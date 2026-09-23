import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score
from sklearn.metrics import classification_report


# ==========================================
# 1. LOAD DATASET
# ==========================================

df = pd.read_excel("dataset/ingredient-flags.csv.xlsx")

print("Dataset loaded!")
print("Total ingredients:", len(df))


# ==========================================
# 2. CREATE TARGET
# ==========================================

df["potential_concern"] = (
    (df["fragrance"] == 1)
    | (df["eu_allergen"] == 1)
    | (df["pregnancy_caution"] == 1)
).astype(int)


print("\nTarget distribution:")
print(df["potential_concern"].value_counts())


# ==========================================
# 3. CREATE INPUT TEXT
# ==========================================

df["text"] = df["display_name"].fillna("").astype(str)


print("\nExample input:")
print(df["text"].head())


# ==========================================
# 4. INPUT AND OUTPUT
# ==========================================

X = df["text"]
y = df["potential_concern"]


# ==========================================
# 5. SPLIT DATA
# ==========================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


print("\nTraining samples:", len(X_train))
print("Testing samples:", len(X_test))


# ==========================================
# 6. CREATE ML MODEL
# ==========================================

model = Pipeline([
    
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 2)
    )),
    
    ("classifier", LogisticRegression(
        max_iter=1000,
        class_weight="balanced"
    ))
])


# ==========================================
# 7. TRAIN MODEL
# ==========================================

print("\nTraining model...")

model.fit(X_train, y_train)

print("Training completed!")


# ==========================================
# 8. TEST MODEL
# ==========================================

y_pred = model.predict(X_test)


# ==========================================
# 9. ACCURACY
# ==========================================

accuracy = accuracy_score(y_test, y_pred)

print("\n================================")
print("MODEL RESULTS")
print("================================")

print("Accuracy:", accuracy)


# ==========================================
# 10. DETAILED REPORT
# ==========================================

print("\nClassification Report:")

print(
    classification_report(
        y_test,
        y_pred,
        target_names=[
            "Lower Concern",
            "Potential Concern"
        ]
    )
)

import joblib
import os

# Create model folder if it doesn't exist
os.makedirs("model", exist_ok=True)

joblib.dump(
    model,
    "model/labelcheck_name_model.pkl"
)

print("\nModel saved successfully!")