from capacity_engine import calculate_capacity_status


result = calculate_capacity_status(
    population=1200,
    safe_capacity=700
)

print("Capacity Deficit:", result["capacity_deficit"])
print("Capacity Surplus:", result["capacity_surplus"])
print("Capacity Status:", result["capacity_status"])