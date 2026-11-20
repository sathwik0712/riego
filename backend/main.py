import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from database import engine, SessionLocal, Base
import models
from services.collector import collector_loop
from routers.fields import router as fields_router
from routers.sensor_readings import router as sensor_readings_router
from routers.auth import router as auth_router
from routers.weather import router as weather_router
from routers.recommendations import router as recommendations_router
from routers.irrigation_log import router as irrigation_log_router
from routers.geo import router as geo_router

# Lifespan event handler to create tables, seed data, and set up hypertable
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create standard database tables
    Base.metadata.create_all(bind=engine)

    # Seed sample farmer if not present (safe to run on every restart)
    db = SessionLocal()
    try:
        exists = db.query(models.Farmer).filter(models.Farmer.farmer_id == "farmer_001").first()
        if not exists:
            db.add(models.Farmer(
                farmer_id="farmer_001",
                name="Ramesh Kumar",
                phone="9876543210",
                village="Hebballi",
                preferred_language="en",
            ))
            db.commit()
            print("Seeded sample farmer: farmer_001")
    finally:
        db.close()

    # Convert sensor_readings to a TimescaleDB hypertable on the 'time' column
    try:
        with engine.begin() as conn:
            conn.execute(
                text("SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);")
            )
    except Exception as e:
        # Log notice if hypertable already exists or non-critical error
        print(f"Hypertable creation notice: {e}")

    # Convert weather_readings to a TimescaleDB hypertable on the 'recorded_at' column
    try:
        with engine.begin() as conn:
            conn.execute(
                text("SELECT create_hypertable('weather_readings', 'recorded_at', if_not_exists => TRUE);")
            )
    except Exception as e:
        # Log notice if hypertable already exists or non-critical error
        print(f"Weather hypertable creation notice: {e}")

    # Start background collector task
    collector_task = asyncio.create_task(collector_loop())

    yield

    # Cleanly cancel collector task on shutdown
    collector_task.cancel()
    try:
        await collector_task
    except asyncio.CancelledError:
        pass

# Initialize FastAPI application
app = FastAPI(title="Riego API", lifespan=lifespan)

# Real site address is added when deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(fields_router)
app.include_router(sensor_readings_router)
app.include_router(auth_router)
app.include_router(weather_router)
app.include_router(recommendations_router)
app.include_router(irrigation_log_router)
app.include_router(geo_router)

# Health check route
@app.get("/health")
def get_health():
    return {"status": "ok"}
