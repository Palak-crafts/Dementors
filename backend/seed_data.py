from database import engine
from sqlalchemy.orm import Session
from models import Habitation


with Session(engine) as db:

    habitation = Habitation(
        name="Test Village",
        district="Chamoli",
        population=1000,
        households=200,
        hazard="Landslide",
        hazard_exposure=70,
        hazard_exposure_details={
            "landslide": 70
        },
        vulnerability="High",
        vulnerability_breakdown={
            "housing": 70,
            "population": 60
        },
        contributing_factors={
            "road_access": "Poor",
            "terrain": "Steep"
        },
        accessibility="Poor",
        emergency_access="Poor",
        safe_capacity=700,
        capacity_deficit=300,
        capacity_status="Deficit",
        capacity_surplus=0,
        priority="Short-Term",
        status="Active",
        is_demo=True,
        latitude=30.3165,
        longitude=79.0193,
        risk_score=75,
        risk_level="High"
    )

    db.add(habitation)
    db.commit()

    print("Habitation added successfully!")