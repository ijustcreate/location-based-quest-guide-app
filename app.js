// ==================================================
// Quest Compass Main Application
// ==================================================
//
// This file controls:
// - GPS
// - compass permission
// - phone heading
// - UI updates
// - saved locations
// - navigation target selection
// - camera marker start button
//
// Storage logic lives in storage.js.
// Navigation math lives in navigation.js.
// Camera detection lives in camera.js.

let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;

let activeTarget = null;
let phoneHeading = null;

const statusElement =
    document.getElementById("status");

const coordsElement =
    document.getElementById("coords");

const compassStatusElement =
    document.getElementById("compassStatus");

const headingInfoElement =
    document.getElementById("headingInfo");

const targetInfoElement =
    document.getElementById("targetInfo");

const navigationInfoElement =
    document.getElementById("navigationInfo");

const directionArrowElement =
    document.getElementById("directionArrow");

const markerStatusElement =
    document.getElementById("markerStatus");

const cameraVideoElement =
    document.getElementById("cameraVideo");

const cameraCanvasElement =
    document.getElementById("cameraCanvas");

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

document
    .getElementById("compassButton")
    .addEventListener(
        "click",
        enableCompass
    );

document
    .getElementById("cameraButton")
    .addEventListener(
        "click",
        function() {
            startCameraMarkerDetection(
                cameraVideoElement,
                cameraCanvasElement,
                markerStatusElement
            );
        }
    );

function enableGPS() {
    // watchPosition keeps updating as the user moves.
    // This is better for navigation than one-time GPS.

    if (!navigator.geolocation) {
        alert("GPS is not supported on this device.");
        return;
    }

    statusElement.textContent = "Requesting GPS...";

    navigator.geolocation.watchPosition(
        function(position) {
            currentLatitude = position.coords.latitude;
            currentLongitude = position.coords.longitude;
            currentAccuracy = position.coords.accuracy;

            statusElement.textContent = "GPS Active";
            statusElement.className = "active";

            coordsElement.innerHTML =
                `
                Latitude: ${currentLatitude}<br>
                Longitude: ${currentLongitude}<br>
                Accuracy: ${Math.round(currentAccuracy)} meters
                `;

            updateNavigationDisplay();
        },

        function(error) {
            statusElement.textContent =
                "GPS Error: " + error.message;

            statusElement.className = "error";
        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
}

function enableCompass() {
    // iPhone Safari requires permission for compass/orientation sensors.
    // Android and some browsers may not require the same permission call.

    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
        DeviceOrientationEvent.requestPermission()
            .then(function(permissionState) {
                if (permissionState === "granted") {
                    startCompassListener();
                } else {
                    compassStatusElement.textContent =
                        "Compass permission denied.";

                    compassStatusElement.className = "error";
                }
            })
            .catch(function(error) {
                compassStatusElement.textContent =
                    "Compass error: " + error.message;

                compassStatusElement.className = "error";
            });

        return;
    }

    startCompassListener();
}

function startCompassListener() {
    // deviceorientation fires when the phone orientation changes.

    compassStatusElement.textContent = "Compass active.";
    compassStatusElement.className = "active";

    window.addEventListener(
        "deviceorientation",
        handleDeviceOrientation,
        true
    );
}

function handleDeviceOrientation(event) {
    // iPhone Safari provides webkitCompassHeading.
    // Other browsers may provide alpha.
    //
    // webkitCompassHeading:
    // 0 = north, 90 = east, 180 = south, 270 = west.
    //
    // alpha usually rotates opposite, so we convert it.

    if (typeof event.webkitCompassHeading === "number") {
        phoneHeading = event.webkitCompassHeading;
    } else if (typeof event.alpha === "number") {
        phoneHeading = normalizeDegrees(360 - event.alpha);
    } else {
        headingInfoElement.textContent =
            "Phone heading: unavailable";

        return;
    }

    headingInfoElement.innerHTML =
        "Phone heading: " +
        Math.round(phoneHeading) +
        "°";

    updateNavigationDisplay();
}

function saveCurrentLocation() {
    // Prevent saving before GPS exists.

    if (!currentLatitude || !currentLongitude) {
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
        accuracy: currentAccuracy,
        createdAt: new Date().toISOString()
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

    locations.forEach(function(location) {
        const card =
            document.createElement("div");

        card.className = "locationCard";

        const title =
            document.createElement("h3");

        title.textContent = location.name;

        const details =
            document.createElement("p");

        details.innerHTML =
            `
            Lat: ${location.latitude}<br>
            Lng: ${location.longitude}<br>
            Accuracy: ${Math.round(location.accuracy)}m
            `;

        const navigateButton =
            document.createElement("button");

        navigateButton.textContent = "Navigate";
        navigateButton.className = "navigateButton";

        navigateButton.addEventListener(
            "click",
            function() {
                startNavigation(location.id);
            }
        );

        const deleteButton =
            document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener(
            "click",
            function() {
                removeLocation(location.id);
            }
        );

        card.appendChild(title);
        card.appendChild(details);
        card.appendChild(navigateButton);
        card.appendChild(deleteButton);

        container.appendChild(card);
    });
}

function startNavigation(locationId) {
    // Select a saved location as the active target.

    const locations =
        loadLocations();

    activeTarget =
        locations.find(function(location) {
            return location.id === locationId;
        });

    updateNavigationDisplay();
}

function updateNavigationDisplay() {
    // If there is no target, there is nothing to calculate.

    if (!activeTarget) {
        return;
    }

    if (!currentLatitude || !currentLongitude) {
        targetInfoElement.innerHTML =
            "<strong>Target:</strong> " + activeTarget.name;

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

    const targetBearing =
        calculateBearingDegrees(
            currentLatitude,
            currentLongitude,
            activeTarget.latitude,
            activeTarget.longitude
        );

    const arrowRotation =
        calculateArrowRotation(
            targetBearing,
            phoneHeading
        );

    const directionLabel =
        getDirectionLabel(targetBearing);

    const arrived =
        hasArrived(distance);

    directionArrowElement.style.transform =
        "rotate(" + arrowRotation + "deg)";

    targetInfoElement.innerHTML =
        "<strong>Target:</strong> " + activeTarget.name;

    navigationInfoElement.innerHTML =
        `
        Distance: ${formatDistance(distance)}<br>
        Map Direction: ${directionLabel}<br>
        Target Bearing: ${Math.round(targetBearing)}°<br>
        Phone Heading: ${
            phoneHeading === null
                ? "not enabled"
                : Math.round(phoneHeading) + "°"
        }<br>
        Arrow Mode: ${
            phoneHeading === null
                ? "map-relative"
                : "phone-relative"
        }<br>
        Status: ${arrived ? "Arrived 🎯" : "Move toward target"}
        `;
}

function removeLocation(locationId) {
    // Delete selected location.

    deleteLocationById(locationId);

    if (activeTarget && activeTarget.id === locationId) {
        activeTarget = null;

        targetInfoElement.innerHTML =
            "No target selected.";

        navigationInfoElement.innerHTML =
            "Choose a saved location to navigate.";

        directionArrowElement.style.transform =
            "rotate(0deg)";
    }

    renderLocations();
}

function clearAllLocations() {
    // Confirm before deleting everything.

    if (confirm("Delete all saved locations?")) {
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

renderLocations();