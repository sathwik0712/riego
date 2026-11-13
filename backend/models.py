from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base

class Field(Base):
    __tablename__ = "fields"

    # Primary key (auto-incremented integer)
    id = Column(Integer, primary_key=True, index=True)

    # Required farmer ID (defaults to "farmer_001")
    farmer_id = Column(String, nullable=False, default="farmer_001")

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
