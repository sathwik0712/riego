from datetime import date
from typing import Optional

# Approximate crop growth stage thresholds (in days since sowing).
# Each crop defines the last day of Germination, Vegetative, and Flowering; Maturity is everything after.
CROP_GROWTH_STAGES = {
    "Wheat": (14, 60, 95),
    "Rice": (14, 60, 90),
    "Tomato": (14, 40, 70),
    "Maize": (10, 45, 70),
    "Cotton": (14, 60, 120),
    "Mustard": (10, 45, 75),
    "Sugarcane": (35, 150, 270),
    "Potato": (14, 40, 70),
}

DEFAULT_GROWTH_STAGES = (14, 45, 75)

_LOWER_CROP_GROWTH_STAGES = {k.strip().lower(): v for k, v in CROP_GROWTH_STAGES.items()}


def get_growth_stage(sowing_date: Optional[date], crop: Optional[str] = None) -> str:
    """
    Calculate the crop growth stage based on days elapsed since sowing and crop type.
    Stages:
    - Not sown yet: sowing_date is None or in the future
    - Germination: day 0 to germination_end
    - Vegetative: day (germination_end + 1) to vegetative_end
    - Flowering: day (vegetative_end + 1) to flowering_end
    - Maturity: everything after flowering_end
    """
    if sowing_date is None:
        return "Not sown yet"

    # Number of days since sowing
    days = (date.today() - sowing_date).days

    if days < 0:
        return "Not sown yet"

    clean_crop = crop.strip().lower() if isinstance(crop, str) else ""
    germination_end, vegetative_end, flowering_end = _LOWER_CROP_GROWTH_STAGES.get(
        clean_crop, DEFAULT_GROWTH_STAGES
    )

    if days <= germination_end:
        return "Germination"
    elif days <= vegetative_end:
        return "Vegetative"
    elif days <= flowering_end:
        return "Flowering"
    else:
        return "Maturity"
