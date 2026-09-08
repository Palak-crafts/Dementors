import sys
from pathlib import Path

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(BACKEND_DIR))
import json
import math
import time
import urllib.request
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from capacity_engine import calculate_capacity_status
from database_session import get_db
from models import Habitation, RelocationSite
from ml.ml_engine import predict_risk_ml, ml_model_available
from relocation_engine import calculate_relocation_priority
from risk_engine import calculate_risk_score, get_relocation_priority, get_risk_level
from schemas import (
    HabitationCreate,
    HabitationUpdate,
    RelocationSiteCreate,
    RelocationSiteUpdate,
)


app = FastAPI(title="SIH Disaster Management API")

# ==========================================
# CORS MIDDLEWARE
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# CACHE CONFIGURATION FOR OPEN-METEO
# ==========================================
WEATHER_CACHE = {}
CACHE_EXPIRY_SECONDS = 600  # 10 minutes cache to avoid rate limits


# ==========================================
# PRE-AUTHORIZED GOVERNMENT OFFICIALS DIRECTORY
# (Enterprise IAM / NIC Provisioned Access)
# ==========================================
OFFICIAL_USERS_DB = {
    "dg.ndma@nic.in": {
        "password": "Password@123",
        "name": "Dr. P. K. Mishra",
        "designation": "Director General, NDMA",
        "role": "national",
        "badge": "National Command",
        "district": None,
    },
    "dm.chamoli@uk.gov.in": {
        "password": "Password@123",
        "name": "Himanshu Khurana, IAS",
        "designation": "District Magistrate, Chamoli",
        "role": "chamoli",
        "badge": "District Magistrate",
        "district": "Chamoli",
    },
    "dm.darbhanga@bihar.gov.in": {
        "password": "Password@123",
        "name": "Rajiv Raushan, IAS",
        "designation": "District Magistrate, Darbhanga",
        "role": "darbhanga",
        "badge": "District Magistrate",
        "district": "Darbhanga",
    },
    "dm.wayanad@kerala.gov.in": {
        "password": "Password@123",
        "name": "Dr. Renu Raj, IAS",
        "designation": "District Magistrate, Wayanad",
        "role": "wayanad",
        "badge": "District Magistrate",
        "district": "Wayanad",
    },
}


class LoginRequest(BaseModel):
    email: str
    password: str


# ==========================================
# AUTHENTICATION ENDPOINT
# ==========================================
@app.post("/api/auth/login")
def login(creds: LoginRequest):
    email_clean = creds.email.strip().lower()
    user = OFFICIAL_USERS_DB.get(email_clean)

    if not user or user["password"] != creds.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid government credentials or unauthorized access key.",
        )

    return {
        "status": "success",
        "access_token": f"dss_secure_token_{user['role']}_2026",
        "user": {
            "name": user["name"],
            "email": email_clean,
            "designation": user["designation"],
            "role": user["role"],
            "badge": user["badge"],
            "district": user["district"],
        },
    }


# ==========================================
# SPATIAL HAVERSINE DISTANCE HELPER
# ==========================================
def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two coordinate pairs in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


# ==========================================
# HOME ENDPOINT
# ==========================================
@app.get("/")
def home():
    return {
        "message": "SIH Backend is Working!",
        "database": "PostgreSQL",
    }


# ==========================================
# HABITATIONS CRUD & DYNAMIC FILTERING
# ==========================================
@app.get("/api/habitations")
def get_habitations(
    district: Optional[str] = Query(None),
    hazard: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Habitation)
    
    if district and district != "All Districts":
        query = query.filter(Habitation.district == district)
    if hazard and hazard != "All Hazards":
        query = query.filter(Habitation.hazard == hazard)
    if risk_level and risk_level != "All Levels":
        query = query.filter(Habitation.risk_level == risk_level)
        
    return query.all()


@app.get("/api/habitations/{habitation_id}")
def get_habitation(habitation_id: int, db: Session = Depends(get_db)):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if habitation is None:
        return {"error": "Habitation not found"}
    return habitation


@app.post("/api/habitations")
def create_habitation(habitation_data: HabitationCreate, db: Session = Depends(get_db)):
    risk_score = calculate_risk_score(
        hazard_exposure=habitation_data.hazard_exposure,
        vulnerability=habitation_data.vulnerability,
        population=habitation_data.population,
        accessibility=habitation_data.accessibility,
    )
    risk_level = get_risk_level(risk_score)
    priority = get_relocation_priority(risk_score)

    capacity_result = calculate_capacity_status(
        population=habitation_data.population,
        safe_capacity=habitation_data.safe_capacity,
    )

    new_habitation = Habitation(
        name=habitation_data.name,
        district=habitation_data.district,
        population=habitation_data.population,
        households=habitation_data.households,
        hazard=habitation_data.hazard,
        hazard_exposure=habitation_data.hazard_exposure,
        vulnerability=habitation_data.vulnerability,
        accessibility=habitation_data.accessibility,
        emergency_access=habitation_data.emergency_access,
        safe_capacity=habitation_data.safe_capacity,
        latitude=habitation_data.latitude,
        longitude=habitation_data.longitude,
        risk_score=risk_score,
        risk_level=risk_level,
        priority=priority,
        capacity_deficit=capacity_result["capacity_deficit"],
        capacity_surplus=capacity_result["capacity_surplus"],
        capacity_status=capacity_result["capacity_status"],
    )

    db.add(new_habitation)
    db.commit()
    db.refresh(new_habitation)
    return new_habitation


@app.put("/api/habitations/{habitation_id}")
def update_habitation(
    habitation_id: int,
    habitation_data: HabitationUpdate,
    db: Session = Depends(get_db),
):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if habitation is None:
        return {"error": "Habitation not found"}

    habitation.name = habitation_data.name
    habitation.district = habitation_data.district
    habitation.population = habitation_data.population
    habitation.households = habitation_data.households
    habitation.hazard = habitation_data.hazard
    habitation.hazard_exposure = habitation_data.hazard_exposure
    habitation.vulnerability = habitation_data.vulnerability
    habitation.accessibility = habitation_data.accessibility
    habitation.emergency_access = habitation_data.emergency_access
    habitation.safe_capacity = habitation_data.safe_capacity
    habitation.latitude = habitation_data.latitude
    habitation.longitude = habitation_data.longitude

    risk_score = calculate_risk_score(
        hazard_exposure=habitation_data.hazard_exposure,
        vulnerability=habitation_data.vulnerability,
        population=habitation_data.population,
        accessibility=habitation_data.accessibility,
    )

    capacity_result = calculate_capacity_status(
        population=habitation_data.population,
        safe_capacity=habitation_data.safe_capacity,
    )

    habitation.risk_score = risk_score
    habitation.risk_level = get_risk_level(risk_score)
    habitation.priority = get_relocation_priority(risk_score)
    habitation.capacity_deficit = capacity_result["capacity_deficit"]
    habitation.capacity_surplus = capacity_result["capacity_surplus"]
    habitation.capacity_status = capacity_result["capacity_status"]

    db.commit()
    db.refresh(habitation)
    return habitation


@app.delete("/api/habitations/{habitation_id}")
def delete_habitation(habitation_id: int, db: Session = Depends(get_db)):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if habitation is None:
        return {"error": "Habitation not found"}

    db.delete(habitation)
    db.commit()
    return {"message": "Habitation deleted successfully", "id": habitation_id}


# ==========================================
# ML RISK PREDICTION
# ==========================================

class MLRiskPredictionRequest(BaseModel):
    hazard_exposure: float
    vulnerability: str
    population: int
    accessibility: str


@app.post("/api/ml/predict-risk")
def predict_risk_with_ml(data: MLRiskPredictionRequest):
    if not ml_model_available():
        raise HTTPException(
            status_code=503,
            detail="ML model is not available."
        )

    try:
        result = predict_risk_ml(
            hazard_exposure=data.hazard_exposure,
            vulnerability=data.vulnerability,
            population=data.population,
            accessibility=data.accessibility,
        )

        return {
            "status": "success",
            "prediction": result,
        }

    except RuntimeError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"ML prediction failed: {str(exc)}",
        )
# ==========================================
# RELOCATION SITES CRUD
# ==========================================
@app.get("/api/relocation-sites")
def get_relocation_sites(db: Session = Depends(get_db)):
    return db.query(RelocationSite).all()


@app.get("/api/relocation-sites/{site_id}")
def get_relocation_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if site is None:
        return {"error": "Relocation site not found"}
    return site


@app.post("/api/relocation-sites")
def create_relocation_site(site_data: RelocationSiteCreate, db: Session = Depends(get_db)):
    available = max(0, site_data.capacity - site_data.occupancy)

    new_site = RelocationSite(
        name=site_data.name,
        district=site_data.district,
        capacity=site_data.capacity,
        occupancy=site_data.occupancy,
        available=available,
        accessibility=site_data.accessibility,
        distance=site_data.distance,
        infrastructure=site_data.infrastructure,
        suitability=site_data.suitability,
        status=site_data.status,
        latitude=site_data.latitude,
        longitude=site_data.longitude,
    )

    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    return new_site


@app.put("/api/relocation-sites/{site_id}")
def update_relocation_site(
    site_id: int, site_data: RelocationSiteUpdate, db: Session = Depends(get_db)
):
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if site is None:
        return {"error": "Relocation site not found"}

    available = max(0, site_data.capacity - site_data.occupancy)

    site.name = site_data.name
    site.district = site_data.district
    site.capacity = site_data.capacity
    site.occupancy = site_data.occupancy
    site.available = available
    site.accessibility = site_data.accessibility
    site.distance = site_data.distance
    site.infrastructure = site_data.infrastructure
    site.suitability = site_data.suitability
    site.status = site_data.status
    site.latitude = site_data.latitude
    site.longitude = site_data.longitude

    db.commit()
    db.refresh(site)
    return site


@app.delete("/api/relocation-sites/{site_id}")
def delete_relocation_site(site_id: int, db: Session = Depends(get_db)):
    site = db.query(RelocationSite).filter(RelocationSite.id == site_id).first()
    if site is None:
        return {"error": "Relocation site not found"}

    db.delete(site)
    db.commit()
    return {"message": "Relocation site deleted successfully", "id": site_id}


# ==========================================
# RELOCATION PRIORITY QUEUE
# ==========================================
@app.get("/api/relocation-priority")
def get_relocation_priority_list(db: Session = Depends(get_db)):
    habitations = db.query(Habitation).all()
    results = []

    for habitation in habitations:
        result = calculate_relocation_priority(
            risk_score=habitation.risk_score,
            capacity_deficit=habitation.capacity_deficit,
            accessibility=habitation.accessibility,
        )

        results.append({
            "habitation_id": habitation.id,
            "habitation_name": habitation.name,
            "district": habitation.district,
            "risk_score": habitation.risk_score,
            "capacity_deficit": habitation.capacity_deficit,
            "accessibility": habitation.accessibility,
            "priority_score": result["priority_score"],
            "priority": result["priority"],
        })

    results.sort(key=lambda x: x["priority_score"], reverse=True)
    return results


# ==========================================
# BEST SHELTER ALLOCATION (HAVERSINE ALGORITHM)
# ==========================================
@app.get("/api/relocation-sites/best/{habitation_id}")
def get_best_relocation_site(habitation_id: int, db: Session = Depends(get_db)):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if habitation is None:
        return {"error": "Habitation not found"}

    sites = db.query(RelocationSite).filter(
        RelocationSite.status == "Active",
        RelocationSite.available > 0
    ).all()

    if len(sites) == 0:
        return {"error": "No available relocation sites found"}

    site_results = []
    for site in sites:
        real_distance = calculate_haversine_distance(
            float(habitation.latitude), float(habitation.longitude),
            float(site.latitude), float(site.longitude)
        )

        district_bonus = 15.0 if str(site.district).strip().lower() == str(habitation.district).strip().lower() else 0.0

        suit = float(site.suitability or 7.0)
        if suit > 10.0:
            suit = suit / 10.0

        proximity_score = max(0.0, 45.0 - (real_distance * 0.12))
        cap_score = min(25.0, (site.available / max(1, habitation.population)) * 25.0)
        suit_score = (suit / 10.0) * 15.0
        acc_score = 10.0 if site.accessibility == "Good" else 5.0

        final_score = round(proximity_score + cap_score + suit_score + acc_score + district_bonus, 1)

        site_results.append({
            "site_id": site.id,
            "site_name": site.name,
            "district": site.district,
            "available": site.available,
            "capacity": site.capacity,
            "occupancy": site.occupancy,
            "accessibility": site.accessibility,
            "distance": real_distance,
            "suitability": suit,
            "site_score": min(100.0, final_score),
            "latitude": float(site.latitude),
            "longitude": float(site.longitude)
        })

    site_results.sort(key=lambda x: x["site_score"], reverse=True)
    best_site = site_results[0]

    return {
        "habitation_id": habitation.id,
        "habitation_name": habitation.name,
        "district": habitation.district,
        "population": habitation.population,
        "risk_score": habitation.risk_score,
        "priority": habitation.priority,
        "recommended_site": best_site,
        "all_sites": site_results
    }


# ==========================================
# GIS GEOJSON EXPORTS WITH DYNAMIC FILTERING
# ==========================================
@app.get("/api/gis/habitations")
def get_gis_habitations(
    district: Optional[str] = Query(None),
    hazard: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Habitation)
    if district and district != "All Districts":
        query = query.filter(Habitation.district == district)
    if hazard and hazard != "All Hazards":
        query = query.filter(Habitation.hazard == hazard)
    if risk_level and risk_level != "All Levels":
        query = query.filter(Habitation.risk_level == risk_level)

    habitations = query.all()
    features = []

    for habitation in habitations:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(habitation.longitude), float(habitation.latitude)],
            },
            "properties": {
                "id": habitation.id,
                "name": habitation.name,
                "district": habitation.district,
                "population": habitation.population,
                "households": habitation.households,
                "hazard": habitation.hazard,
                "risk_score": habitation.risk_score,
                "risk_level": habitation.risk_level,
                "vulnerability": habitation.vulnerability,
                "accessibility": habitation.accessibility,
                "capacity_deficit": habitation.capacity_deficit,
                "capacity_status": habitation.capacity_status,
                "priority": habitation.priority,
                "status": habitation.status,
            },
        }
        features.append(feature)

    return {"type": "FeatureCollection", "features": features}


@app.get("/api/gis/relocation-sites")
def get_gis_relocation_sites(db: Session = Depends(get_db)):
    sites = db.query(RelocationSite).all()
    features = []

    for site in sites:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(site.longitude), float(site.latitude)],
            },
            "properties": {
                "id": site.id,
                "name": site.name,
                "district": site.district,
                "capacity": site.capacity,
                "occupancy": site.occupancy,
                "available": site.available,
                "accessibility": site.accessibility,
                "distance": site.distance,
                "suitability": site.suitability,
                "status": site.status,
            },
        }
        features.append(feature)

    return {"type": "FeatureCollection", "features": features}


# ==========================================
# ANALYTICS SUMMARY
# ==========================================
@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    habitations = db.query(Habitation).all()
    relocation_sites = db.query(RelocationSite).all()

    total_habitations = len(habitations)
    total_population = sum(h.population for h in habitations)

    critical = sum(1 for h in habitations if h.risk_level == "Critical")
    high = sum(1 for h in habitations if h.risk_level == "High")
    moderate = sum(1 for h in habitations if h.risk_level == "Moderate")
    low = sum(1 for h in habitations if h.risk_level == "Low")

    population_at_risk = sum(
        h.population for h in habitations if h.risk_level in ["Critical", "High"]
    )
    total_capacity_deficit = sum(h.capacity_deficit for h in habitations)

    immediate_relocation = sum(1 for h in habitations if h.priority == "Immediate")
    short_term_relocation = sum(1 for h in habitations if h.priority == "Short-Term")
    medium_term_relocation = sum(1 for h in habitations if h.priority == "Medium-Term")
    monitor = sum(1 for h in habitations if h.priority == "Monitor")

    total_site_capacity = sum(s.capacity for s in relocation_sites)
    occupied_site_capacity = sum(s.occupancy for s in relocation_sites)
    available_site_capacity = sum(s.available for s in relocation_sites)

    hazard_distribution = {}
    for h in habitations:
        hazard = h.hazard or "Unknown"
        hazard_distribution[hazard] = hazard_distribution.get(hazard, 0) + 1

    return {
        "summary": {
            "total_habitations": total_habitations,
            "total_population": total_population,
            "population_at_risk": population_at_risk,
            "critical_red_zones": critical,
            "capacity_deficit": total_capacity_deficit,
            "immediate_relocation": immediate_relocation,
        },
        "risk_distribution": {
            "Critical": critical,
            "High": high,
            "Moderate": moderate,
            "Low": low,
        },
        "relocation_distribution": {
            "Immediate": immediate_relocation,
            "Short-Term": short_term_relocation,
            "Medium-Term": medium_term_relocation,
            "Monitor": monitor,
        },
        "hazard_distribution": hazard_distribution,
        "relocation_capacity": {
            "total_capacity": total_site_capacity,
            "occupied": occupied_site_capacity,
            "available": available_site_capacity,
            "sites": len(relocation_sites),
        },
    }


# ==========================================
# REAL-TIME LIVE WEATHER API (Open-Meteo)
# ==========================================
@app.get("/api/weather/live/{habitation_id}")
def get_live_weather(habitation_id: int, db: Session = Depends(get_db)):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if not habitation:
        return {"error": "Habitation not found"}

    now = time.time()
    cache_key = f"{habitation.latitude}_{habitation.longitude}"

    if cache_key in WEATHER_CACHE:
        cached_data, timestamp = WEATHER_CACHE[cache_key]
        if now - timestamp < CACHE_EXPIRY_SECONDS:
            return {
                "habitation_name": habitation.name,
                "cached": True,
                **cached_data,
            }

    url = (
        f"https://api.open-meteo.com/v1/forecast?latitude={habitation.latitude}&longitude={habitation.longitude}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m"
    )

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SIH-Disaster-DSS/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            current = data.get("current", {})

            weather_payload = {
                "temperature": current.get("temperature_2m", 25.0),
                "humidity": current.get("relative_humidity_2m", 70),
                "rainfall_mm": current.get("rain", 0.0),
                "precipitation": current.get("precipitation", 0.0),
                "wind_speed_kmh": current.get("wind_speed_10m", 10.0),
                "source": "Open-Meteo Live API",
            }
            WEATHER_CACHE[cache_key] = (weather_payload, now)

            return {
                "habitation_name": habitation.name,
                "cached": False,
                **weather_payload,
            }
    except Exception:
        return {
            "habitation_name": habitation.name,
            "error": "External weather API unreachable",
            "fallback": True,
            "rainfall_mm": 0.0,
            "temperature": 24.0,
            "wind_speed_kmh": 10.0,
        }


# ==========================================
# LIVE USGS SEISMIC & DISASTER TELEMETRY API
# ==========================================
@app.get("/api/disaster/live-feed/{habitation_id}")
def get_live_disaster_telemetry(habitation_id: int, db: Session = Depends(get_db)):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if not habitation:
        return {"error": "Habitation not found"}

    usgs_url = (
        f"https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&"
        f"latitude={habitation.latitude}&longitude={habitation.longitude}&maxradiuskm=300&limit=1"
    )

    seismic_data = {"recent_earthquake_detected": False, "magnitude": 0.0, "place": "None"}
    
    try:
        req = urllib.request.Request(usgs_url, headers={"User-Agent": "SIH-Disaster-DSS/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            features = data.get("features", [])
            if features:
                props = features[0].get("properties", {})
                seismic_data = {
                    "recent_earthquake_detected": True,
                    "magnitude": props.get("mag", 0.0),
                    "place": props.get("place", "Nearby Region"),
                    "time": props.get("time"),
                }
    except Exception:
        seismic_data = {"status": "USGS Seismic feed currently syncing via local proxy"}

    return {
        "habitation_name": habitation.name,
        "district": habitation.district,
        "coordinates": [float(habitation.latitude), float(habitation.longitude)],
        "live_seismic_telemetry": seismic_data,
        "data_source": "USGS Live Global Seismic Network & Open-Meteo Telemetry"
    }


# ==========================================
# DISASTER SURGE SIMULATION
# ==========================================
@app.post("/api/disaster/simulate")
def simulate_disaster_event(
    habitation_id: int, hazard_surge: float = 30.0, db: Session = Depends(get_db)
):
    habitation = db.query(Habitation).filter(Habitation.id == habitation_id).first()
    if not habitation:
        return {"error": "Habitation not found"}

    new_exposure = min(100.0, habitation.hazard_exposure + hazard_surge)
    habitation.hazard_exposure = new_exposure

    risk_score = calculate_risk_score(
        hazard_exposure=new_exposure,
        vulnerability=habitation.vulnerability,
        population=habitation.population,
        accessibility=habitation.accessibility,
    )
    risk_level = get_risk_level(risk_score)
    priority = get_relocation_priority(risk_score)

    habitation.risk_score = risk_score
    habitation.risk_level = risk_level
    habitation.priority = priority

    db.commit()
    db.refresh(habitation)

    return {
        "status": "Event Simulated Successfully",
        "habitation_name": habitation.name,
        "new_hazard_exposure": new_exposure,
        "new_risk_score": risk_score,
        "new_risk_level": risk_level,
        "new_relocation_priority": priority,
    }