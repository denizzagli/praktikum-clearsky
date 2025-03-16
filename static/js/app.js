let startMap, destMap;

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
            drawEmptyChart("source");
            drawEmptyChart("destination");
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

async function setParameters(data_type) {
    let weatherParameter = document.getElementById("weather-parameter-" + data_type).value;
    let airQualityParameter = document.getElementById("air-pollution-parameter-" + data_type).value;

    let pathParts = window.location.pathname.split("/");
    let instanceIdIndex = pathParts.indexOf("app") + 1;
    let instanceId = pathParts[instanceIdIndex];

    if (!instanceId) {
        console.error("Couldn't find instance id.");
        return;
    }

    let response = await fetch(`/get-graph-data/${instanceId}?data_type=${data_type}&weather_parameter=${weatherParameter}&air_pollution_parameter=${airQualityParameter}`);
    let jsonData = await response.json();

    drawPlotlyChart(data_type, jsonData, weatherParameter, airQualityParameter);
}

async function drawPlotlyChart(data_type, jsonData, weatherParameter, airQualityParameter) {
    let timestamps = jsonData.data.map(d => new Date(d.dt * 1000));
    let weatherValues = jsonData.data.map(d => d["weather_parameter"]);
    let airQualityValues = jsonData.data.map(d => d["air_pollution_parameter"]);

    let trace1 = {
        x: timestamps,
        y: weatherValues,
        type: "scatter",
        mode: "lines",
        name: weatherParameter,
        line: {color: "red"}
    };

    let trace2 = {
        x: timestamps,
        y: airQualityValues,
        type: "scatter",
        mode: "lines",
        name: airQualityParameter,
        line: {color: "blue"}
    };

    let layout = {
        title: "Weather & Air Quality Over Time",
        xaxis: {title: "Time"},
        yaxis: {title: "Measurement"}
    };

    Plotly.newPlot("weather-air-quality-chart-" + data_type, [trace1, trace2], layout);
}

function drawEmptyChart(data_type) {
    let layout = {
        title: "Weather & Air Pollution Data",
        xaxis: {title: "Time"},
        yaxis: {title: "Measurement"}
    };

    let emptyData = [{
        x: [],
        y: [],
        type: "scatter",
        mode: "lines+markers",
        name: "No Data Available"
    }];

    Plotly.newPlot("weather-air-quality-chart-" + data_type, emptyData, layout);
}