from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from models import Base

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username="postgres",
    password="sih@2026",
    host="localhost",
    port=5432,
    database="sih_backend"
)

engine = create_engine(DATABASE_URL)

Base.metadata.create_all(engine)

with engine.connect() as connection:
    result = connection.execute(text("SELECT 1"))
    print("Database connected successfully!")
    print("Result:", result.scalar())
    print("Tables created successfully!")