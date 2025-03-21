def classify_total_risk(total_risk):
    if total_risk < 0.3:
        return "Low Risk"
    elif total_risk < 0.6:
        return "Medium Risk"
    elif total_risk < 0.8:
        return "High Risk"
    else:
        return "Very High Risk"


def make_decision(source_risk, destination_risk):
    risk_levels = ["Low Risk", "Medium Risk", "High Risk", "Very High Risk"]

    source_index = risk_levels.index(source_risk)
    destination_index = risk_levels.index(destination_risk)

    if destination_index <= source_index:
        return "Safe"

    elif destination_index - source_index == 1:
        return "Caution"

    elif destination_index - source_index == 2:
        return "Risky"

    else:
        return "Dangerous"