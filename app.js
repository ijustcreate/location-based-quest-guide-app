// ==================================================
// Quest Compass Main Application
// ==================================================
//
// This file controls:
// - GPS
// - Buttons
// - UI updates
// - Saved location rendering
// - Starting navigation to a saved location
//
// Storage logic lives in storage.js.
// Navigation math lives in navigation.js.

let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;

let activeTarget = null;

// Grab important page elements once so we can reuse them.
const statusElement =
    document.getElementById("status");

const coordsElement =
    document.getElementById("coords");

const targetInfoElement =
    document.getElementById("targetInfo");

const navigationInfoElement =
    document.getElementById("navigationInfo");

const directionArrowElement =
    document.getElementById("directionArrow");

// Wire up button clicks.
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
    // watchPosition keeps updating as the user moves.
    // This is better for navigation than getCurrentPosition.

    if (!navigator.geolocation) {
        alert("GPS is not supported on this device.");
        return;
    }

    statusElement.textContent =
        "Requesting GPS...";

    navigator.geolocation.watchPosition(
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

            // If a target is selected, update navigation every time GPS updates.
            updateNavigationDisplay();
        },

        function(error) {
            statusElement.textContent =
                "GPS Error: " + error.message;
        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
}

function saveCurrentLocation() {
    // Prevent saving empty GPS data.

    if (!currentLatitude) {
        alert("Enable GPS first.");
        return;
    }

    const locationName =
        prompt("Name this location:");

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
    // Draw saved locations onto the page.

    const container =
        document.getElementById("savedLocations");

    const locations =
        loadLocations();

    container.innerHTML = "";

    if (locations.length === 0) {
        container.innerHTML =
            "<p class='smallText'>No saved locations yet.</p>";
        return;
    }

    locations.forEach(
        function(location, index) {
            const card =
                document.createElement("div");

            card.className =
                "locationCard";

            card.innerHTML =
                `
                <h3>${location.name}</h3>

                <p>
                Lat: ${location.latitude}<br>
                Lng: ${location.longitude}<br>
                Accuracy: ${Math.round(location.accuracy)}m
                </p>

                <button class="navigateButton" onclick="startNavigation(${index})">
                    Navigate
                </button>

                <button onclick="removeLocation(${index})">
                    Delete
                </button>
                `;

            container.appendChild(card);
        }
    );
}

function startNavigation(index) {
    // Save selected target in memory.
    // Later this can become persistent quest state.

    const locations =
        loadLocations();

    activeTarget =
        locations[index];

    updateNavigationDisplay();
}

function updateNavigationDisplay() {
    // If there is no target, there is nothing to calculate.

    if (!activeTarget) {
        return;
    }

    // GPS must be active before navigation can work.

    if (!currentLatitude || !currentLongitude) {
        targetInfoElement.innerHTML =
            `<strong>Target:</strong> ${activeTarget.name}`;

        navigationInfoElement.innerHTML =
            "Enable GPS to begin navigation.";

        return;
    }

    const distance =
        calculateDistanceMeters(
            currentLatitude,
            currentLongitude,
            activeTarget.latitude,
            activeTarget.longitude
        );

    const bearing =
        calculateBearingDegrees(
            currentLatitude,
            currentLongitude,
            activeTarget.latitude,
            activeTarget.longitude
        );

    const directionLabel =
        getDirectionLabel(bearing);

    const arrived =
        hasArrived(distance);

    // Rotate arrow toward the target bearing.
    // This is not yet corrected for phone heading.
    // Next milestone can use device orientation to make it true compass-relative.

    directionArrowElement.style.transform =
        `rotate(${bearing}deg)`;

    targetInfoElement.innerHTML =
        `<strong>Target:</strong> ${activeTarget.name}`;

    navigationInfoElement.innerHTML =
        `
        Distance: ${formatDistance(distance)}<br>
        Direction: ${directionLabel}<br>
        Bearing: ${Math.round(bearing)}°<br>
        Status: ${arrived ? "Arrived 🎯" : "Move toward target"}
        `;
}

function removeLocation(index) {
    // Delete selected location and redraw the list.

    deleteLocation(index);

    renderLocations();
}

function clearAllLocations() {
    // Confirm before destroying saved data.

    if (
        confirm("Delete all saved locations?")
    ) {
        clearLocations();

        activeTarget = null;

        targetInfoElement.innerHTML =
            "No target selected.";

        navigationInfoElement.innerHTML =
            "Choose a saved location to navigate.";

        directionArrowElement.style.transform =
            "rotate(0deg)";

        renderLocations();
    }
}

// Draw saved locations when page first loads.
renderLocations();