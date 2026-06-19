// ==================================================
// Quest Compass Main App
// ==================================================

const appState = {
    activeTab: "trail",
    gps: {
        status: "off",
        latitude: null,
        longitude: null,
        accuracyMeters: null,
        error: null
    },
    compass: {
        status: "off",
        headingDegrees: null,
        error: null
    },
    scanner: {
        status: "off",
        colorSignal: 0,
        symbolMatch: 0,
        lightQuality: 0,
        frameStability: 0,
        lockConfidence: 0,
        lockedAt: null,
        error: null
    },
    target: {
        savedPlaceId: null
    }
};

let activeTarget = null;
let selectedLibraryLocationId = null;

const modeSubtitle = document.getElementById("modeSubtitle");
const headerLocationSelect = document.getElementById("headerLocationSelect");

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

const colorSignalBar = document.getElementById("redSignalBar");
const symbolMatchBar = document.getElementById("shapeMatchBar");
const lightQualityBar = document.getElementById("lightingBar");
const frameStabilityBar = document.getElementById("stabilityBar");
const confidenceBar = document.getElementById("confidenceBar");

const colorSignalText = document.getElementById("redSignalText");
const symbolMatchText = document.getElementById("shapeMatchText");
const lightQualityText = document.getElementById("lightingText");
const frameStabilityText = document.getElementById("stabilityText");
const confidenceText = document.getElementById("confidenceText");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalActions = document.getElementById("modalActions");

document.querySelectorAll(".navButton").forEach(function(button) {
    button.addEventListener("click", function() {
        setMode(button.dataset.mode);
    });
});

gpsChip.addEventListener("click", enableGPS);
compassChip.addEventListener("click", enableCompass);

scannerChip.addEventListener("click", function() {
    setMode("scan");

    if (appState.scanner.status === "off" || appState.scanner.status === "error") {
        enableScanner();
    }
});

targetChip.addEventListener("click", function() {
    setMode("library");
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

headerLocationSelect.addEventListener("change", function() {
    selectedLibraryLocationId = headerLocationSelect.value || null;
    renderLocations();
});

modalOverlay.addEventListener("click", function(event) {
    if (event.target === modalOverlay) {
        hideModal();
    }
});

function setMode(mode) {
    appState.activeTab = mode;

    document.querySelectorAll(".modePanel").forEach(function(panel) {
        panel.classList.remove("activePanel");
    });

    document.querySelectorAll(".navButton").forEach(function(button) {
        button.classList.remove("activeNav");
    });

    document.getElementById(mode + "Panel").classList.add("activePanel");
    document.querySelector("[data-mode='" + mode + "']").classList.add("activeNav");

    document.body.classList.toggle("scanActive", mode === "scan" && appState.scanner.status !== "off");

    if (mode === "library") {
        renderLocations();
    }

    renderAppState();
}

function enableGPS() {
    if (!navigator.geolocation) {
        appState.gps.status = "error";
        appState.gps.error = "GPS is not supported on this device.";
        renderAppState();
        return;
    }

    appState.gps.status = "requesting";
    appState.gps.error = null;
    renderAppState();

    navigator.geolocation.watchPosition(
        function(position) {
            appState.gps.status = "active";
            appState.gps.latitude = position.coords.latitude;
            appState.gps.longitude = position.coords.longitude;
            appState.gps.accuracyMeters = position.coords.accuracy;
            appState.gps.error = null;

            renderAppState();
            renderLocations();
        },
        function(error) {
            appState.gps.status = "error";
            appState.gps.error = error.message;
            renderAppState();
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
}

function enableCompass() {
    appState.compass.status = "requesting";
    renderAppState();

    if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
        DeviceOrientationEvent.requestPermission()
            .then(function(permissionState) {
                if (permissionState === "granted") {
                    startCompassListener();
                } else {
                    appState.compass.status = "error";
                    appState.compass.error = "Compass permission denied.";
                    renderAppState();
                }
            })
            .catch(function(error) {
                appState.compass.status = "error";
                appState.compass.error = error.message;
                renderAppState();
            });

        return;
    }

    startCompassListener();
}

function startCompassListener() {
    appState.compass.status = "calibrated";
    appState.compass.error = null;

    window.addEventListener("deviceorientation", handleDeviceOrientation, true);

    renderAppState();
}

function handleDeviceOrientation(event) {
    if (typeof event.webkitCompassHeading === "number") {
        appState.compass.headingDegrees = event.webkitCompassHeading;
    } else if (typeof event.alpha === "number") {
        appState.compass.headingDegrees = normalizeDegrees(360 - event.alpha);
    } else {
        appState.compass.status = "error";
        appState.compass.error = "Phone heading unavailable.";
    }

    renderAppState();
}

function enableScanner() {
    appState.scanner.status = "searching";
    renderAppState();

    startCameraMarkerDetection(
        cameraVideo,
        cameraCanvas,
        updateScannerUI
    );
}

function updateScannerUI(result) {
    appState.scanner.status = result.status || (result.confirmed ? "sigilLocked" : "searching");
    appState.scanner.colorSignal = result.colorSignal || 0;
    appState.scanner.symbolMatch = result.symbolMatch || 0;
    appState.scanner.lightQuality = result.lightQuality || 0;
    appState.scanner.frameStability = result.frameStability || 0;
    appState.scanner.lockConfidence = result.lockConfidence || 0;
    appState.scanner.lockedAt = result.confirmed ? appState.scanner.lockedAt || new Date().toISOString() : null;
    appState.scanner.error = result.status === "error" ? result.message : null;

    markerTitle.textContent = result.title;
    markerMessage.textContent = result.holdProgress && !result.confirmed ?
        result.message + " Locking " + result.holdProgress + "%." :
        result.message;

    updateBar(colorSignalBar, colorSignalText, appState.scanner.colorSignal);
    updateBar(symbolMatchBar, symbolMatchText, appState.scanner.symbolMatch);
    updateBar(lightQualityBar, lightQualityText, appState.scanner.lightQuality);
    updateBar(frameStabilityBar, frameStabilityText, appState.scanner.frameStability);
    updateBar(confidenceBar, confidenceText, appState.scanner.lockConfidence);

    renderAppState();
}

function updateBar(barElement, textElement, value) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value || 0)));

    barElement.style.width = safeValue + "%";
    textElement.textContent = safeValue + "%";
}

function renderAppState() {
    modeSubtitle.textContent = getHeaderSubtitle();
    modeSubtitle.hidden = appState.activeTab === "library";
    headerLocationSelect.hidden = appState.activeTab !== "library";
    renderStatusChips();
    renderGpsReadouts();
    renderCompassReadout();
    updateNavigationDisplay();
}

function getHeaderSubtitle() {
    if (appState.activeTab === "scan") {
        if (appState.scanner.status === "sigilLocked") return "Sigil Locked";
        if (appState.scanner.status === "signalFound") return "Signal Found";
        if (appState.scanner.status === "holdingSteady") return "Hold Steady";
        return "Sigil Scan";
    }

    if (appState.activeTab === "create") return "Forge Quest";
    if (appState.activeTab === "library") return "Field Notes";

    if (!activeTarget) return "Trail Idle";
    if (appState.gps.status !== "active") return "Target Locked";
    return "Trail Active";
}

function renderStatusChips() {
    const gpsActive = appState.gps.status === "active";
    const compassReady = appState.compass.status === "calibrated";
    const scannerReady = appState.scanner.status !== "off" && appState.scanner.status !== "error";
    const hasTarget = activeTarget !== null;

    gpsChip.classList.toggle("active", gpsActive);
    compassChip.classList.toggle("active", compassReady);
    scannerChip.classList.toggle("active", scannerReady);
    targetChip.classList.toggle("active", hasTarget);

    gpsChip.classList.toggle("warning", appState.gps.status === "requesting");
    compassChip.classList.toggle("warning", appState.compass.status === "requesting");
    scannerChip.classList.toggle("warning", appState.scanner.status === "signalFound" || appState.scanner.status === "holdingSteady");

    gpsChipText.textContent = getGpsChipLabel();
    compassChipText.textContent = getCompassChipLabel();
    scannerChipText.textContent = getScannerChipLabel();
    targetChipText.textContent = hasTarget ? "Locked" : "None";
}

function getGpsChipLabel() {
    if (appState.gps.status === "requesting") return "Requesting";
    if (appState.gps.status === "active") return "Active";
    if (appState.gps.status === "error") return "Error";
    return "Off";
}

function getCompassChipLabel() {
    if (appState.compass.status === "requesting") return "Requesting";
    if (appState.compass.status === "calibrated") return "Calibrated";
    if (appState.compass.status === "error") return "Error";
    return "Off";
}

function getScannerChipLabel() {
    if (appState.scanner.status === "sigilLocked") return "Locked";
    if (appState.scanner.status === "holdingSteady") return "Holding";
    if (appState.scanner.status === "signalFound") return "Signal";
    if (appState.scanner.status === "searching") return "Active";
    if (appState.scanner.status === "error") return "Error";
    return "Off";
}

function renderGpsReadouts() {
    if (appState.gps.status === "error") {
        gpsReadout.textContent = "GPS Error: " + appState.gps.error;
        createGpsReadout.textContent = "GPS unavailable: " + appState.gps.error;
        return;
    }

    if (appState.gps.status === "requesting") {
        gpsReadout.textContent = "Requesting GPS permission...";
        createGpsReadout.textContent = "Requesting GPS permission...";
        return;
    }

    if (appState.gps.status !== "active") {
        gpsReadout.textContent = "GPS inactive.";
        createGpsReadout.textContent = "Enable GPS to capture this place.";
        return;
    }

    const text =
        "GPS Active<br>Accuracy: " + Math.round(appState.gps.accuracyMeters || 0) + " m" +
        "<br>" + getFacingText();

    gpsReadout.innerHTML = text;
    createGpsReadout.innerHTML = text;
}

function renderCompassReadout() {
    if (appState.compass.status === "error") {
        headingReadout.textContent = "Compass error: " + appState.compass.error;
        return;
    }

    if (appState.compass.status === "requesting") {
        headingReadout.textContent = "Requesting compass permission...";
        return;
    }

    if (appState.compass.status !== "calibrated") {
        headingReadout.textContent = "Compass inactive. Calibrate heading when ready.";
        return;
    }

    headingReadout.textContent =
        appState.compass.headingDegrees === null ?
            "Compass active. Rotate phone to update heading." :
            "Phone heading: " + Math.round(appState.compass.headingDegrees) + " degrees";
}

function savePlace(shouldFollow) {
    if (appState.gps.status !== "active" || appState.gps.latitude === null || appState.gps.longitude === null) {
        showModal({
            title: "Location Needed",
            message: "Enable GPS before saving this place.",
            actions: [
                { label: "Enable GPS", className: "primaryButton", onClick: enableGPS },
                { label: "Not now", className: "secondaryButton", onClick: hideModal }
            ]
        });
        return;
    }

    const name = placeNameInput.value.trim();

    if (!name) {
        showModal({
            title: "Name Needed",
            message: "Give this place a name before saving it.",
            actions: [
                { label: "OK", className: "primaryButton", onClick: hideModal }
            ]
        });
        return;
    }

    const newLocation = {
        name: name,
        hint: hintInput.value.trim(),
        latitude: appState.gps.latitude,
        longitude: appState.gps.longitude,
        accuracy: appState.gps.accuracyMeters,
        facingDegrees: appState.compass.headingDegrees,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    addLocation(newLocation);

    placeNameInput.value = "";
    hintInput.value = "";

    renderLocations();

    if (shouldFollow) {
        const locations = loadLocations();
        setActiveTarget(locations[locations.length - 1]);
        setMode("trail");
        return;
    }

    setMode("library");
}

function renderLocations() {
    const container = document.getElementById("savedLocations");
    const locations = loadLocations();

    renderLibrarySelect(locations);

    container.innerHTML = "";

    if (locations.length === 0) {
        container.innerHTML =
            "<div class='locationCard'><h3>No saved places yet.</h3><p>Use Create to save your first location.</p></div>";

        return;
    }

    if (!selectedLibraryLocationId || !locations.some(function(location) {
        return location.id === selectedLibraryLocationId;
    })) {
        selectedLibraryLocationId = locations[0].id;
        headerLocationSelect.value = selectedLibraryLocationId;
    }

    const selectedLocation = locations.find(function(location) {
        return location.id === selectedLibraryLocationId;
    });

    renderLocationDetail(container, selectedLocation);
}
function renderLibrarySelect(locations) {
    headerLocationSelect.innerHTML = "";

    if (locations.length === 0) {
        const option = document.createElement("option");

        option.value = "";
        option.textContent = "No saved places";
        headerLocationSelect.appendChild(option);
        selectedLibraryLocationId = null;
        return;
    }

    locations.forEach(function(location) {
        const option = document.createElement("option");

        option.value = location.id;
        option.textContent = location.name;
        headerLocationSelect.appendChild(option);
    });

    if (!selectedLibraryLocationId) {
        selectedLibraryLocationId = locations[0].id;
    }

    headerLocationSelect.value = selectedLibraryLocationId;
}

function renderLocationDetail(container, location) {
    const card = document.createElement("div");
    const distanceText = getDistanceTextForLocation(location);
    const savedMeta = "Saved nearby - Accuracy " + Math.round(location.accuracy || 0) + "m";
    const createdAt = location.createdAt ? new Date(location.createdAt).toLocaleString() : "Unknown";

    card.className = "locationCard libraryDetail";
    card.innerHTML =
        "<div class='locationDetailHeader'>" +
        "<div><div class='sectionLabel'>SELECTED PLACE</div><h3>" + escapeHTML(location.name) + "</h3></div>" +
        "</div>" +
        "<p class='locationHint'>" + escapeHTML(location.hint || "No clue saved yet.") + "</p>" +
        "<div class='libraryMetaGrid'>" +
        "<div><small>Status</small><strong>" + escapeHTML(distanceText) + "</strong></div>" +
        "<div><small>Saved</small><strong>" + escapeHTML(createdAt) + "</strong></div>" +
        "<div><small>Accuracy</small><strong>" + Math.round(location.accuracy || 0) + " m</strong></div>" +
        "<div><small>Facing</small><strong>" + escapeHTML(formatFacing(location.facingDegrees)) + "</strong></div>" +
        "</div>" +
        "<p class='savedMeta'>" + escapeHTML(savedMeta) + "</p>" +
        "<details class='technicalDetails'>" +
        "<summary>Show technical details</summary>" +
        "<p>Lat: " + escapeHTML(location.latitude) +
        "<br>Lng: " + escapeHTML(location.longitude) +
        "<br>ID: " + escapeHTML(location.id) +
        "</p>" +
        "</details>" +
        "<div class='locationActions'>" +
        "<button class='followButton'>Begin Trail</button>" +
        "<button class='editButton'>Edit</button>" +
        "<button class='deleteButton'>Delete</button>" +
        "</div>";

    card.querySelector(".followButton").addEventListener("click", function() {
        setActiveTarget(location);
        setMode("trail");
    });

    card.querySelector(".editButton").addEventListener("click", function() {
        showModal({
            title: location.name,
            message: location.hint || "No clue saved yet.",
            actions: [
                { label: "Close", className: "primaryButton", onClick: hideModal }
            ]
        });
    });

    card.querySelector(".deleteButton").addEventListener("click", function() {
        showModal({
            title: "Delete Place",
            message: "Remove " + location.name + " from Field Notes?",
            actions: [
                {
                    label: "Delete",
                    className: "dangerButton",
                    onClick: function() {
                        deleteLocationById(location.id);

                        if (activeTarget && activeTarget.id === location.id) {
                            setActiveTarget(null);
                        }

                        selectedLibraryLocationId = null;
                        hideModal();
                        renderLocations();
                    }
                },
                { label: "Cancel", className: "secondaryButton", onClick: hideModal }
            ]
        });
    });

    container.appendChild(card);
}

function setActiveTarget(location) {
    activeTarget = location;
    appState.target.savedPlaceId = location ? location.id : null;
    renderAppState();
}

function getDistanceTextForLocation(location) {
    if (appState.gps.status !== "active" || appState.gps.latitude === null || appState.gps.longitude === null) {
        return "Distance unavailable - GPS off";
    }

    const distance = calculateDistanceMeters(
        appState.gps.latitude,
        appState.gps.longitude,
        location.latitude,
        location.longitude
    );

    return "Distance: " + formatDistance(distance);
}

function getFacingText() {
    return "Facing: " + formatFacing(appState.compass.headingDegrees);
}

function formatFacing(degrees) {
    const number = Number(degrees);

    if (!Number.isFinite(number)) {
        return "Not captured";
    }

    const normalized = normalizeDegrees(number);

    return Math.round(normalized) + " degrees " + getDirectionLabel(normalized);
}

function updateNavigationDisplay() {
    if (!activeTarget) {
        directionArrow.style.transform = "translate(-50%, -50%) rotate(0deg)";
        bearingReadout.textContent = "No target";

        trailTargetName.textContent = "No Active Trail";
        trailTargetHint.textContent = "Choose a saved place from Field Notes.";
        trailDistance.textContent = "--";
        trailAccuracy.textContent = "Accuracy unknown";

        scanTargetName.textContent = "No target selected";
        scanTargetMeta.textContent = "Choose a place from Field Notes.";

        navigationReadout.textContent = "No navigation target selected.";
        return;
    }

    trailTargetName.textContent = activeTarget.name;
    trailTargetHint.textContent = activeTarget.hint || "Follow the signal.";

    scanTargetName.textContent = activeTarget.name;
    scanTargetMeta.textContent = "Saved Location";

    if (appState.gps.status !== "active" || appState.gps.latitude === null || appState.gps.longitude === null) {
        directionArrow.style.transform = "translate(-50%, -50%) rotate(0deg)";
        bearingReadout.textContent = "Enable GPS";
        trailDistance.textContent = "GPS inactive";
        trailAccuracy.textContent = "Enable GPS";
        navigationReadout.textContent = "Target locked. Enable GPS to calculate distance.";
        return;
    }

    const distance = calculateDistanceMeters(
        appState.gps.latitude,
        appState.gps.longitude,
        activeTarget.latitude,
        activeTarget.longitude
    );

    const bearing = calculateBearingDegrees(
        appState.gps.latitude,
        appState.gps.longitude,
        activeTarget.latitude,
        activeTarget.longitude
    );

    const arrowRotation = calculateArrowRotation(bearing, appState.compass.headingDegrees);
    const directionLabel = getDirectionLabel(bearing);
    const arrived = hasArrived(distance);

    directionArrow.style.transform =
        "translate(-50%, -50%) rotate(" + arrowRotation + "deg)";

    bearingReadout.textContent =
        appState.compass.status === "calibrated" ?
            directionLabel + " " + Math.round(bearing) + " degrees" :
            "Calibrate heading";

    trailDistance.textContent = formatDistance(distance);
    trailAccuracy.textContent = "GPS +/-" + Math.round(appState.gps.accuracyMeters || 0) + " m";

    navigationReadout.innerHTML =
        "Target: " + escapeHTML(activeTarget.name) +
        "<br>Distance: " + formatDistance(distance) +
        "<br>Map Direction: " + directionLabel +
        "<br>Target Bearing: " + Math.round(bearing) + " degrees" +
        "<br>Phone Heading: " + (appState.compass.headingDegrees === null ? "not enabled" : Math.round(appState.compass.headingDegrees) + " degrees") +
        "<br>Status: " + (arrived ? "Discovery reached" : "Move toward target");
}

function clearAllSavedLocations() {
    showModal({
        title: "Clear Field Notes",
        message: "Delete every saved place from this browser?",
        actions: [
            {
                label: "Clear All",
                className: "dangerButton",
                onClick: function() {
                    clearLocations();
                    setActiveTarget(null);
                    hideModal();
                    renderLocations();
                }
            },
            { label: "Cancel", className: "secondaryButton", onClick: hideModal }
        ]
    });
}

function showModal(config) {
    modalTitle.textContent = config.title;
    modalMessage.textContent = config.message;
    modalActions.innerHTML = "";

    config.actions.forEach(function(action) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = action.className || "secondaryButton";
        button.textContent = action.label;
        button.addEventListener("click", action.onClick);

        modalActions.appendChild(button);
    });

    modalOverlay.hidden = false;
}

function hideModal() {
    modalOverlay.hidden = true;
}

function escapeHTML(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

renderAppState();
renderLocations();
