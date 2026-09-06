from pydantic import BaseModel


class HabitationCreate(BaseModel):
    name: str
    district: str
    population: int
    households: int

    hazard: str = "Unknown"
    hazard_exposure: float = 0

    vulnerability: str = "Low"
    accessibility: str = "Moderate"
    emergency_access: str = "Moderate"

    safe_capacity: int = 0

    latitude: float
    longitude: float


class HabitationUpdate(BaseModel):
    name: str
    district: str
    population: int
    households: int

    hazard: str
    hazard_exposure: float

    vulnerability: str
    accessibility: str
    emergency_access: str

    safe_capacity: int

    latitude: float
    longitude: float


# --------------------------------
# RELOCATION SITE SCHEMAS
# --------------------------------

class RelocationSiteCreate(BaseModel):
    name: str
    district: str

    capacity: int
    occupancy: int = 0

    accessibility: str = "Moderate"
    distance: float = 0

    infrastructure: dict = {}

    suitability: float = 0

    status: str = "Active"

    latitude: float
    longitude: float


class RelocationSiteUpdate(BaseModel):
    name: str
    district: str

    capacity: int
    occupancy: int

    accessibility: str
    distance: float

    infrastructure: dict

    suitability: float

    status: str

    latitude: float
    longitude: float