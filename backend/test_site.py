from relocation_engine import calculate_site_score


score = calculate_site_score(
    available=500,
    suitability=90,
    accessibility="Good",
    distance=8.5
)

print("Site Score:", score)