import re
from datetime import date, datetime, timezone, timedelta
from typing import Optional, List, Any
from pydantic import BaseModel
from growth import get_growth_stage

# Check Pydantic version for validator compatibility
try:
    from pydantic import ConfigDict, field_validator, model_validator
    IS_V2 = True
except ImportError:
    from pydantic import validator as field_validator, root_validator
    IS_V2 = False

# Allowed values for restricted choices
VALID_AREA_UNITS = {"acres", "guntas"}
VALID_SOIL_TYPES = {"Sandy", "Loamy", "Clay"}
VALID_WATER_SOURCES = {"Borewell", "Canal", "Tank", "Rain-fed"}
VALID_IRRIGATION_METHODS = {"Drip", "Sprinkler", "Flood"}
VALID_RECOMMENDATION_ACTIONS = {"water", "wait"}
VALID_RECOMMENDATION_STATUSES = {"pending", "done", "skipped"}
VALID_RECOMMENDATION_SOURCES = {"rule", "ml"}
VALID_IRRIGATION_LOG_SOURCES = {"farmer", "auto"}
VALID_IRRIGATION_EVENT_SOURCES = {"farmer_tap", "manual_entry", "sensor_detected"}


class FieldCreate(BaseModel):
    nickname: Optional[str] = None
    latitude: float
    longitude: float
    area: float
    area_unit: str
    crop: str
    sowing_date: Optional[date] = None
    soil_type: str
    water_source: str
    irrigation_method: str
    # Optional pump flow rate in litres per hour (L/h)
    pump_flow_rate: Optional[float] = None
    # Optional pump horsepower (HP), must be > 0 and at most 50
    pump_hp: Optional[float] = None
    has_sensor: bool
    device_id: Optional[str] = None

    # Trim nickname; empty string becomes None
    @field_validator("nickname")
    @classmethod
    def validate_nickname(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    # Crop cannot be empty
    @field_validator("crop")
    @classmethod
    def validate_crop(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("Crop cannot be empty")
        return v

    # Area unit must be "acres" or "guntas"
    @field_validator("area_unit")
    @classmethod
    def validate_area_unit(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if v not in VALID_AREA_UNITS:
            raise ValueError("Area unit must be 'acres' or 'guntas'")
        return v

    # Soil type must be "Sandy", "Loamy" or "Clay"
    @field_validator("soil_type")
    @classmethod
    def validate_soil_type(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if v not in VALID_SOIL_TYPES:
            raise ValueError("Soil type must be 'Sandy', 'Loamy' or 'Clay'")
        return v

    # Water source must be "Borewell", "Canal", "Tank" or "Rain-fed"
    @field_validator("water_source")
    @classmethod
    def validate_water_source(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if v not in VALID_WATER_SOURCES:
            raise ValueError("Water source must be 'Borewell', 'Canal', 'Tank' or 'Rain-fed'")
        return v

    # Irrigation method must be "Drip", "Sprinkler" or "Flood"
    @field_validator("irrigation_method")
    @classmethod
    def validate_irrigation_method(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if v not in VALID_IRRIGATION_METHODS:
            raise ValueError("Irrigation method must be 'Drip', 'Sprinkler' or 'Flood'")
        return v

    # Latitude between -90 and 90
    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v):
        if v < -90 or v > 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    # Longitude between -180 and 180
    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v):
        if v < -180 or v > 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v

    # Area must be greater than 0
    @field_validator("area")
    @classmethod
    def validate_area(cls, v):
        if v <= 0:
            raise ValueError("Area must be greater than 0")
        return v

    # Pump flow rate must be greater than 0 if given (unit: litres per hour, L/h)
    @field_validator("pump_flow_rate")
    @classmethod
    def validate_pump_flow_rate(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Pump flow rate must be greater than 0")
        return v

    # Pump horsepower must be greater than 0 and at most 50 if given
    @field_validator("pump_hp")
    @classmethod
    def validate_pump_hp(cls, v):
        if v is not None and (v <= 0 or v > 50):
            raise ValueError("Pump horsepower must be greater than 0 and at most 50")
        return v

    # Sowing date cannot be in the future
    @field_validator("sowing_date")
    @classmethod
    def validate_sowing_date(cls, v):
        if v is not None and v > date.today():
            raise ValueError("Sowing date cannot be in the future")
        return v

    # Trim device_id; empty string becomes None
    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v if v else None
        return v

    # Cross-field validation: sensor and device_id relationship
    if IS_V2:
        @model_validator(mode="after")
        def validate_sensor_and_device(self):
            if self.has_sensor:
                if not self.device_id:
                    raise ValueError("Device ID is required when sensor is installed")
            else:
                if self.device_id:
                    raise ValueError("Device ID must be empty when no sensor is installed")
            return self
    else:
        @root_validator
        def validate_sensor_and_device(cls, values):
            has_sensor = values.get("has_sensor")
            device_id = values.get("device_id")
            if has_sensor:
                if not device_id:
                    raise ValueError("Device ID is required when sensor is installed")
            else:
                if device_id:
                    raise ValueError("Device ID must be empty when no sensor is installed")
            return values


class FieldOut(FieldCreate):
    id: int
    farmer_id: str
    registered_at: datetime
    # Calculated dynamically without a database column
    growth_stage: str = ""
    # Source of pump flow rate: "typed", "estimated_from_hp", or "default"
    pump_flow_source: Optional[str] = None

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)

        @model_validator(mode="after")
        def set_growth_stage(self):
            self.growth_stage = get_growth_stage(self.sowing_date, getattr(self, "crop", None))
            return self
    else:
        class Config:
            from_attributes = True
            orm_mode = True

        @root_validator
        def set_growth_stage(cls, values):
            values["growth_stage"] = get_growth_stage(values.get("sowing_date"), values.get("crop"))
            return values


# Schema for incoming sensor readings
class SensorReadingCreate(BaseModel):
    device_id: str
    raw_value: int
    time: Optional[datetime] = None

    # device_id is required, must not be empty, and trimmed
    @field_validator("device_id")
    @classmethod
    def validate_device_id(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("Device ID is required and cannot be empty")
        return v

    # raw_value must be a whole number between 0 and 4095 (ESP32 12-bit ADC range)
    @field_validator("raw_value")
    @classmethod
    def validate_raw_value(cls, v):
        if not isinstance(v, int) or isinstance(v, bool):
            raise ValueError("Raw value must be a whole number")
        if v < 0 or v > 4095:
            raise ValueError("Raw value must be between 0 and 4095")
        return v

    # Validate timestamp bounds if supplied (max 5 minutes future, max 7 days past)
    @field_validator("time")
    @classmethod
    def validate_time(cls, v):
        if v is not None:
            now = datetime.now(timezone.utc)
            v_aware = v if v.tzinfo is not None else v.replace(tzinfo=timezone.utc)

            if v_aware > now + timedelta(minutes=5):
                raise ValueError("Timestamp cannot be more than 5 minutes in the future")
            if v_aware < now - timedelta(days=7):
                raise ValueError("Timestamp cannot be older than 7 days")
        return v

    # Support 'timestamp' key as an alternative input for 'time'
    # and default to current server time if omitted
    if IS_V2:
        @model_validator(mode="before")
        @classmethod
        def handle_timestamp_field(cls, data):
            if isinstance(data, dict):
                if "time" not in data and "timestamp" in data:
                    data["time"] = data["timestamp"]
            return data

        @model_validator(mode="after")
        def set_default_time(self):
            if self.time is None:
                self.time = datetime.now(timezone.utc)
            return self
    else:
        @root_validator(pre=True)
        def handle_timestamp_field(cls, values):
            if isinstance(values, dict):
                if "time" not in values and "timestamp" in values:
                    values["time"] = values["timestamp"]
            return values

        @root_validator
        def set_default_time(cls, values):
            if values.get("time") is None:
                values["time"] = datetime.now(timezone.utc)
            return values


# Schema for returning sensor readings
class SensorReadingOut(BaseModel):
    time: datetime
    device_id: str
    field_id: int
    raw_value: int
    moisture_percent: Optional[float] = None
    source: Optional[str] = None

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)

        @model_validator(mode="after")
        def set_default_source(self):
            if not self.source:
                self.source = "manual" if str(self.device_id or "").startswith("manual-") else "sensor"
            return self
    else:
        class Config:
            from_attributes = True
            orm_mode = True

        @root_validator
        def set_default_source(cls, values):
            if not values.get("source"):
                dev_id = str(values.get("device_id") or "")
                values["source"] = "manual" if dev_id.startswith("manual-") else "sensor"
            return values


# Schema for recording manual soil moisture readings
class ManualReadingCreate(BaseModel):
    moisture_percent: float

    # Moisture percentage must be a number between 0 and 100
    @field_validator("moisture_percent")
    @classmethod
    def validate_moisture_percent(cls, v):
        if isinstance(v, bool):
            raise ValueError("Moisture percentage must be a number between 0 and 100")
        if v < 0.0 or v > 100.0:
            raise ValueError("Moisture percentage must be between 0 and 100")
        return v


# Schema for returning manual soil moisture reading confirmation
class ManualReadingOut(BaseModel):
    field_id: int
    moisture_percent: float
    time: datetime
    source: str = "manual"

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True



# Allowed language choices
VALID_LANGUAGES = {"en", "hi", "kn"}


# Signup request
class SignupRequest(BaseModel):
    name: str
    phone: str
    village: str
    preferred_language: str = "en"

    # Name: trimmed, 2-60 chars
    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if len(v) < 2 or len(v) > 60:
            raise ValueError("Name must be 2-60 characters")
        return v

    # Phone: exactly 10 digits, starts with 6-9 (Indian mobile)
    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()
        if not re.match(r"^[6-9]\d{9}$", v):
            raise ValueError("Phone must be exactly 10 digits starting with 6-9")
        return v

    # Village: trimmed, 2-60 chars
    @field_validator("village")
    @classmethod
    def validate_village(cls, v):
        v = v.strip()
        if len(v) < 2 or len(v) > 60:
            raise ValueError("Village must be 2-60 characters")
        return v

    # Language: must be "en", "hi" or "kn"
    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v):
        if v not in VALID_LANGUAGES:
            raise ValueError("Language must be 'en', 'hi' or 'kn'")
        return v


# OTP request
class OTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()
        if not re.match(r"^[6-9]\d{9}$", v):
            raise ValueError("Phone must be exactly 10 digits starting with 6-9")
        return v


# OTP verification
class OTPVerify(BaseModel):
    phone: str
    otp: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()
        if not re.match(r"^[6-9]\d{9}$", v):
            raise ValueError("Phone must be exactly 10 digits starting with 6-9")
        return v

    # OTP: exactly 6 digits
    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v):
        v = v.strip()
        if not re.match(r"^\d{6}$", v):
            raise ValueError("OTP must be exactly 6 digits")
        return v


# Farmer output (safe subset of fields)
class FarmerOut(BaseModel):
    farmer_id: str
    name: str
    phone: str
    village: str
    preferred_language: str
    created_at: datetime

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True


# Recommendation creation schema with input validation
class RecommendationCreate(BaseModel):
    field_id: int
    advice_text: str
    action: str
    water_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    source: Optional[str] = "rule"
    status: Optional[str] = "pending"

    # Advice text cannot be empty
    @field_validator("advice_text")
    @classmethod
    def validate_advice_text(cls, v):
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("Advice text cannot be empty")
        return v

    # Action must be "water" or "wait"
    @field_validator("action")
    @classmethod
    def validate_action(cls, v):
        if isinstance(v, str):
            v = v.strip().lower()
        if v not in VALID_RECOMMENDATION_ACTIONS:
            raise ValueError("Action must be 'water' or 'wait'")
        return v

    # Duration minutes between 1 and 600 if provided
    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v):
        if v is not None and (v < 1 or v > 600):
            raise ValueError("Duration minutes must be between 1 and 600")
        return v

    # Source must be "rule" or "ml"
    @field_validator("source")
    @classmethod
    def validate_source(cls, v):
        if v is None:
            return "rule"
        if isinstance(v, str):
            v = v.strip().lower()
        if v not in VALID_RECOMMENDATION_SOURCES:
            raise ValueError("Source must be 'rule' or 'ml'")
        return v

    # Status must be "pending", "done" or "skipped"
    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v is None:
            return "pending"
        if isinstance(v, str):
            v = v.strip().lower()
        if v not in VALID_RECOMMENDATION_STATUSES:
            raise ValueError("Status must be 'pending', 'done' or 'skipped'")
        return v


# Recommendation output schema
class RecommendationOut(BaseModel):
    id: int
    field_id: int
    created_at: datetime
    advice_text: str
    action: str
    water_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    source: str
    status: str

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True


# Irrigation log creation schema with input validation
class IrrigationLogCreate(BaseModel):
    field_id: int
    started_at: Optional[datetime] = None
    duration_minutes: int
    water_liters: Optional[float] = None
    source: Optional[str] = "farmer"
    event_source: Optional[str] = "farmer_tap"
    irrigated_at: Optional[datetime] = None
    recommendation_id: Optional[int] = None

    # Duration minutes between 1 and 600
    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v):
        if v < 1 or v > 600:
            raise ValueError("Duration minutes must be between 1 and 600")
        return v

    # Water liters not negative
    @field_validator("water_liters")
    @classmethod
    def validate_water_liters(cls, v):
        if v is not None and v < 0:
            raise ValueError("Water liters cannot be negative")
        return v

    # Source must be "farmer" or "auto"
    @field_validator("source")
    @classmethod
    def validate_source(cls, v):
        if v is None:
            return "farmer"
        if isinstance(v, str):
            v = v.strip().lower()
        if v not in VALID_IRRIGATION_LOG_SOURCES:
            raise ValueError("Source must be 'farmer' or 'auto'")
        return v

    # event_source must be "farmer_tap", "manual_entry", or "sensor_detected"
    @field_validator("event_source")
    @classmethod
    def validate_event_source(cls, v):
        if v is None:
            return "farmer_tap"
        if isinstance(v, str):
            v = v.strip().lower()
        if v not in VALID_IRRIGATION_EVENT_SOURCES:
            raise ValueError(f"event_source must be one of: {', '.join(sorted(VALID_IRRIGATION_EVENT_SOURCES))}")
        return v

    # irrigated_at must not be in the future, and at most 7 days old
    @field_validator("irrigated_at")
    @classmethod
    def validate_irrigated_at(cls, v):
        if v is not None:
            now_utc = datetime.now(timezone.utc)
            v_utc = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
            if v_utc > now_utc + timedelta(seconds=10):
                raise ValueError("irrigated_at must not be in the future")
            if v_utc < now_utc - timedelta(days=7):
                raise ValueError("irrigated_at cannot be more than 7 days old")
            return v_utc
        return v


# Irrigation log output schema
class IrrigationLogOut(BaseModel):
    id: int
    field_id: int
    started_at: datetime
    duration_minutes: int
    water_liters: Optional[float] = None
    source: str
    event_source: Optional[str] = "farmer_tap"
    irrigated_at: Optional[datetime] = None
    recommendation_id: Optional[int] = None
    created_at: datetime

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True


# Irrigation log history query response
class IrrigationLogHistoryOut(BaseModel):
    field_id: int
    days: int
    count: int
    logs: List[IrrigationLogOut]

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True


# Weather forecast snapshot history response
class ForecastSnapshotOut(BaseModel):
    id: int
    field_id: int
    fetched_at: datetime
    rain_next_24h_mm: Optional[float] = None
    rain_chance_next_24h: Optional[float] = None
    max_temp_next_24h: Optional[float] = None
    daily_summary: Optional[Any] = None

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True


# Detected irrigation event schema from sensor jumps
class DetectedIrrigationEvent(BaseModel):
    time: datetime
    moisture_before: float
    moisture_after: float
    jump: float

    if IS_V2:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            from_attributes = True
            orm_mode = True

