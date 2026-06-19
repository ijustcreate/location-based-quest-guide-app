// ==================================================
// Quest Compass Main Application
// ==================================================

// This file controls:
//
// GPS
// Buttons
// User Interface
// Rendering saved locations
//
// Storage logic is in storage.js



let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;



const statusElement =
    document.getElementById("status");

const coordsElement =
    document.getElementById("coords");



document
    .getElementById("gpsButton")
    .addEventListener(
        "click",
        enableGPS
    );



document
    .getElementById("saveButton")
    .addEventListener(
        "click",
        saveCurrentLocation
    );



document
    .getElementById("clearButton")
    .addEventListener(
        "click",
        clearAllLocations
    );



function enableGPS() {

    navigator.geolocation.getCurrentPosition(

        function(position) {

            currentLatitude =
                position.coords.latitude;

            currentLongitude =
                position.coords.longitude;

            currentAccuracy =
                position.coords.accuracy;

            statusElement.textContent =
                "GPS Active";

            statusElement.className =
                "active";

            coordsElement.innerHTML =
                `
                Latitude: ${currentLatitude}<br>
                Longitude: ${currentLongitude}<br>
                Accuracy: ${Math.round(currentAccuracy)} meters
                `;
        }

    );
}



function saveCurrentLocation() {

    if (!currentLatitude) {

        alert(
            "Enable GPS first."
        );

        return;
    }

    const locationName =
        prompt(
            "Name this location:"
        );

    if (!locationName) {

        return;
    }

    addLocation({

        name: locationName,

        latitude: currentLatitude,

        longitude: currentLongitude,

        accuracy: currentAccuracy

    });

    renderLocations();
}



function renderLocations() {

    const container =
        document.getElementById(
            "savedLocations"
        );

    container.innerHTML = "";

    const locations =
        loadLocations();



    locations.forEach(

        function(location, index) {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "locationCard";

            card.innerHTML =
                `
                <h3>${location.name}</h3>

                <p>
                Lat: ${location.latitude}<br>
                Lng: ${location.longitude}<br>
                Accuracy:
                ${Math.round(location.accuracy)}m
                </p>

                <button onclick="removeLocation(${index})">
                    Delete
                </button>
                `;

            container.appendChild(
                card
            );
        }

    );
}



function removeLocation(index) {

    deleteLocation(index);

    renderLocations();
}



function clearAllLocations() {

    if (
        confirm(
            "Delete all saved locations?"
        )
    ) {

        clearLocations();

        renderLocations();
    }
}



// Draw saved locations when page loads
renderLocations();