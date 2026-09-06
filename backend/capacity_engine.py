def calculate_capacity_status(population, safe_capacity):
    capacity_difference = safe_capacity - population

    if capacity_difference < 0:
        capacity_deficit = abs(capacity_difference)
        capacity_surplus = 0
    else:
        capacity_deficit = 0
        capacity_surplus = capacity_difference

    # Calculate deficit ratio
    if population > 0:
        deficit_ratio = capacity_deficit / population
    else:
        deficit_ratio = 0

    # Determine capacity status
    if deficit_ratio >= 0.60:
        capacity_status = "Critical Deficit"
    elif deficit_ratio >= 0.30:
        capacity_status = "Deficit"
    elif deficit_ratio >= 0.10:
        capacity_status = "Warning"
    else:
        capacity_status = "Adequate"

    return {
        "capacity_deficit": capacity_deficit,
        "capacity_surplus": capacity_surplus,
        "capacity_status": capacity_status
    }