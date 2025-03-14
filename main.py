import os

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

app = FastAPI()

load_dotenv()

OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")

app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")

instance_data = {}


# PROD
@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


# PROD
@app.post("/")
async def receive_post(request: Request):
    data = await request.body()

    print("CPEE data:", data.decode())

    return {"data": data.decode()}


# PROD
@app.get("/about")
async def about(request: Request):
    return templates.TemplateResponse("about.html", {"request": request})


# PROD
@app.get("/contact")
async def contact(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})


# PROD
@app.get("/app")
async def contact(request: Request):
    return templates.TemplateResponse("app.html", {"request": request})


# PROD
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
        "destination_air_pollution_data": []
    }

    return {"message": "Instance created", "instance_id": instance_id}


# PROD
@app.get("/get-all-instances")
async def get_all_instances():
    return JSONResponse(content=instance_data)


# PROD
@app.get("/get-active-instances")
async def get_active_instances():
    return {"instances": list(instance_data.keys())}


@app.get("/get-instance/{instance_id}")
async def get_instance(instance_id: str):
    if instance_id in instance_data:
        return instance_data[instance_id]
    return JSONResponse(content={"error": "Instance not found"}, status_code=404)


# PROD
@app.get("/app/{instance_id}")
async def app_instance(request: Request, instance_id: str):
    data = instance_data.get(instance_id, None)

    if not data:
        return JSONResponse({"error": "Instance not found"}, status_code=404)

    return templates.TemplateResponse("app.html", {"request": request, "instance_id": instance_id, "data": data})


# PROD
@app.post("/get-coordinates")
async def get_location(instance_id: str = Form(...),
                       city: str = Form(...),
                       coordinate_type: str = Form(...)):
    try:
        url = f"https://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={OPENWEATHER_API_KEY}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url)

        response.raise_for_status()
        data = response.json()

        response_json = {
            "name": data[0]["name"],
            "lat": data[0]["lat"],
            "lon": data[0]["lon"],
            "country": data[0]["country"]
        }

        if coordinate_type == "source":
            instance_data[instance_id]["source_name"] = city
            instance_data[instance_id]["source_coordinates"] = response_json

        elif coordinate_type == "destination":
            instance_data[instance_id]["destination_name"] = city
            instance_data[instance_id]["destination_coordinates"] = response_json

        if len(data) > 0:
            return response_json
        else:
            return JSONResponse({"error": "City not found."}, status_code=404)
    except httpx.RequestError as e:
        return JSONResponse({"error": f"Request error: {e}"}, status_code=500)
    except httpx.HTTPStatusError as e:
        return JSONResponse({"error": f"HTTP error: {e.response.status_code}"}, status_code=e.response.status_code)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# PROD
@app.get("/get-weather")
async def get_weather(lat: float = Form(...),
                      lon: float = Form(...)):
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


# PROD
@app.get("/get-air-quality")
async def get_air_quality(lat: float = Form(...),
                          lon: float = Form(...)):
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
    uvicorn.run(app, host="::1", port=13378)
