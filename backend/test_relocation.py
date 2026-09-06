from relocation_engine import calculate_relocation_priority


result = calculate_relocation_priority(
    risk_score=75,
    capacity_deficit=500,
    accessibility="Poor"
)


print("Priority Score:", result["priority_score"])
print("Priority:", result["priority"])