import joblib
import pandas as pd
import re

# Load trained model
model = joblib.load("model/labelcheck_name_model.pkl")

# Load ingredient information
df = pd.read_excel("dataset/ingredient-flags.csv.xlsx")

# Make ingredient names lowercase
df["display_name"] = (
    df["display_name"]
    .fillna("")
    .astype(str)
    .str.lower()
)


def clean_ingredient(text):
    text = text.lower()
    text = text.strip()

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text)

    # Remove punctuation at beginning/end
    text = text.strip(".,;:()[]")

    return text

# ==========================================
# 2. LABELCHECK
# ==========================================

print("================================")
print("       LABELCHECK REPORT")
print("================================")

ingredients = input(
    "\nEnter ingredients separated by commas:\n"
)

ingredient_list = ingredients.split(",")

potential_concerns = []
lower_concerns = []


# ==========================================
# 3. CHECK EACH INGREDIENT
# ==========================================

for ingredient in ingredient_list:

    ingredient = clean_ingredient(ingredient)

    if ingredient == "":
        continue

    # ML prediction
    prediction = model.predict([ingredient])[0]

    # Probability of Potential Concern
    probability = model.predict_proba([ingredient])[0][1]

    percentage = probability * 100

    # Find ingredient in dataset
    match = df[
        df["display_name"] == ingredient.lower()
    ]

    # Store result
    if prediction == 1:

        potential_concerns.append(
            (ingredient, percentage, match)
        )

    else:

        lower_concerns.append(
            (ingredient, percentage, match)
        )


# ==========================================
# 4. DISPLAY POTENTIAL CONCERNS
# ==========================================

print("\n================================")
print("       POTENTIAL CONCERNS")
print("================================")

if len(potential_concerns) == 0:

    print("None")

else:

    for ingredient, probability, match in potential_concerns:

        print(
            f"\n- {ingredient}"
        )

        print(
            f"  Model probability: "
            f"{probability:.1f}%"
        )

        if not match.empty:

            row = match.iloc[0]

            print(
                f"  Fragrance flag: "
                f"{'YES' if row['fragrance'] == 1 else 'NO'}"
            )

            print(
                f"  EU allergen: "
                f"{'YES' if row['eu_allergen'] == 1 else 'NO'}"
            )

            print(
                f"  Pregnancy caution: "
                f"{'YES' if row['pregnancy_caution'] == 1 else 'NO'}"
            )

        else:

            print("  Dataset information: Not found")


# ==========================================
# 5. DISPLAY LOWER CONCERNS
# ==========================================

print("\n================================")
print("       LOWER CONCERN")
print("================================")

if len(lower_concerns) == 0:

    print("None")

else:

    for ingredient, probability, match in lower_concerns:

        print(
            f"\n- {ingredient}"
        )

        print(
            f"  Model probability: "
            f"{probability:.1f}%"
        )

        if not match.empty:

            row = match.iloc[0]

            print(
                f"  Fragrance flag: "
                f"{'YES' if row['fragrance'] == 1 else 'NO'}"
            )

            print(
                f"  EU allergen: "
                f"{'YES' if row['eu_allergen'] == 1 else 'NO'}"
            )

            print(
                f"  Pregnancy caution: "
                f"{'YES' if row['pregnancy_caution'] == 1 else 'NO'}"

            )

        else:

            print("  Dataset information: Not found")


# ==========================================
# 6. COMPLETE
# ==========================================

print("\n================================")
print("       ANALYSIS COMPLETED")
print("================================")