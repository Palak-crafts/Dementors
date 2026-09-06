from risk_engine import (
    calculate_risk_score,
    get_risk_level,
    get_relocation_priority
)


score = calculate_risk_score(
    hazard_exposure=80,
    vulnerability="High",
    population=1200,
    accessibility="Poor"
)

level = get_risk_level(score)

priority = get_relocation_priority(score)

print("Risk Score:", score)
print("Risk Level:", level)
print("Relocation Priority:", priority)