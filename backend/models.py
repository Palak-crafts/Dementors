from sqlalchemy import String, Integer, Float
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    pass


class Habitation(Base):
    __tablename__ = "habitations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100))
    
    population: Mapped[int] = mapped_column(Integer)
    households: Mapped[int] = mapped_column(Integer)

    hazard: Mapped[str] = mapped_column(String(50), default="Unknown")
    hazard_exposure: Mapped[float] = mapped_column(Float, default=0)
    hazard_exposure_details: Mapped[dict] = mapped_column(JSONB, default=dict)

    vulnerability: Mapped[str] = mapped_column(String(50), default="Low")
    vulnerability_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)
    contributing_factors: Mapped[dict] = mapped_column(JSONB, default=dict)
    accessibility: Mapped[str] = mapped_column(String(20), default="Moderate")
    emergency_access: Mapped[str] = mapped_column(String(20), default="Moderate")

    safe_capacity: Mapped[int] = mapped_column(Integer, default=0)
    capacity_deficit: Mapped[int] = mapped_column(Integer, default=0)
    capacity_status: Mapped[str] = mapped_column(String(30), default="Adequate")
    capacity_surplus: Mapped[int] = mapped_column(Integer, default=0)

    priority: Mapped[str] = mapped_column(String(20), default="Monitor")
    status: Mapped[str] = mapped_column(String(20), default="Active")
    is_demo: Mapped[bool] = mapped_column(default=False)

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    risk_score: Mapped[float] = mapped_column(Float, default=0)
    risk_level: Mapped[str] = mapped_column(String(20), default="Low")

class RelocationSite(Base):
    __tablename__ = "relocation_sites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100))

    capacity: Mapped[int] = mapped_column(Integer, default=0)
    occupancy: Mapped[int] = mapped_column(Integer, default=0)
    available: Mapped[int] = mapped_column(Integer, default=0)

    accessibility: Mapped[str] = mapped_column(String(20), default="Moderate")
    distance: Mapped[float] = mapped_column(Float, default=0)
    infrastructure: Mapped[dict] = mapped_column(JSONB, default=dict)

    suitability: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="Active")

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)

    is_demo: Mapped[bool] = mapped_column(default=False)