let startMap, destMap;

fetch("/static/config.json")
    .then(response => response.json())
    .then(data => {
        window.CONFIG = data;
    });

function redirectToHome() {
    window.location.href = window.CONFIG.BASE_URL + '/';
}

function redirectToAbout() {
    window.location.href = window.CONFIG.BASE_URL + '/about';
}

function redirectToContact() {
    window.location.href = window.CONFIG.BASE_URL + '/contact';
}

function redirectToApp() {
    window.location.href = window.CONFIG.BASE_URL + '/app';
}

async function fetchLocation() {
    let startingCity = document.getElementById("starting-city").value;
    let destinationCity = document.getElementById("destination-city").value;

    if (startingCity === destinationCity) {
        alert("Starting and Destination cities cannot be the same.");

        return;
    }

    console.log("Fetching location data for:", startingCity, "to", destinationCity);

    try {
        let startResponse = await fetch(window.CONFIG.BASE_URL + `/get-location?city=${startingCity}&location_type=source`);
        let startData = await startResponse.json();

        let destResponse = await fetch(window.CONFIG.BASE_URL + `/get-location?city=${destinationCity}&location_type=destination`);
        let destData = await destResponse.json();

        if (startData.error) {
            alert(`Error fetching starting city: ${startData.error}`);

            return;
        }

        if (destData.error) {
            alert(`Error fetching destination city: ${destData.error}`);

            return;
        }

        console.log("Starting City Data:", startData);
        console.log("Destination City Data:", destData);

        displayMaps(startData, destData);

        setTimeout(showParameterSelection, 500);
    } catch (error) {
        console.error("Error fetching location data:", error);

        alert("Failed to fetch location data.");
    }
}

function showParameterSelection() {
    document.getElementById("param-title").style.display = "block";
    document.getElementById("param-script").style.display = "block";
    document.getElementById("weather-parameter-title").style.display = "block";
    document.getElementById("weather-parameter").style.display = "block";
    document.getElementById("air-pollution-parameter-title").style.display = "block";
    document.getElementById("air-pollution-parameter").style.display = "block";
    document.getElementById("set-parameters-button").style.display = "block";
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

async function setParameters() {
    let weatherSelected = document.getElementById("weather-parameter").value;
    let airQualitySelected = document.getElementById("air-pollution-parameter").value;

    if (!weatherSelected || !airQualitySelected) {
        alert("Please select at least one parameter.");

        return;
    }

    console.log("Selected Parameters:");
    console.log("Weather:", weatherSelected);
    console.log("Air Quality:", airQualitySelected);

    try {
        let response = await fetch(window.CONFIG.BASE_URL + "/set-parameters", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                weather_parameter: weatherSelected,
                air_quality_parameter: airQualitySelected
            })
        });

        let data;

        if (!response.ok) {
            console.error(`HTTP error! Status: ${response.status}`);

            data = {error: `HTTP error: ${response.status}`};
        } else {
            data = await response.json();
        }

        console.log("Server Response:", data);
    } catch (error) {
        console.error("Error sending parameters:", error);
    }
}
