"""Unit conversion helpers for field measurements."""

GUNTAS_PER_ACRE = 40


def area_in_acres(area: float, unit: str) -> float:
    """
    Convert a field area value to acres.

    Args:
        area: Numeric area value.
        unit: "acres" or "guntas". 1 acre = 40 guntas.

    Returns:
        Area expressed in acres.

    Raises:
        ValueError: If unit is not "acres" or "guntas".
    """
    if unit == "acres":
        return area
    if unit == "guntas":
        return area / GUNTAS_PER_ACRE
    raise ValueError(
        f"Unknown area unit {unit!r}. Expected 'acres' or 'guntas'."
    )
