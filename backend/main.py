from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from database import engine, Base
import models
from routers.fields import router as fields_router
from routers.sensor_readings import router as sensor_readings_router

# Lifespan event handler to create tables and TimescaleDB hypertable on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create standard database tables
    Base.metadata.create_all(bind=engine)

    # Convert sensor_readings to a TimescaleDB hypertable on the 'time' column
    try:
        with engine.begin() as conn:
            conn.execute(
                text("SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);")
            )
    except Exception as e:
        # Log notice if hypertable already exists or non-critical error
        print(f"Hypertable creation notice: {e}")

    yield

# Initialize FastAPI application
app = FastAPI(title="Riego API", lifespan=lifespan)

# Include API routers
app.include_router(fields_router)
app.include_router(sensor_readings_router)

# Health check route
@app.get("/health")
def get_health():
    return {"status": "ok"}
