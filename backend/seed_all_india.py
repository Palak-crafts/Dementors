from database_session import get_db
from models import Habitation, RelocationSite
from risk_engine import calculate_risk_score, get_risk_level, get_relocation_priority
from capacity_engine import calculate_capacity_status

# =========================================================================
# ALL-INDIA HABITATIONS (Multi-Hazard Vulnerability Dataset)
# =========================================================================
ALL_INDIA_HABITATIONS = [
    # 1. Uttarakhand - Landslide / Subsidence
    {
        "name": "Sunil Upper Ward (Joshimath)",
        "district": "Chamoli",
        "population": 1420,
        "households": 290,
        "hazard": "Landslide",
        "hazard_exposure": 92.0,
        "vulnerability": "Very High",
        "accessibility": "Poor",
        "emergency_access": "Poor",
        "safe_capacity": 400,
        "latitude": 30.5574,
        "longitude": 79.5658,
    },
    # 2. Assam - Riverine Flooding & Erosion
    {
        "name": "Salmora Riverbank",
        "district": "Majuli",
        "population": 2850,
        "households": 540,
        "hazard": "Flood",
        "hazard_exposure": 88.0,
        "vulnerability": "High",
        "accessibility": "Poor",
        "emergency_access": "Moderate",
        "safe_capacity": 900,
        "latitude": 26.8521,
        "longitude": 94.2155,
    },
    # 3. Odisha - Severe Cyclone / Storm Surge
    {
        "name": "Astaranga Coastal Hamlet",
        "district": "Puri",
        "population": 3600,
        "households": 720,
        "hazard": "Cyclone",
        "hazard_exposure": 85.0,
        "vulnerability": "High",
        "accessibility": "Moderate",
        "emergency_access": "Good",
        "safe_capacity": 1800,
        "latitude": 19.9822,
        "longitude": 86.2654,
    },
    # 4. Himachal Pradesh - Flash Flood & Landslide
    {
        "name": "Pandoh Low-lying Basin",
        "district": "Mandi",
        "population": 1150,
        "households": 230,
        "hazard": "Cloudburst",
        "hazard_exposure": 79.0,
        "vulnerability": "High",
        "accessibility": "Moderate",
        "emergency_access": "Moderate",
        "safe_capacity": 350,
        "latitude": 31.6705,
        "longitude": 77.0426,
    },
    # 5. Bihar - Annual River Overflow
    {
        "name": "Kusheshwar Asthan East",
        "district": "Darbhanga",
        "population": 4200,
        "households": 810,
        "hazard": "Flood",
        "hazard_exposure": 91.0,
        "vulnerability": "Very High",
        "accessibility": "Poor",
        "emergency_access": "Poor",
        "safe_capacity": 1200,
        "latitude": 25.8234,
        "longitude": 86.1342,
    },
    # 6. Kerala - Western Ghats Debris Flow
    {
        "name": "Meppadi Hill Slopes",
        "district": "Wayanad",
        "population": 1890,
        "households": 380,
        "hazard": "Landslide",
        "hazard_exposure": 84.0,
        "vulnerability": "High",
        "accessibility": "Moderate",
        "emergency_access": "Moderate",
        "safe_capacity": 600,
        "latitude": 11.5512,
        "longitude": 76.1264,
    },
    # 7. West Bengal - Coastal Tidal Inundation
    {
        "name": "Ghoramara Island West",
        "district": "South 24 Parganas",
        "population": 2100,
        "households": 420,
        "hazard": "Sea Inundation",
        "hazard_exposure": 95.0,
        "vulnerability": "Very High",
        "accessibility": "Poor",
        "emergency_access": "Poor",
        "safe_capacity": 450,
        "latitude": 21.9167,
        "longitude": 88.1333,
    },
    # 8. Gujarat - Seismic Zone V
    {
        "name": "Anjar Rural Cluster",
        "district": "Kutch",
        "population": 3100,
        "households": 600,
        "hazard": "Earthquake",
        "hazard_exposure": 74.0,
        "vulnerability": "Moderate",
        "accessibility": "Good",
        "emergency_access": "Good",
        "safe_capacity": 2200,
        "latitude": 23.1147,
        "longitude": 70.0278,
    }
]

# =========================================================================
# ALL-INDIA RELOCATION SHELTERS & RELIEF CENTERS
# =========================================================================
ALL_INDIA_SITES = [
    {
        "name": "Pipalkoti Elevated Multi-Purpose Relief Complex",
        "district": "Chamoli",
        "capacity": 2500,
        "occupancy": 350,
        "accessibility": "Good",
        "distance": 14.8,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 9.2,
        "status": "Active",
        "latitude": 30.4312,
        "longitude": 79.4321,
    },
    {
        "name": "Garamur Central High Ground Shelter",
        "district": "Majuli",
        "capacity": 3200,
        "occupancy": 600,
        "accessibility": "Good",
        "distance": 9.2,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 8.7,
        "status": "Active",
        "latitude": 26.9614,
        "longitude": 94.1978,
    },
    {
        "name": "Kalinga Multi-Hazard Cyclone Shelter Center",
        "district": "Puri",
        "capacity": 4500,
        "occupancy": 800,
        "accessibility": "Good",
        "distance": 6.5,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 9.5,
        "status": "Active",
        "latitude": 19.8912,
        "longitude": 86.0945,
    },
    {
        "name": "Mandi Polytechnic Campus Evacuation Ground",
        "district": "Mandi",
        "capacity": 1800,
        "occupancy": 200,
        "accessibility": "Good",
        "distance": 11.0,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 8.9,
        "status": "Active",
        "latitude": 31.7084,
        "longitude": 76.9318,
    },
    {
        "name": "Darbhanga Stadium Disaster Relief Camp",
        "district": "Darbhanga",
        "capacity": 5000,
        "occupancy": 1100,
        "accessibility": "Good",
        "distance": 18.2,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 8.4,
        "status": "Active",
        "latitude": 26.1542,
        "longitude": 85.8918,
    },
    {
        "name": "Kalpetta Civil Defense Shelter Ground",
        "district": "Wayanad",
        "capacity": 2200,
        "occupancy": 400,
        "accessibility": "Good",
        "distance": 13.4,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 9.0,
        "status": "Active",
        "latitude": 11.6103,
        "longitude": 76.0828,
    },
    {
        "name": "Kakdwip Solid Cyclone Shelter",
        "district": "South 24 Parganas",
        "capacity": 3000,
        "occupancy": 550,
        "accessibility": "Good",
        "distance": 15.6,
        "infrastructure": {"water": True, "power": True, "medical": True},
        "suitability": 8.8,
        "status": "Active",
        "latitude": 21.8764,
        "longitude": 88.1884,
    }
]


def seed_database():
    db = next(get_db())
    try:
        print(" Seeding All-India Multi-Hazard Dataset into PostgreSQL...")

        # 1. Seed Habitations
        for item in ALL_INDIA_HABITATIONS:
            exists = db.query(Habitation).filter(Habitation.name == item["name"]).first()
            if not exists:
                risk_score = calculate_risk_score(
                    hazard_exposure=item["hazard_exposure"],
                    vulnerability=item["vulnerability"],
                    population=item["population"],
                    accessibility=item["accessibility"],
                )
                risk_level = get_risk_level(risk_score)
                priority = get_relocation_priority(risk_score)

                cap_res = calculate_capacity_status(
                    population=item["population"],
                    safe_capacity=item["safe_capacity"],
                )

                hab = Habitation(
                    name=item["name"],
                    district=item["district"],
                    population=item["population"],
                    households=item["households"],
                    hazard=item["hazard"],
                    hazard_exposure=item["hazard_exposure"],
                    vulnerability=item["vulnerability"],
                    accessibility=item["accessibility"],
                    emergency_access=item["emergency_access"],
                    safe_capacity=item["safe_capacity"],
                    capacity_deficit=cap_res["capacity_deficit"],
                    capacity_surplus=cap_res["capacity_surplus"],
                    capacity_status=cap_res["capacity_status"],
                    priority=priority,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    status="Active",
                )
                db.add(hab)
                print(f" -> Added Habitation: {hab.name} [{hab.hazard} in {hab.district}] - Risk: {risk_score:.1f}")

        # 2. Seed Relocation Shelters
        for s in ALL_INDIA_SITES:
            exists = db.query(RelocationSite).filter(RelocationSite.name == s["name"]).first()
            if not exists:
                avail = max(0, s["capacity"] - s["occupancy"])
                site = RelocationSite(
                    name=s["name"],
                    district=s["district"],
                    capacity=s["capacity"],
                    occupancy=s["occupancy"],
                    available=avail,
                    accessibility=s["accessibility"],
                    distance=s["distance"],
                    infrastructure=s["infrastructure"],
                    suitability=s["suitability"],
                    status=s["status"],
                    latitude=s["latitude"],
                    longitude=s["longitude"],
                )
                db.add(site)
                print(f" -> Added Relocation Shelter: {site.name} ({site.district}) - Available: {avail}")

        db.commit()
        print("\n All-India data seeded successfully! All engines recalculated.")
    except Exception as e:
        db.rollback()
        print(f" Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()