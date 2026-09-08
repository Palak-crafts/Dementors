"""
ml_engine.py
=============
Loads the trained risk_model.pkl once at import time and exposes
predict_risk_ml() for use from main.py.

Kept deliberately separate from risk_engine.py: risk_engine.py is the
transparent, rule-based baseline; this module is the learned model. Both
run independently so a habitation's rule-based score is never overwritten
by the ML prediction -- they are shown side by side.
"""

from pathlib import Path
import joblib
import pandas as pd
from .category_mapper import CategoryMapper

ML_DIR = Path(__file__).resolve().parent
MODEL_PATH = ML_DIR / "risk_model.pkl"
ENCODERS_PATH = ML_DIR / "label_encoders.pkl"

_model = None
_encoders = None
_load_error = None


def _load():
    """Load model + encoders once. Any failure is captured, not raised,
    so a missing/corrupt model file degrades gracefully instead of
    crashing the whole backend on startup."""
    global _model, _encoders, _load_error
    try:
        _model = joblib.load(MODEL_PATH)
        _encoders = joblib.load(ENCODERS_PATH)
    except Exception as exc:  # noqa: BLE001 -- intentional broad catch
        _load_error = str(exc)


_load()


def ml_model_available() -> bool:
    return _model is not None and _encoders is not None


def predict_risk_ml(
    hazard_exposure: float,
    vulnerability: str,
    population: int,
    accessibility: str,
) -> dict:
    """Returns the ML-predicted risk level + per-class confidence.

    Raises a clear RuntimeError (caught by the caller in main.py) if the
    model failed to load, or if an unseen category is passed in.
    """
    if not ml_model_available():
        raise RuntimeError(
            f"ML model not available: {_load_error or 'unknown load error'}"
        )

    vuln_encoder = _encoders["vulnerability"]
    access_encoder = _encoders["accessibility"]
    target_encoder = _encoders["target"]

    if vulnerability not in vuln_encoder.classes_:
        raise RuntimeError(f"Unknown vulnerability value: {vulnerability!r}")
    if accessibility not in access_encoder.classes_:
        raise RuntimeError(f"Unknown accessibility value: {accessibility!r}")

    # Extract scalar int values from label encoder outputs
    vuln_encoded = int(vuln_encoder.transform([vulnerability])[0])
    access_encoded = int(access_encoder.transform([accessibility])[0])

    X = pd.DataFrame(
        {
            "hazard_exposure": [hazard_exposure],
            "vulnerability": [vuln_encoded],
            "population": [population],
            "accessibility": [access_encoded],
        }
    )

    predicted_idx = _model.predict(X)[0]
    predicted_label = str(
        target_encoder.inverse_transform([predicted_idx])[0]
    )

    probabilities = _model.predict_proba(X)[0]
    confidence_by_class = {
        str(cls): round(float(prob), 3)
        for cls, prob in zip(target_encoder.classes_, probabilities)
    }

    return {
        "predicted_risk_level": predicted_label,
        "confidence": confidence_by_class[predicted_label],
        "confidence_by_class": confidence_by_class,
        "model": "RandomForestClassifier",
        "note": "Trained on synthetic/bootstrapped data -- see project docs.",
    }