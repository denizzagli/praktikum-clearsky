# Routing of the impaction
def compute_individual_impaction(value: float, parameter: str) -> float:
    if parameter == "temperature":
        return compute_temperature_impaction(value)

    elif parameter == "precipitation":
        return compute_precipitation_impaction(value)

    elif parameter == "humidity":
        return compute_humidity_impaction(value)

    elif parameter == "wind_speed":
        return compute_wind_impaction(value)


# Compute wind speed impaction
def compute_wind_impaction(wind_speed: float) -> float:
    if wind_speed > 20:
        return -0.2
    elif wind_speed > 10:
        return -0.1
    elif wind_speed < 5:
        return 0.1
    return 0.0


# Compute precipitation impaction
def compute_precipitation_impaction(precipitation: float) -> float:
    if precipitation > 10:
        return -0.3
    elif precipitation > 1:
        return -0.1
    return 0.0


# Compute humidity impaction
def compute_humidity_impaction(humidity: float) -> float:
    if humidity < 20:
        return 0.2
    elif humidity < 40:
        return 0.1
    elif humidity > 80:
        return -0.1
    return 0.0


# Compute temperature impaction
def compute_temperature_impaction(temperature: float) -> float:
    if temperature < -10 or temperature > 35:
        return 0.2
    elif temperature < 0 or temperature > 30:
        return 0.1
    return 0.0
