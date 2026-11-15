from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from database import Base


# Farmer profile
class Farmer(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(String, unique=True, nullable=False)          # e.g. "farmer_001"
    name = Column(String, nullable=False)
    phone = Column(String(10), unique=True, nullable=False)          # 10-digit phone
    village = Column(String, nullable=False)
    preferred_language = Column(String, nullable=False, default="en") # "en", "hi", or "kn"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Field(Base):
    __tablename__ = "fields"

    # Primary key (auto-incremented integer)
    id = Column(Integer, primary_key=True, index=True)

    # Required farmer ID, linked to farmers table
    farmer_id = Column(String, ForeignKey("farmers.farmer_id"), nullable=False, default="farmer_001")

    # Optional nickname for the field
    nickname = Column(String, nullable=True)

    # Required coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Required field size and unit ("acres" or "guntas")
    area = Column(Float, nullable=False)
    area_unit = Column(String, nullable=False)

    # Required crop type
    crop = Column(String, nullable=False)

    # Optional sowing date (null means "not sown yet")
    sowing_date = Column(Date, nullable=True)

    # Required soil and irrigation details
    soil_type = Column(String, nullable=False)
    water_source = Column(String, nullable=False)
    irrigation_method = Column(String, nullable=False)

    # Optional pump flow rate
    pump_flow_rate = Column(Float, nullable=True)

    # Required hardware sensor flag
    has_sensor = Column(Boolean, nullable=False)

    # Optional unique telemetry device ID
    device_id = Column(String, nullable=True, unique=True)

    # Registration timestamp with timezone (defaults to now)
    registered_at = Column(DateTime(timezone=True), server_default=func.now())


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    # Composite primary key (time, device_id) required for TimescaleDB hypertable
    time = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    device_id = Column(String, primary_key=True)

    # Foreign key referencing the associated field
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)

    # Telemetry sensor reading
    raw_value = Column(Integer, nullable=False)

    # Moisture percentage (optional, calculated in later steps)
    moisture_percent = Column(Float, nullable=True)


# Weather reading history: one row is saved each time fresh weather is fetched
class WeatherReading(Base):
    __tablename__ = "weather_readings"

    # Composite primary key (recorded_at, field_id) required for TimescaleDB hypertable
    recorded_at = Column(DateTime(timezone=True), primary_key=True, server_default=func.now())
    field_id = Column(Integer, ForeignKey("fields.id"), primary_key=True, nullable=False)

    # Weather telemetry metrics
    temperature_c = Column(Float, nullable=False)
    humidity_percent = Column(Float, nullable=False)
    wind_speed_ms = Column(Float, nullable=False)
    rain_mm_last_hour = Column(Float, nullable=False, default=0.0)
    is_raining = Column(Boolean, nullable=False, default=False)
    description = Column(String, nullable=True)

    # Composite index to optimize retrieving the latest weather readings for a field (newest first)
    __table_args__ = (
        Index("ix_weather_readings_field_recorded_at", field_id, recorded_at.desc()),
    )

