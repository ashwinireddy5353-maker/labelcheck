from flask import Flask, request, jsonify
from flask_cors import CORS

import joblib
import pandas as pd
import re


# ==========================================
# 1. CREATE FLASK APP
# ==========================================

app = Flask(__name__)
CORS(app)


# ==========================================
# 2. LOAD ML MODEL
# ==========================================

model = joblib.load(
    "model/labelcheck_name_model.pkl"
)


# ==========================================
# 3. LOAD DATASET
# ==========================================

df = pd.read_excel(
    "dataset/ingredient-flags.csv.xlsx"
)

df["display_name"] = (
    df["display_name"]
    .fillna("")
    .astype(str)
    .str.lower()
)


# ==========================================
# 4. CLEAN INGREDIENT
# ==========================================

def clean_ingredient(text):

    text = text.lower()
    text = text.strip()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    text = text.strip(
        ".,;:()[]"
    )

    return text


# ==========================================
# 5. ANALYZE INGREDIENTS
# ==========================================

def analyze_ingredients(ingredients):

    results = []

    for ingredient in ingredients:

        ingredient = clean_ingredient(
            ingredient
        )

        if ingredient == "":
            continue

        # ML prediction
        prediction = model.predict(
            [ingredient]
        )[0]

        # Probability
        probability = (
            model.predict_proba(
                [ingredient]
            )[0][1]
        )

        percentage = probability * 100

        # Dataset lookup
        match = df[
            df["display_name"] == ingredient
        ]

        # Default values
        fragrance = False
        eu_allergen = False
        pregnancy_caution = False

        if not match.empty:

            row = match.iloc[0]

            fragrance = bool(row["fragrance"] == 1)

eu_allergen = bool(row["eu_allergen"] == 1)

pregnancy_caution = bool(
    row["pregnancy_caution"] == 1
)

        # Store result
        results.append({

            "ingredient": ingredient,

            "prediction": (
                "Potential Concern"
                if prediction == 1
                else "Lower Concern"
            ),

            "probability": round(
                percentage,
                1
            ),

            "fragrance": fragrance,

            "eu_allergen": eu_allergen,

            "pregnancy_caution":
                pregnancy_caution
        })

    return results


# ==========================================
# 6. TEST ROUTE
# ==========================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "message":
            "LabelCheck backend is running!"
    })


# ==========================================
# 7. ANALYZE API
# ==========================================

@app.route(
    "/analyze",
    methods=["POST"]
)
def analyze():

    data = request.get_json()

    if not data:
        return jsonify({
            "error":
                "No JSON data received"
        }), 400

    ingredients = data.get(
        "ingredients"
    )

    if not ingredients:
        return jsonify({
            "error":
                "Ingredients are required"
        }), 400

    results = analyze_ingredients(
        ingredients
    )

    return jsonify({
        "results": results
    })


# ==========================================
# 8. RUN SERVER
# ==========================================

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )