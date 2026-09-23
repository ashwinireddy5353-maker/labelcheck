import pandas as pd

df = pd.read_excel("dataset/ingredient-flags.csv.xlsx")

# Create a new target
df["potential_concern"] = (
    (df["fragrance"] == 1)
    | (df["eu_allergen"] == 1)
    | (df["pregnancy_caution"] == 1)
).astype(int)

print("Potential concern:")
print(df["potential_concern"].value_counts())

print("\nPercentage:")
print(df["potential_concern"].value_counts(normalize=True) * 100)