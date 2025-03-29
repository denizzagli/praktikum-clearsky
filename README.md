# 🌤️ ClearSky – Real-Time Travel Risk Analyzer and Air Quality Visualizer

ClearSky analyzes real-time weather and air pollution data to evaluate the environmental risk of a planned journey between a **source** and a **destination** over a specified **observation period**. Since weather conditions directly affect air pollution levels, both datasets are considered together during the analysis.

The system uses air pollution parameters such as PM2.5, PM10, NO2 and weather parameters such as temperature, wind, and precipitation to calculate:

- **Air Pollution Risk Score**  
- **Weather Impaction Score**

These scores are computed seperatly for both the source and destination, then combined to calculate ** total risk score ** and estimate a **total travel risk level**. This provides the user with a clear understanding of how risky the journey might be from an environmental and health perspective.

All processes are automated using the **CPEE (Cloud Process Execution Engine)**. The collected data is processed in real time and visualized through **time-series charts**, enabling users to monitor and understand dynamic environmental changes effectively.

## ✅ Features

- **Source-Destination Based Risk Analysis**  
  Evaluates air quality risk between user-defined source and destination points.

- **Real-Time Data Collection**  
  Continuously fetches live weather and air pollution data using Weather and OpenWeather APIs.

- **Automated Workflow with CPEE**  
  Uses Cloud Process Execution Engine to automate data collection, evaluation, and data visualization.

- **Time-Series Data Visualization**  
  Displays historical and real-time data together using dynamic time-series graphs.

- **Location-Specific Risk Scoring**  
  Calculates separate risk scores for both source and destination locations based on air pollution and weather data.

- **Combined Risk Evaluation**  
  Merges air pollution risk and weather impact scores into a single total risk score to define risk level of travel.

## 🧰 Tech Stack

- **Backend:** [FastAPI](https://fastapi.tiangolo.com/)
- **Frontend:** HTML, CSS, JavaScript (with Bootstrap & Tailwind CSS)
- **Process Automation:** [CPEE – Cloud Process Execution Engine](https://cpee.org/)
- **APIs Used:**  
  - [OpenWeather Geocoding API](https://openweathermap.org/api/geocoding-api)  
  - [WeatherAPI](https://www.weatherapi.com/docs/)  
  - [OpenWeather Air Pollution API](https://openweathermap.org/api/air-pollution)
- **Visualization:** [Plotly.js](https://plotly.com/javascript/)

## 🛠️ Installation

Follow the steps below to set up and run the project locally:

### 1. Clone the Repository

```bash
git clone https://github.com/denizzagli/praktikum-clearsky.git
cd praktikum-clearsky
```

### 2. Install Requirements

```bash
pip install -r requirements.txt
```

### 3. Set Path Variables According To Your Environment

If your project is not running at the root URL (e.g. it's served under a port or a path like `/ports/13378`), you need to update some paths manually to make the app work correctly in your environment. If you run the project on the root URL, you do not need to do these updates.

Update the lines below according to your own environment.

- **`static/config.json`**<br>
  - Line 2:
    ```json
    {
      "BASE_URL": "/ports/13378"
    }
    ```
- **`static/js/app.js`**<br>
  - Line 25:
  ```js
  fetch("/ports/13378/static/config.json")
  ```
- **`templates/base.html`**<br>
  - Line 19:
  ```html
  <link rel="stylesheet" href="/ports/13378/static/css/style.css">
  ```
  - Line 22:
  ```html
  <link rel="icon" type="image/x-icon" href="/ports/13378/static/clear-sky-icon.png">
  ```
  - Line 54:
  ```html
  <script src="/ports/13378/static/js/app.js"></script>
  ```

### 4. Provide a Predefined Database (Optional)

If you already have a dataset and want the application to use it directly, you can place a file named `data.json` in the root of the project.

- The file must contain valid structured data that matches the expected format.
- When `data.json` is present, the application will load it on startup and skip creating a new file.

If `data.json` does not **exist**, the application will automatically create and populate one during execution. If you want, you can move this file to another environment.

### 5. Run the Application

To start the application, you can use one of the following commands:

- Run normally:
  ```bash
  python3 main.py
  ```
- Run in the background (for continuous execution):
  ```bash
  nohup python3 main.py &
  ```

### 6. Set Up CPEE Process

Follow the steps below to configure the CPEE instance:

1. Visit [https://cpee.org/flow/](https://cpee.org/flow/) and create a new instance.
2. Once created, click **Monitor Instance** to open the instance.
3. Under the **Instance** tab at the top, click the **Load Testset** button and upload the provided testset ([cpee_testset.xml](https://github.com/denizzagli/praktikum-clearsky/blob/main/cpee_testset.xml)).
4. Navigate to the **Data Elements** tab:
   - Find the `instance_id` variable and update its value to match the **ID of the active instance** (shown in the top right corner).
   - Update the `source_name` and `destination_name` variables with any city you want to test. You can check whether geocoding data exists for a specific city using this API call: `http://api.openweathermap.org/geo/1.0/direct?q={city name},{state code},{country code}&limit={limit}&appid={API key}`.
5. The process will **automatically fetch live weather and air pollution data and calculate scores every 30 minutes**. It will repeat this action based on the value of the `round` variable (default is `24`, i.e., 12 hours). You can update this value according to the period you want to examine.


  
