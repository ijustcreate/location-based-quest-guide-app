// ==================================================
// Quest Compass Main App
// ==================================================
//
// This file controls:
// - app modes
// - GPS
// - compass permission
// - status chips
// - navigation target
// - create form
// - saved location library
// - scanner UI

let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;

let phoneHeading = null;
let activeTarget = null;

let gpsActive = false;
let compassActive = false;
let scannerActive = false;

const modeSubtitle = document.getElementById("modeSubtitle");

const gpsChip = document.getElementById("gpsChip");
const compassChip = document.getElementById("compassChip");
const scannerChip = document.getElementById("scannerChip");
const targetChip = document.getElementById("targetChip");

const gpsChipText = document.getElementById("gpsChipText");
const compassChipText = document.getElementById("compassChipText");
const scannerChipText = document.getElementById("scannerChipText");
const targetChipText = document.getElementById("targetChipText");

const gpsReadout = document.getElementById("gpsReadout");
const headingReadout = document.getElementById("headingReadout");
const navigationReadout = document.getElementById("navigationReadout");
const createGpsReadout = document.getElementById("createGpsReadout");

const directionArrow = document.getElementById("directionArrow");
const bearingReadout = document.getElementById("bearingReadout");

const trailTargetName = document.getElementById("trailTargetName");
const trailTargetHint = document.getElementById("trailTargetHint");
const trailDistance = document.getElementById("trailDistance");
const trailAccuracy = document.getElementById("trailAccuracy");

const scanTargetName = document.getElementById("scanTargetName");
const scanTargetMeta = document.getElementById("scanTargetMeta");

const placeNameInput = document.getElementById("placeNameInput");
const hintInput = document.getElementById("hintInput");

const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");

const markerTitle = document.getElementById("markerTitle");
const markerMessage = document.getElementById("markerMessage");

const redSignalBar = document.getElementById("redSignalBar");
const shapeMatchBar = document.getElementById("shapeMatchBar");
const lightingBar = document.getElementById("lightingBar");
const stabilityBar = document.getElementById("stabilityBar");

const redSignalText = document.getElementById("redSignalText");
const shapeMatchText = document.getElementById("shapeMatchText");
const lightingText = document.getElementById("lightingText");
const stabilityText = document.getElementById("stabilityText");

document.querySelectorAll(".navButton").forEach(function(button) {
    button.addEventListener("click", function() {
        setMode(button.dataset.mode);
    });
});

document.getElementById("trailGpsButton").addEventListener("click", enableGPS);
document.getElementById("trailCompassButton").addEventListener("click", enableCompass);

document.getElementById("trailScannerButton").addEventListener("click", function() {
    setMode("scan");
});

document.getElementById("trailSaveButton").addEventListener("click", function() {
    setMode("create");
});

document.getElementById("scanCameraButton").addEventListener("click", enableScanner);

document.getElementById("createSaveButton").addEventListener("click", function() {
    savePlace(false);
});

document.getElementById("createSaveFollowButton").addEventListener("click", function() {
    savePlace(true);
});

document.getElementById("clearButton").addEventListener("click", clearAllSavedLocations);

function setMode(mode) {
    // Switch between Trail, Scan, Create, and Library.

    document.querySelectorAll(".modePanel").forEach(function(panel) {
        panel.classList.remove("activePanel");
    });

    document.querySelectorAll(".navButton").forEach(function(button) {
        button.classList.remove("activeNav");
    });

    document.getElementById(mode + "Panel").classList.add("activePanel");

    document
        .querySelector("[data-mode='" + mode + "']")
        .classList
        .add("activeNav");

    if (mode === "trail") {
        modeSubtitle.textContent = "Trail Active";
    }

    if (mode === "scan") {
        modeSubtitle.textContent = "Sigil Scan";
    }

    if (mode === "create") {
        modeSubtitle.textContent = "Forge Quest";
    }

    if (mode === "library") {
        modeSubtitle.textContent = "Field Notes";
        renderLocations();
    }
}

function enableGPS() {
    // Start live GPS tracking.

    if (!navigator.geolocation) {
        gpsReadout.textContent = "GPS is not supported on this device.";
        return;
    }

    gpsReadout.textContent = "Requesting GPS permission...";

    navigator.geolocation.watchPosition(
        function(position) {
            currentLatitude = position.coords.latitude;
            currentLongitude = position.coords.longitude;
            currentAccuracy = position.coords.accuracy;

            gpsActive = true;

            updateStatusChips();
            updateGpsReadouts();
            updateNavigationDisplay();
            renderLocations();
        },

        function(error) {
            gpsReadout.textContent = "GPS Error: " + error.message;
            gpsActive = false;
            updateStatusChips();
        },

        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
}

function enableCompass() {
    // iPhone Safari requires permission for orientation sensors.

    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
        DeviceOrientationEvent.requestPermission()
            .then(function(permissionState) {
                if (permissionState === "granted") {
                    startCompassListener();
                } else {
                    headingReadout.textContent = "Compass permission denied.";
                }
            })
            .catch(function(error) {
                headingReadout.textContent = "Compass error: " + error.message;
            });

        return;
    }

    startCompassListener();
}

function startCompassListener() {
    // Listen for phone heading changes.

    compassActive = true;

    updateStatusChips();

    window.addEventListener(
        "deviceorientation",
        handleDeviceOrientation,
        true
    );

    headingReadout.textContent = "Compass active. Rotate phone to update heading.";
}

function handleDeviceOrientation(event) {
    // iPhone gives webkitCompassHeading.
    // Other devices may use alpha.

    if (typeof event.webkitCompassHeading === "number") {
        phoneHeading = event.webkitCompassHeading;
    } else if (typeof event.alpha === "number") {
        phoneHeading = normalizeDegrees(360 - event.alpha);
    } else {
        headingReadout.textContent = "Phone heading unavailable.";
        return;
    }

    headingReadout.textContent =
        "Phone heading: " + Math.round(phoneHeading) + "°";

    updateNavigationDisplay();
}

function enableScanner() {
    // Start camera marker scanner.

    scannerActive = true;

    updateStatusChips();

    startCameraMarkerDetection(
        cameraVideo,
        cameraCanvas,
        updateScannerUI
    );
}

function updateScannerUI(result) {
    // Update scanner status and bars from camera.js result.

    markerTitle.textContent = result.title;
    markerMessage.textContent = result.message;

    updateBar(redSignalBar, redSignalText, result.redSignal);
    updateBar(shapeMatchBar, shapeMatchText, result.shapeMatch);
    updateBar(lightingBar, lightingText, result.lighting);
    updateBar(stabilityBar, stabilityText, result.stability);

    scannerChipText.textContent = result.confirmed ? "Confirmed" : "Active";
}

function updateBar(barElement, textElement, value) {
    // Update one scanner meter.

    const safeValue = Math.max(
        0,
        Math.min(
            100,
            Math.round(value || 0)
        )
    );

    barElement.style.width = safeValue + "%";
    textElement.textContent = safeValue + "%";
}

function updateStatusChips() {
    // Update compact top status pills.

    gpsChip.classList.toggle("active", gpsActive);
    compassChip.classList.toggle("active", compassActive);
    scannerChip.classList.toggle("active", scannerActive);
    targetChip.classList.toggle("active", activeTarget !== null);

    gpsChipText.textContent = gpsActive ? "Active" : "Off";
    compassChipText.textContent = compassActive ? "Calibrated" : "Off";
    scannerChipText.textContent = scannerActive ? scannerChipText.textContent || "Active" : "Off";
    targetChipText.textContent = activeTarget ? "Locked" : "None";
}

function updateGpsReadouts() {
    // Display current GPS data in Trail and Create.

    if (!gpsActive) {
        gpsReadout.textContent = "GPS inactive.";
        createGpsReadout.textContent = "Enable GPS to capture this place.";
        return;
    }

    const text =
        "Latitude: " + currentLatitude +
        "<br>Longitude: " + currentLongitude +
        "<br>Accuracy: " + Math.round(currentAccuracy) + " m";

    gpsReadout.innerHTML = text;
    createGpsReadout.innerHTML = text;
}

function savePlace(shouldFollow) {
    // Save a location from the Create screen.

    if (!currentLatitude || !currentLongitude) {
        alert("Enable GPS first.");
        return;
    }

    const name = placeNameInput.value.trim();

    if (!name) {
        alert("Name this place first.");
        return;
    }

    const newLocation = {
        name: name,
        hint: hintInput.value.trim(),
        latitude: currentLatitude,
        longitude: currentLongitude,
        accuracy: currentAccuracy,
        createdAt: new Date().toISOString()
    };

    addLocation(newLocation);

    placeNameInput.value = "";
    hintInput.value = "";

    renderLocations();

    if (shouldFollow) {
        const locations = loadLocations();
        activeTarget = locations[locations.length - 1];
        updateStatusChips();
        updateNavigationDisplay();
        setMode("trail");
        return;
    }

    setMode("library");
}

function renderLocations() {
    // Render saved locations in Library.

    const container = document.getElementById("savedLocations");

    const locations = loadLocations();

    container.innerHTML = "";

    if (locations.length === 0) {
        container.innerHTML =
            "<div class='locationCard'><h3>No saved places yet.</h3><p>Use Create to save your first location.</p></div>";

        return;
    }

    locations.forEach(function(location) {
        const card = document.createElement("div");

        card.className = "locationCard";

        const distanceText = getDistanceTextForLocation(location);

        card.innerHTML =
            "<h3>" + escapeHTML(location.name) + "</h3>" +
            "<p>" +
            "Lat: " + location.latitude + "<br>" +
            "Lng: " + location.longitude + "<br>" +
            "Saved Accuracy: " + Math.round(location.accuracy) + " m<br>" +
            distanceText +
            "</p>" +
            "<div class='locationActions'>" +
            "<button class='followButton'>Follow</button>" +
            "<button class='deleteButton'>Delete</button>" +
            "</div>";

        card.querySelector(".followButton").addEventListener("click", function() {
            activeTarget = location;
            updateStatusChips();
            updateNavigationDisplay();
            setMode("trail");
        });

        card.querySelector(".deleteButton").addEventListener("click", function() {
            deleteLocationById(location.id);

            if (activeTarget && activeTarget.id === location.id) {
                activeTarget = null;
                updateNavigationDisplay();
                updateStatusChips();
            }

            renderLocations();
        });

        container.appendChild(card);
    });
}

function getDistanceTextForLocation(location) {
    // Show distance from current position if GPS is active.

    if (!gpsActive || !currentLatitude || !currentLongitude) {
        return "Distance: GPS inactive";
    }

    const distance = calculateDistanceMeters(
        currentLatitude,
        currentLongitude,
        location.latitude,
        location.longitude
    );

    return "Distance: " + formatDistance(distance);
}

function updateNavigationDisplay() {
    // Update Trail and Scan target cards.

    if (!activeTarget) {
        directionArrow.style.transform = "translate(-50%, -50%) rotate(0deg)";
        bearingReadout.textContent = "No target";

        trailTargetName.textContent = "No Active Trail";
        trailTargetHint.textContent = "Choose a saved place from Library.";
        trailDistance.textContent = "--";
        trailAccuracy.textContent = "Accuracy unknown";

        scanTargetName.textContent = "No target selected";
        scanTargetMeta.textContent = "Choose a place from Library.";

        navigationReadout.textContent = "No navigation target selected.";
        return;
    }

    trailTargetName.textContent = activeTarget.name;
    trailTargetHint.textContent = activeTarget.hint || "Follow the signal.";

    scanTargetName.textContent = activeTarget.name;
    scanTargetMeta.textContent = "Saved Location";

    if (!currentLatitude || !currentLongitude) {
        trailDistance.textContent = "--";
        trailAccuracy.textContent = "Enable GPS";
        navigationReadout.textContent = "Enable GPS to navigate.";
        return;
    }

    const distance = calculateDistanceMeters(
        currentLatitude,
        currentLongitude,
        activeTarget.latitude,
        activeTarget.longitude
    );

    const bearing = calculateBearingDegrees(
        currentLatitude,
        currentLongitude,
        activeTarget.latitude,
        activeTarget.longitude
    );

    const arrowRotation = calculateArrowRotation(
        bearing,
        phoneHeading
    );

    const directionLabel = getDirectionLabel(bearing);

    const arrived = hasArrived(distance);

    directionArrow.style.transform =
        "translate(-50%, -50%) rotate(" + arrowRotation + "deg)";

    bearingReadout.textContent =
        directionLabel + " " + Math.round(bearing) + "°";

    trailDistance.textContent = formatDistance(distance);

    trailAccuracy.textContent =
        "GPS ±" + Math.round(currentAccuracy || 0) + " m";

    navigationReadout.innerHTML =
        "Target: " + escapeHTML(activeTarget.name) +
        "<br>Distance: " + formatDistance(distance) +
        "<br>Map Direction: " + directionLabel +
        "<br>Target Bearing: " + Math.round(bearing) + "°" +
        "<br>Phone Heading: " + (phoneHeading === null ? "not enabled" : Math.round(phoneHeading) + "°") +
        "<br>Status: " + (arrived ? "Discovery reached 🎯" : "Move toward target");
}

function clearAllSavedLocations() {
    // Delete all saved locations after confirmation.

    if (!confirm("Clear all saved locations?")) {
        return;
    }

    clearLocations();

    activeTarget = null;

    updateStatusChips();
    updateNavigationDisplay();
    renderLocations();
}

function escapeHTML(text) {
    // Prevent user-entered names from becoming HTML.

    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

updateStatusChips();
updateGpsReadouts();
updateNavigationDisplay();
renderLocations();