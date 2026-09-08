"""
generate_training_data.py
==========================
Generates a synthetic training dataset for the ML risk-prediction model.

WHY SYNTHETIC:
Dementors currently has no real historical outcome data (e.g. "this
habitation was actually damaged / evacuated / not"). Real ML needs labeled
examples, so this script bootstraps a dataset using the existing rule-based
risk_engine.py formula as a *starting point*, then injects random noise so
the model learns underlying patterns instead of just memorizing the formula.

Be upfront with judges: this is synthetic/bootstrapped data, not real
historical outcomes. That is a normal, honest limitation for a hackathon
prototype and does not undermine the ML pipeline itself.

USAGE:
    python generate_training_data.py
Produces: training_data.csv (in the same ml/ folder)
"""

import csv
import random
import sys
from pathlib import Path

# Allow importing the existing backend risk_engine.py (one level up)
sys.path.append(str(Path(__file__).resolve().parent.parent))

from risk_engine import calculate_risk_score, get_risk_level, get_relocation_priority

random.seed(42)  # reproducible dataset

NUM_SAMPLES = 3000

VULNERABILITY_LEVELS = ["Low", "Moderate", "High", "Very High"]
ACCESSIBILITY_LEVELS = ["Good", "Moderate", "Poor"]


def generate_one_record():
    hazard_exposure = round(random.uniform(0, 100), 1)
    vulnerability = random.choice(VULNERABILITY_LEVELS)
    population = random.randint(100, 5000)
    accessibility = random.choice(ACCESSIBILITY_LEVELS)

    # Base label from the existing, transparent rule-based formula
    base_score = calculate_risk_score(
        hazard_exposure=hazard_exposure,
        vulnerability=vulnerability,
        population=population,
        accessibility=accessibility,
    )

    # Inject noise so the model learns a pattern, not a memorized formula.
    # +/- up to 8 points, simulating real-world variance the simple formula
    # doesn't capture (terrain quirks, local infrastructure, etc.)
    noisy_score = base_score + random.uniform(-8, 8)
    noisy_score = max(0, min(100, round(noisy_score, 2)))

    risk_level = get_risk_level(noisy_score)
    priority = get_relocation_priority(noisy_score)

    return {
        "hazard_exposure": hazard_exposure,
        "vulnerability": vulnerability,
        "population": population,
        "accessibility": accessibility,
        "risk_score": noisy_score,
        "risk_level": risk_level,
        "priority": priority,
    }


def main():
    records = [generate_one_record() for _ in range(NUM_SAMPLES)]

    out_path = Path(__file__).resolve().parent / "training_data.csv"
    fieldnames = [
        "hazard_exposure",
        "vulnerability",
        "population",
        "accessibility",
        "risk_score",
        "risk_level",
        "priority",
    ]

    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    # Quick class distribution summary for sanity-checking
    from collections import Counter
    level_counts = Counter(r["risk_level"] for r in records)

    print(f"Generated {len(records)} synthetic records -> {out_path}")
    print("Risk level distribution:")
    for level in ["Low", "Moderate", "High", "Critical"]:
        print(f"  {level:10s}: {level_counts.get(level, 0)}")


if __name__ == "__main__":
    main()
