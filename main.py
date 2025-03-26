import asyncio
import json
import os
import re
import time

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form, Query
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.responses import StreamingResponse

import decision_maker

# FastAPI APP
app = FastAPI()

# Load environment variables
load_dotenv()

# Get API Keys from environment variables
DATA_FILE = os.getenv("DATA_FILE", "default.json")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Set up Jinja2
templates = Jinja2Templates(directory="templates")

# Storage to instance data
instance_data = {}

instance_updates = {}

# Load JSON file or initialize a new data structure
try:
    with open(DATA_FILE, "r") as file:
        instance_data = json.load(file)
except (FileNotFoundError, json.JSONDecodeError):
    instance_data = {}


# Function to save data to the JSON file
def save_to_json():
    json_string = json.dumps(instance_data, indent=4)
    with open(DATA_FILE, "w", encoding="utf-8") as output_file:
        output_file.write(json_string)


@app.get("/sse/{instance_id}")
async def sse_updates(instance_id: str):
    async def event_stream():
        if instance_id not in instance_updates:
            instance_updates[instance_id] = []

        try:
            while True:
                if instance_updates[instance_id]:
                    data = instance_updates[instance_id].pop(0)
                    yield f"data: {json.dumps(data)}\n\n"

                await asyncio.sleep(2)
        except asyncio.CancelledError:
            print(f"Connection for {instance_id} was closed")

            raise

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def send_sse_update(instance_id: str, data):
    if instance_id not in instance_updates:
        instance_updates[instance_id] = []
    instance_updates[instance_id].append(data)


# Route for the "Home" page
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


# Route to handle POST requests at "/"
@app.post("/")
async def receive_post(request: Request):
    try:
        # Read and decode request body
        data = await request.body()
        decoded_data = data.decode()

        # Extract JSON data from body
        match = re.search(r'{.*}', decoded_data, re.DOTALL)

        if match:
            json_data = json.loads(match.group(0))

            # Check if the instance exists in stored data and required keys are present
            if str(json_data["instance"]) in instance_data and "content" in json_data and "changed" in json_data[
                "content"]:
                if json_data["content"]["changed"][0] == "source_weather_response" and "error" not in \
                        json_data["content"]["values"]["source_weather_response"]:
                    instance_data[str(json_data["instance"])]["source_weather_data"].append(
                        json_data["content"]["values"]["source_weather_response"])
                elif json_data["content"]["changed"][0] == "source_air_pollution_response" and "error" not in \
                        json_data["content"]["values"]["source_air_pollution_response"]:
                    instance_data[str(json_data["instance"])]["source_air_pollution_data"].append(
                        json_data["content"]["values"]["source_air_pollution_response"])
                elif json_data["content"]["changed"][0] == "destination_weather_response" and "error" not in \
                        json_data["content"]["values"]["destination_weather_response"]:
                    instance_data[str(json_data["instance"])]["destination_weather_data"].append(
                        json_data["content"]["values"]["destination_weather_response"])
                elif json_data["content"]["changed"][0] == "destination_air_pollution_response" and "error" not in \
                        json_data["content"]["values"]["destination_air_pollution_response"]:
                    instance_data[str(json_data["instance"])]["destination_air_pollution_data"].append(
                        json_data["content"]["values"]["destination_air_pollution_response"])

                # Update JSON data file
                save_to_json()

                send_sse_update(str(json_data["instance"]), json_data)

            # Return the processed JSON data
            return json_data

        # Return an error response if no JSON data is found
        return JSONResponse({"error": "No JSON data found"}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"error": "Invalid JSON format"}, status_code=400)
    except KeyError as e:
        return JSONResponse({"error": f"Missing key: {str(e)}"}, status_code=400)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# Route for the "About" page
@app.get("/about")
async def about(request: Request):
    return templates.TemplateResponse("about.html", {"request": request})


# Route for the "Contact" page
@app.get("/contact")
async def contact(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})


# Create instance for this system
@app.post("/provide-process-id")
async def provide_process_id(instance_id: str = Form(...)):
    instance_data[str(instance_id)] = {
        "source_name": None,
        "destination_name": None,
        "source_coordinates": None,
        "destination_coordinates": None,
        "source_weather_data": [],
        "destination_weather_data": [],
        "source_air_pollution_data": [],
        "destination_air_pollution_data": [],
        "source_weather_impaction": {
            "temperature": None,
            "precipitation": None,
            "humidity": None,
            "wind_speed": None
        },
        "destination_weather_impaction": {
            "temperature": None,
            "precipitation": None,
            "humidity": None,
            "wind_speed": None
        },
        "source_air_quality_risk": {
            "pm2_5": None,
            "pm10": None,
            "o3": None,
            "no2": None,
            "so2": None,
            "co": None,
            "nh3": None
        },
        "destination_air_quality_risk": {
            "pm2_5": None,
            "pm10": None,
            "o3": None,
            "no2": None,
            "so2": None,
            "co": None,
            "nh3": None
        },
        "result_data": [],
        "created_time": int(time.time())
    }

    # Update JSON data file
    save_to_json()

    return {"message": "Instance created", "instance_id": instance_id}


# Retrieve all instances
@app.get("/get-all-instances")
async def get_all_instances():
    return JSONResponse(content=instance_data)


# Retrieve only active instance names
@app.get("/get-active-instances")
def get_active_instances():
    return {"instances": list(instance_data.keys())}


# Retrieve a specific instance by instance_id
@app.get("/get-instance/{instance_id}")
async def get_instance(instance_id: str):
    if instance_id in instance_data:
        return instance_data[instance_id]
    return JSONResponse(content={"error": "Instance not found"}, status_code=404)


# Route the app page for a specific instance
@app.get("/app/{instance_id}")
async def app_instance(request: Request, instance_id: str):
    data = instance_data.get(instance_id, None)

    if not data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    return templates.TemplateResponse("app.html", {"request": request, "instance_id": instance_id, "data": data})


@app.get("/compare/{first_instance_id}/{second_instance_id}")
async def app_instance(request: Request, first_instance_id: str, second_instance_id: str):
    first_data = instance_data.get(first_instance_id, None)
    second_data = instance_data.get(second_instance_id, None)

    if not first_data or not second_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    return templates.TemplateResponse("compare.html", {"request": request, "first_instance_id": first_instance_id,
                                                       "second_instance_id": second_instance_id,
                                                       "first_data": first_data,
                                                       "second_data": second_data})


# Retrieve coordinates for a given city
@app.post("/get-coordinates")
async def get_location(instance_id: str = Form(...),
                       city: str = Form(...),
                       coordinate_type: str = Form(...)):
    try:
        # Generate the API request URL for OpenWeatherMap Geocoding
        url = f"https://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={OPENWEATHER_API_KEY}"

        # Make an asynchronous HTTP request to fetch location data
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

        # Raise an error if the response status is not successful
        response.raise_for_status()
        data = response.json()

        # Extract relevant location details from the API response
        response_json = {
            "name": data[0]["name"],
            "lat": data[0]["lat"],
            "lon": data[0]["lon"],
            "country": data[0]["country"]
        }

        # Store the coordinates in the instance data based on the type
        if coordinate_type == "source":
            instance_data[instance_id]["source_name"] = city
            instance_data[instance_id]["source_coordinates"] = response_json

        elif coordinate_type == "destination":
            instance_data[instance_id]["destination_name"] = city
            instance_data[instance_id]["destination_coordinates"] = response_json

        if len(data) > 0:
            # Update JSON data file
            save_to_json()

            # Return the extracted location data if available
            return response_json
        else:
            # Return an error if no city data is found
            return JSONResponse({"error": "City not found."}, status_code=404)
    # Handle exceptions
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# Fetch current weather data based on latitude and longitude
@app.post("/get-weather")
async def get_weather(lat: float = Form(...),
                      lon: float = Form(...)):
    try:
        # Generate the API request URL for WeatherAPI
        url = f"https://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={lat},{lon}"

        # Make an asynchronous HTTP request to fetch weather data
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

        # Raise an error if the response status is not successful
        response.raise_for_status()
        data = response.json()

        # Extract and return relevant weather details
        return {
            "location": data["location"]["name"],
            "region": data["location"]["region"],
            "country": data["location"]["country"],
            "temperature": data["current"]["temp_c"],
            "precipitation": data["current"]["precip_mm"],
            "humidity": data["current"]["humidity"],
            "wind_speed": data["current"]["wind_kph"],
            "time": data["location"]["localtime_epoch"]
        }
    # Handle exceptions
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# Fetch air quality data based on latitude and longitude
@app.post("/get-air-quality")
async def get_air_quality(lat: float = Form(...),
                          lon: float = Form(...)):
    try:
        # Construct the API request URL for OpenWeatherMap air pollution data
        url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"

        # Make an asynchronous HTTP request to fetch air quality data
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

        # Raise an error if the response status is not successful
        response.raise_for_status()
        data = response.json()

        # Extract and return relevant air quality details
        return {
            "coord": data["coord"],
            "aqi": data["list"][0]["main"]["aqi"],
            "co": data["list"][0]["components"]["co"],
            "no": data["list"][0]["components"]["no"],
            "no2": data["list"][0]["components"]["no2"],
            "o3": data["list"][0]["components"]["o3"],
            "so2": data["list"][0]["components"]["so2"],
            "pm2_5": data["list"][0]["components"]["pm2_5"],
            "pm10": data["list"][0]["components"]["pm10"],
            "nh3": data["list"][0]["components"]["nh3"],
            "time": data["list"][0]["dt"]
        }
    # Handle exceptions
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get-graph-data/{instance_id}")
async def get_graph_data(instance_id: str, data_type: str = Query(...), parameter: str = Query(...)):
    if instance_id not in instance_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    instance = instance_data[instance_id]

    data = []

    if data_type == "weather":
        sorted_source_weather_data = sort_by_time(instance["source_weather_data"])
        sorted_destination_weather_data = sort_by_time(instance["destination_weather_data"])

        for i in range(len(instance["source_weather_data"])):
            dt = sorted_source_weather_data[i]["time"]
            source_weather_value = sorted_source_weather_data[i][parameter]

            if i < len(sorted_destination_weather_data):
                destination_weather_value = sorted_destination_weather_data[i][parameter]

                data.append(
                    {"dt": dt, "source_data": source_weather_value,
                     "destination_data": destination_weather_value,
                     "source_weather_impaction": instance["source_weather_impaction"],
                     "destination_weather_impaction": instance["destination_weather_impaction"],
                     "source_air_quality_risk": instance["source_air_quality_risk"],
                     "destination_air_quality_risk": instance["destination_air_quality_risk"]})
    elif data_type == "air-pollution":
        sorted_source_air_pollution_data = sort_by_time(instance["source_air_pollution_data"])
        sorted_destination_air_pollution_data = sort_by_time(instance["destination_air_pollution_data"])

        for i in range(len(instance["source_air_pollution_data"])):
            dt = sorted_source_air_pollution_data[i]["time"]
            source_air_pollution_value = sorted_source_air_pollution_data[i][parameter]

            if i < len(sorted_destination_air_pollution_data):
                destination_air_pollution_value = sorted_destination_air_pollution_data[i][parameter]

                data.append(
                    {"dt": dt, "source_data": source_air_pollution_value,
                     "destination_data": destination_air_pollution_value,
                     "source_weather_impaction": instance["source_weather_impaction"],
                     "destination_weather_impaction": instance["destination_weather_impaction"],
                     "source_air_quality_risk": instance["source_air_quality_risk"],
                     "destination_air_quality_risk": instance["destination_air_quality_risk"]})

    return {"data": data}


@app.post("/decision-making")
async def decision_making(instance_id: str = Form(...),
                          source_risk_score: float = Form(...),
                          destination_risk_score: float = Form(...),
                          date_time: int = Form(...), ):
    if instance_id not in instance_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    source_risk_level = decision_maker.classify_total_risk(source_risk_score)
    destination_risk_level = decision_maker.classify_total_risk(destination_risk_score)
    decision = decision_maker.make_decision(source_risk_level, destination_risk_level)

    result = {
        "source_risk_score": source_risk_score,
        "source_risk_level": source_risk_level,
        "destination_risk_score": destination_risk_score,
        "destination_risk_level": destination_risk_level,
        "decision": decision,
        "time": date_time
    }

    instance_data[instance_id]["result_data"].append(result)

    save_to_json()

    send_sse_update(instance_id, result)

    return result


@app.get("/get-score-data/{instance_id}")
async def get_score_data(instance_id: str):
    if instance_id not in instance_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    instance = instance_data[instance_id]

    sorted_result_data = sort_by_time(instance["result_data"])

    return {"data": sorted_result_data}


@app.get("/get-current-score-data/{instance_id}")
async def get_current_score_data(instance_id: str, date_time: int):
    if instance_id not in instance_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    instance = instance_data[instance_id]

    sorted_result_data = sort_by_time(instance["result_data"])

    matched = next((d for d in sorted_result_data if d["time"] == date_time), None)

    if matched is None:
        if len(sorted_result_data) > 0:
            matched = sorted_result_data[-1]
        else:
            matched = "no-data"

    return {"data": matched}


@app.post("/set-weather-data")
async def set_weather_data(instance_id: str = Form(...),
                           location_type: str = Form(...),
                           temperature: float = Form(...),
                           precipitation: float = Form(...),
                           humidity: float = Form(...),
                           wind_speed: float = Form(...)):
    if instance_id not in instance_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    if location_type == "source":
        instance_data[instance_id]["source_weather_impaction"]["temperature"] = temperature
        instance_data[instance_id]["source_weather_impaction"]["precipitation"] = precipitation
        instance_data[instance_id]["source_weather_impaction"]["humidity"] = humidity
        instance_data[instance_id]["source_weather_impaction"]["wind_speed"] = wind_speed

    elif location_type == "destination":
        instance_data[instance_id]["destination_weather_impaction"]["temperature"] = temperature
        instance_data[instance_id]["destination_weather_impaction"]["precipitation"] = precipitation
        instance_data[instance_id]["destination_weather_impaction"]["humidity"] = humidity
        instance_data[instance_id]["destination_weather_impaction"]["wind_speed"] = wind_speed

    save_to_json()

    return {"result": "Scores have been updated"}


@app.post("/set-air-quality-data")
async def set_weather_data(instance_id: str = Form(...),
                           location_type: str = Form(...),
                           pm2_5: float = Form(...),
                           pm10: float = Form(...),
                           o3: float = Form(...),
                           no2: float = Form(...),
                           so2: float = Form(...),
                           co: float = Form(...),
                           nh3: float = Form(...)):
    if instance_id not in instance_data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    if location_type == "source":
        instance_data[instance_id]["source_air_quality_risk"]["pm2_5"] = pm2_5
        instance_data[instance_id]["source_air_quality_risk"]["pm10"] = pm10
        instance_data[instance_id]["source_air_quality_risk"]["o3"] = o3
        instance_data[instance_id]["source_air_quality_risk"]["no2"] = no2
        instance_data[instance_id]["source_air_quality_risk"]["so2"] = so2
        instance_data[instance_id]["source_air_quality_risk"]["co"] = co
        instance_data[instance_id]["source_air_quality_risk"]["nh3"] = nh3

    elif location_type == "destination":
        instance_data[instance_id]["destination_air_quality_risk"]["pm2_5"] = pm2_5
        instance_data[instance_id]["destination_air_quality_risk"]["pm10"] = pm10
        instance_data[instance_id]["destination_air_quality_risk"]["o3"] = o3
        instance_data[instance_id]["destination_air_quality_risk"]["no2"] = no2
        instance_data[instance_id]["destination_air_quality_risk"]["so2"] = so2
        instance_data[instance_id]["destination_air_quality_risk"]["co"] = co
        instance_data[instance_id]["destination_air_quality_risk"]["nh3"] = nh3

    save_to_json()

    return {"result": "Scores have been updated"}


def sort_by_time(data_list):
    return sorted(data_list, key=lambda x: x["time"])


# Uvicorn
if __name__ == "__main__":
    uvicorn.run(app, host="::1", port=13378)
