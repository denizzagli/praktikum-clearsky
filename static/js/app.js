document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("fetch-location");
    const dropdown = document.getElementById("city-dropdown");
    const resultDiv = document.getElementById("result");
    const startButton = document.getElementById("start-app");

    if (startButton) {
        startButton.addEventListener("click", () => {
            window.location.href = "/app";
        });
    }

    if (button) {
        button.addEventListener("click", async () => {
            const city = dropdown.value;

            try {
                const response = await fetch(`/get-location?city=${encodeURIComponent(city)}`);
                const data = await response.json();

                if (response.ok) {
                    resultDiv.style.display = "block";
                    resultDiv.className = "alert alert-success";
                    resultDiv.innerHTML = `
                    <strong>${data.name}</strong> (${data.country})<br>
                    Latitude: ${data.lat}, Longitude: ${data.lon}
                `;

                    let map = L.map('map').setView([data.lat, data.lon], 13);

                    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                        maxZoom: 19,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);

                    L.marker([data.lat, data.lon]).addTo(map)
                        .bindPopup(`<b>${data.name}</b><br>Lat: ${data.lat}, Lon: ${data.lon}`)
                        .openPopup();
                } else {
                    resultDiv.style.display = "block";
                    resultDiv.className = "alert alert-danger";
                    resultDiv.textContent = data.error || "An error occurred.";
                }
            } catch (error) {
                resultDiv.style.display = "block";
                resultDiv.className = "alert alert-danger";
                resultDiv.textContent = "Failed to fetch location info.";
            }
        });
    }
});