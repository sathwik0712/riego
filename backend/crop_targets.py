"""Target soil moisture ranges by crop and developmental growth stage.

Approximate values, mentor to confirm.
"""

from typing import Dict, Optional, Tuple

# Target volumetric moisture ranges (%) by crop and growth stage: (lower_bound, upper_bound)
# Approximate values, mentor to confirm.
CROP_TARGET_MOISTURE: Dict[str, Dict[str, Tuple[float, float]]] = {
    "Wheat": {"Germination": (45.0, 65.0), "Vegetative": (50.0, 70.0), "Flowering": (55.0, 75.0), "Maturity": (40.0, 60.0)},
    "Rice": {"Germination": (60.0, 80.0), "Vegetative": (70.0, 90.0), "Flowering": (75.0, 95.0), "Maturity": (60.0, 75.0)},
    "Tomato": {"Germination": (50.0, 70.0), "Vegetative": (60.0, 80.0), "Flowering": (65.0, 85.0), "Maturity": (50.0, 70.0)},
    "Maize": {"Germination": (45.0, 65.0), "Vegetative": (55.0, 75.0), "Flowering": (60.0, 80.0), "Maturity": (45.0, 65.0)},
    "Cotton": {"Germination": (40.0, 60.0), "Vegetative": (50.0, 70.0), "Flowering": (55.0, 75.0), "Maturity": (40.0, 55.0)},
    "Mustard": {"Germination": (40.0, 60.0), "Vegetative": (45.0, 65.0), "Flowering": (50.0, 70.0), "Maturity": (35.0, 50.0)},
    "Sugarcane": {"Germination": (55.0, 75.0), "Vegetative": (65.0, 85.0), "Flowering": (70.0, 90.0), "Maturity": (55.0, 70.0)},
    "Potato": {"Germination": (50.0, 70.0), "Vegetative": (60.0, 80.0), "Flowering": (65.0, 85.0), "Maturity": (50.0, 65.0)},
}

DEFAULT_TARGET_MOISTURE: Tuple[float, float] = (45.0, 65.0)

# Pre-normalized lookup for case and whitespace insensitivity
_LOWER_CROP_TARGETS: Dict[str, Dict[str, Tuple[float, float]]] = {
    k.strip().lower(): {stage.strip().lower(): v for stage, v in stages.items()}
    for k, stages in CROP_TARGET_MOISTURE.items()
}


def get_target_range(crop: Optional[str] = None, stage: Optional[str] = None) -> Tuple[float, float]:
    """
    Get the (lower_bound, upper_bound) volumetric soil moisture percentage range
    for a given crop and developmental growth stage.

    Crop and stage comparisons ignore case and whitespace.
    Unknown crop or unknown stage returns DEFAULT_TARGET_MOISTURE.
    """
    clean_crop = crop.strip().lower() if isinstance(crop, str) else ""
    clean_stage = stage.strip().lower() if isinstance(stage, str) else ""

    crop_dict = _LOWER_CROP_TARGETS.get(clean_crop)
    if crop_dict is not None:
        return crop_dict.get(clean_stage, DEFAULT_TARGET_MOISTURE)

    return DEFAULT_TARGET_MOISTURE
