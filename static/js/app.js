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
        link.textContent = `Instance ${instance}`;
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
                {lat: data.source_coordinates.lat, lon: data.source_coordinates.lon},
                {lat: data.destination_coordinates.lat, lon: data.destination_coordinates.lon}
            );
        }
    } catch (error) {
        console.error("Error fetching instance data:", error);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname === "/") {
        setTimeout(fetchInstances, 500);
    }

    let pathParts = window.location.pathname.split("/");

    if (pathParts.length === 3 && pathParts[1] === "app") {
        let instanceId = pathParts[2];

        fetchDatasForMaps(instanceId);
    }
});

