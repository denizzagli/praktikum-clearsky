# Weights of air quality parameters
weights = {
    "pm2_5": 0.35,
    "pm10": 0.2,
    "o3": 0.2,
    "no2": 0.15,
    "so2": 0.07,
    "co": 0.07,
    "nh3": 0.05
}

# Threshold of air quality parameters
thresholds = {
    "pm2_5": 15,
    "pm10": 45,
    "o3": 80,
    "no2": 25,
    "so2": 20,
    "co": 4000,
    "nh3": 200
}


# Compute risk for individual parameters
def compute_individual_risk(value: float, parameter: str) -> float:
    normalized = min(value / thresholds[parameter], 1)

    return weights[parameter] * normalized


# Computes risk according to weights and thresholds
def compute_risk(data: dict):
    score = 0

    for pollutant in weights:
        val = data.get(pollutant, 0)
        normalized = min(val / thresholds[pollutant], 1)
        score += weights[pollutant] * normalized

    return score


# Classification of risks
def classify_risk(score: float) -> str:
    if score < 0.3:
        return "Low Risk"
    elif score < 0.6:
        return "Medium Risk"
    elif score < 0.8:
        return "High Risk"
    else:
        return "Very High Risk"

