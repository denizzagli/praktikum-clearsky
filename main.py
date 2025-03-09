import os

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

app = FastAPI()

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


@app.get("/about")
async def about(request: Request):
    return templates.TemplateResponse("about.html", {"request": request})


@app.get("/contact")
async def contact(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})


@app.get("/app")
async def contact(request: Request):
    return templates.TemplateResponse("app.html", {"request": request})


location_data = {"source": None, "destination": None}


@app.get("/get-location")
async def get_location(city: str, location_type: str):
    try:
        url = f"https://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={OPENWEATHER_API_KEY}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
        response.raise_for_status()
        data = response.json()

        if len(data) > 0:
            if location_type == "source":
                location_data["source"] = data
            elif location_type == "destination":
                location_data["destination"] = data

            return {
                "name": data[0]["name"],
                "lat": data[0]["lat"],
                "lon": data[0]["lon"],
                "country": data[0]["country"]
            }
        else:
            return JSONResponse({"error": "City not found."}, status_code=404)
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/get-location-source")
def get_location_source():
    if location_data["source"]:
        return location_data["source"]
    else:
        return JSONResponse({"error": "No source location found."}, status_code=404)


@app.get("/get-location-destination")
def get_location_destination():
    if location_data["destination"]:
        return location_data["destination"]
    else:
        return JSONResponse({"error": "No destination location found."}, status_code=404)


class ParameterModel(BaseModel):
    weather_parameter: str
    air_quality_parameter: str


parameters = {"weather_parameter": None, "air_quality_parameter": None}


@app.post("/set-parameters")
def set_parameters(params: ParameterModel):
    parameters["weather_parameter"] = params.weather_parameter
    parameters["air_quality_parameter"] = params.air_quality_parameter

    return JSONResponse(content=parameters)


@app.get("/get-parameters")
def get_parameters():
    return JSONResponse(content=parameters)


class FrequencyModel(BaseModel):
    time: float


frequency = {"time": None}


@app.post("/set-frequency")
def set_parameters(params: FrequencyModel):
    frequency["time"] = params.time

    return JSONResponse(content=frequency)


@app.get("/get-frequency")
def get_frequency():
    return JSONResponse(content=frequency)


@app.get("/weather")
async def get_weather(lat: float, lon: float):
    try:
        url = f"https://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={lat},{lon}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
        response.raise_for_status()
        data = response.json()

        return {
            "location": data["location"]["name"],
            "region": data["location"]["region"],
            "country": data["location"]["country"],
            "temperature": data["current"]["temp_c"],
            "precipitation": data["current"]["precip_mm"],
            "humidity": data["current"]["humidity"],
            "wind_speed": data["current"]["wind_kph"],
        }
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/air-quality")
async def get_air_quality(lat: float, lon: float):
    try:
        url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
        response.raise_for_status()
        data = response.json()

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
        }
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


if __name__ == "__main__":
    # uvicorn.run(app, host="0.0.0.0", port=8000)
    uvicorn.run(app, host="::1", port=13378)
