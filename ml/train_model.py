"""
train_model.py
================
Trains a Random Forest classifier to predict habitation risk_level from
hazard_exposure, vulnerability, population, and accessibility.

USAGE:
    python train_model.py
Produces:
    risk_model.pkl        (trained RandomForestClassifier)
    label_encoders.pkl    (encoders for vulnerability/accessibility/target)
"""

import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from .category_mapper import CategoryMapper

ML_DIR = Path(__file__).resolve().parent
CSV_PATH = ML_DIR / "training_data.csv"
MODEL_PATH = ML_DIR / "risk_model.pkl"
ENCODERS_PATH = ML_DIR / "label_encoders.pkl"

# Ordinal mappings to guarantee consistent numerical encoding
VULNERABILITY_MAP = {"Low": 0, "Moderate": 1, "High": 2, "Critical": 3, "Very High": 3}
ACCESSIBILITY_MAP = {"Good": 0, "Moderate": 1, "Poor": 2}


def load_data() -> pd.DataFrame:
    if not CSV_PATH.exists():
        print(f"ERROR: {CSV_PATH} not found. Run generate_training_data.py first.")
        sys.exit(1)
    return pd.read_csv(CSV_PATH)


# class CategoryMapper:
#     """Custom wrapper to keep compatibility with ml_engine.py interface."""
#     def __init__(self, mapping: dict):
#         self.mapping = mapping
#         self.inverse = {v: k for k, v in mapping.items()}
#         self.classes_ = list(mapping.keys())

#     def transform(self, values):
#         return [self.mapping[v] for v in values]

#     def inverse_transform(self, values):
#         return [self.inverse[v] for v in values]


def encode_features(df: pd.DataFrame):
    vuln_encoder = CategoryMapper(VULNERABILITY_MAP)
    access_encoder = CategoryMapper(ACCESSIBILITY_MAP)

    target_encoder = LabelEncoder()
    # Explicitly fit target labels
    target_encoder.fit(["Low", "Moderate", "High", "Critical"])

    X = pd.DataFrame({
        "hazard_exposure": df["hazard_exposure"],
        "vulnerability": vuln_encoder.transform(df["vulnerability"]),
        "population": df["population"],
        "accessibility": access_encoder.transform(df["accessibility"]),
    })
    y = target_encoder.transform(df["risk_level"])

    encoders = {
        "vulnerability": vuln_encoder,
        "accessibility": access_encoder,
        "target": target_encoder,
    }
    return X, y, encoders


def main():
    print("Loading training data...")
    df = load_data()
    print(f"  {len(df)} records loaded")

    X, y, encoders = encode_features(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"  Train: {len(X_train)} rows | Test: {len(X_test)} rows")

    print("\nTraining RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        random_state=42,
        class_weight="balanced",  # Handles class imbalance
    )
    model.fit(X_train, y_train)

    print("\nEvaluating on held-out test set...")
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    target_names = encoders["target"].classes_

    print(f"  Accuracy: {acc:.3f}")
    print("\n  Classification report:")
    report = classification_report(y_test, y_pred, target_names=target_names, zero_division=0)
    for line in report.splitlines():
        print(f"  {line}")

    # Feature importance
    importances = dict(zip(X.columns, model.feature_importances_))
    print("\n  Feature importance:")
    for feat, imp in sorted(importances.items(), key=lambda kv: -kv[1]):
        print(f"    {feat:16s}: {imp:.3f}")

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoders, ENCODERS_PATH)
    print(f"\nSaved model -> {MODEL_PATH}")
    print(f"Saved encoders -> {ENCODERS_PATH}")


if __name__ == "__main__":
    main()