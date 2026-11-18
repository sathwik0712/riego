"""Pump flow rate resolution and estimation from horsepower."""

from typing import Optional, Tuple

# Approximate pump flow rate mapping for typical agricultural pumps.
# Mapping: pump horsepower (HP) -> flow rate in litres per hour (L/h).
HP_TO_FLOW_LPH = {
    0.5: 5000,
    1: 9000,
    2: 18000,
    3: 27000,
    5: 45000,
}

DEFAULT_FLOW_LPH = 9000.0


def resolve_pump_flow(flow: Optional[float], hp: Optional[float]) -> Tuple[float, str]:
    """
    Resolve the pump flow rate (L/h) and its source based on provided flow and horsepower:
    - If flow is explicitly provided (> 0): returns (flow, "typed")
    - Else if hp is provided (> 0): returns (nearest flow from table, "estimated_from_hp")
    - Else: returns (DEFAULT_FLOW_LPH, "default")
    """
    if flow is not None and flow > 0:
        return float(flow), "typed"

    if hp is not None and hp > 0:
        nearest_hp = min(HP_TO_FLOW_LPH.keys(), key=lambda k: abs(k - hp))
        return float(HP_TO_FLOW_LPH[nearest_hp]), "estimated_from_hp"

    return float(DEFAULT_FLOW_LPH), "default"
