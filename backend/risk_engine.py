def calculate_risk_score(
    hazard_exposure,
    vulnerability,
    population,
    accessibility
):
    vulnerability_map = {
        "Low": 25,
        "Moderate": 50,
        "High": 75,
        "Very High": 95
    }

    accessibility_map = {
        "Good": 20,
        "Moderate": 50,
        "Poor": 85
    }

    vulnerability_score = vulnerability_map.get(vulnerability, 50)

    accessibility_score = accessibility_map.get(accessibility, 50)

    population_exposure = min(100, (population / 5000) * 100)

    risk_score = (
        hazard_exposure * 0.35
        + vulnerability_score * 0.30
        + population_exposure * 0.20
        + accessibility_score * 0.15
    )

    return round(min(100, risk_score), 2)

def get_risk_level(risk_score):
    if risk_score >= 80:
        return "Critical"
    elif risk_score >= 60:
        return "High"
    elif risk_score >= 40:
        return "Moderate"
    else:
        return "Low"

def get_relocation_priority(risk_score):
    if risk_score >= 80:
        return "Immediate"
    elif risk_score >= 60:
        return "Short-Term"
    elif risk_score >= 40:
        return "Medium-Term"
    else:
        return "Monitor"