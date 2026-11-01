
from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from functools import wraps
import hashlib
import os
import re
import json
import secrets
import sqlite3
import struct
import tempfile
import zlib
from pathlib import Path

import joblib
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI
from werkzeug.security import check_password_hash, generate_password_hash


# ==========================================
# 1. CONFIGURATION
# ==========================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["*"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
)

AUTH_DATABASE_PATH = Path(
    os.getenv("LABELCHECK_AUTH_DB", BASE_DIR / "labelcheck_auth.sqlite3")
)
PROFILE_AVATAR_DIRECTORY = Path(
    os.getenv("LABELCHECK_AVATAR_DIR", BASE_DIR / "uploads" / "avatars")
)
MAX_PROFILE_AVATAR_SIZE = 5 * 1024 * 1024
MAX_PROFILE_AVATAR_DIMENSION = 4096
MAX_PROFILE_AVATAR_PIXELS = 20_000_000
PROFILE_AVATAR_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
}


@contextmanager
def get_auth_connection():
    connection = sqlite3.connect(AUTH_DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_auth_database():
    AUTH_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_auth_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                created_at TEXT NOT NULL,
                profile_json TEXT NOT NULL
            )
            """
        )
        user_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(users)")
        }
        if "avatar_filename" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN avatar_filename TEXT")
        if "avatar_updated_at" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN avatar_updated_at TEXT")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )


def serialize_user(row):
    avatar_url = None
    if row["avatar_filename"]:
        avatar_version = row["avatar_updated_at"] or row["avatar_filename"]
        avatar_url = f"/api/profile/avatar?v={avatar_version}"
    return {
        "id": row["id"],
        "fullName": row["full_name"],
        "email": row["email"],
        "role": row["role"],
        "createdAt": row["created_at"],
        "avatarUrl": avatar_url,
        "profile": json.loads(row["profile_json"]),
    }


def image_dimensions_are_valid(width, height):
    return (
        width > 0
        and height > 0
        and width <= MAX_PROFILE_AVATAR_DIMENSION
        and height <= MAX_PROFILE_AVATAR_DIMENSION
        and width * height <= MAX_PROFILE_AVATAR_PIXELS
    )


def validate_profile_avatar(contents):
    if contents.startswith(b"\x89PNG\r\n\x1a\n"):
        offset = 8
        has_image_data = False
        has_end = False
        dimensions = None
        while offset + 12 <= len(contents):
            chunk_length = struct.unpack(">I", contents[offset:offset + 4])[0]
            chunk_type = contents[offset + 4:offset + 8]
            chunk_end = offset + 12 + chunk_length
            if chunk_end > len(contents):
                break
            chunk_data = contents[offset + 8:offset + 8 + chunk_length]
            expected_crc = struct.unpack(">I", contents[offset + 8 + chunk_length:chunk_end])[0]
            if zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF != expected_crc:
                break
            if offset == 8:
                if chunk_type != b"IHDR" or chunk_length != 13:
                    break
                dimensions = struct.unpack(">II", chunk_data[:8])
            elif chunk_type == b"IDAT":
                has_image_data = True
            elif chunk_type == b"IEND":
                has_end = chunk_length == 0 and chunk_end == len(contents)
                break
            offset = chunk_end
        if (
            dimensions
            and has_image_data
            and has_end
            and image_dimensions_are_valid(*dimensions)
        ):
            return ".png"
        return None

    if contents.startswith(b"\xff\xd8"):
        offset = 2
        dimensions = None
        frame_markers = {
            0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
            0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF,
        }
        while offset < len(contents):
            if contents[offset] != 0xFF:
                break
            while offset < len(contents) and contents[offset] == 0xFF:
                offset += 1
            if offset >= len(contents):
                break
            marker = contents[offset]
            offset += 1
            if marker in (0xD8, 0xD9, 0x01) or 0xD0 <= marker <= 0xD7:
                if marker == 0xD9:
                    break
                continue
            if offset + 2 > len(contents):
                break
            segment_length = struct.unpack(">H", contents[offset:offset + 2])[0]
            if segment_length < 2 or offset + segment_length > len(contents):
                break
            if marker in frame_markers and segment_length >= 7:
                height, width = struct.unpack(">HH", contents[offset + 3:offset + 7])
                dimensions = (width, height)
                break
            if marker == 0xDA:
                break
            offset += segment_length
        if (
            dimensions
            and b"\xff\xd9" in contents
            and image_dimensions_are_valid(*dimensions)
        ):
            return ".jpg"
        return None

    if (
        len(contents) >= 20
        and contents[:4] == b"RIFF"
        and contents[8:12] == b"WEBP"
        and struct.unpack("<I", contents[4:8])[0] + 8 == len(contents)
    ):
        offset = 12
        dimensions = None
        while offset + 8 <= len(contents):
            chunk_type = contents[offset:offset + 4]
            chunk_length = struct.unpack("<I", contents[offset + 4:offset + 8])[0]
            chunk_start = offset + 8
            chunk_end = chunk_start + chunk_length
            if chunk_end > len(contents):
                break
            chunk = contents[chunk_start:chunk_end]
            if chunk_type == b"VP8X" and len(chunk) >= 10:
                width = 1 + int.from_bytes(chunk[4:7], "little")
                height = 1 + int.from_bytes(chunk[7:10], "little")
                dimensions = (width, height)
            elif chunk_type == b"VP8L" and len(chunk) >= 5 and chunk[0] == 0x2F:
                width = 1 + ((chunk[2] & 0x3F) << 8) + chunk[1]
                height = 1 + ((chunk[4] & 0x0F) << 10) + (chunk[3] << 2) + (chunk[2] >> 6)
                dimensions = (width, height)
            elif (
                chunk_type == b"VP8 "
                and len(chunk) >= 10
                and chunk[3:6] == b"\x9d\x01\x2a"
            ):
                width = struct.unpack("<H", chunk[6:8])[0] & 0x3FFF
                height = struct.unpack("<H", chunk[8:10])[0] & 0x3FFF
                dimensions = (width, height)
            if dimensions:
                break
            offset = chunk_end + (chunk_length & 1)
        if dimensions and image_dimensions_are_valid(*dimensions):
            return ".webp"
    return None


def create_auth_session(connection, user_id):
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    connection.execute(
        """
        INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
        """,
        (
            hashlib.sha256(token.encode("utf-8")).hexdigest(),
            user_id,
            now.isoformat(),
            (now + timedelta(days=30)).isoformat(),
        ),
    )
    return token


def get_bearer_token():
    authorization = request.headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        return None
    return token.strip()


def require_auth(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        token = get_bearer_token()
        if not token:
            return jsonify({"message": "Authentication required"}), 401

        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with get_auth_connection() as connection:
            row = connection.execute(
                """
                SELECT users.*, auth_sessions.token_hash, auth_sessions.expires_at
                FROM auth_sessions
                JOIN users ON users.id = auth_sessions.user_id
                WHERE auth_sessions.token_hash = ?
                """,
                (token_hash,),
            ).fetchone()

            if not row:
                return jsonify({"message": "Session is invalid or expired"}), 401

            try:
                expires_at = datetime.fromisoformat(row["expires_at"])
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
            except Exception:
                expires_at = datetime.min.replace(tzinfo=timezone.utc)

            if expires_at <= datetime.now(timezone.utc):
                connection.execute(
                    "DELETE FROM auth_sessions WHERE token_hash = ?",
                    (token_hash,),
                )
                return jsonify({"message": "Session is invalid or expired"}), 401

            g.auth_user = serialize_user(row)

        return view(*args, **kwargs)

    return wrapped


initialize_auth_database()


@app.after_request
def prevent_auth_response_caching(response):
    if request.path == "/api/profile/avatar":
        response.headers["Cache-Control"] = "private, no-store"
    elif request.path.startswith("/api/auth/"):
        response.headers["Cache-Control"] = "no-store"
    return response


# ==========================================
# 2. LOAD ML MODEL & DATASET (LAZY)
# ==========================================

MODEL_PATH = PROJECT_DIR / "model" / "labelcheck_name_model.pkl"
DATASET_PATH = PROJECT_DIR / "dataset" / "ingredient-flags.csv.xlsx"

_model = None
_df = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"ML model not found: {MODEL_PATH}")
        _model = joblib.load(MODEL_PATH)
    return _model


def get_dataset():
    global _df
    if _df is None:
        if not DATASET_PATH.exists():
            raise FileNotFoundError(f"Ingredient dataset not found: {DATASET_PATH}")
        loaded_df = pd.read_excel(DATASET_PATH)
        required_columns = [
            "display_name",
            "fragrance",
            "eu_allergen",
            "pregnancy_caution",
        ]
        missing_columns = [c for c in required_columns if c not in loaded_df.columns]
        if missing_columns:
            raise ValueError(f"Dataset is missing columns: {missing_columns}")
        loaded_df["display_name"] = (
            loaded_df["display_name"]
            .fillna("")
            .astype(str)
            .str.strip()
            .str.lower()
        )
        _df = loaded_df
    return _df


# ==========================================
# 4. CLEAN INGREDIENT
# ==========================================

def clean_ingredient(text):
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = text.strip(".,;:()[]")
    return text


def dataset_flag(value):
    """Convert a dataset flag into a JSON-safe boolean."""
    if pd.isna(value):
        return False

    return str(value).strip().lower() in ("1", "1.0", "true", "yes")


# ==========================================
# 5. ANALYZE INGREDIENTS
# ==========================================

def analyze_ingredients(ingredients):
    results = []
    model = get_model()
    df = get_dataset()

    for ingredient in ingredients:
        if not isinstance(ingredient, str):
            continue

        ingredient = clean_ingredient(ingredient)

        if not ingredient:
            continue

        prediction = model.predict([ingredient])[0]

        probabilities = model.predict_proba([ingredient])[0]
        concern_probability = float(probabilities[1]) * 100

        match = df[df["display_name"] == ingredient]

        fragrance = False
        eu_allergen = False
        pregnancy_caution = False

        if not match.empty:
            row = match.iloc[0]

            fragrance = dataset_flag(row["fragrance"])
            eu_allergen = dataset_flag(row["eu_allergen"])
            pregnancy_caution = dataset_flag(row["pregnancy_caution"])

        results.append({
            "ingredient": ingredient,
            "prediction": (
                "Potential Concern" if prediction == 1
                else "Lower Concern"
            ),
            "probability": round(concern_probability, 1),
            "fragrance": fragrance,
            "eu_allergen": eu_allergen,
            "pregnancy_caution": pregnancy_caution,
        })

    return results


# ==========================================
# 6. HOME ROUTE
# ==========================================

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    full_name = data.get("fullName") or data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not isinstance(full_name, str) or len(full_name.strip()) < 2:
        return jsonify({"message": "Full name must be at least 2 characters"}), 400
    if not isinstance(email, str) or not re.fullmatch(
        r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", email.strip()
    ):
        return jsonify({"message": "Please enter a valid email address"}), 400
    if not isinstance(password, str) or len(password) < 8:
        return jsonify({"message": "Password must be at least 8 characters"}), 400

    clean_name = full_name.strip()
    clean_email = email.strip().lower()

    profile = {
        "allergies": [],
        "skinSensitivities": [],
        "avoidIngredients": [],
        "dietaryRestrictions": [],
        "fragranceSensitivity": False,
        "preferredCategories": [],
        "isOnboardingCompleted": False,
    }
    user_id = secrets.token_urlsafe(16)
    created_at = datetime.now(timezone.utc).isoformat()

    try:
        with get_auth_connection() as connection:
            existing = connection.execute(
                "SELECT id FROM users WHERE email = ? COLLATE NOCASE",
                (clean_email,),
            ).fetchone()
            if existing:
                return jsonify({"message": "An account with this email address already exists. Please sign in instead."}), 409

            user_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            role = "admin" if user_count == 0 else "user"

            connection.execute(
                """
                INSERT INTO users (id, full_name, email, password_hash, role, created_at, profile_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    clean_name,
                    clean_email,
                    generate_password_hash(password),
                    role,
                    created_at,
                    json.dumps(profile),
                ),
            )
            user = connection.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            token = create_auth_session(connection, user_id)
    except sqlite3.IntegrityError:
        return jsonify({"message": "An account with this email address already exists. Please sign in instead."}), 409

    return jsonify({"token": token, "user": serialize_user(user)}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not password:
        return jsonify({"message": "Email and password are required"}), 400

    clean_email = email.strip().lower()

    with get_auth_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE email = ? COLLATE NOCASE",
            (clean_email,),
        ).fetchone()

        if not user or not check_password_hash(user["password_hash"], password):
            return jsonify({"message": "Invalid email or password"}), 401

        token = create_auth_session(connection, user["id"])

    return jsonify({"token": token, "user": serialize_user(user)})


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def current_user():
    return jsonify(g.auth_user)


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    token = get_bearer_token()
    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with get_auth_connection() as connection:
            connection.execute(
                "DELETE FROM auth_sessions WHERE token_hash = ?", (token_hash,)
            )
    return jsonify({"success": True})


@app.route("/api/profile/password", methods=["PUT"])
@require_auth
def change_password():
    data = request.get_json(silent=True) or {}
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")

    if not isinstance(old_password, str) or not isinstance(new_password, str) or not old_password or not new_password:
        return jsonify({"message": "Old and new passwords are required"}), 400

    if len(new_password) < 8:
        return jsonify({"message": "New password must be at least 8 characters"}), 400

    with get_auth_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE id = ?", (g.auth_user["id"],)
        ).fetchone()

        if not user or not check_password_hash(user["password_hash"], old_password):
            return jsonify({"message": "Current password is incorrect"}), 400

        connection.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (generate_password_hash(new_password), g.auth_user["id"]),
        )

    return jsonify({"success": True, "message": "Password updated successfully"})


@app.route("/api/profile", methods=["DELETE"])
@require_auth
def delete_account():
    user_id = g.auth_user["id"]
    with get_auth_connection() as connection:
        user = connection.execute(
            "SELECT avatar_filename FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if user and user["avatar_filename"]:
            avatar_path = PROFILE_AVATAR_DIRECTORY / user["avatar_filename"]
            if avatar_path.is_file():
                try:
                    avatar_path.unlink()
                except OSError:
                    pass

        connection.execute("DELETE FROM users WHERE id = ?", (user_id,))

    return jsonify({"success": True, "message": "Account deleted successfully"})


@app.route("/api/admin/users", methods=["GET"])
@require_auth
def admin_get_users():
    if g.auth_user["role"] != "admin":
        return jsonify({"message": "Admin privileges required"}), 403
    with get_auth_connection() as connection:
        rows = connection.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
        return jsonify([serialize_user(row) for row in rows])


@app.route("/api/admin/users/<user_id>/role", methods=["PUT"])
@require_auth
def admin_update_user_role(user_id):
    if g.auth_user["role"] != "admin":
        return jsonify({"message": "Admin privileges required"}), 403
    data = request.get_json(silent=True) or {}
    new_role = data.get("role")
    if new_role not in ("user", "admin"):
        return jsonify({"message": "Role must be 'user' or 'admin'"}), 400
    with get_auth_connection() as connection:
        connection.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
        user = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not user:
            return jsonify({"message": "User not found"}), 404
        return jsonify(serialize_user(user))


@app.route("/api/profile", methods=["PUT"])
@require_auth
def update_profile():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"message": "Profile data is required"}), 400

    allowed_fields = {
        "ageGroup",
        "allergies",
        "skinType",
        "skinSensitivities",
        "avoidIngredients",
        "dietaryRestrictions",
        "fragranceSensitivity",
        "preferredCategories",
        "isOnboardingCompleted",
    }

    profile = {**g.auth_user["profile"], **{
        key: value for key, value in data.items() if key in allowed_fields
    }}
    with get_auth_connection() as connection:
        connection.execute(
            "UPDATE users SET profile_json = ? WHERE id = ?",
            (json.dumps(profile), g.auth_user["id"]),
        )
        user = connection.execute(
            "SELECT * FROM users WHERE id = ?", (g.auth_user["id"],)
        ).fetchone()
    return jsonify(serialize_user(user))


@app.route("/api/profile/avatar", methods=["GET"])
@require_auth
def get_profile_avatar():
    with get_auth_connection() as connection:
        user = connection.execute(
            "SELECT avatar_filename FROM users WHERE id = ?",
            (g.auth_user["id"],),
        ).fetchone()

    if not user or not user["avatar_filename"]:
        return jsonify({"message": "No profile picture has been uploaded"}), 404

    filename = user["avatar_filename"]
    if Path(filename).name != filename or Path(filename).suffix.lower() not in PROFILE_AVATAR_TYPES:
        app.logger.error("Invalid profile avatar reference for authenticated user")
        return jsonify({"message": "Profile picture is unavailable"}), 404

    avatar_path = PROFILE_AVATAR_DIRECTORY / filename
    if not avatar_path.is_file():
        return jsonify({"message": "Profile picture is unavailable"}), 404

    response = send_file(
        avatar_path,
        mimetype=PROFILE_AVATAR_TYPES[avatar_path.suffix.lower()],
        conditional=False,
    )
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.route("/api/profile/avatar", methods=["POST"])
@require_auth
def upload_profile_avatar():
    if (
        request.content_length is not None
        and request.content_length > MAX_PROFILE_AVATAR_SIZE + 64 * 1024
    ):
        return jsonify({"message": "Profile pictures must be 5 MB or smaller"}), 413

    avatar = request.files.get("avatar")
    if avatar is None:
        return jsonify({"message": "Choose a profile picture to upload"}), 400

    contents = avatar.stream.read(MAX_PROFILE_AVATAR_SIZE + 1)
    if not contents:
        return jsonify({"message": "The selected file is empty"}), 400
    if len(contents) > MAX_PROFILE_AVATAR_SIZE:
        return jsonify({"message": "Profile pictures must be 5 MB or smaller"}), 413

    extension = validate_profile_avatar(contents)
    if not extension:
        return jsonify({
            "message": "Upload a valid PNG, JPEG, or WebP image no larger than 4096 pixels per side"
        }), 400

    PROFILE_AVATAR_DIRECTORY.mkdir(parents=True, exist_ok=True)
    new_filename = f"{secrets.token_hex(16)}{extension}"
    new_path = PROFILE_AVATAR_DIRECTORY / new_filename
    temporary_path = None

    try:
        with tempfile.NamedTemporaryFile(
            dir=PROFILE_AVATAR_DIRECTORY,
            prefix=".avatar-",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            temporary_file.write(contents)
        os.replace(temporary_path, new_path)

        with get_auth_connection() as connection:
            previous = connection.execute(
                "SELECT avatar_filename FROM users WHERE id = ?",
                (g.auth_user["id"],),
            ).fetchone()
            connection.execute(
                "UPDATE users SET avatar_filename = ?, avatar_updated_at = ? WHERE id = ?",
                (
                    new_filename,
                    datetime.now(timezone.utc).isoformat(),
                    g.auth_user["id"],
                ),
            )
            updated_user = connection.execute(
                "SELECT * FROM users WHERE id = ?",
                (g.auth_user["id"],),
            ).fetchone()
    except Exception:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()
        if new_path.exists():
            new_path.unlink()
        app.logger.exception("Failed to save profile picture")
        return jsonify({"message": "Unable to save the profile picture. Please try again."}), 500

    previous_filename = previous["avatar_filename"] if previous else None
    if (
        previous_filename
        and previous_filename != new_filename
        and Path(previous_filename).name == previous_filename
        and Path(previous_filename).suffix.lower() in PROFILE_AVATAR_TYPES
    ):
        try:
            (PROFILE_AVATAR_DIRECTORY / previous_filename).unlink(missing_ok=True)
        except OSError:
            app.logger.exception("Failed to remove replaced profile picture")

    return jsonify(serialize_user(updated_user))


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "LabelCheck backend is running!"
    })


# ==========================================
# 7. ANALYZE API
# ==========================================

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    ingredients = data.get("ingredients")

    if not isinstance(ingredients, list) or not ingredients:
        return jsonify({"error": "A non-empty ingredients list is required"}), 400

    if not all(isinstance(item, str) for item in ingredients):
        return jsonify({"error": "Every ingredient must be a string"}), 400

    try:
        results = analyze_ingredients(ingredients)
        return jsonify({"results": results})
    except Exception:
        app.logger.exception("Ingredient analysis failed")
        return jsonify({"error": "Ingredient analysis failed"}), 500


# ==========================================
# 8. AI ASSISTANT API
# ==========================================

@app.route("/assistant/chat", methods=["POST"])
def assistant_chat():
    data = request.get_json(silent=True) or {}

    message = data.get("message", "")
    history = data.get("history", [])

    if not isinstance(message, str) or not message.strip():
        return jsonify({"error": "A message is required"}), 400

    message = message.strip()

    if len(message) > 2000:
        return jsonify({"error": "Message is too long"}), 400

    if client is None:
        return jsonify({
            "error": "AI is not configured. Add OPENAI_API_KEY to backend/.env"
        }), 503

    # Look for an exact ingredient name in the user's message.
    # This initial implementation supports exact ingredient-name messages.
    query = clean_ingredient(message)
    df = get_dataset()
    match = df[df["display_name"] == query]

    ingredient_context = []

    if not match.empty:
        row = match.iloc[0]

        ingredient_context.append({
            "source": "ingredient dataset",
            "ingredient": row["display_name"],
            "fragrance": dataset_flag(row["fragrance"]),
            "eu_allergen": dataset_flag(row["eu_allergen"]),
            "pregnancy_caution": dataset_flag(row["pregnancy_caution"]),
        })

        try:
            model = get_model()
            prediction = model.predict([query])[0]
            probabilities = model.predict_proba([query])[0]

            ingredient_context.append({
                "source": "ML model",
                "ingredient": query,
                "prediction": (
                    "Potential Concern" if prediction == 1
                    else "Lower Concern"
                ),
                "model_confidence_percent": round(
                    float(max(probabilities)) * 100, 1
                ),
            })
        except Exception:
            app.logger.exception("ML prediction failed in assistant")

    # Validate and limit conversation history.
    safe_history = []

    if isinstance(history, list):
        for item in history[-10:]:
            if not isinstance(item, dict):
                continue

            role = item.get("role")
            content = item.get("content")

            if (
                role in ("user", "assistant")
                and isinstance(content, str)
                and content.strip()
            ):
                safe_history.append({
                    "role": role,
                    "content": content[:2000],
                })

    context_text = (
        "LabelCheck data for the current question:\n"
        + json.dumps(ingredient_context)
        + "\nIf no exact ingredient match is supplied, explain that no "
          "exact dataset match was found. Do not invent model predictions "
          "or dataset flags."
    )

    try:
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            instructions=(
                "You are LabelCheck Assistant, a helpful cosmetic ingredient "
                "information assistant. Answer the user's actual question "
                "naturally and clearly. Use the supplied LabelCheck data "
                "when relevant. Explain that ML predictions are model "
                "estimates, not medical diagnoses or proof of safety. "
                "Never invent dataset flags, EWG scores, ingredient "
                "concentrations, regulatory approvals, or medical facts. "
                "If the data does not answer the question, say so. Provide "
                "cautious general information and do not claim access to "
                "live registries or a personal profile."
            ),
            input=[
                *safe_history,
                {
                    "role": "user",
                    "content": f"{context_text}\n\nQuestion: {message}",
                },
            ],
            max_output_tokens=350,
        )

        reply = response.output_text.strip()

        if not reply:
            return jsonify({
                "error": "The AI returned an empty response"
            }), 502

        return jsonify({"reply": reply})

    except Exception:
        app.logger.exception("Assistant API request failed")
        return jsonify({
            "error": "The AI service request failed. Check the backend terminal."
        }), 502


# ==========================================
# 9. RUN SERVER
# ==========================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="127.0.0.1", port=port, debug=False)
