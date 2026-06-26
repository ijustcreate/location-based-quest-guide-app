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
let editingLocationId = null;
let draftLocationOverride = null;

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
const useCurrentLocationButton = document.getElementById("useCurrentLocationButton");
const manualCoordinatesInput = document.getElementById("manualCoordinatesInput");
const applyManualCoordinatesButton = document.getElementById("applyManualCoordinatesButton");

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
const compactTargetCard = document.querySelector(".compactTargetCard");

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
const scanCameraButton = document.getElementById("scanCameraButton");
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

compactTargetCard.addEventListener("click", function() {
    if (!activeTarget) {
        setMode("library");
    }
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

scanCameraButton.addEventListener("click", enableScanner);

document.getElementById("createSaveButton").addEventListener("click", function() {
    savePlace(false);
});

document.getElementById("createSaveFollowButton").addEventListener("click", function() {
    savePlace(true);
});

useCurrentLocationButton.addEventListener("click", useCurrentGpsForDraftLocation);
applyManualCoordinatesButton.addEventListener("click", applyManualCoordinatesToDraft);

document.getElementById("clearButton").addEventListener("click", clearAllSavedLocations);
settingsClearButton.addEventListener("click", clearAllSavedLocations);

headerLocationSelect.addEventListener("change", function() {
    selectedLibraryLocationId = headerLocationSelect.value || null;
    renderLocations();
});

settingsButton.addEventListener("click", function() {
    setSettingsOpen(settingsPanel.hidden);
    renderSettingsPanel();
});

closeSettingsButton.addEventListener("click", function() {
    setSettingsOpen(false);
});

saveSettingsButton.addEventListener("click", saveSettingsFromPanel);

resetLandingButton.addEventListener("click", function() {
    currentSettings.showLandingOnOpen = true;
    saveSettings(currentSettings);
    landingGate.hidden = false;
});

exportDataButton.addEventListener("click", function() {
    downloadTextFile("quest-compass-export-" + Date.now() + ".json", exportQuestData());
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
    setMode("scan");
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
    attuneButton.querySelector("span").textContent = "Attune Sigil";
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
    const hasLock = appState.scanner.status === "sigilLocked" || appState.scanner.lockConfidence >= 70;

    if (pendingGlyphAttune || !activeTarget || !hasLock) {
        confirmFoundButton.hidden = true;
        confirmFoundButton.disabled = false;
        confirmFoundButton.textContent = "Attune Sigil";
        return;
    }

    confirmFoundButton.hidden = false;
    confirmFoundButton.disabled = true;
    confirmFoundButton.textContent = "Wrong Sigil";
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
    scanCameraButton.hidden = appState.scanner.status !== "off" && appState.scanner.status !== "error";
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
    const draftCoordinates = getDraftCoordinates();

    if (!draftCoordinates) {
        showModal({
            title: "Location Needed",
            message: "Enable GPS, use current GPS, or paste Google Maps coordinates before saving.",
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
        latitude: draftCoordinates.latitude,
        longitude: draftCoordinates.longitude,
        accuracy: draftCoordinates.accuracy,
        facingDegrees: appState.compass.headingDegrees,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    let savedLocation = null;

    try {
        if (editingLocationId) {
            savedLocation = updateLocationById(editingLocationId, function(existing) {
                return Object.assign({}, existing, newLocation, {
                    id: existing.id,
                    createdAt: existing.createdAt || newLocation.createdAt,
                    updatedAt: new Date().toISOString()
                });
            });
        } else {
            savedLocation = addLocation(newLocation);
        }
    } catch (error) {
        try {
            clearEmbeddedLocationMedia();
            newLocation.imageDataUrl = "";
            newLocation.glyphObjectives = newLocation.glyphObjectives.map(function(objective) {
                return Object.assign({}, objective, { iconDataUrl: "" });
            });

            if (editingLocationId) {
                savedLocation = updateLocationById(editingLocationId, function(existing) {
                    return Object.assign({}, existing, newLocation, {
                        id: existing.id,
                        createdAt: existing.createdAt || newLocation.createdAt,
                        updatedAt: new Date().toISOString()
                    });
                });
            } else {
                savedLocation = addLocation(newLocation);
            }
        } catch (retryError) {
            showModal({
                title: "Save Failed",
                message: retryError.message || error.message || "This place could not be saved. Browser storage is full.",
                actions: [
                    { label: "OK", className: "primaryButton", onClick: hideModal }
                ]
            });
            return;
        }
    }

    if (!editingLocationId && savedLocation) {
        syncLocationToCloud(savedLocation);
    }

    const savedEditingLocationId = editingLocationId;
    resetCreateForm();

    renderLocations();

    if (shouldFollow) {
        const locations = loadLocations();
        const target = savedEditingLocationId ?
            locations.find(function(location) { return location.id === savedEditingLocationId; }) :
            locations[locations.length - 1];

        setActiveTarget(target);
        setMode("trail");
        return;
    }

    setMode("library");
}

function resetCreateForm() {
    editingLocationId = null;
    draftLocationOverride = null;
    placeNameInput.value = "";
    hintInput.value = "";
    clueInput.value = "";
    clueAnswerInput.value = "";
    rewardTextInput.value = "";
    rewardTypeSelect.value = "lore-page";
    rewardRaritySelect.value = "Common";
    questNameInput.value = "";
    chainNextLocationSelect.value = "";
    manualCoordinatesInput.value = "";
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
    createGpsReadout.textContent = appState.gps.status === "active" ? "Using current GPS when saving." : "Enable GPS to capture this place.";
}

function getDraftCoordinates() {
    if (draftLocationOverride) {
        return draftLocationOverride;
    }

    if (editingLocationId) {
        const existing = loadLocations().find(function(location) {
            return location.id === editingLocationId;
        });

        if (existing) {
            return {
                latitude: existing.latitude,
                longitude: existing.longitude,
                accuracy: existing.accuracy || 0
            };
        }
    }

    if (appState.gps.status === "active" && appState.gps.latitude !== null && appState.gps.longitude !== null) {
        return {
            latitude: appState.gps.latitude,
            longitude: appState.gps.longitude,
            accuracy: appState.gps.accuracyMeters || 0
        };
    }

    return null;
}

function useCurrentGpsForDraftLocation() {
    if (appState.gps.status !== "active") {
        requestGpsThen(useCurrentGpsForDraftLocation);
        return;
    }

    draftLocationOverride = {
        latitude: appState.gps.latitude,
        longitude: appState.gps.longitude,
        accuracy: appState.gps.accuracyMeters || 0
    };
    createGpsReadout.textContent = "Draft location set from current GPS.";
}

function applyManualCoordinatesToDraft() {
    const match = manualCoordinatesInput.value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);

    if (!match) {
        showModal({
            title: "Coordinates Needed",
            message: "Paste coordinates like 33.812345, -117.912345.",
            actions: [{ label: "OK", className: "primaryButton", onClick: hideModal }]
        });
        return;
    }

    draftLocationOverride = {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
        accuracy: 0
    };
    createGpsReadout.textContent = "Draft location set from pasted coordinates.";
}

async function syncLocationToCloud(location) {
    if (!window.QuestCloud || !window.QuestCloud.isAvailable() || location.visibility === "private") {
        return;
    }

    try {
        const result = await window.QuestCloud.submitPublicLocation(location);

        if (result.ok) {
            markLocationCloudSync(location.id, "synced", { cloudId: result.cloudId });
            renderLocations();
            showModal({
                title: "Saved",
                message: "This place was saved locally and shared through the Explorer Network.",
                actions: [
                    { label: "OK", className: "primaryButton", onClick: hideModal }
                ]
            });
        } else {
            markLocationCloudSync(location.id, "pending", result);
            renderLocations();
            showModal({
                title: "Cloud Sync Pending",
                message: getCloudPendingMessage(result.message),
                actions: [
                    { label: "Retry", className: "primaryButton", onClick: function() { hideModal(); retryCloudSync(location.id); } },
                    { label: "OK", className: "primaryButton", onClick: hideModal }
                ]
            });
        }
    } catch (error) {
        markLocationCloudSync(location.id, "pending", { message: error.message || String(error) });
        renderLocations();
        showModal({
            title: "Cloud Sync Pending",
            message: getCloudPendingMessage(error.message || String(error)),
            actions: [
                { label: "Retry", className: "primaryButton", onClick: function() { hideModal(); retryCloudSync(location.id); } },
                { label: "OK", className: "primaryButton", onClick: hideModal }
            ]
        });
    }
}

function getCloudPendingMessage(rawMessage) {
    if (currentSettings.showTechnicalDetails && rawMessage) {
        return "Saved on this device. Cloud sync is pending. Debug: " + rawMessage;
    }

    return "Saved on this device. Cloud sync is pending.";
}

function retryCloudSync(locationId) {
    const location = loadLocations().find(function(savedLocation) {
        return savedLocation.id === locationId;
    });

    if (location) {
        syncLocationToCloud(location);
    }
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
            libraryView === "public" ?
                "<div class='locationCard'><h3>Loading public quests...</h3><p>Explorer Network quests can be browsed without GPS. Use Find Nearby Adventures when you want distance sorting.</p></div>" :
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

    const hasGps = appState.gps.status === "active" &&
        appState.gps.latitude !== null &&
        appState.gps.longitude !== null;
    const cloudStatus = document.createElement("div");

    cloudStatus.className = "locationCard cloudStatusCard";
    cloudStatus.innerHTML =
        "<div class='sectionLabel'>EXPLORER NETWORK</div>" +
        "<p>" + (hasGps ? "Checking public quests near you..." : "Browse public quests without GPS, or use your location to sort nearby adventures.") + "</p>" +
        (hasGps ? "" : "<button class='primaryButton findNearbyButton' type='button'>Find Nearby Adventures</button>");
    container.appendChild(cloudStatus);

    const findNearbyButton = cloudStatus.querySelector(".findNearbyButton");

    if (findNearbyButton) {
        findNearbyButton.addEventListener("click", function() {
            requestGpsThen(function() {
                renderLocations();
            });
        });
    }

    try {
        const locations = await window.QuestCloud.fetchPublicLocations(
            hasGps ? appState.gps.latitude : null,
            hasGps ? appState.gps.longitude : null,
            5000
        );

        if (libraryView !== "public") {
            return;
        }

        if (locations.length === 0) {
            cloudStatus.innerHTML =
                "<div class='sectionLabel'>EXPLORER NETWORK</div><p>No public quests found yet.</p>";
            return;
        }

        cloudStatus.innerHTML =
            "<div class='sectionLabel'>EXPLORER NETWORK</div><h3>" + (hasGps ? "Public Quests Near Me" : "Public Quests") + "</h3>";

        locations.forEach(function(location) {
            container.appendChild(renderCloudLocationCard(location));
        });
    } catch (error) {
        cloudStatus.innerHTML =
            "<div class='sectionLabel'>EXPLORER NETWORK</div><p>Could not load public quests right now." +
            (currentSettings.showTechnicalDetails ? " Debug: " + escapeHTML(error.message || error) : "") +
            "</p>";
    }
}

function renderCloudLocationCard(location) {
    const card = document.createElement("div");
    const glyphCount = Array.isArray(location.glyphObjectives) ? location.glyphObjectives.length : 0;

    card.className = "locationCard cloudLocationCard";
    card.innerHTML =
        "<div class='locationDetailHeader'>" +
        "<div><div class='sectionLabel'>PUBLIC QUEST</div><h3>" + escapeHTML(location.name) + "</h3></div>" +
        "<button class='followButton headerFollowButton'>Begin Quest</button>" +
        "</div>" +
        "<p class='locationHint'>" + escapeHTML(location.hint || "No clue shared yet.") + "</p>" +
        "<div class='libraryMetaGrid'>" +
        "<div><small>Distance</small><strong>" + escapeHTML(location.distanceMeters ? formatDistance(location.distanceMeters) : "GPS needed") + "</strong></div>" +
        "<div><small>Glyphs</small><strong>" + glyphCount + "</strong></div>" +
        "<div><small>Source</small><strong>Explorer Network</strong></div>" +
        "</div>";

    card.querySelector(".followButton").addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
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
        return [];
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

async function handleLocationImageSelected(event) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    try {
        pendingLocationImageDataUrl = await resizeImageFile(file, 640, 0.72);
        locationImageButton.classList.add("hasImage");
        locationImageButton.style.backgroundImage = "url('" + pendingLocationImageDataUrl + "')";
        locationImageButton.textContent = "";
    } catch (error) {
        showModal({
            title: "Image Failed",
            message: "Could not prepare that image. Try a smaller photo.",
            actions: [{ label: "OK", className: "primaryButton", onClick: hideModal }]
        });
    }
}

async function handleGlyphIconSelected(event, index) {
    const file = event.target.files && event.target.files[0];

    if (!file) {
        return;
    }

    try {
        pendingGlyphIconDataUrls[index] = await resizeImageFile(file, 220, 0.68);
    } catch (error) {
        showModal({
            title: "Image Failed",
            message: "Could not prepare that glyph image. Try a smaller photo.",
            actions: [{ label: "OK", className: "primaryButton", onClick: hideModal }]
        });
    }
}

function resizeImageFile(file, maxSize, quality) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();

        reader.onerror = reject;
        reader.onload = function(event) {
            const image = new Image();

            image.onerror = reject;
            image.onload = function() {
                const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                const canvas = document.createElement("canvas");
                const width = Math.max(1, Math.round(image.width * scale));
                const height = Math.max(1, Math.round(image.height * scale));

                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(image, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            image.src = event.target.result;
        };

        reader.readAsDataURL(file);
    });
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
        attuneButton.querySelector("span").textContent = "Sigil Bound";
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
    const syncBadge = location.cloudSyncStatus === "pending" ?
        "<button class='syncPendingButton' type='button'>Cloud sync pending</button>" :
        "";

    card.className = "locationCard libraryDetail compactQuestCard";
    card.innerHTML =
        "<details class='questDetails'>" +
        "<summary class='questSummary'>" +
        "<button class='locationImageThumb' type='button' aria-label='Open location photo'>" + (location.imageDataUrl ? "" : "Icon") + "</button>" +
        "<span class='questSummaryText'><span class='sectionLabel'>" + escapeHTML(location.questName) + "</span><strong>" + escapeHTML(location.name) + "</strong><small>" + escapeHTML(location.hint || "No clue saved yet.") + "</small></span>" +
        "<span class='questSummaryStats'><strong>" + completedGlyphs + " / " + location.glyphObjectives.length + "</strong><small>" + getGlyphPoints(location) + " pts</small></span>" +
        syncBadge +
        "<button class='followButton headerFollowButton' type='button'>Begin Quest</button>" +
        "<span class='questChevron'>v</span>" +
        "</summary>" +
        "<div class='questExpandedBody'>" +
        "<div class='clueBlock'>" +
        "<strong>Clue</strong>" +
        "<p>" + escapeHTML(location.clue || "No clue text yet.") + "</p>" +
        "<small>Answer: " + escapeHTML(location.clueAnswer || "Scanner capture") + "</small>" +
        "</div>" +
        "<div class='libraryMetaGrid compactMetaGrid'>" +
        "<div><small>Status</small><strong>" + escapeHTML(distanceText) + "</strong></div>" +
        "<div><small>Creator</small><strong>" + escapeHTML(location.creatorUsername) + "</strong></div>" +
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
        "</div>" +
        "</div>" +
        "</details>";
    const imageThumb = card.querySelector(".locationImageThumb");

    if (location.imageDataUrl) {
        imageThumb.classList.add("hasImage");
        imageThumb.style.backgroundImage = "url('" + location.imageDataUrl + "')";
        imageThumb.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();
            showImagePreview(location.imageDataUrl, location.name);
        });
    }

    card.querySelector(".followButton").addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        setActiveTarget(location);
        setMode("trail");
    });

    const syncButton = card.querySelector(".syncPendingButton");

    if (syncButton) {
        syncButton.addEventListener("click", function(event) {
            event.preventDefault();
            event.stopPropagation();
            retryCloudSync(location.id);
        });
    }

    card.querySelector(".editButton").addEventListener("click", function() {
        loadLocationIntoCreateForm(location);
        setMode("create");
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

function setSettingsOpen(isOpen) {
    settingsPanel.hidden = !isOpen;
    document.body.classList.toggle("settingsOpen", isOpen);
}

function loadLocationIntoCreateForm(location) {
    editingLocationId = location.id;
    draftLocationOverride = null;
    placeNameInput.value = location.name || "";
    hintInput.value = location.hint || "";
    clueInput.value = location.clue || "";
    clueAnswerInput.value = location.clueAnswer || "";
    rewardTextInput.value = location.rewardText || "";
    rewardTypeSelect.value = location.rewardType || "story-fragment";
    rewardRaritySelect.value = location.rewardRarity || "Common";
    questNameInput.value = location.questName || "";
    chainNextLocationSelect.value = location.chainNextLocationId || "";
    const locationObjectives = Array.isArray(location.glyphObjectives) ? location.glyphObjectives : [];
    const hasCoordinates = Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude));

    manualCoordinatesInput.value = hasCoordinates ? Number(location.latitude).toFixed(6) + ", " + Number(location.longitude).toFixed(6) : "";
    pendingLocationImageDataUrl = location.imageDataUrl || "";
    locationImageButton.classList.toggle("hasImage", !!pendingLocationImageDataUrl);
    locationImageButton.style.backgroundImage = pendingLocationImageDataUrl ? "url('" + pendingLocationImageDataUrl + "')" : "";
    locationImageButton.textContent = pendingLocationImageDataUrl ? "" : "📍";

    [0, 1, 2].forEach(function(index) {
        const objective = locationObjectives[index];
        const colorSelect = [glyphColor1, glyphColor2, glyphColor3][index];
        const shapeSelect = [glyphShape1, glyphShape2, glyphShape3][index];
        const requiredInput = [glyphRequired1, glyphRequired2, glyphRequired3][index];

        colorSelect.value = objective ? objective.colorFamily : (index === 0 ? "red" : "");
        shapeSelect.value = objective ? objective.shape : "hollow-triangle";
        requiredInput.checked = objective ? objective.required !== false : true;
        pendingGlyphIconDataUrls[index] = objective ? objective.iconDataUrl || "" : "";
    });

    createGpsReadout.textContent = "Editing saved location. Coordinates stay unchanged unless you use current GPS or paste new coordinates.";
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
        title: "Clear Local Device Data",
        message: "Clear saved places, active target, scanner progress, cached public quests, local map/profile progress, and local quest stats from this device? Published Explorer Network quests may still appear when reloaded from the cloud.",
        actions: [
            {
                label: "Clear Local Data",
                className: "dangerButton",
                onClick: function() {
                    clearAllQuestData();
                    setActiveTarget(null);
                    selectedLibraryLocationId = null;
                    pendingGlyphAttune = null;
                    attuneCompleted = false;
                    lastGlyphCompletionKey = "";
                    confirmFoundButton.hidden = true;
                    attunePrompt.hidden = true;
                    attuneMeterFill.style.width = "0%";
                    currentUser = getCurrentUser();
                    appState.scannerOverlay = false;
                    hideModal();
                    renderAccountBar();
                    renderLocations();
                    renderSettingsPanel();
                    renderAppState();
                    showModal({
                        title: "Local Data Cleared",
                        message: "My Places, active target, scanner progress, cached public quests, local map/profile progress, and local quest stats were cleared. Published Explorer Network quests were not deleted from the shared cloud.",
                        actions: [
                            { label: "OK", className: "primaryButton", onClick: hideModal }
                        ]
                    });
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

function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
