from datetime import date
from typing import Optional

def get_growth_stage(sowing_date: Optional[date]) -> str:
    """
    Calculate the crop growth stage based on days elapsed since sowing.
    Note: These are generic stages for all crops for now;
    this can become crop-specific later.
    """
    if sowing_date is None:
        return "Not sown yet"

    # Number of days since sowing
    days = (date.today() - sowing_date).days

    if days < 0:
        return "Not sown yet"
    elif days <= 14:
        return "Germination"
    elif days <= 45:
        return "Vegetative"
    elif days <= 75:
        return "Flowering"
    else:
        return "Maturity"

