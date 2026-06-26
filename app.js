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
    },
    scannerOverlay: false
};

let activeTarget = null;
let selectedLibraryLocationId = null;
let currentSettings = loadSettings();
let currentUser = getCurrentUser();
let attuneSignalStartedAt = null;
let attuneHoldStartedAt = null;
let attuneHoldTimer = null;
let attuneCompleted = false;
let pendingLocationImageDataUrl = "";
let lastScannerCueStatus = "";
let libraryView = "mine";
let pendingGpsCallbacks = [];
let lastGlyphCompletionKey = "";
let pendingGlyphAttune = null;
let pendingGlyphIconDataUrls = ["", "", ""];

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
const settingsClearButton = document.getElementById("settingsClearButton");
const settingsAccountStats = document.getElementById("settingsAccountStats");
const popularQuestStats = document.getElementById("popularQuestStats");
const adminTools = document.getElementById("adminTools");
const exportDataButton = document.getElementById("exportDataButton");
const importDataButton = document.getElementById("importDataButton");
const resetDebugButton = document.getElementById("resetDebugButton");

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
const glyphProgressText = document.getElementById("glyphProgressText");
const foundGlyphButton = document.getElementById("foundGlyphButton");

const scanTargetName = document.getElementById("scanTargetName");
const scanTargetMeta = document.getElementById("scanTargetMeta");

const placeNameInput = document.getElementById("placeNameInput");
const hintInput = document.getElementById("hintInput");
const questNameInput = document.getElementById("questNameInput");
const clueInput = document.getElementById("clueInput");
const clueAnswerInput = document.getElementById("clueAnswerInput");
const rewardTextInput = document.getElementById("rewardTextInput");
const rewardTypeSelect = document.getElementById("rewardTypeSelect");
const rewardRaritySelect = document.getElementById("rewardRaritySelect");
const chainNextLocationSelect = document.getElementById("chainNextLocationSelect");
const locationImageInput = document.getElementById("locationImageInput");
const locationImageButton = document.querySelector(".mapPin");
const glyphColor1 = document.getElementById("glyphColor1");
const glyphColor2 = document.getElementById("glyphColor2");
const glyphColor3 = document.getElementById("glyphColor3");
const glyphShape1 = document.getElementById("glyphShape1");
const glyphShape2 = document.getElementById("glyphShape2");
const glyphShape3 = document.getElementById("glyphShape3");
const glyphIcon1 = document.getElementById("glyphIcon1");
const glyphIcon2 = document.getElementById("glyphIcon2");
const glyphIcon3 = document.getElementById("glyphIcon3");
const glyphRequired1 = document.getElementById("glyphRequired1");
const glyphRequired2 = document.getElementById("glyphRequired2");
const glyphRequired3 = document.getElementById("glyphRequired3");

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
const confirmFoundButton = document.getElementById("confirmFoundButton");
const targetIconElement = document.querySelector(".targetIcon");

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

foundGlyphButton.addEventListener("click", function() {
    requestGpsThen(function() {
        appState.scannerOverlay = true;
        setMode("scan");
        if (appState.scanner.status === "off" || appState.scanner.status === "error") {
            enableScanner();
        }
    });
});

document.getElementById("scanCameraButton").addEventListener("click", enableScanner);

document.getElementById("createSaveButton").addEventListener("click", function() {
    savePlace(false);
});

document.getElementById("createSaveFollowButton").addEventListener("click", function() {
    savePlace(true);
});

document.getElementById("clearButton").addEventListener("click", clearAllSavedLocations);
settingsClearButton.addEventListener("click", clearAllSavedLocations);

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

exportDataButton.addEventListener("click", function() {
    showModal({
        title: "Export Quest Data",
        message: exportQuestData(),
        actions: [
            { label: "Close", className: "primaryButton", onClick: hideModal }
        ]
    });
});

importDataButton.addEventListener("click", function() {
    const json = window.prompt("Paste exported Quest Compass data");

    if (!json) {
        return;
    }

    try {
        importQuestData(json);
        currentUser = getCurrentUser();
        renderLocations();
        renderAppState();
        showModal({
            title: "Import Complete",
            message: "Quest data imported.",
            actions: [{ label: "OK", className: "primaryButton", onClick: hideModal }]
        });
    } catch (error) {
        showModal({
            title: "Import Failed",
            message: error.message,
            actions: [{ label: "OK", className: "primaryButton", onClick: hideModal }]
        });
    }
});

resetDebugButton.addEventListener("click", function() {
    resetQuestDebugData();
    renderLocations();
    renderSettingsPanel();
});

foundSymbolButton.addEventListener("click", function() {
    enterApp(false);
    requestGpsThen(function() {
        setMode("scan");

        if (currentSettings.autoStartScanner) {
            enableScanner();
        }
    });
});

enterSiteButton.addEventListener("click", function() {
    enterApp();
});

authForm.addEventListener("submit", function(event) {
    event.preventDefault();
    handleAuthSubmit();
});

document.querySelectorAll(".libraryTab").forEach(function(button) {
    button.addEventListener("click", function() {
        libraryView = button.dataset.libraryView;
        renderLocations();
    });
});

attuneButton.addEventListener("pointerdown", startAttuneHold);
attuneButton.addEventListener("pointerup", cancelAttuneHold);
attuneButton.addEventListener("pointerleave", cancelAttuneHold);
attuneButton.addEventListener("pointercancel", cancelAttuneHold);
confirmFoundButton.addEventListener("click", confirmFoundLocation);
locationImageInput.addEventListener("change", handleLocationImageSelected);
glyphIcon1.addEventListener("change", function(event) { handleGlyphIconSelected(event, 0); });
glyphIcon2.addEventListener("change", function(event) { handleGlyphIconSelected(event, 1); });
glyphIcon3.addEventListener("change", function(event) { handleGlyphIconSelected(event, 2); });
locationImageButton.addEventListener("click", function() {
    if (pendingLocationImageDataUrl) {
        showImagePreview(pendingLocationImageDataUrl, "Location Photo");
    }
});

modalOverlay.addEventListener("click", function(event) {
    if (event.target === modalOverlay) {
        hideModal();
    }
});

function setMode(mode) {
    const leavingScan = appState.activeTab === "scan" && mode !== "scan";

    if (mode !== "scan") {
        appState.scannerOverlay = false;
    }

    if (leavingScan) {
        disableScanner();
    }

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
    document.body.classList.toggle("trailScannerOverlay", appState.scannerOverlay && mode === "scan");

    if (mode === "library") {
        renderLocations();
    }

    renderAppState();
}

function requestGpsThen(callback) {
    if (appState.gps.status === "active") {
        callback();
        return;
    }

    pendingGpsCallbacks.push(callback);

    showModal({
        title: "GPS Needed",
        message: "Quest Compass needs GPS on so glyph captures can be matched to nearby known locations.",
        actions: [
            {
                label: "Turn On GPS",
                className: "primaryButton",
                onClick: function() {
                    hideModal();
                    enableGPS();
                }
            },
            { label: "Cancel", className: "secondaryButton", onClick: hideModal }
        ]
    });
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

            const callbacks = pendingGpsCallbacks.splice(0);
            callbacks.forEach(function(callback) {
                callback();
            });
            renderAppState();
            renderLocations();
        },
        function(error) {
            appState.gps.status = "error";
            appState.gps.error = error.message;
            pendingGpsCallbacks = [];
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
    if (appState.gps.status !== "active") {
        requestGpsThen(enableScanner);
        return;
    }

    appState.scanner.status = "searching";
    attuneCompleted = false;
    pendingGlyphAttune = null;
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

function disableScanner() {
    stopCameraMarkerDetection(cameraVideo, cameraCanvas);
    appState.scanner.status = "off";
    appState.scanner.colorSignal = 0;
    appState.scanner.symbolMatch = 0;
    appState.scanner.lightQuality = 0;
    appState.scanner.frameStability = 0;
    appState.scanner.lockConfidence = 0;
    appState.scanner.lockedAt = null;
    appState.scanner.error = null;
    pendingGlyphAttune = null;
    confirmFoundButton.hidden = true;
    attunePrompt.hidden = true;
}

function updateScannerUI(result) {
    appState.scanner.status = result.status || (result.confirmed ? "sigilLocked" : "searching");
    appState.scanner.colorSignal = result.colorSignal || 0;
    appState.scanner.symbolMatch = result.symbolMatch || 0;
    appState.scanner.lightQuality = result.lightQuality || 0;
    appState.scanner.frameStability = result.frameStability || 0;
    appState.scanner.lockConfidence = result.lockConfidence || 0;
    appState.scanner.colorFamily = result.colorFamily || "";
    appState.scanner.shape = result.shape || "";
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
    handleGlyphScanResult(result);
    updateConfirmFoundButton();
    playScannerCue(appState.scanner.status);
    updateAttuneAvailability();

    renderAppState();
}

function handleGlyphScanResult(result) {
    if (!result.confirmed) {
        return;
    }

    if (appState.gps.status !== "active") {
        markerTitle.textContent = "GPS needed";
        markerMessage.textContent = "Turn on GPS so this glyph can be matched to a known location.";
        requestGpsThen(function() {});
        return;
    }

    const match = findNearestGlyphMatch(result);

    if (!match || !match.location) {
        markerTitle.textContent = "Unknown glyph";
        markerMessage.textContent = "This " + (result.colorFamily || "unknown") + " glyph is not close to a known unlocked location.";
        playSoundCue("wrongSymbol");
        return;
    }

    const targetLocation = match.location;
    const pendingObjectives = targetLocation.glyphObjectives.filter(function(objective) {
        return objective.status !== "complete";
    });
    const matchedObjective = pendingObjectives.find(function(objective) {
        return objective.shape === (result.shape || "hollow-triangle") &&
            objective.colorFamily === result.colorFamily &&
            Number(result.lockConfidence || 0) >= Number(objective.minConfidence || 72);
    });

    if (!matchedObjective) {
        markerTitle.textContent = "Glyph mismatch";
        markerMessage.textContent = "This " + (result.colorFamily || "unknown") + " glyph is not assigned to " + targetLocation.name + ".";
        playSoundCue("wrongSymbol");
        return;
    }

    pendingGlyphAttune = {
        location: targetLocation,
        objective: matchedObjective,
        match: match,
        result: result,
        sighting: {
        username: getCurrentUsername() || "guest",
        capturedAt: new Date().toISOString(),
        confidence: Number(result.lockConfidence || 0),
        colorFamily: result.colorFamily,
        shape: result.shape || "hollow-triangle",
        evidenceRequirement: matchedObjective.evidenceRequirement,
        imageDataUrl: cameraCanvas.toDataURL ? cameraCanvas.toDataURL("image/jpeg", 0.76) : "",
        latitude: appState.gps.latitude,
        longitude: appState.gps.longitude,
        accuracy: appState.gps.accuracyMeters,
        distanceMeters: Math.round(match.distanceMeters)
        }
    };

    markerTitle.textContent = "Glyph locked";
    markerMessage.textContent = "You found " + targetLocation.name + ". Hold Attune to bind this " + matchedObjective.label + ".";
}

function findNearestGlyphMatch(result) {
    const userLat = appState.gps.latitude;
    const userLng = appState.gps.longitude;
    const maxDistance = Math.max(45, Number(appState.gps.accuracyMeters || 0) + 30);
    let best = null;

    loadKnownLocations().forEach(function(location) {
        const hasMatchingGlyph = location.glyphObjectives.some(function(objective) {
            return objective.status !== "complete" &&
                objective.colorFamily === result.colorFamily &&
                objective.shape === (result.shape || "hollow-triangle") &&
                Number(result.lockConfidence || 0) >= Number(objective.minConfidence || 72);
        });

        if (!hasMatchingGlyph) {
            return;
        }

        getLocationGpsAnchors(location).forEach(function(anchor) {
            const distance = calculateDistanceMeters(userLat, userLng, anchor.latitude, anchor.longitude);

            if (distance <= maxDistance && (!best || distance < best.distanceMeters)) {
                best = {
                    location: location,
                    distanceMeters: distance,
                    anchor: anchor
                };
            }
        });
    });

    if (best) {
        return best;
    }

    if (activeTarget) {
        return {
            location: activeTarget,
            distanceMeters: Infinity,
            anchor: null
        };
    }

    return null;
}

function showGlyphCompletionModal(completion) {
    const location = completion.location;
    const required = location.glyphObjectives.filter(function(objective) {
        return objective.required;
    });
    const done = required.every(function(objective) {
        return objective.status === "complete";
    });
    const nextLocation = location.chainNextLocationId ?
        loadKnownLocations().find(function(savedLocation) {
            return savedLocation.id === location.chainNextLocationId;
        }) :
        findSuggestedNextLocation(location);

    showModal({
        title: done ? "Quest Location Complete" : "Glyph Found",
        message: done ?
            "Congrats, you found " + location.name + ". All required glyphs are complete." :
            "Congrats, you found " + location.name + ". " + getGlyphProgressText(location),
        actions: nextLocation ? [
            {
                label: "Next Location",
                className: "primaryButton",
                onClick: function() {
                    hideModal();
                    setActiveTarget(nextLocation);
                    setMode("trail");
                }
            },
            { label: "Stay Here", className: "secondaryButton", onClick: hideModal }
        ] : [
            { label: "Continue", className: "primaryButton", onClick: hideModal }
        ]
    });
}

function findSuggestedNextLocation(location) {
    return loadKnownLocations().find(function(candidate) {
        return candidate.id !== location.id &&
            candidate.questName === location.questName &&
            !candidate.completedAt;
    }) || null;
}

function updateConfirmFoundButton() {
    const canConfirm = activeTarget &&
        (appState.scanner.status === "sigilLocked" || appState.scanner.lockConfidence >= 70);

    confirmFoundButton.hidden = !canConfirm;
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
        rewardType: rewardTypeSelect.value,
        rewardRarity: rewardRaritySelect.value,
        questName: questNameInput.value.trim() || "Field Quest",
        chainNextLocationId: chainNextLocationSelect.value || "",
        glyphObjectives: buildGlyphObjectivesFromForm(),
        imageDataUrl: pendingLocationImageDataUrl,
        latitude: appState.gps.latitude,
        longitude: appState.gps.longitude,
        accuracy: appState.gps.accuracyMeters,
        facingDegrees: appState.compass.headingDegrees,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        addLocation(newLocation);
    } catch (error) {
        showModal({
            title: "Save Failed",
            message: error.message || "This place could not be saved. Check browser storage permissions.",
            actions: [
                { label: "OK", className: "primaryButton", onClick: hideModal }
            ]
        });
        return;
    }

    placeNameInput.value = "";
    hintInput.value = "";
    clueInput.value = "";
    clueAnswerInput.value = "";
    rewardTextInput.value = "";
    rewardTypeSelect.value = "lore-page";
    rewardRaritySelect.value = "Common";
    questNameInput.value = "";
    chainNextLocationSelect.value = "";
    glyphColor1.value = "red";
    glyphColor2.value = "";
    glyphColor3.value = "";
    glyphShape1.value = "hollow-triangle";
    glyphShape2.value = "hollow-triangle";
    glyphShape3.value = "hollow-triangle";
    glyphIcon1.value = "";
    glyphIcon2.value = "";
    glyphIcon3.value = "";
    pendingGlyphIconDataUrls = ["", "", ""];
    glyphRequired1.checked = true;
    glyphRequired2.checked = true;
    glyphRequired3.checked = true;
    pendingLocationImageDataUrl = "";
    locationImageInput.value = "";
    locationImageButton.classList.remove("hasImage");
    locationImageButton.style.backgroundImage = "";
    locationImageButton.textContent = "📍";

    renderLocations();

    if (shouldFollow) {
        const locations = loadLocations();
        setActiveTarget(locations[locations.length - 1]);
        setMode("trail");
        return;
    }

    setMode("library");
}

function buildGlyphObjectivesFromForm() {
    return [
        { colorSelect: glyphColor1, shapeSelect: glyphShape1, requiredInput: glyphRequired1, iconIndex: 0 },
        { colorSelect: glyphColor2, shapeSelect: glyphShape2, requiredInput: glyphRequired2, iconIndex: 1 },
        { colorSelect: glyphColor3, shapeSelect: glyphShape3, requiredInput: glyphRequired3, iconIndex: 2 }
    ].filter(function(row) {
        return row.colorSelect.value;
    }).map(function(row, index) {
        return {
            label: row.colorSelect.value + " " + row.shapeSelect.value.replace("hollow-", ""),
            shape: row.shapeSelect.value,
            colorFamily: row.colorSelect.value,
            iconDataUrl: pendingGlyphIconDataUrls[row.iconIndex],
            required: row.requiredInput.checked,
            points: index === 0 ? 2 : 1,
            evidenceRequirement: "photo",
            minConfidence: Number(currentSettings.attuneThreshold || 72),
            status: "pending"
        };
    });
}

function renderLocations() {
    const container = document.getElementById("savedLocations");
    const locations = getLocationsForLibraryView();

    renderLibraryTabs();
    renderLibrarySelect(loadLocations());
    renderChainSelect(loadLocations());

    container.innerHTML = "";

    if (libraryView === "users") {
        renderUsersView(container);
        return;
    }

    if (locations.length === 0) {
        container.innerHTML =
            "<div class='locationCard'><h3>No locations here yet.</h3><p>Use Create to save your first glyph quest.</p></div>";

        if (libraryView === "public") {
            refreshCloudPublicLocations(container);
        }

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

    if (libraryView === "public") {
        refreshCloudPublicLocations(container);
    }
}

async function refreshCloudPublicLocations(container) {
    if (!window.QuestCloud || !window.QuestCloud.isAvailable()) {
        return;
    }

    const cloudStatus = document.createElement("div");

    cloudStatus.className = "locationCard cloudStatusCard";
    cloudStatus.innerHTML = "<div class='sectionLabel'>CLOUD</div><p>Checking public quests near you...</p>";
    container.appendChild(cloudStatus);

    try {
        const locations = await window.QuestCloud.fetchPublicLocations(
            appState.gps.latitude,
            appState.gps.longitude,
            5000
        );

        if (libraryView !== "public") {
            return;
        }

        if (locations.length === 0) {
            cloudStatus.innerHTML =
                "<div class='sectionLabel'>CLOUD</div><p>No Supabase public quests found nearby yet.</p>";
            return;
        }

        cloudStatus.innerHTML =
            "<div class='sectionLabel'>CLOUD</div><h3>Public Quests Near Me</h3>";

        locations.forEach(function(location) {
            container.appendChild(renderCloudLocationCard(location));
        });
    } catch (error) {
        cloudStatus.innerHTML =
            "<div class='sectionLabel'>CLOUD</div><p>Could not load Supabase quests: " + escapeHTML(error.message || error) + "</p>";
    }
}

function renderCloudLocationCard(location) {
    const card = document.createElement("div");
    const glyphCount = Array.isArray(location.glyphObjectives) ? location.glyphObjectives.length : 0;

    card.className = "locationCard cloudLocationCard";
    card.innerHTML =
        "<div class='locationDetailHeader'>" +
        "<div><div class='sectionLabel'>PUBLIC CLOUD QUEST</div><h3>" + escapeHTML(location.name) + "</h3></div>" +
        "<button class='followButton headerFollowButton'>Begin Quest</button>" +
        "</div>" +
        "<p class='locationHint'>" + escapeHTML(location.hint || "No clue shared yet.") + "</p>" +
        "<div class='libraryMetaGrid'>" +
        "<div><small>Distance</small><strong>" + escapeHTML(location.distanceMeters ? formatDistance(location.distanceMeters) : "GPS needed") + "</strong></div>" +
        "<div><small>Glyphs</small><strong>" + glyphCount + "</strong></div>" +
        "<div><small>Source</small><strong>Supabase</strong></div>" +
        "</div>";

    card.querySelector(".followButton").addEventListener("click", function() {
        setActiveTarget(location);
        setMode("trail");
    });

    return card;
}

function renderUsersView(container) {
    const accounts = loadAccounts();

    container.innerHTML = accounts.map(function(account) {
        return "<div class='locationCard userCard'>" +
            "<div class='sectionLabel'>USER</div>" +
            "<h3>" + escapeHTML(account.username) + (isAdminUser(account.username) ? " · Admin" : "") + "</h3>" +
            "<p>Explorer Rank " + getExplorerRank(account) + "</p>" +
            "<p>Locations Found: " + account.unlockedLocationIds.length +
            "<br>Artifacts: " + account.artifacts.length +
            "<br>Points: " + account.points + "</p>" +
            "</div>";
    }).join("");
}

function getLocationsForLibraryView() {
    const all = loadLocations();
    const username = getCurrentUsername();

    if (libraryView === "public") {
        return loadPublicLocations().filter(function(location) {
            return location.visibility === "public";
        });
    }

    if (libraryView === "shared") {
        return all.filter(function(location) {
            return location.creatorUsername !== username && location.visibility !== "private";
        });
    }

    if (libraryView === "users") {
        return [];
    }

    return all.filter(function(location) {
        return isAdminUser() || !username || location.creatorUsername === username;
    });
}

function renderLibraryTabs() {
    document.querySelectorAll(".libraryTab").forEach(function(button) {
        button.classList.toggle("activeLibraryTab", button.dataset.libraryView === libraryView);
    });
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

function enterApp(shouldPromptGps) {
    landingGate.hidden = true;
    currentSettings.showLandingOnOpen = false;
    saveSettings(currentSettings);
    renderAppState();

    if (shouldPromptGps !== false && appState.gps.status !== "active" && appState.gps.status !== "requesting") {
        window.setTimeout(function() {
            requestGpsThen(function() {});
        }, 250);
    }
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

function handleLocationImageSelected(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(loadEvent) {
        pendingLocationImageDataUrl = loadEvent.target.result;
        locationImageButton.classList.add("hasImage");
        locationImageButton.style.backgroundImage = "url('" + pendingLocationImageDataUrl + "')";
        locationImageButton.textContent = "";
    };

    reader.readAsDataURL(file);
}

function handleGlyphIconSelected(event, index) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(loadEvent) {
        pendingGlyphIconDataUrls[index] = loadEvent.target.result;
    };

    reader.readAsDataURL(file);
}

function getExplorerRank(user) {
    if (!user) {
        return 1;
    }

    const score = Number(user.points || 0) +
        (Array.isArray(user.unlockedLocationIds) ? user.unlockedLocationIds.length : 0) +
        (Array.isArray(user.artifacts) ? user.artifacts.length : 0) +
        Number(user.secretsSolved || 0);

    return Math.max(1, Math.floor(score / 5) + 1);
}

function renderAccountBar() {
    currentUser = getCurrentUser();

    if (!currentUser) {
        accountName.textContent = "Guest";
        accountResources.textContent = "Glimmer 0 - Relics 0 - Keys 0 - Crowns 0";
        return;
    }

    accountName.textContent = currentUser.username + " - Explorer Rank " + getExplorerRank(currentUser);
    accountResources.textContent =
        "Glimmer " + currentUser.resources.resource1 +
        " - Relics " + currentUser.resources.resource2 +
        " - Keys " + currentUser.resources.resource3 +
        " - Crowns " + currentUser.resources.resource4;
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
    adminTools.hidden = !isAdminUser();

    if (currentUser) {
        settingsAccountStats.innerHTML =
            "<p><strong>" + escapeHTML(currentUser.username) + "</strong></p>" +
            "<p>Explorer Rank: " + getExplorerRank(currentUser) + "</p>" +
            "<p>Locations Found: " + currentUser.unlockedLocationIds.length + "</p>" +
            "<p>Artifacts Collected: " + currentUser.artifacts.length + "</p>" +
            "<p>Secrets Solved: " + currentUser.secretsSolved + "</p>" +
            "<p>Captures: " + currentUser.captureHistory.length + " - Visits: " + currentUser.visitHistory.length + "</p>" +
            renderProfileMap(currentUser);
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

function renderProfileMap(user) {
    const unlocked = loadKnownLocations().filter(function(location) {
        return user.unlockedLocationIds.includes(location.id) ||
            user.createdLocationIds.includes(location.id) ||
            isAdminUser(user.username);
    }).filter(function(location) {
        return Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));
    });

    if (unlocked.length === 0) {
        return "<div class='profileMap'><small>No unlocked map markers yet.</small></div>";
    }

    const latitudes = unlocked.map(function(location) { return Number(location.latitude); });
    const longitudes = unlocked.map(function(location) { return Number(location.longitude); });
    const minLat = Math.min.apply(null, latitudes);
    const maxLat = Math.max.apply(null, latitudes);
    const minLng = Math.min.apply(null, longitudes);
    const maxLng = Math.max.apply(null, longitudes);
    const latSpan = Math.max(maxLat - minLat, 0.0001);
    const lngSpan = Math.max(maxLng - minLng, 0.0001);
    const markers = unlocked.map(function(location) {
        const x = ((Number(location.longitude) - minLng) / lngSpan) * 82 + 9;
        const y = (1 - ((Number(location.latitude) - minLat) / latSpan)) * 72 + 12;

        return "<span class='profileMapMarker' title='" + escapeHTML(location.name) + "' style='left:" + x.toFixed(1) + "%;top:" + y.toFixed(1) + "%'></span>";
    }).join("");

    return "<div class='profileMap'><strong>Unlocked Map</strong>" + markers + "</div>";
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

    if (!confidenceReady || attuneCompleted || !pendingGlyphAttune) {
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

    if (pendingGlyphAttune) {
        const completionKey = pendingGlyphAttune.location.id + ":" + pendingGlyphAttune.objective.id + ":" + pendingGlyphAttune.result.colorFamily;

        if (completionKey === lastGlyphCompletionKey) {
            return;
        }

        lastGlyphCompletionKey = completionKey;

        const completion = completeGlyphObjective(
            pendingGlyphAttune.location.id,
            pendingGlyphAttune.objective.id,
            pendingGlyphAttune.sighting
        );

        pendingGlyphAttune = null;

        if (!completion) {
            return;
        }

        activeTarget = completion.location;
        currentUser = getCurrentUser();
        renderAccountBar();
        renderLocations();
        renderSettingsPanel();
        renderAppState();
        markerTitle.textContent = "Glyph attuned";
        markerMessage.textContent = "Congrats, you found " + completion.location.name + ". +" + completion.awardedPoints + " points.";
        playSoundCue("questComplete");
        showGlyphCompletionModal(completion);
        return;
    }

    const captureLocation = activeTarget || {
        id: "unbound-sigil",
        name: "Unbound Sigil",
        questName: "Scanner Discovery",
        chainNextLocationId: "",
        rewardText: "You captured an unbound symbol."
    };

    const result = recordLocationCapture(captureLocation);
    playSoundCue("questComplete");
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
            title: "Reward Revealed",
            message: getRewardRevealText(captureLocation) + " Next location: " + nextLocation.name,
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
        title: "Reward Revealed",
        message: getRewardRevealText(captureLocation) +
            " Account points: " + (result && result.user ? result.user.points : 0),
        actions: [
            { label: "Nice", className: "primaryButton", onClick: hideModal }
        ]
    });
}

function getRewardRevealText(location) {
    return (location.rewardRarity || "Common") + " " +
        String(location.rewardType || "story-fragment").replaceAll("-", " ") +
        ": " + (location.rewardText || "You gained one point.") + " ";
}

function confirmFoundLocation() {
    if (!activeTarget) {
        showModal({
            title: "Choose A Target",
            message: "Select a location from Field Notes before confirming a scanner lock.",
            actions: [
                { label: "Open Field Notes", className: "primaryButton", onClick: function() { hideModal(); setMode("library"); } },
                { label: "Close", className: "secondaryButton", onClick: hideModal }
            ]
        });
        return;
    }

    let refinedTarget = activeTarget;

    if (appState.gps.status === "active") {
        refinedTarget = refineLocationPosition(
            activeTarget.id,
            appState.gps.latitude,
            appState.gps.longitude,
            appState.gps.accuracyMeters
        ) || activeTarget;
    }

    recordLocationVisit(refinedTarget, "confirmed-found");

    activeTarget = refinedTarget;
    currentUser = getCurrentUser();
    renderLocations();
    renderSettingsPanel();
    renderAppState();

    showModal({
        title: "Location Confirmed",
        message: "The marker is locked and this location now has a fresher GPS sample. Hold Attune on each matching glyph to earn completion rewards.",
        actions: [
            { label: "Continue", className: "primaryButton", onClick: hideModal }
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
    const glyphList = location.glyphObjectives.map(function(objective) {
        return "<li class='" + (objective.status === "complete" ? "glyphComplete" : "") + "'>" +
            renderGlyphIconMarkup(objective) +
            "<span>" + escapeHTML(objective.colorFamily) + " " + escapeHTML(objective.shape.replaceAll("-", " ")) + "</span>" +
            "<strong>" + escapeHTML(objective.status) + " · " + objective.points + " pts</strong>" +
            "</li>";
    }).join("");
    const completedGlyphs = location.glyphObjectives.filter(function(objective) {
        return objective.status === "complete";
    }).length;

    card.className = "locationCard libraryDetail";
    card.innerHTML =
        "<div class='locationDetailHeader'>" +
        "<button class='locationImageThumb' type='button' aria-label='Open location photo'>" + (location.imageDataUrl ? "" : "✦") + "</button>" +
        "<div><div class='sectionLabel'>" + escapeHTML(location.questName) + "</div><h3>" + escapeHTML(location.name) + "</h3></div>" +
        "<button class='followButton headerFollowButton'>Begin Quest</button>" +
        "</div>" +
        "<p class='locationHint'>" + escapeHTML(location.hint || "No clue saved yet.") + "</p>" +
        "<div class='clueBlock'>" +
        "<strong>Clue</strong>" +
        "<p>" + escapeHTML(location.clue || "No clue text yet.") + "</p>" +
        "<small>Answer: " + escapeHTML(location.clueAnswer || "Scanner capture") + "</small>" +
        "</div>" +
        "<div class='libraryMetaGrid'>" +
        "<div><small>Glyphs Found</small><strong>" + completedGlyphs + " / " + location.glyphObjectives.length + "</strong></div>" +
        "<div><small>Points</small><strong>" + getGlyphPoints(location) + "</strong></div>" +
        "<div><small>Creator</small><strong>" + escapeHTML(location.creatorUsername) + "</strong></div>" +
        "<div><small>Status</small><strong>" + escapeHTML(distanceText) + "</strong></div>" +
        "<div><small>Saved</small><strong>" + escapeHTML(createdAt) + "</strong></div>" +
        "<div><small>Accuracy</small><strong>" + Math.round(location.accuracy || 0) + " m</strong></div>" +
        "<div><small>Facing</small><strong>" + escapeHTML(formatFacing(location.facingDegrees)) + "</strong></div>" +
        "<div><small>Next</small><strong>" + escapeHTML(nextLocation ? nextLocation.name : "Reward screen") + "</strong></div>" +
        "<div><small>Captures</small><strong>" + location.capturedCount + "</strong></div>" +
        "</div>" +
        "<p class='rewardText'><strong>" + escapeHTML(location.rewardRarity) + " " + escapeHTML(location.rewardType.replaceAll("-", " ")) + "</strong><br>" + escapeHTML(location.rewardText || "Reward: +1 point") + "</p>" +
        "<ul class='glyphObjectiveList'>" + glyphList + "</ul>" +
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
        "<button class='editButton'>Edit</button>" +
        "<button class='deleteButton'>Delete</button>" +
        "</div>";

    const imageThumb = card.querySelector(".locationImageThumb");

    if (location.imageDataUrl) {
        imageThumb.classList.add("hasImage");
        imageThumb.style.backgroundImage = "url('" + location.imageDataUrl + "')";
        imageThumb.addEventListener("click", function() {
            showImagePreview(location.imageDataUrl, location.name);
        });
    }

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

function renderGlyphIconMarkup(objective) {
    if (objective.iconDataUrl) {
        return "<span class='glyphIconPhoto' style='background-image:url(\"" + escapeHTML(objective.iconDataUrl) + "\")'></span>";
    }

    return "<span class='glyphIconBadge glyph-" + escapeHTML(objective.colorFamily) + " glyph-" + escapeHTML(objective.shape) + "'></span>";
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
        updateTargetIcon(null);

        trailTargetName.textContent = "No Active Trail";
        trailTargetHint.textContent = "Choose a saved place from Field Notes.";
        trailDistance.textContent = "--";
        trailAccuracy.textContent = "Accuracy unknown";
        glyphProgressText.textContent = "Glyphs Found: 0 / 0";
        foundGlyphButton.disabled = true;

        scanTargetName.textContent = "No target selected";
        scanTargetMeta.textContent = "Choose a place from Field Notes.";

        navigationReadout.textContent = "No navigation target selected.";
        return;
    }

    updateTargetIcon(activeTarget);
    foundGlyphButton.disabled = false;
    glyphProgressText.textContent = getGlyphProgressText(activeTarget);
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

function getGlyphProgressText(location) {
    const objectives = location && Array.isArray(location.glyphObjectives) ? location.glyphObjectives : [];
    const complete = objectives.filter(function(objective) {
        return objective.status === "complete";
    }).length;

    return "Glyphs Found: " + complete + " / " + objectives.length;
}

function getGlyphPoints(location) {
    const objectives = location && Array.isArray(location.glyphObjectives) ? location.glyphObjectives : [];

    return objectives.reduce(function(total, objective) {
        return total + Number(objective.points || 0);
    }, Number(location && location.completionBonus || 0));
}

function updateTargetIcon(location) {
    if (!targetIconElement) {
        return;
    }

    targetIconElement.classList.toggle("hasImage", !!(location && location.imageDataUrl));
    targetIconElement.style.backgroundImage = location && location.imageDataUrl ? "url('" + location.imageDataUrl + "')" : "";
    targetIconElement.textContent = location && location.imageDataUrl ? "" : "🌳";
    targetIconElement.onclick = location && location.imageDataUrl ? function() {
        showImagePreview(location.imageDataUrl, location.name);
    } : null;
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

function showImagePreview(imageDataUrl, title) {
    modalTitle.textContent = title || "Location Photo";
    modalMessage.innerHTML = "<img class='imagePreviewFull' alt='Saved location photo' src='" + imageDataUrl + "'>";
    modalActions.innerHTML = "";

    const closeButton = document.createElement("button");

    closeButton.type = "button";
    closeButton.className = "primaryButton";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", hideModal);
    modalActions.appendChild(closeButton);
    modalOverlay.hidden = false;
}

function playScannerCue(status) {
    if (status === lastScannerCueStatus) {
        return;
    }

    lastScannerCueStatus = status;

    if (status === "sigilLocked") {
        playSoundCue("gpsLock");
    } else if (status === "signalFound") {
        playSoundCue("markerFound");
    } else if (status === "error") {
        playSoundCue("wrongSymbol");
    }
}

function playSoundCue(type) {
    if (!currentSettings.soundCues || (typeof window.AudioContext === "undefined" && typeof window.webkitAudioContext === "undefined")) {
        return;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    const audio = new AudioCtor();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const frequencies = {
        gpsLock: [620, 880],
        markerFound: [440, 660, 880],
        questComplete: [523, 659, 784, 1046],
        wrongSymbol: [180, 120]
    }[type] || [440];

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.type = type === "wrongSymbol" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.03);

    frequencies.forEach(function(frequency, index) {
        oscillator.frequency.setValueAtTime(frequency, audio.currentTime + index * 0.12);
    });

    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + frequencies.length * 0.14 + 0.05);
    oscillator.start();
    oscillator.stop(audio.currentTime + frequencies.length * 0.14 + 0.08);
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
landingGate.hidden = false;
renderAppState();
renderLocations();
