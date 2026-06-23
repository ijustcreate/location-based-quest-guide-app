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
        error: null,
        signalReadySince: null
    },
    target: {
        savedPlaceId: null
    }
};

let activeTarget = null;
let selectedLibraryLocationId = null;
let currentSettings = loadSettings();
let currentUser = getCurrentUser();
let attuneSignalStartedAt = null;
let attuneHoldStartedAt = null;
let attuneHoldTimer = null;
let attuneCompleted = false;

const modeSubtitle = document.getElementById("modeSubtitle");
const headerLocationSelect = document.getElementById("headerLocationSelect");
const landingGate = document.getElementById("landingGate");
const foundSymbolButton = document.getElementById("foundSymbolButton");
const enterSiteButton = document.getElementById("enterSiteButton");
const authForm = document.getElementById("authForm");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const authMessage = document.getElementById("authMessage");
const accountName = document.getElementById("accountName");
const accountResources = document.getElementById("accountResources");
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettingsButton = document.getElementById("closeSettingsButton");
const saveSettingsButton = document.getElementById("saveSettingsButton");
const resetLandingButton = document.getElementById("resetLandingButton");
const settingsAccountStats = document.getElementById("settingsAccountStats");
const popularQuestStats = document.getElementById("popularQuestStats");

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
const questNameInput = document.getElementById("questNameInput");
const clueInput = document.getElementById("clueInput");
const clueAnswerInput = document.getElementById("clueAnswerInput");
const rewardTextInput = document.getElementById("rewardTextInput");
const chainNextLocationSelect = document.getElementById("chainNextLocationSelect");

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
const attunePrompt = document.getElementById("attunePrompt");
const attuneButton = document.getElementById("attuneButton");
const attuneMeterFill = document.getElementById("attuneMeterFill");

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

settingsButton.addEventListener("click", function() {
    settingsPanel.hidden = !settingsPanel.hidden;
    renderSettingsPanel();
});

closeSettingsButton.addEventListener("click", function() {
    settingsPanel.hidden = true;
});

saveSettingsButton.addEventListener("click", saveSettingsFromPanel);

resetLandingButton.addEventListener("click", function() {
    currentSettings.showLandingOnOpen = true;
    saveSettings(currentSettings);
    landingGate.hidden = false;
});

foundSymbolButton.addEventListener("click", function() {
    enterApp();
    setMode("scan");

    if (currentSettings.autoStartScanner) {
        enableScanner();
    }
});

enterSiteButton.addEventListener("click", function() {
    authForm.hidden = !authForm.hidden;
    usernameInput.focus();
});

authForm.addEventListener("submit", function(event) {
    event.preventDefault();
    handleAuthSubmit();
});

attuneButton.addEventListener("pointerdown", startAttuneHold);
attuneButton.addEventListener("pointerup", cancelAttuneHold);
attuneButton.addEventListener("pointerleave", cancelAttuneHold);
attuneButton.addEventListener("pointercancel", cancelAttuneHold);

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
            enableHighAccuracy: currentSettings.highAccuracyGps,
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
    attuneCompleted = false;
    attuneSignalStartedAt = null;
    attunePrompt.hidden = true;
    attuneMeterFill.style.width = "0%";
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
    updateAttuneAvailability();

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
    renderAccountBar();
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
        clue: clueInput.value.trim() || hintInput.value.trim(),
        clueAnswer: clueAnswerInput.value.trim(),
        rewardText: rewardTextInput.value.trim(),
        questName: questNameInput.value.trim() || "Field Quest",
        chainNextLocationId: chainNextLocationSelect.value || "",
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
    clueInput.value = "";
    clueAnswerInput.value = "";
    rewardTextInput.value = "";
    questNameInput.value = "";
    chainNextLocationSelect.value = "";

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
    renderChainSelect(locations);

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

function renderChainSelect(locations) {
    chainNextLocationSelect.innerHTML = "<option value=''>No next location yet</option>";

    locations.forEach(function(location) {
        const option = document.createElement("option");

        option.value = location.id;
        option.textContent = location.name;
        chainNextLocationSelect.appendChild(option);
    });
}

function enterApp() {
    landingGate.hidden = true;
    currentSettings.showLandingOnOpen = false;
    saveSettings(currentSettings);
    renderAppState();
}

function handleAuthSubmit() {
    const result = loginOrCreateAccount(usernameInput.value, passwordInput.value);

    authMessage.textContent = result.message;
    authMessage.classList.toggle("error", !result.ok);

    if (!result.ok) {
        return;
    }

    currentUser = result.user;
    enterApp();
    renderLocations();
    renderAppState();
}

function renderAccountBar() {
    currentUser = getCurrentUser();

    if (!currentUser) {
        accountName.textContent = "Guest";
        accountResources.textContent = "R1 0 - R2 0 - R3 0 - R4 0";
        return;
    }

    accountName.textContent = currentUser.username + " · " + currentUser.points + " pts";
    accountResources.textContent =
        "R1 " + currentUser.resources.resource1 +
        " - R2 " + currentUser.resources.resource2 +
        " - R3 " + currentUser.resources.resource3 +
        " - R4 " + currentUser.resources.resource4;
}

function renderSettingsPanel() {
    document.getElementById("settingHighAccuracyGps").checked = currentSettings.highAccuracyGps;
    document.getElementById("settingAutoStartScanner").checked = currentSettings.autoStartScanner;
    document.getElementById("settingSoundCues").checked = currentSettings.soundCues;
    document.getElementById("settingHapticCues").checked = currentSettings.hapticCues;
    document.getElementById("settingShowTechnicalDetails").checked = currentSettings.showTechnicalDetails;
    document.getElementById("settingHideExactCoordinates").checked = currentSettings.hideExactCoordinates;
    document.getElementById("settingScannerSensitivity").value = currentSettings.scannerSensitivity;
    document.getElementById("settingAttuneThreshold").value = currentSettings.attuneThreshold;
    document.getElementById("settingRewardResource1").value = currentSettings.rewardResource1;
    document.getElementById("settingRewardResource2").value = currentSettings.rewardResource2;

    renderAccountBar();

    if (currentUser) {
        settingsAccountStats.innerHTML =
            "<p><strong>" + escapeHTML(currentUser.username) + "</strong></p>" +
            "<p>Points: " + currentUser.points + "</p>" +
            "<p>Created: " + currentUser.createdLocationIds.length + " · Unlocked: " + currentUser.unlockedLocationIds.length + "</p>" +
            "<p>Captures: " + currentUser.captureHistory.length + " · Visits: " + currentUser.visitHistory.length + "</p>";
    } else {
        settingsAccountStats.textContent = "No account signed in.";
    }

    const popular = getPopularQuestStats().slice(0, 6);

    popularQuestStats.innerHTML = popular.length === 0 ?
        "<p>No captures yet.</p>" :
        popular.map(function(stat, index) {
            return "<p>" + (index + 1) + ". <strong>" + escapeHTML(stat.locationName) + "</strong><br>" +
                escapeHTML(stat.questName) + " · " + stat.points + " pts · " + stat.captures + " captures</p>";
        }).join("");
}

function saveSettingsFromPanel() {
    currentSettings = Object.assign(
        {},
        currentSettings,
        {
            highAccuracyGps: document.getElementById("settingHighAccuracyGps").checked,
            autoStartScanner: document.getElementById("settingAutoStartScanner").checked,
            soundCues: document.getElementById("settingSoundCues").checked,
            hapticCues: document.getElementById("settingHapticCues").checked,
            showTechnicalDetails: document.getElementById("settingShowTechnicalDetails").checked,
            hideExactCoordinates: document.getElementById("settingHideExactCoordinates").checked,
            scannerSensitivity: document.getElementById("settingScannerSensitivity").value,
            attuneThreshold: Number(document.getElementById("settingAttuneThreshold").value || 75),
            rewardResource1: Number(document.getElementById("settingRewardResource1").value || 0),
            rewardResource2: Number(document.getElementById("settingRewardResource2").value || 0)
        }
    );

    saveSettings(currentSettings);
    renderSettingsPanel();
}

function updateAttuneAvailability() {
    const threshold = Number(currentSettings.attuneThreshold || 75);
    const signalSeconds = Number(currentSettings.attuneSignalSeconds || 3);
    const confidenceReady = appState.scanner.lockConfidence >= threshold;

    if (!confidenceReady || attuneCompleted) {
        attuneSignalStartedAt = null;
        attunePrompt.hidden = true;
        cancelAttuneHold();
        return;
    }

    if (attuneSignalStartedAt === null) {
        attuneSignalStartedAt = Date.now();
    }

    const readyForMs = Date.now() - attuneSignalStartedAt;
    attunePrompt.hidden = readyForMs < signalSeconds * 1000;
}

function startAttuneHold(event) {
    event.preventDefault();

    if (attunePrompt.hidden || attuneCompleted) {
        return;
    }

    attuneHoldStartedAt = Date.now();
    attuneButton.setPointerCapture?.(event.pointerId);

    if (attuneHoldTimer) {
        clearInterval(attuneHoldTimer);
    }

    attuneHoldTimer = setInterval(updateAttuneHold, 50);
    updateAttuneHold();
}

function updateAttuneHold() {
    if (attuneHoldStartedAt === null) {
        return;
    }

    const holdMs = Number(currentSettings.attuneHoldSeconds || 3) * 1000;
    const progress = Math.min(1, (Date.now() - attuneHoldStartedAt) / holdMs);

    attuneMeterFill.style.width = Math.round(progress * 100) + "%";

    if (progress >= 1) {
        completeAttuneCapture();
    }
}

function cancelAttuneHold() {
    attuneHoldStartedAt = null;

    if (attuneHoldTimer) {
        clearInterval(attuneHoldTimer);
        attuneHoldTimer = null;
    }

    if (!attuneCompleted) {
        attuneMeterFill.style.width = "0%";
    }
}

function completeAttuneCapture() {
    if (attuneCompleted) {
        return;
    }

    attuneCompleted = true;
    cancelAttuneHold();
    attuneMeterFill.style.width = "100%";
    attunePrompt.hidden = true;

    const captureLocation = activeTarget || {
        id: "unbound-sigil",
        name: "Unbound Sigil",
        questName: "Scanner Discovery",
        chainNextLocationId: "",
        rewardText: "You captured an unbound symbol."
    };

    const result = recordLocationCapture(captureLocation);
    currentUser = getCurrentUser();
    renderAccountBar();
    renderLocations();
    renderSettingsPanel();

    const nextLocation = captureLocation.chainNextLocationId ?
        loadLocations().find(function(location) {
            return location.id === captureLocation.chainNextLocationId;
        }) :
        null;

    if (nextLocation) {
        showModal({
            title: "Captured",
            message: (captureLocation.rewardText || "You gained one point.") + " Next location: " + nextLocation.name,
            actions: [
                {
                    label: "Follow Next",
                    className: "primaryButton",
                    onClick: function() {
                        hideModal();
                        setActiveTarget(nextLocation);
                        setMode("trail");
                    }
                },
                { label: "Stay Here", className: "secondaryButton", onClick: hideModal }
            ]
        });
        return;
    }

    showModal({
        title: "Captured",
        message: (captureLocation.rewardText || "You gained one point.") +
            " Account points: " + (result && result.user ? result.user.points : 0),
        actions: [
            { label: "Nice", className: "primaryButton", onClick: hideModal }
        ]
    });
}

function renderLocationDetail(container, location) {
    const card = document.createElement("div");
    const distanceText = getDistanceTextForLocation(location);
    const savedMeta = "Saved nearby - Accuracy " + Math.round(location.accuracy || 0) + "m";
    const createdAt = location.createdAt ? new Date(location.createdAt).toLocaleString() : "Unknown";
    const nextLocation = loadLocations().find(function(savedLocation) {
        return savedLocation.id === location.chainNextLocationId;
    });
    const visitorText = location.visitedBy.length === 0 ?
        "No captures yet" :
        location.visitedBy.map(function(visit) {
            return escapeHTML(visit.username) + " at " + escapeHTML(new Date(visit.visitedAt).toLocaleString());
        }).join("<br>");

    card.className = "locationCard libraryDetail";
    card.innerHTML =
        "<div class='locationDetailHeader'>" +
        "<div><div class='sectionLabel'>" + escapeHTML(location.questName) + "</div><h3>" + escapeHTML(location.name) + "</h3></div>" +
        "</div>" +
        "<p class='locationHint'>" + escapeHTML(location.hint || "No clue saved yet.") + "</p>" +
        "<div class='clueBlock'>" +
        "<strong>Clue</strong>" +
        "<p>" + escapeHTML(location.clue || "No clue text yet.") + "</p>" +
        "<small>Answer: " + escapeHTML(location.clueAnswer || "Scanner capture") + "</small>" +
        "</div>" +
        "<div class='libraryMetaGrid'>" +
        "<div><small>Status</small><strong>" + escapeHTML(distanceText) + "</strong></div>" +
        "<div><small>Saved</small><strong>" + escapeHTML(createdAt) + "</strong></div>" +
        "<div><small>Accuracy</small><strong>" + Math.round(location.accuracy || 0) + " m</strong></div>" +
        "<div><small>Facing</small><strong>" + escapeHTML(formatFacing(location.facingDegrees)) + "</strong></div>" +
        "<div><small>Next</small><strong>" + escapeHTML(nextLocation ? nextLocation.name : "Reward screen") + "</strong></div>" +
        "<div><small>Captures</small><strong>" + location.capturedCount + "</strong></div>" +
        "</div>" +
        "<p class='rewardText'>" + escapeHTML(location.rewardText || "Reward: +1 point") + "</p>" +
        "<details class='technicalDetails'" + (currentSettings.showTechnicalDetails ? " open" : "") + ">" +
        "<summary>Visit history</summary>" +
        "<p>" + visitorText + "</p>" +
        "</details>" +
        "<p class='savedMeta'>" + escapeHTML(savedMeta) + "</p>" +
        "<details class='technicalDetails'" + (currentSettings.showTechnicalDetails ? " open" : "") + ">" +
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

    if (location) {
        recordLocationVisit(location, "target-selected");
    }

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

loadAccounts();
landingGate.hidden = currentSettings.showLandingOnOpen === false;
renderAppState();
renderLocations();
