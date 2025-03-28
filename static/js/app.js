let startMap, destMap, startMap2, destMap2;

let selectedInstanceApp = null;

let firstInstance = null;
let secondInstance = null;

let parameterDict = {
    "temperature": "Temperature",
    "precipitation": "Precipitation",
    "humidity": "Humidity",
    "wind_speed": "Wind Speed",
    "aqi": "AQI",
    "co": "CO",
    "no": "NO",
    "no2": "NO₂",
    "o3": "O₃",
    "so2": "SO₂",
    "pm2_5": "PM2.5",
    "pm10": "PM10",
    "nh3": "NH₃"
};


fetch("/static/config.json")
    .then(response => response.json())
    .then(data => {
        window.CONFIG = data;
        initApp();
    })
    .catch(error => console.error("Error loading config:", error));

function initApp() {
    if (window.location.pathname === "/") {
        fetchInstancesApp();
        fetchInstancesCompare();
    }

    let pathParts = window.location.pathname.split("/");

    if (pathParts.includes("app")) {
        let instanceIdIndex = pathParts.indexOf("app") + 1;
        let instanceId = pathParts[instanceIdIndex];

        if (instanceId) {
            fetchInstancesApp();
            fetchDatasForMaps(instanceId, startMap, destMap, "start-title", "dest-title", "map-start", "map-dest");
            setParameters("weather-parameter", "air-pollution-parameter", instanceId, "weather-chart", "air-pollution-chart");
            drawScoreChart(instanceId, "total-impaction-and-risk-score-chart");
            startSSE("weather-parameter", "air-pollution-parameter", instanceId, "weather-chart", "air-pollution-chart", "total-impaction-and-risk-score-chart");
        }
    }

    if (pathParts.includes("compare")) {
        let firstInstanceIdIndex = pathParts.indexOf("compare") + 1;
        let secondInstanceIdIndex = pathParts.indexOf("compare") + 2;

        let firstInstanceId = pathParts[firstInstanceIdIndex];
        let secondInstanceId = pathParts[secondInstanceIdIndex];

        if (firstInstanceId && secondInstanceId) {
            fetchInstancesCompare();
            fetchDatasForMaps(firstInstanceId, startMap, destMap, "first-start-title", "first-dest-title", "first-map-start", "first-map-dest");
            fetchDatasForMaps(secondInstanceId, startMap2, destMap2, "second-start-title", "second-dest-title", "second-map-start", "second-map-dest");
            setParameters("first-weather-parameter", "first-air-pollution-parameter", firstInstanceId, "first-weather-chart", "first-air-pollution-chart")
            setParameters("second-weather-parameter", "second-air-pollution-parameter", secondInstanceId, "second-weather-chart", "second-air-pollution-chart")
            drawScoreChart(firstInstanceId, "first-total-impaction-and-risk-score-chart")
            drawScoreChart(secondInstanceId, "second-total-impaction-and-risk-score-chart")
            startSSE("first-weather-parameter", "first-air-pollution-parameter", firstInstanceId, "first-weather-chart", "first-air-pollution-chart", "first-total-impaction-and-risk-score-chart")
            startSSE("second-weather-parameter", "second-air-pollution-parameter", secondInstanceId, "second-weather-chart", "second-air-pollution-chart", "second-total-impaction-and-risk-score-chart")
        }
    }
}

function redirectToHome() {
    window.location.href = window.CONFIG.BASE_URL + '/';
}

function redirectToAbout() {
    window.location.href = window.CONFIG.BASE_URL + '/about';
}

function redirectToContact() {
    window.location.href = window.CONFIG.BASE_URL + '/contact';
}

function displayMaps(startData, destData, sourceMap, destinationMap, startTitle, destinationTitle, sourceContainer, destinationContainer) {
    if (!document.getElementById(sourceContainer) || !document.getElementById(destinationContainer)) {
        console.error("Map container not found!");

        return;
    }

    document.getElementById(startTitle).style.display = "block";
    document.getElementById(destinationTitle).style.display = "block";

    if (!sourceMap) {
        sourceMap = L.map(sourceContainer).setView([startData.lat, startData.lon], 6);
    } else {
        sourceMap.setView([startData.lat, startData.lon], 6);
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(sourceMap);

    L.marker([startData.lat, startData.lon]).addTo(sourceMap)
        .bindPopup(`<b>Starting City:</b> ${startData.name}`)
        .openPopup();

    if (!destinationMap) {
        destinationMap = L.map(destinationContainer).setView([destData.lat, destData.lon], 6);
    } else {
        destinationMap.setView([destData.lat, destData.lon], 6);
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(destinationMap);

    L.marker([destData.lat, destData.lon]).addTo(destinationMap)
        .bindPopup(`<b>Destination City:</b> ${destData.name}`)
        .openPopup();
}

async function fetchInstancesApp() {
    let dropdownMenu = document.getElementById("instanceDropdown");

    if (!dropdownMenu) {
        console.error("Dropdown menu not found!");

        return;
    }

    let response = await fetch(window.CONFIG.BASE_URL + "/get-active-instances");
    let data = await response.json();

    dropdownMenu.innerHTML = "";

    if (data.instances.length === 0) {
        dropdownMenu.innerHTML = '<li><a class="dropdown-item disabled" href="#">No active instances</a></li>';

        return;
    }

    data.instances.forEach(instance => {
        let item = document.createElement("li");
        let link = document.createElement("a");
        link.classList.add("dropdown-item");
        link.href = "#";
        link.textContent = `${instance}`;
        link.onclick = () => {
            selectedInstanceApp = instance;
            document.getElementById("instanceDropdownButton").textContent = `Selected: ${instance}`;
        };
        item.appendChild(link);
        dropdownMenu.appendChild(item);
    });
}

function goToSelectedInstanceApp() {
    if (!selectedInstanceApp) {
        alert("Please select an instance first.");

        return;
    }
    goToInstance(selectedInstanceApp);
}

function goToInstance(instanceId) {
    if (instanceId) {
        window.location.href = window.CONFIG.BASE_URL + "/app/" + instanceId;
    }
}


async function fetchInstancesCompare() {
    let firstDropdown = document.getElementById("firstInstanceDropdown");
    let secondDropdown = document.getElementById("secondInstanceDropdown");

    if (!firstDropdown || !secondDropdown) {
        console.error("Dropdown not found!");

        return;
    }

    let response = await fetch(window.CONFIG.BASE_URL + "/get-active-instances");
    let data = await response.json();

    firstDropdown.innerHTML = "";
    secondDropdown.innerHTML = "";

    if (data.instances.length === 0) {
        let emptyItem = '<li><a class="dropdown-item disabled" href="#">No active instances</a></li>';

        firstDropdown.innerHTML = emptyItem;
        secondDropdown.innerHTML = emptyItem;

        return;
    }

    data.instances.forEach(instance => {
        const createItem = (dropdown, buttonId, setter) => {
            let item = document.createElement("li");
            let link = document.createElement("a");

            link.classList.add("dropdown-item");
            link.href = "#";
            link.textContent = `${instance}`;
            link.onclick = () => {
                setter(instance);
                document.getElementById(buttonId).textContent = `Selected: ${instance}`;
            };

            item.appendChild(link);

            dropdown.appendChild(item);
        };

        createItem(firstDropdown, "firstInstanceBtn", (val) => firstInstance = val);
        createItem(secondDropdown, "secondInstanceBtn", (val) => secondInstance = val);
    });
}

function goToCompare() {
    if (!firstInstance || !secondInstance) {
        alert("Please select both instances.");

        return;
    }

    if (firstInstance === secondInstance) {
        alert("Please select two different instances.");

        return;
    }

    window.location.href = window.CONFIG.BASE_URL + `/compare/${firstInstance}/${secondInstance}`;
}

async function fetchDatasForMaps(instanceId, sourceMap, destinationMap, startTitle, destinationTitle, sourceContainer, destinationContainer) {
    try {
        let response = await fetch(window.CONFIG.BASE_URL + `/get-instance/${instanceId}`);
        let data = await response.json();

        if (data.source_coordinates && data.destination_coordinates) {
            displayMaps(
                {name: data.source_name, lat: data.source_coordinates.lat, lon: data.source_coordinates.lon},
                {
                    name: data.destination_name,
                    lat: data.destination_coordinates.lat,
                    lon: data.destination_coordinates.lon
                }, sourceMap, destinationMap, startTitle, destinationTitle, sourceContainer, destinationContainer
            );
        }
    } catch (error) {
        console.error("Error fetching instance data:", error);
    }
}

async function setParameters(weatherParameterSelectionName, airPollutionParameterSelectionName, instanceId, weatherChartName, airPollutionChartName) {
    let weatherParameter = document.getElementById(weatherParameterSelectionName).value;
    let airPollutionParameter = document.getElementById(airPollutionParameterSelectionName).value;

    let weatherResponse = await fetch(window.CONFIG.BASE_URL + `/get-graph-data/${instanceId}?data_type=weather&parameter=${weatherParameter}`);
    let weatherJsonData = await weatherResponse.json();

    let airPollutionResponse = await fetch(window.CONFIG.BASE_URL + `/get-graph-data/${instanceId}?data_type=air-pollution&parameter=${airPollutionParameter}`);
    let airPollutionJsonData = await airPollutionResponse.json();

    await drawPlotlyChart(weatherChartName, weatherJsonData, weatherParameter, instanceId, "weather");
    await drawPlotlyChart(airPollutionChartName, airPollutionJsonData, airPollutionParameter, instanceId, "air_pollution");
}

async function drawPlotlyChart(chartName, jsonData, parameter, instanceId, chartType) {
    let timestamps = jsonData.data.map(d => new Date(d.dt * 1000));
    let sourceValues = jsonData.data.map(d => d["source_data"]);
    let destinationValues = jsonData.data.map(d => d["destination_data"]);

    let trace1 = {
        x: timestamps,
        y: sourceValues,
        type: "scatter",
        mode: "lines",
        name: "Source " + parameterDict[parameter],
        line: {
            color: 'rgb(219, 64, 82)',
            width: 3
        }
    };

    let trace2 = {
        x: timestamps,
        y: destinationValues,
        type: "scatter",
        mode: "lines",
        name: "Destination " + parameterDict[parameter],
        line: {
            color: 'rgb(55, 128, 191)',
            width: 1
        }
    };

    let layout = {
        title: parameterDict[parameter] + " Over Time",
        xaxis: {title: "Time"},
        yaxis: {title: "Measurement"}
    };

    if (timestamps.length > 0) {
        const lastDt = jsonData.data[jsonData.data.length - 1].dt;

        let currentScoreResponse = await fetch(window.CONFIG.BASE_URL + `/get-current-score-data/${instanceId}?date_time=${lastDt}`);
        let currentScoreJsonData = await currentScoreResponse.json();

        let source_str = ""
        let destination_str = ""

        let source_weather_impaction = null
        let destination_weather_impaction = null

        if (chartType === "weather") {
            source_weather_impaction = jsonData["data"][jsonData["data"].length - 1]["source_weather_impaction"][parameter]
            destination_weather_impaction = jsonData["data"][jsonData["data"].length - 1]["destination_weather_impaction"][parameter]
        } else if (chartType === "air_pollution") {
            source_weather_impaction = jsonData["data"][jsonData["data"].length - 1]["source_air_quality_risk"][parameter]
            destination_weather_impaction = jsonData["data"][jsonData["data"].length - 1]["destination_air_quality_risk"][parameter]
        }

        if (source_weather_impaction == null || destination_weather_impaction == null) {
            source_str = "Current Total Risk Score: Not Yet Calculated"
            destination_str = "Current Total Risk Score: Not Yet Calculated"
        } else {
            const source_score = source_weather_impaction.toFixed(3);
            source_str = `Score: ${source_score}` + "<br>" + "Level: " + currentScoreJsonData.data.source_risk_level;

            const destination_score = destination_weather_impaction.toFixed(3);
            destination_str = `Score: ${destination_score}` + "<br>" + "Level: " + currentScoreJsonData.data.destination_risk_level;
        }

        let sourceAy = 40;
        let destinationAy = -40;

        if (sourceValues.length > 0 && destinationValues.length > 0) {
            if (sourceValues[sourceValues.length - 1] > destinationValues[destinationValues.length - 1]) {
                sourceAy = -40;
                destinationAy = 40;
            }
        }

        layout.annotations = [
            {
                x: timestamps[timestamps.length - 1],
                y: sourceValues[sourceValues.length - 1],
                text: source_str,
                showarrow: true,
                arrowhead: 4,
                ax: 80,
                ay: sourceAy,
                xanchor: "left",
                align: "left",
                font: {
                    color: "rgb(219, 64, 82)",
                    size: 12
                },
                bgcolor: "rgba(255,255,255,0.8)"
            },
            {
                x: timestamps[timestamps.length - 1],
                y: destinationValues[destinationValues.length - 1],
                text: destination_str,
                showarrow: true,
                arrowhead: 4,
                ax: 80,
                ay: destinationAy,
                xanchor: "left",
                align: "left",
                font: {
                    color: "rgb(55, 128, 191)",
                    size: 12
                },
                bgcolor: "rgba(255,255,255,0.8)"
            }
        ];

        layout.shapes = [
            {
                type: 'line',
                x0: timestamps[timestamps.length - 1],
                x1: timestamps[timestamps.length - 1],
                y0: destinationValues[destinationValues.length - 1],
                y1: sourceValues[sourceValues.length - 1],
                line: {
                    color: '#888',
                    width: 2,
                    dash: 'dot'
                }
            }
        ];

        let decision = currentScoreJsonData.data.decision;
        let decisionColor = "#2ca02c";

        switch (decision) {
            case "Safe":
                decisionColor = "#2ca02c";
                break;
            case "Caution":
                decisionColor = "#ff9900";
                break;
            case "Risky":
                decisionColor = "#1f77b4";
                break;
            case "Dangerous":
                decisionColor = "#d62728";
                break;
        }

        layout.annotations.push({
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 1.1,
            text: `Current Decision: <b>${currentScoreJsonData.data.decision}</b><br>`,
            showarrow: false,
            font: {
                size: 20,
                family: "'Segoe UI', 'Helvetica Neue', sans-serif",
                color: decisionColor
            },
            align: 'center'
        });
    }

    Plotly.newPlot(chartName, [trace1, trace2], layout);
}

async function drawScoreChart(instanceId, scoreChartName) {
    let scoreResponse = await fetch(window.CONFIG.BASE_URL + `/get-score-data/${instanceId}`);
    let scoreJsonData = await scoreResponse.json();

    let timestamps = scoreJsonData.data.map(d => new Date(d.time * 1000));
    let sourceValues = scoreJsonData.data.map(d => d["source_risk_score"]);
    let destinationValues = scoreJsonData.data.map(d => d["destination_risk_score"]);

    let trace1 = {
        x: timestamps,
        y: sourceValues,
        type: "scatter",
        mode: "lines",
        name: "Source Risk Score",
        line: {
            color: 'rgb(219, 64, 82)',
            width: 3
        }
    };

    let trace2 = {
        x: timestamps,
        y: destinationValues,
        type: "scatter",
        mode: "lines",
        name: "Destination Risk Score",
        line: {
            color: 'rgb(55, 128, 191)',
            width: 1
        }
    };

    let layout = {
        title: "Risk Scores Over Time",
        xaxis: {title: "Time"},
        yaxis: {title: "Score"}
    };

    if (timestamps.length > 0) {
        let last_score_data = scoreJsonData["data"][scoreJsonData["data"].length - 1]

        let source_str = ""
        let destination_str = ""

        if (last_score_data == null) {
            source_str = "Risk Score: Not Yet Calculated"
            destination_str = "Risk Score: Not Yet Calculated"
        } else {
            const source_score = last_score_data["source_risk_score"].toFixed(3);
            source_str = `Score: ${source_score}` + "<br>" + "Level: " + last_score_data["source_risk_level"];

            const destination_score = last_score_data["destination_risk_score"].toFixed(3);
            destination_str = `Score: ${destination_score}` + "<br>" + "Level: " + last_score_data["destination_risk_level"];
        }

        let sourceAy = 40;
        let destinationAy = -40;

        if (sourceValues.length > 0 && destinationValues.length > 0) {
            if (sourceValues[sourceValues.length - 1] > destinationValues[destinationValues.length - 1]) {
                sourceAy = -40;
                destinationAy = 40;
            }
        }

        layout.annotations = [
            {
                x: timestamps[timestamps.length - 1],
                y: sourceValues[sourceValues.length - 1],
                text: source_str,
                showarrow: true,
                arrowhead: 4,
                ax: 80,
                ay: sourceAy,
                xanchor: "left",
                align: "left",
                font: {
                    color: "rgb(219, 64, 82)",
                    size: 12
                },
                bgcolor: "rgba(255,255,255,0.8)"
            },
            {
                x: timestamps[timestamps.length - 1],
                y: destinationValues[destinationValues.length - 1],
                text: destination_str,
                showarrow: true,
                arrowhead: 4,
                ax: 80,
                ay: sourceAy,
                xanchor: "left",
                align: "left",
                font: {
                    color: "rgb(55, 128, 191)",
                    size: 12
                },
                bgcolor: "rgba(255,255,255,0.8)"
            }
        ];

        layout.shapes = [
            {
                type: 'line',
                x0: timestamps[timestamps.length - 1],
                x1: timestamps[timestamps.length - 1],
                y0: destinationValues[destinationValues.length - 1],
                y1: sourceValues[sourceValues.length - 1],
                line: {
                    color: '#888',
                    width: 2,
                    dash: 'dot'
                }
            }
        ];

        let decision = last_score_data["decision"];
        let decisionColor = "#2ca02c";

        switch (decision) {
            case "Safe":
                decisionColor = "#2ca02c";
                break;
            case "Caution":
                decisionColor = "#ff9900";
                break;
            case "Risky":
                decisionColor = "#1f77b4";
                break;
            case "Dangerous":
                decisionColor = "#d62728";
                break;
        }

        layout.annotations.push({
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 1.1,
            text: `Current Decision: <b>${decision}</b><br>`,
            showarrow: false,
            font: {
                size: 20,
                family: "'Segoe UI', 'Helvetica Neue', sans-serif",
                color: decisionColor
            },
            align: 'center'
        });
    }

    Plotly.newPlot(scoreChartName, [trace1, trace2], layout);
}

function startSSE(weatherParameterSelectionName, airPollutionParameterSelectionName, instanceId, weatherChartName, airPollutionChartName, scoreChartName) {
    const eventSource = new EventSource(window.CONFIG.BASE_URL + `/sse/${instanceId}`);

    eventSource.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            console.log("SSE Update:", data);
            setParameters(weatherParameterSelectionName, airPollutionParameterSelectionName, instanceId, weatherChartName, airPollutionChartName)
            drawScoreChart(instanceId, scoreChartName)
        } catch (error) {
            console.error("Error processing SSE message:", error);
        }
    };

    eventSource.onerror = function () {
        console.error("SSE connection lost. Reconnecting...");
        eventSource.close();
        setTimeout(() => startSSE(weatherParameterSelectionName, airPollutionParameterSelectionName, instanceId, weatherChartName, airPollutionChartName, scoreChartName), 5000);
    };
}

