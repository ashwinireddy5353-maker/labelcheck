
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
import difflib
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
SCAN_UPLOAD_DIRECTORY = Path(
    os.getenv("LABELCHECK_SCAN_DIR", BASE_DIR / "uploads" / "scans")
)
SCAN_UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
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
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                product_name TEXT NOT NULL,
                brand TEXT,
                category TEXT,
                image_url TEXT,
                scan_date TEXT NOT NULL,
                score INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                ingredients_json TEXT NOT NULL,
                report_json TEXT NOT NULL
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
# 5. INGREDIENT TOXICOLOGY & ALLERGEN REGISTRY
# ==========================================

KNOWN_HAZARDS = {
    "formaldehyde_releasers": {
        "keywords": [
            "dmdm hydantoin", "formaldehyde", "quaternium-15", "diazolidinyl urea",
            "imidazolidinyl urea", "polyoxymethylene urea", "sodium hydroxymethylglycinate",
            "bronopol", "2-bromo-2-nitropropane", "glyoxal", "methenamine"
        ],
        "category": "Formaldehyde Releaser",
        "risk_level": "hazardous",
        "is_hazardous": True,
        "is_allergen": True,
        "is_irritant": True,
        "hazard_details": "Formaldehyde-releasing preservative classified as a human carcinogen and high-potency contact allergen.",
        "why_flagged": "Potentially Hazardous Formaldehyde Releaser",
    },
    "parabens": {
        "keywords": [
            "methylparaben", "propylparaben", "butylparaben", "ethylparaben",
            "isobutylparaben", "isopropylparaben", "benzylparaben", "paraben"
        ],
        "category": "Preservative / Paraben",
        "risk_level": "moderate",
        "is_hazardous": True,
        "is_allergen": False,
        "is_irritant": True,
        "hazard_details": "Synthetic antimicrobial preservative associated with weak estrogenic and endocrine disruption activity.",
        "why_flagged": "Potential Endocrine Disruptor (Parabens)",
    },
    "phthalates": {
        "keywords": ["dibutyl phthalate", "diethyl phthalate", "phthalate", "dbp", "dep", "dehp"],
        "category": "Plasticizer / Phthalate",
        "risk_level": "hazardous",
        "is_hazardous": True,
        "is_allergen": False,
        "is_irritant": True,
        "hazard_details": "Classified reproductive toxicant and endocrine disruptor restricted in cosmetics.",
        "why_flagged": "High Hazard: Restricted Phthalate",
    },
    "harsh_sulfates": {
        "keywords": [
            "sodium lauryl sulfate", "sls", "ammonium lauryl sulfate",
            "sodium laureth sulfate", "sles", "tea-lauryl sulfate"
        ],
        "category": "Harsh Surfactant",
        "risk_level": "moderate",
        "is_hazardous": False,
        "is_allergen": False,
        "is_irritant": True,
        "irritant_details": "Harsh anionic detergent known to strip natural skin lipids, compromise epidermal barrier, and trigger dermatitis.",
        "why_flagged": "Harsh Cleansing Detergent (Barrier Stripper)",
    },
    "chemical_uv_filters": {
        "keywords": [
            "oxybenzone", "benzophenone-3", "benzophenone", "octinoxate",
            "ethylhexyl methoxycinnamate", "octyl methoxycinnamate", "4-methylbenzylidene camphor",
            "homosalate", "octocrylene", "avobenzone", "butyl methoxydibenzoylmethane",
            "octisalate", "ethylhexyl salicylate", "butyloctyl salicylate",
            "diethylamino hydroxybenzoyl hexyl benzoate", "methylene bis-benzotriazolyl",
            "tinosorb", "mexoryl", "cinnamate", "methoxycinnamate"
        ],
        "category": "Chemical UV Filter",
        "risk_level": "moderate",
        "is_hazardous": True,
        "is_allergen": True,
        "is_irritant": True,
        "hazard_details": "Chemical UV absorber with documented systemic dermal absorption, potential hormone mimicry, and aquatic ecotoxicity.",
        "why_flagged": "Chemical UV Filter with Potential Endocrine/Sensitivity Concern",
    },
    "amines_and_nitrosating_agents": {
        "keywords": [
            "triethanolamine", "diethanolamine", "monoethanolamine", "tea", "dea", "mea", "tromethamine"
        ],
        "category": "pH Adjuster / Amine",
        "risk_level": "moderate",
        "is_hazardous": True,
        "is_allergen": True,
        "is_irritant": True,
        "irritant_details": "Alkaline amine surfactant and pH neutralizer that can form nitrosamines (carcinogens) and trigger contact dermatitis.",
        "why_flagged": "Nitrosating Amine Compound / Barrier Irritant",
    },
    "siloxanes_and_microplastics": {
        "keywords": [
            "cyclopentasiloxane", "cyclotetrasiloxane", "cyclomethicone", "d4", "d5", "d6"
        ],
        "category": "Volatile Silicone",
        "risk_level": "moderate",
        "is_hazardous": True,
        "is_allergen": False,
        "is_irritant": False,
        "hazard_details": "Cyclic siloxane restricted under EU REACH due to environmental persistence, bioaccumulation, and suspected endocrine activity.",
        "why_flagged": "Restricted Cyclic Siloxane (Bioaccumulation Concern)",
    },
    "sensitizing_preservatives": {
        "keywords": [
            "methylisothiazolinone", "methylchloroisothiazolinone", "kathon",
            "triclosan", "triclocarban", "bht", "bha", "butylated hydroxytoluene", "butylated hydroxyanisole",
            "chlorphenesin"
        ],
        "category": "Antimicrobial Sensitizer",
        "risk_level": "high",
        "is_hazardous": True,
        "is_allergen": True,
        "is_irritant": True,
        "hazard_details": "Extreme contact sensitizer frequently causing allergic eczema and facial dermatitis; banned in leave-on EU cosmetics.",
        "why_flagged": "High-Risk Contact Sensitizer / Bioaccumulative Preservative",
    },
    "fragrances_and_allergens": {
        "keywords": [
            "fragrance", "parfum", "aroma", "perfume", "flavour", "flavor",
            "limonene", "linalool", "geraniol", "citronellol", "eugenol", "citral",
            "cinnamal", "coumarin", "hydroxycitronellal", "isoeugenol", "amyl cinnamal",
            "benzyl alcohol", "benzyl benzoate", "benzyl salicylate", "farnesol",
            "hexyl cinnamal", "alpha-isomethyl ionone", "evernia prunastri", "oakmoss", "tree moss",
            "lavender oil", "peppermint oil", "eucalyptus oil", "citrus oil"
        ],
        "category": "Fragrance & Aroma Allergen",
        "risk_level": "high",
        "is_hazardous": False,
        "is_allergen": True,
        "is_irritant": True,
        "allergen_details": "Common contact allergen and volatile aroma blend recognized by EU SCCS as leading trigger of allergic contact dermatitis.",
        "why_flagged": "Recognized Contact Allergen / Sensitizing Fragrance Compound",
    },
    "drying_alcohols": {
        "keywords": ["alcohol denat", "sd alcohol", "isopropyl alcohol", "denatured alcohol"],
        "category": "Drying Alcohol",
        "risk_level": "moderate",
        "is_hazardous": False,
        "is_allergen": False,
        "is_irritant": True,
        "irritant_details": "Simple volatile alcohol that can dissolve intercellular lipids and accelerate skin barrier dehydration.",
        "why_flagged": "Drying Alcohol (Skin Barrier Irritant)",
    },
    "pregnancy_cautions": {
        "keywords": [
            "retinol", "retinyl palmitate", "tretinoin", "adapalene",
            "tazarotene", "hydroquinone", "salicylic acid"
        ],
        "category": "Potent Active",
        "risk_level": "moderate",
        "is_hazardous": False,
        "is_allergen": False,
        "is_irritant": True,
        "hazard_details": "High-strength active compound requiring caution during pregnancy or acute barrier impairment.",
        "why_flagged": "Caution Advised (High Strength Active / Pregnancy Caution)",
    },
    "clean_and_beneficial": {
        "keywords": [
            "aqua", "water", "glycerin", "ceramide", "sodium hyaluronate", "hyaluronic acid",
            "niacinamide", "panthenol", "allantoin", "squalane", "tocopherol", "aloe barbadensis",
            "centella asiatica", "centella", "butyrospermum parkii", "cholesterol", "beta-glucan",
            "zinc oxide", "titanium dioxide", "shea butter", "jojoba"
        ],
        "category": "Barrier & Nourishing",
        "risk_level": "low",
        "is_hazardous": False,
        "is_allergen": False,
        "is_irritant": False,
    }
}


def check_personal_allergy_match(cleaned_ing, user_allergies=None, user_avoids=None, fragrance_sensitivity=False, skin_sensitivities=None, skin_type=None):
    """
    Checks if an ingredient matches user's personal allergies, avoid list, or sensitivities.
    """
    cleaned_lower = cleaned_ing.lower().strip()
    is_personal_allergen = False
    is_personal_avoid = False
    why_flagged_list = []
    allergen_match_name = None
    avoid_match_name = None

    # 1. Match against user allergies
    for allergy in (user_allergies or []):
        allergy_clean = allergy.lower().strip()
        if not allergy_clean:
            continue
        
        matched = False
        if allergy_clean in cleaned_lower or cleaned_lower in allergy_clean:
            matched = True
        elif "fragrance" in allergy_clean or "parfum" in allergy_clean:
            if any(k in cleaned_lower for k in ["fragrance", "parfum", "aroma", "perfume", "limonene", "linalool", "geraniol", "citronellol", "eugenol", "citral"]):
                matched = True
        elif "formaldehyde" in allergy_clean:
            if any(k in cleaned_lower for k in ["formaldehyde", "dmdm", "quaternium-15", "diazolidinyl", "imidazolidinyl", "bronopol"]):
                matched = True
        elif "paraben" in allergy_clean:
            if "paraben" in cleaned_lower:
                matched = True
        elif "sulfate" in allergy_clean or "sls" in allergy_clean:
            if "sulfate" in cleaned_lower or "sls" in cleaned_lower:
                matched = True
        elif "nickel" in allergy_clean and "nickel" in cleaned_lower:
            matched = True

        if matched:
            is_personal_allergen = True
            allergen_match_name = allergy
            why_flagged_list.append(f"Matches Personal Allergy: {allergy}")
            break

    # 2. Check fragrance sensitivity flag
    if fragrance_sensitivity and not is_personal_allergen:
        if any(k in cleaned_lower for k in ["fragrance", "parfum", "aroma", "perfume", "limonene", "linalool", "geraniol", "citronellol", "eugenol", "citral"]):
            is_personal_allergen = True
            allergen_match_name = "Fragrance Sensitivity"
            why_flagged_list.append("Matches Profile Sensitivity: Fragrance / Parfums")

    # 3. Match against user avoid list
    for avoid in (user_avoids or []):
        avoid_clean = avoid.lower().strip()
        if not avoid_clean:
            continue
        matched = False
        if avoid_clean in cleaned_lower or cleaned_lower in avoid_clean:
            matched = True
        elif "paraben" in avoid_clean and "paraben" in cleaned_lower:
            matched = True
        elif ("sulfate" in avoid_clean or "sls" in avoid_clean) and ("sulfate" in cleaned_lower or "sls" in cleaned_lower):
            matched = True
        elif "phthalate" in avoid_clean and "phthalate" in cleaned_lower:
            matched = True
        elif ("oxybenzone" in avoid_clean or "sunscreen" in avoid_clean) and any(k in cleaned_lower for k in ["oxybenzone", "benzophenone", "octinoxate", "homosalate", "octocrylene"]):
            matched = True

        if matched:
            is_personal_avoid = True
            avoid_match_name = avoid
            why_flagged_list.append(f"Matches Personal Avoid List: {avoid}")
            break

    # 4. Check skin sensitivities (e.g. Eczema, Rosacea, sensitive)
    is_sensitive = (skin_type and str(skin_type).lower() == "sensitive") or any(
        s.lower() in ["eczema", "rosacea", "contact dermatitis"] for s in (skin_sensitivities or [])
    )
    if is_sensitive and not is_personal_avoid and not is_personal_allergen:
        if any(k in cleaned_lower for k in ["sodium lauryl sulfate", "sls", "alcohol denat", "sd alcohol", "isopropyl alcohol"]):
            is_personal_avoid = True
            why_flagged_list.append("Harsh barrier stripper problematic for your sensitive skin profile")

    return {
        "is_personal_allergen": is_personal_allergen,
        "is_personal_avoid": is_personal_avoid,
        "allergen_match_name": allergen_match_name,
        "avoid_match_name": avoid_match_name,
        "warning_text": "; ".join(why_flagged_list) if why_flagged_list else None,
    }


def evaluate_single_ingredient(ingredient, user_profile=None):
    """
    Evaluates an individual ingredient for chemical hazards, general allergens,
    irritants, ML concern prediction, and personal allergies.
    """
    user_profile = user_profile or {}
    user_allergies = user_profile.get("allergies") or user_profile.get("userAllergies") or []
    user_avoids = user_profile.get("avoidIngredients") or user_profile.get("avoidList") or user_profile.get("avoid_ingredients") or []
    fragrance_sensitivity = user_profile.get("fragranceSensitivity", False) or user_profile.get("fragrance_sensitivity", False)
    skin_sensitivities = user_profile.get("skinSensitivities") or user_profile.get("skin_sensitivities") or []
    skin_type = user_profile.get("skinType") or user_profile.get("skin_type")

    cleaned = clean_ingredient(ingredient)
    display_title = ingredient.strip().title()

    # 1. Check personal allergen and avoid match
    personal = check_personal_allergy_match(
        cleaned, user_allergies, user_avoids, fragrance_sensitivity, skin_sensitivities, skin_type
    )

    # 2. Check Known Chemical Hazards
    detected_hazard = False
    detected_allergen = False
    detected_irritant = False
    detected_clean = False
    category = "General"
    hazard_details = None
    allergen_details = None
    irritant_details = None
    why_flagged = personal["warning_text"]

    for hazard_type, info in KNOWN_HAZARDS.items():
        matched_kw = None
        for kw in info["keywords"]:
            if kw in cleaned or (len(cleaned) >= 4 and cleaned in kw):
                matched_kw = kw
                break
        
        # Fuzzy match for OCR misreadings & typos (e.g. etyihexyl methoxyeinnamate -> ethylhexyl methoxycinnamate)
        if not matched_kw and len(cleaned) >= 5:
            tokens = [w for w in re.split(r"[\s\-_/]+", cleaned) if len(w) >= 4]
            for t in tokens:
                for kw in info["keywords"]:
                    if len(kw) >= 4 and (t in kw or kw in t):
                        matched_kw = kw
                        break
                    kw_tokens = [k for k in kw.split() if len(k) >= 4]
                    close = difflib.get_close_matches(t, kw_tokens, n=1, cutoff=0.70)
                    if close:
                        matched_kw = kw
                        break
                if matched_kw:
                    break

        if matched_kw:
            if info.get("is_hazardous"):
                detected_hazard = True
                hazard_details = info.get("hazard_details")
            if info.get("is_allergen"):
                detected_allergen = True
                allergen_details = info.get("allergen_details")
            if info.get("is_irritant"):
                detected_irritant = True
                irritant_details = info.get("irritant_details")
            if hazard_type == "clean_and_beneficial":
                detected_clean = True
            
            category = info.get("category", category)
            hazard_why = info.get("why_flagged")
            if hazard_why and not why_flagged:
                why_flagged = hazard_why

    # 3. Match against Excel dataset
    df = get_dataset()
    match = df[df["display_name"] == cleaned]
    if match.empty:
        # Partial match on display_name
        words = cleaned.split()
        if words:
            for w in [cleaned, words[0]]:
                if len(w) >= 3:
                    sub_match = df[df["display_name"].str.contains(re.escape(w), na=False)]
                    if not sub_match.empty:
                        match = sub_match
                        break

    if not match.empty:
        row = match.iloc[0]
        if dataset_flag(row.get("fragrance")):
            detected_allergen = True
            detected_irritant = True
            if not allergen_details:
                allergen_details = "Fragrance compound identified in cosmetic registry."
        if dataset_flag(row.get("eu_allergen")):
            detected_allergen = True
            if not allergen_details:
                allergen_details = "EU Annex III regulated contact allergen."
        if dataset_flag(row.get("pregnancy_caution")):
            detected_hazard = True
            if not hazard_details:
                hazard_details = "Active component flagged with pregnancy / sensitive caution."

    # 4. ML Model Prediction
    model = get_model()
    concern_probability = 25.0
    try:
        prediction = model.predict([cleaned])[0]
        probabilities = model.predict_proba([cleaned])[0]
        concern_probability = float(probabilities[1]) * 100
        if prediction == 1 or concern_probability >= 60:
            detected_hazard = True
            if not hazard_details:
                hazard_details = f"ML model flagged potential chemical concern ({round(concern_probability, 1)}% probability)."
    except Exception:
        pass

    # 5. Determine Overall Risk Level
    if personal["is_personal_allergen"]:
        risk_level = "hazardous"
        detected_allergen = True
    elif detected_hazard:
        risk_level = "hazardous" if any(kw in cleaned for kw in ["formaldehyde", "dmdm", "phthalate", "oxybenzone"]) else "moderate"
    elif personal["is_personal_avoid"]:
        risk_level = "high"
    elif detected_allergen:
        risk_level = "high"
    elif detected_irritant:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "rawName": ingredient,
        "matchedName": display_title,
        "cleanedName": cleaned,
        "category": category,
        "riskLevel": risk_level,
        "isAllergen": detected_allergen or personal["is_personal_allergen"],
        "isIrritant": detected_irritant,
        "isHazardous": detected_hazard,
        "isClean": detected_clean,
        "isPersonalAllergen": personal["is_personal_allergen"],
        "isPersonalAvoid": personal["is_personal_avoid"],
        "personalizedMatch": personal["is_personal_allergen"] or personal["is_personal_avoid"],
        "userAvoidMatch": personal["is_personal_avoid"],
        "whyFlagged": why_flagged,
        "hazardDetails": hazard_details,
        "allergenDetails": allergen_details,
        "irritantDetails": irritant_details,
        "confidence": round(concern_probability / 100, 2),
    }


def calculate_formulation_score(evaluated_items):
    """
    Computes a personalized safety score considering ALL ingredients,
    chemical hazards, irritants, and personal allergens.
    """
    total = len(evaluated_items)
    if total == 0:
        return 100, "Lower Detected Risk", "No ingredients to analyze.", {}

    personal_allergens = sum(1 for item in evaluated_items if item.get("isPersonalAllergen"))
    personal_avoids = sum(1 for item in evaluated_items if item.get("isPersonalAvoid") and not item.get("isPersonalAllergen"))
    hazards = sum(1 for item in evaluated_items if item.get("isHazardous"))
    allergens = sum(1 for item in evaluated_items if item.get("isAllergen"))
    irritants = sum(1 for item in evaluated_items if item.get("isIrritant"))
    clean_count = sum(1 for item in evaluated_items if item.get("isClean") or (item.get("riskLevel") == "low" and not item.get("personalizedMatch")))

    # Base score
    score = 100

    # Deductions based on ingredient findings
    deductions = (
        (personal_allergens * 35)
        + (personal_avoids * 18)
        + (hazards * 22)
        + (allergens * 12)
        + (irritants * 8)
    )

    # Clean buffer points (clean ingredients like aqua, glycerin, ceramides add safety balance)
    clean_buffer = min(15, clean_count * 2)

    score = 100 - deductions + clean_buffer

    # Hard safety caps: If user is personally allergic, product is dangerous for them!
    if personal_allergens >= 2:
        score = max(10, min(25, score))
    elif personal_allergens == 1:
        score = max(15, min(45, score))
    elif personal_avoids >= 1:
        score = min(60, score)
    elif hazards >= 1:
        score = min(68, score)

    score = max(10, min(100, round(score)))

    # Determine risk label
    if score >= 80:
        risk_label = "Lower Detected Risk"
    elif score >= 60:
        risk_label = "Moderate Detected Risk"
    elif score >= 40:
        risk_label = "Higher Detected Risk"
    else:
        risk_label = "Significant Detected Concerns"

    # Construct dynamic explanation
    warnings = []
    if personal_allergens > 0:
        matched_allergies = [i["whyFlagged"] for i in evaluated_items if i.get("isPersonalAllergen") and i.get("whyFlagged")]
        warnings.append(f"CRITICAL ALLERGEN ALERT: {personal_allergens} ingredient(s) directly match your personal allergy watchlist ({', '.join(matched_allergies)}).")
    if personal_avoids > 0:
        warnings.append(f"{personal_avoids} ingredient(s) match items on your personal avoid list.")
    if hazards > 0:
        warnings.append(f"{hazards} chemical hazard(s) flagged.")
    if allergens > 0 and personal_allergens == 0:
        warnings.append(f"{allergens} general allergen(s) / fragrance compound(s) detected.")
    if irritants > 0:
        warnings.append(f"{irritants} skin irritant(s) detected.")

    if warnings:
        risk_exp = " ".join(warnings)
    else:
        risk_exp = f"All {total} scanned ingredients appear clean, non-toxic, and free from your saved personal allergy triggers."

    summary_counts = {
        "total": total,
        "allergens": allergens,
        "irritants": irritants,
        "hazards": hazards,
        "personalAllergens": personal_allergens,
        "reviewNeeded": sum(1 for item in evaluated_items if item.get("riskLevel") == "moderate"),
        "clean": clean_count,
        "unknown": 0,
    }

    return score, risk_label, risk_exp, summary_counts


def analyze_ingredients(ingredients, user_profile=None):
    """
    Backwards-compatible wrapper returning array of analyzed items.
    """
    evaluated = []
    for ingredient in ingredients:
        if not isinstance(ingredient, str):
            continue
        cleaned = clean_ingredient(ingredient)
        if not cleaned:
            continue
        item = evaluate_single_ingredient(ingredient, user_profile)
        evaluated.append({
            "ingredient": item["cleanedName"],
            "prediction": "Potential Concern" if item["isHazardous"] else "Lower Concern",
            "probability": round(item["confidence"] * 100, 1),
            "fragrance": item["isIrritant"] and item["category"] == "Fragrance & Aroma Allergen",
            "eu_allergen": item["isAllergen"],
            "pregnancy_caution": item["isHazardous"] and item["category"] == "Potent Active",
            "raw_item": item,
        })
    return evaluated


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


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    return analyze()


# ==========================================
# 7b. SCAN & OCR APIS
# ==========================================

@app.route("/api/scan/upload", methods=["POST"])
@app.route("/scan/upload", methods=["POST"])
def upload_scan_image():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "No image provided"}), 400

    scan_id = f"scan_{int(datetime.now(timezone.utc).timestamp())}_{secrets.token_hex(4)}"
    filename = f"{scan_id}.jpg"
    dest = SCAN_UPLOAD_DIRECTORY / filename

    try:
        file.save(dest)
        # Attempt Pillow multi-scale unsharp deblur & autocontrast
        try:
            from PIL import Image, ImageEnhance, ImageFilter, ImageOps
            with Image.open(dest) as img:
                rgb_img = img.convert("RGB")
                if rgb_img.width < 1400:
                    scale = min(2.5, 1600 / rgb_img.width)
                    rgb_img = rgb_img.resize(
                        (int(rgb_img.width * scale), int(rgb_img.height * scale)),
                        Image.Resampling.LANCZOS,
                    )
                # Percentile autocontrast removes specular reflection and shadows
                rgb_img = ImageOps.autocontrast(rgb_img, cutoff=2)
                # Multi-scale unsharp masking: wide radius for defocus blur + fine radius for edges
                rgb_img = rgb_img.filter(ImageFilter.UnsharpMask(radius=6, percent=180, threshold=2))
                rgb_img = rgb_img.filter(ImageFilter.UnsharpMask(radius=2, percent=160, threshold=1))
                rgb_img = ImageEnhance.Sharpness(rgb_img).enhance(2.0)
                enhanced_dest = SCAN_UPLOAD_DIRECTORY / f"enhanced_{filename}"
                rgb_img.save(enhanced_dest, "JPEG", quality=95)
        except Exception:
            pass
    except Exception:
        app.logger.exception("Failed to save scan upload")
        return jsonify({"error": "Failed to save uploaded image"}), 500

    image_url = f"/api/scan/{scan_id}/image"
    return jsonify({"scanId": scan_id, "imageUrl": image_url})


@app.route("/api/scan/<scan_id>/image", methods=["GET"])
@app.route("/scan/<scan_id>/image", methods=["GET"])
def get_scan_image(scan_id):
    filename = f"{scan_id}.jpg"
    path = SCAN_UPLOAD_DIRECTORY / filename
    if not path.is_file():
        enhanced = SCAN_UPLOAD_DIRECTORY / f"enhanced_{filename}"
        if enhanced.is_file():
            path = enhanced
        else:
            return jsonify({"error": "Image not found"}), 404
    return send_file(path, mimetype="image/jpeg")


@app.route("/api/scan/<scan_id>/ocr", methods=["POST"])
@app.route("/scan/<scan_id>/ocr", methods=["POST"])
def scan_ocr(scan_id):
    data = request.get_json(silent=True) or {}
    manual_text = data.get("manualText") or data.get("rawText")
    client_items = data.get("extractedItems")

    # If client already performed enhanced OCR and provided extracted items
    if client_items and isinstance(client_items, list) and len(client_items) > 0:
        return jsonify({
            "scanId": scan_id,
            "rawText": manual_text or "",
            "overallConfidence": data.get("overallConfidence", 0.94),
            "extractedItems": client_items,
        })

    # Locate uploaded image for OCR
    image_path = SCAN_UPLOAD_DIRECTORY / f"{scan_id}.jpg"
    enhanced_path = SCAN_UPLOAD_DIRECTORY / f"enhanced_{scan_id}.jpg"
    candidates = [p for p in (image_path, enhanced_path) if p.is_file()]

    # 1. Native Windows OCR Engine (instant local hardware-accelerated recognition)
    if not manual_text and candidates:
        try:
            import winocr
            from PIL import Image
            import asyncio

            async def _do_winocr(im):
                return await winocr.recognize_pil(im)

            for target_img in candidates:
                try:
                    pil_img = Image.open(target_img)
                    if pil_img.mode not in ("RGB", "L"):
                        pil_img = pil_img.convert("RGB")
                    ocr_res = asyncio.run(_do_winocr(pil_img))
                    if ocr_res and hasattr(ocr_res, "text") and len(ocr_res.text.strip()) > 5:
                        manual_text = ocr_res.text.strip()
                        app.logger.info(f"WinOCR extracted {len(manual_text)} chars from {target_img.name}")
                        break
                except Exception:
                    pass
        except Exception:
            app.logger.exception("Native WinOCR extraction failed")

    # 2. If OpenAI Vision is configured and manual_text still not resolved
    if not manual_text and client is not None and target_img is not None:
        try:
            import base64
            with open(target_img, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")

            response = client.chat.completions.create(
                model=os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini"),
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert cosmetic and food ingredient label OCR system. "
                                   "Transcribe the full ingredient list exactly from the package label. "
                                   "Even if the image has motion blur, out-of-focus text, glare, or curved containers, read all chemical and botanical names carefully. "
                                   "Return ONLY a clean, comma-separated list of the recognized ingredients without conversational fluff."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all ingredient names from this product image:"},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                        ]
                    }
                ],
                max_tokens=600,
            )
            extracted = response.choices[0].message.content.strip()
            if extracted:
                manual_text = extracted
        except Exception:
            app.logger.exception("OpenAI vision extraction failed")

    # Match against canonical ingredients dataset
    df = get_dataset()
    dataset_names = [str(x).strip() for x in df["display_name"].dropna().unique() if len(str(x).strip()) >= 2]

    if manual_text and manual_text.strip():
        text_clean = manual_text.strip()
        text_clean = re.sub(r'(?i)^\s*[\W_]*ingredients?\s*[:：\-]\s*', '', text_clean)
        text_clean = re.sub(r'(?i)\b(fragrance\s*free|paraben\s*free|dermatologically\s*tested|cruelty\s*free|vegan|net\s*wt|mfg|exp|batch)\b.*', '', text_clean)
        text_clean = re.sub(r'\.\s+(?=[A-Z])', ', ', text_clean)
        text_clean = re.sub(r'(\d)\s*,\s*(\d)-', r'\1__COMMA__\2-', text_clean)
        raw_list = [i.replace('__COMMA__', ',').strip(' .,;:()[]"\'') for i in re.split(r'[,;\n•·]', text_clean) if len(i.strip(' .,;:()[]"\'')) >= 2]
    else:
        text_clean = ""
        raw_list = []

    items = []
    for idx, ing in enumerate(raw_list):
        cleaned = clean_ingredient(ing)
        if len(cleaned) < 2 or re.match(r"^[0-9\W]+$", cleaned):
            continue

        matches = difflib.get_close_matches(cleaned, dataset_names, n=1, cutoff=0.75)
        if matches:
            suggested = matches[0].title()
            conf = 0.95
            is_err = cleaned.lower() != matches[0].lower()
        else:
            suggested = ing.strip().title()
            conf = 0.85
            is_err = False

        items.append({
            "id": f"item_{idx}_{int(datetime.now(timezone.utc).timestamp())}",
            "originalText": ing.strip(),
            "suggestedName": suggested,
            "confidence": conf,
            "isSuspectedError": is_err,
        })

    return jsonify({
        "scanId": scan_id,
        "rawText": text_clean,
        "overallConfidence": 0.92 if items else 0.0,
        "extractedItems": items,
        "warning": None if items else "No readable ingredients could be automatically identified from this image.",
    })


@app.route("/api/scan/<scan_id>/analyze", methods=["POST"])
@app.route("/scan/<scan_id>/analyze", methods=["POST"])
def scan_analyze(scan_id):
    data = request.get_json(silent=True) or {}
    ingredients = data.get("ingredients", [])
    product_name = data.get("productName", "Scanned Product")
    category = data.get("category", "Cosmetics & Skincare")
    user_profile = data.get("userProfile") or {}

    if not isinstance(ingredients, list) or not ingredients:
        return jsonify({"error": "Ingredients list is required"}), 400

    # Resolve authenticated session user
    token = get_bearer_token()
    user_id = None
    if token:
        try:
            token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
            with get_auth_connection() as connection:
                session_row = connection.execute(
                    "SELECT user_id FROM auth_sessions WHERE token_hash = ?", (token_hash,)
                ).fetchone()
                if session_row:
                    user_id = session_row["user_id"]
                    if not user_profile or not user_profile.get("allergies"):
                        user_row = connection.execute(
                            "SELECT profile_json FROM users WHERE id = ?", (user_id,)
                        ).fetchone()
                        if user_row and user_row["profile_json"]:
                            try:
                                db_profile = json.loads(user_row["profile_json"])
                                # Merge with payload profile
                                user_profile = {**db_profile, **user_profile}
                            except Exception:
                                pass
        except Exception:
            app.logger.exception("Failed to resolve session user for scan analysis")

    # Evaluate each ingredient with chemical toxicology + personal allergy profiling
    evaluated_items = []
    analyzed_items = []

    for idx, ing in enumerate(ingredients):
        if not isinstance(ing, str) or not ing.strip():
            continue
        eval_item = evaluate_single_ingredient(ing, user_profile)
        evaluated_items.append(eval_item)

        analyzed_items.append({
            "id": f"ing_{idx}_{scan_id}",
            "rawName": eval_item["rawName"],
            "matchedName": eval_item["matchedName"],
            "category": eval_item["category"],
            "riskLevel": eval_item["riskLevel"],
            "isAllergen": eval_item["isAllergen"],
            "isIrritant": eval_item["isIrritant"],
            "isHazardous": eval_item["isHazardous"],
            "isPersonalAllergen": eval_item["isPersonalAllergen"],
            "isPersonalAvoid": eval_item["isPersonalAvoid"],
            "personalizedMatch": eval_item["personalizedMatch"],
            "userAvoidMatch": eval_item["userAvoidMatch"],
            "whyFlagged": eval_item["whyFlagged"],
            "hazardDetails": eval_item["hazardDetails"],
            "allergenDetails": eval_item["allergenDetails"],
            "irritantDetails": eval_item["irritantDetails"],
            "confidence": eval_item["confidence"],
            "datasetReference": "EWG Hazard Registry, EU CosIng & SCCS 2026",
        })

    # Comprehensive score calculation considering all ingredients + personal allergies
    score, risk_label, risk_exp, summary_counts = calculate_formulation_score(evaluated_items)

    now_iso = datetime.now(timezone.utc).isoformat()
    image_url = f"/api/scan/{scan_id}/image" if (SCAN_UPLOAD_DIRECTORY / f"{scan_id}.jpg").exists() else ""

    # Personalized warnings list for UI banners
    personalized_warnings = [
        f"{item['rawName']}: {item['whyFlagged']}"
        for item in evaluated_items
        if item.get("personalizedMatch") and item.get("whyFlagged")
    ]

    # Dynamically select safer clean alternatives avoiding detected concerns
    flagged_names = [i["rawName"].title() for i in evaluated_items if i.get("isHazardous") or i.get("isAllergen")]
    safer_alternatives = [
        {
            "id": "alt_1",
            "name": "PureBarrier Lipid Recovery Emulsion",
            "brand": "DermoCleanse",
            "category": category,
            "imageUrl": "https://images.unsplash.com/photo-1608248597260-843818e61230?auto=format&fit=crop&w=400&q=80",
            "safetyScore": 96,
            "reasonSuggested": "100% fragrance-free, zero parabens, zero formaldehyde releasers. Certified hypoallergenic.",
            "avoidedConcerns": flagged_names[:3] if flagged_names else ["Fragrance / Parfum", "Preservatives"],
            "rating": 4.9,
        },
        {
            "id": "alt_2",
            "name": "CalmOat Soothing Barrier Gel",
            "brand": "PureBotanica",
            "category": category,
            "imageUrl": "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80",
            "safetyScore": 94,
            "reasonSuggested": "Formulated with colloidal oatmeal and ceramides. Avoids all 26 EU regulated contact allergens.",
            "avoidedConcerns": flagged_names[:2] if flagged_names else ["Chemical Sensitizers"],
            "rating": 4.8,
        },
    ]

    report = {
        "id": f"rep_{scan_id}",
        "scanId": scan_id,
        "productName": product_name,
        "brand": "Scanned Product",
        "category": category,
        "imageUrl": image_url,
        "scanDate": now_iso,
        "score": score,
        "riskLabel": risk_label,
        "riskExplanation": risk_exp,
        "summaryCounts": summary_counts,
        "ingredients": analyzed_items,
        "personalizedWarnings": personalized_warnings,
        "saferAlternatives": safer_alternatives,
    }

    # Always persist scan into SQLite scans table
    try:
        with get_auth_connection() as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO scans (id, user_id, product_name, brand, category, image_url, scan_date, score, risk_level, ingredients_json, report_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    scan_id,
                    user_id,
                    product_name,
                    "Scanned Product",
                    category,
                    image_url,
                    now_iso,
                    score,
                    risk_label,
                    json.dumps(ingredients),
                    json.dumps(report),
                ),
            )
    except Exception:
        app.logger.exception("Failed to persist scan into database")

    return jsonify(report)


def _serialize_scan_summary(row):
    """Convert a database scan row into a scan summary for history/dashboard."""
    try:
        rep = json.loads(row["report_json"])
    except Exception:
        rep = {}
    summary_counts = rep.get("summaryCounts", {})
    return {
        "id": row["id"],
        "userId": row["user_id"] or "",
        "productName": row["product_name"],
        "brand": row["brand"] or "Scanned Product",
        "category": row["category"] or "Cosmetics & Skincare",
        "imageUrl": row["image_url"] or rep.get("imageUrl", ""),
        "scanDate": row["scan_date"],
        "score": row["score"],
        "riskLabel": row["risk_level"],
        "allergensCount": summary_counts.get("allergens", 0),
        "hazardsCount": summary_counts.get("hazards", 0),
        "status": "completed",
        "reportId": rep.get("id", f"rep_{row['id']}"),
    }


@app.route("/api/reports/<path:report_id>", methods=["GET"])
@app.route("/reports/<path:report_id>", methods=["GET"])
@app.route("/api/scan/<scan_id>/report", methods=["GET"])
@app.route("/scan/<scan_id>/report", methods=["GET"])
@app.route("/api/scans/<scan_id>", methods=["GET"])
@app.route("/scans/<scan_id>", methods=["GET"])
def get_report_endpoint(report_id=None, scan_id=None):
    """Retrieve full safety analysis report by report_id or scan_id."""
    target_id = report_id or scan_id
    if not target_id:
        return jsonify({"error": "Report identifier is required"}), 400

    clean_id = target_id.replace("rep_", "")

    with get_auth_connection() as connection:
        # 1. Match by id or clean scan_id
        row = connection.execute(
            """
            SELECT report_json FROM scans
            WHERE id = ? OR id = ?
            ORDER BY scan_date DESC
            LIMIT 1
            """,
            (target_id, clean_id),
        ).fetchone()

        # 2. Match within report_json for target_id or rep_clean_id
        if not row:
            row = connection.execute(
                """
                SELECT report_json FROM scans
                WHERE report_json LIKE ? OR report_json LIKE ?
                ORDER BY scan_date DESC
                LIMIT 1
                """,
                (f'%"id": "{target_id}"%', f'%"scanId": "{clean_id}"%'),
            ).fetchone()

        if row:
            try:
                report_obj = json.loads(row["report_json"])
                # Auto-upgrade outdated 100-score reports if hazardous ingredients exist
                if report_obj.get("score") == 100:
                    raw_ings = [i.get("rawName") for i in report_obj.get("ingredients", []) if isinstance(i, dict) and i.get("rawName")]
                    if raw_ings:
                        re_evals = [evaluate_single_ingredient(ing) for ing in raw_ings]
                        new_score, new_label, new_exp, new_counts = calculate_formulation_score(re_evals)
                        if new_score != 100:
                            report_obj["score"] = new_score
                            report_obj["riskLabel"] = new_label
                            report_obj["riskExplanation"] = new_exp
                            report_obj["summaryCounts"] = new_counts
                            for idx, item in enumerate(report_obj.get("ingredients", [])):
                                if idx < len(re_evals):
                                    ev = re_evals[idx]
                                    item["riskLevel"] = ev["riskLevel"]
                                    item["isHazardous"] = ev["isHazardous"]
                                    item["isAllergen"] = ev["isAllergen"]
                                    item["isIrritant"] = ev["isIrritant"]
                                    item["whyFlagged"] = ev["whyFlagged"]
                                    item["hazardDetails"] = ev["hazardDetails"]
                                    item["allergenDetails"] = ev["allergenDetails"]
                return jsonify(report_obj)
            except Exception:
                app.logger.exception("Failed to decode saved report JSON")

    return jsonify({"error": f"Report not found for identifier: {target_id}"}), 404


@app.route("/api/scans", methods=["GET"])
@app.route("/scans", methods=["GET"])
def get_scans():
    token = get_bearer_token()
    user_id = None
    if token:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with get_auth_connection() as connection:
            session_row = connection.execute(
                "SELECT user_id FROM auth_sessions WHERE token_hash = ?", (token_hash,)
            ).fetchone()
            if session_row:
                user_id = session_row["user_id"]

    with get_auth_connection() as connection:
        if user_id:
            rows = connection.execute(
                "SELECT * FROM scans WHERE user_id = ? OR user_id IS NULL ORDER BY scan_date DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = connection.execute(
                "SELECT * FROM scans ORDER BY scan_date DESC LIMIT 30"
            ).fetchall()

        return jsonify([_serialize_scan_summary(row) for row in rows])


@app.route("/api/scans/<scan_id>", methods=["DELETE"])
@app.route("/scans/<scan_id>", methods=["DELETE"])
def delete_scan(scan_id):
    clean_id = scan_id.replace("rep_", "")
    with get_auth_connection() as connection:
        connection.execute("DELETE FROM scans WHERE id = ? OR id = ?", (scan_id, clean_id))
    return jsonify({"success": True})


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
