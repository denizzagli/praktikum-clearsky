let startMap, destMap;

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
        setTimeout(() => fetchInstances(), 500);
    }

    let pathParts = window.location.pathname.split("/");

    if (pathParts.includes("app")) {
        let instanceIdIndex = pathParts.indexOf("app") + 1;
        let instanceId = pathParts[instanceIdIndex];

        if (instanceId) {
            fetchDatasForMaps(instanceId);
            setParameters()
            startSSE(instanceId);
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

function displayMaps(startData, destData) {
    if (!document.getElementById("map-start") || !document.getElementById("map-dest")) {
        console.error("Map container not found!");
        return;
    }

    document.getElementById("start-title").style.display = "block";
    document.getElementById("dest-title").style.display = "block";

    if (!startMap) {
        startMap = L.map('map-start').setView([startData.lat, startData.lon], 6);
    } else {
        startMap.setView([startData.lat, startData.lon], 6);
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(startMap);

    L.marker([startData.lat, startData.lon]).addTo(startMap)
        .bindPopup(`<b>Starting City:</b> ${startData.name}`)
        .openPopup();

    if (!destMap) {
        destMap = L.map('map-dest').setView([destData.lat, destData.lon], 6);
    } else {
        destMap.setView([destData.lat, destData.lon], 6);
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(destMap);

    L.marker([destData.lat, destData.lon]).addTo(destMap)
        .bindPopup(`<b>Destination City:</b> ${destData.name}`)
        .openPopup();
}

async function fetchInstances() {
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
        link.onclick = () => goToInstance(instance);
        item.appendChild(link);
        dropdownMenu.appendChild(item);
    });
}


function goToInstance(instanceId) {
    if (instanceId) {
        window.location.href = window.CONFIG.BASE_URL + "/app/" + instanceId;
    }
}

async function fetchDatasForMaps(instanceId) {
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
                }
            );
        }
    } catch (error) {
        console.error("Error fetching instance data:", error);
    }
}

async function setParameters() {
    let weatherParameter = document.getElementById("weather-parameter").value;
    let airPollutionParameter = document.getElementById("air-pollution-parameter").value;

    let pathParts = window.location.pathname.split("/");
    let instanceIdIndex = pathParts.indexOf("app") + 1;
    let instanceId = pathParts[instanceIdIndex];

    if (!instanceId) {
        console.error("Couldn't find instance id.");

        return;
    }

    let weatherResponse = await fetch(window.CONFIG.BASE_URL + `/get-graph-data/${instanceId}?data_type=weather&parameter=${weatherParameter}`);
    let weatherJsonData = await weatherResponse.json();

    let airPollutionResponse = await fetch(window.CONFIG.BASE_URL + `/get-graph-data/${instanceId}?data_type=air-pollution&parameter=${airPollutionParameter}`);
    let airPollutionJsonData = await airPollutionResponse.json();

    await drawPlotlyChart("weather", weatherJsonData, weatherParameter);
    await drawPlotlyChart("air-pollution", airPollutionJsonData, airPollutionParameter);
}

async function drawPlotlyChart(dataType, jsonData, parameter) {
    let timestamps = jsonData.data.map(d => new Date(d.dt * 1000));
    let sourceValues = jsonData.data.map(d => d["source_data"]);
    let destinationValues = jsonData.data.map(d => d["destination_data"]);

    let trace1 = {
        x: timestamps,
        y: sourceValues,
        type: "scatter",
        mode: "lines",
        name: "Source " + parameterDict[parameter],
        line: {color: "red"}
    };

    let trace2 = {
        x: timestamps,
        y: destinationValues,
        type: "scatter",
        mode: "lines",
        name: "Destination " + parameterDict[parameter],
        line: {color: "blue"}
    };

    let layout = {
        title: parameterDict[parameter] + " Over Time",
        xaxis: {title: "Time"},
        yaxis: {title: "Measurement"}
    };

    Plotly.newPlot(dataType + "-chart", [trace1, trace2], layout);
}

function startSSE(instanceId) {
    const eventSource = new EventSource(window.CONFIG.BASE_URL + `/sse/${instanceId}`);

    eventSource.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            console.log("SSE Update:", data);
            setParameters()
        } catch (error) {
            console.error("Error processing SSE message:", error);
        }
    };

    eventSource.onerror = function () {
        console.error("SSE connection lost. Reconnecting...");
        eventSource.close();
        setTimeout(() => startSSE(instanceId), 5000);
    };
}
