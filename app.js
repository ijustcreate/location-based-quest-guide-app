const state = {
  locations: [],
  activeLocationId: null,
  currentPosition: null,
  watchId: null,
  heading: null,
  scannerRunning: false,
  lastConfirmedScanKey: null
};

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  state.locations = loadQuestLocations();

  bindNavigation();
  bindControls();
  renderAll();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("scan") === "1") {
    hideLandingPrompt();
    openTab("scanTab");
    startScanner();
  }
}

function bindNavigation() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => openTab(button.dataset.tab));
  });

  $("landingScanButton").addEventListener("click", () => {
    hideLandingPrompt();
    openTab("scanTab");
    startScanner();
  });

  $("landingEnterButton").addEventListener("click", hideLandingPrompt);
}

function bindControls() {
  $("gpsButton").addEventListener("click", startGps);
  $("compassButton").addEventListener("click", requestCompass);
  $("quickScanButton").addEventListener("click", () => {
    openTab("scanTab");
    startScanner();
  });

  $("foundSymbolButton").addEventListener("click", () => {
    if (!getActiveLocation()) {
      showModal("No active quest", "Choose or create a quest before scanning a glyph.");
      return;
    }

    openTab("scanTab");
    startScanner();
  });

  $("startScannerButton").addEventListener("click", startScanner);
  $("stopScannerButton").addEventListener("click", stopScanner);

  $("savePlaceButton").addEventListener("click", () => saveCreatedPlace(false));
  $("saveFollowButton").addEventListener("click", () => saveCreatedPlace(true));

  $("locationSelect").addEventListener("change", (event) => {
    state.activeLocationId = event.target.value || null;
    renderAll();
    openTab("trailTab");
  });

  $("adminButton").addEventListener("click", openAdminModal);
}

function hideLandingPrompt() {
  $("landingPrompt").classList.add("hidden");
}

function openTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });

  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  if (tabId !== "scanTab" && state.scannerRunning) {
    stopScanner();
  }
}

function startGps() {
  if (!navigator.geolocation) {
    showModal("GPS unavailable", "This browser does not support geolocation.");
    return;
  }

  $("gpsButton").textContent = "📍 GPS On";

  state.watchId = navigator.geolocation.watchPosition(
    (position) => {
      state.currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      renderAll();
    },
    (error) => {
      showModal("GPS error", error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 12000
    }
  );
}

function requestCompass() {
  const handler = (event) => {
    const heading =
      event.webkitCompassHeading !== undefined
        ? event.webkitCompassHeading
        : event.alpha !== null
          ? 360 - event.alpha
          : null;

    if (heading !== null) {
      state.heading = normalizeDegrees(heading);
      $("compassButton").textContent = "🧭 Compass On";
      renderTrail();
    }
  };

  if (
    window.DeviceOrientationEvent &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission().then((permission) => {
      if (permission === "granted") {
        window.addEventListener("deviceorientation", handler, true);
      } else {
        showModal("Compass blocked", "Compass permission was not granted.");
      }
    }).catch((error) => showModal("Compass error", error.message));
  } else {
    window.addEventListener("deviceorientationabsolute", handler, true);
    window.addEventListener("deviceorientation", handler, true);
  }
}

function saveCreatedPlace(shouldFollow) {
  if (!state.currentPosition) {
    showModal("Location needed", "Turn on GPS before saving a quest location.");
    return;
  }

  const selectedColors = [
    ["red", $("glyphRed").checked],
    ["green", $("glyphGreen").checked],
    ["pink", $("glyphPink").checked],
    ["blue", $("glyphBlue").checked]
  ].filter((entry) => entry[1]).map((entry) => entry[0]);

  if (!selectedColors.length) {
    showModal("Glyph needed", "Select at least one glyph objective.");
    return;
  }

  const points = Number($("glyphPointsInput").value || 50);
  const evidenceRequired = $("evidenceRequiredInput").checked;
  const now = new Date().toISOString();

  const location = upsertQuestLocation({
    id: `loc-${cryptoSafeId()}`,
    name: $("placeNameInput").value.trim() || "Unnamed Quest",
    hint: $("placeHintInput").value.trim(),
    latitude: state.currentPosition.latitude,
    longitude: state.currentPosition.longitude,
    accuracy: state.currentPosition.accuracy,
    facingDegrees: state.heading,
    createdAt: now,
    updatedAt: now,
    glyphs: selectedColors.map((color) => createGlyphObjective(color, points, evidenceRequired))
  });

  state.locations = loadQuestLocations();

  if (shouldFollow) {
    state.activeLocationId = location.id;
    openTab("trailTab");
  }

  $("placeNameInput").value = "";
  $("placeHintInput").value = "";
  $("createStatus").textContent = `Saved ${location.name}.`;

  renderAll();
}

function startScanner() {
  const video = $("scannerVideo");
  const canvas = $("scannerCanvas");

  state.scannerRunning = true;
  $("startScannerButton").textContent = "Scanning...";

  startCameraMarkerDetection(video, canvas, handleScannerResult);
}

function stopScanner() {
  state.scannerRunning = false;
  $("startScannerButton").textContent = "Start Scanner";
  stopCameraMarkerDetection($("scannerVideo"), $("scannerCanvas"));
}

function handleScannerResult(result) {
  $("scannerTitle").textContent = result.title;
  $("scannerMessage").textContent = result.message;
  $("colorMeter").value = result.colorSignal || 0;
  $("shapeMeter").value = result.symbolMatch || 0;
  $("lightMeter").value = result.lightQuality || 0;
  $("stableMeter").value = result.frameStability || 0;
  $("lockMeter").value = result.lockConfidence || 0;

  renderScannerMatch(result);

  if (result.confirmed) {
    attemptGlyphCompletion(result);
  }
}

function attemptGlyphCompletion(result) {
  const active = getActiveLocation();

  if (!active || !result.colorFamily) return;

  const scanKey = `${active.id}-${result.colorFamily}-${Math.floor(Date.now() / 2500)}`;

  if (state.lastConfirmedScanKey === scanKey) return;

  const glyph = active.glyphs.find((item) =>
    !item.completed &&
    item.colorFamily === result.colorFamily &&
    item.shape === "hollow-triangle" &&
    result.lockConfidence >= item.minimumConfidence
  );

  if (!glyph) {
    state.lastConfirmedScanKey = scanKey;
    $("scannerMatchCard").innerHTML = `
      <strong>Wrong glyph</strong>
      <p class="muted">This quest does not need another ${escapeHtml(result.colorFamily)} glyph.</p>
    `;
    return;
  }

  glyph.completed = true;
  glyph.completedAt = new Date().toISOString();
  glyph.evidenceImage = glyph.evidenceRequired ? result.evidenceImage : null;
  glyph.lastScan = {
    colorFamily: result.colorFamily,
    shape: result.shape,
    confidence: result.lockConfidence,
    scannedAt: glyph.completedAt
  };

  const progress = getQuestProgress(active);
  active.pointsAwarded = progress.points;

  if (progress.isComplete && !active.completedAt) {
    active.completedAt = new Date().toISOString();
  }

  upsertQuestLocation(active);
  state.locations = loadQuestLocations();
  state.lastConfirmedScanKey = scanKey;

  $("scannerMatchCard").innerHTML = `
    <strong>Glyph complete: ${escapeHtml(result.colorFamily)}</strong>
    <p class="completed">+${glyph.points} points</p>
  `;

  renderAll();

  if (progress.isComplete) {
    showModal("Quest complete", `${active.name} is complete. ${progress.points} points awarded.`);
  }
}

function renderAll() {
  renderTrail();
  renderActiveQuestCard();
  renderLibrary();
  renderStateLabel();
}

function renderTrail() {
  const active = getActiveLocation();

  $("targetName").textContent = active ? active.name : "No active quest";
  $("targetHint").textContent = active?.hint || "Choose a saved quest location or create one.";

  if (!active || !state.currentPosition) {
    $("distanceValue").textContent = "—";
    $("bearingValue").textContent = "—";
    $("accuracyValue").textContent = state.currentPosition
      ? `${Math.round(state.currentPosition.accuracy)} m`
      : "—";
    $("compassArrow").style.transform = "rotate(0deg)";
    $("pointsValue").textContent = active ? String(getQuestProgress(active).points) : "0";
    return;
  }

  const distance = calculateDistanceMeters(
    state.currentPosition.latitude,
    state.currentPosition.longitude,
    active.latitude,
    active.longitude
  );

  const bearing = calculateBearingDegrees(
    state.currentPosition.latitude,
    state.currentPosition.longitude,
    active.latitude,
    active.longitude
  );

  const arrowRotation = calculateArrowRotation(bearing, state.heading);

  $("distanceValue").textContent = formatDistance(distance);
  $("bearingValue").textContent = getDirectionLabel(bearing);
  $("accuracyValue").textContent = `${Math.round(state.currentPosition.accuracy)} m`;
  $("pointsValue").textContent = String(getQuestProgress(active).points);
  $("compassArrow").style.transform = `rotate(${arrowRotation}deg)`;
}

function renderActiveQuestCard() {
  const active = getActiveLocation();
  const card = $("activeQuestCard");

  if (!active) {
    card.innerHTML = `
      <h2>No quest selected</h2>
      <p class="muted">Create a quest or select one from the library.</p>
    `;
    return;
  }

  const progress = getQuestProgress(active);

  card.innerHTML = `
    <h2>${escapeHtml(active.name)}</h2>
    <p class="muted">${escapeHtml(active.hint || "No clue written yet.")}</p>
    <p><strong>Glyphs Found:</strong> ${progress.completedGlyphs} / ${progress.totalGlyphs}</p>
    <p><strong>Required:</strong> ${progress.completedRequiredGlyphs} / ${progress.requiredGlyphs}</p>
    <p><strong>Score:</strong> ${progress.points} / ${progress.possiblePoints}</p>
    ${progress.isComplete ? `<p class="completed">Quest complete</p>` : ""}
    <div class="glyph-list">
      ${active.glyphs.map(renderGlyphItem).join("")}
    </div>
  `;
}

function renderGlyphItem(glyph) {
  return `
    <div class="glyph-item">
      <div class="glyph-left">
        <span class="glyph-dot ${escapeHtml(glyph.colorFamily)}"></span>
        <strong>${escapeHtml(glyph.colorFamily)} triangle</strong>
      </div>
      <span class="${glyph.completed ? "completed" : "muted"}">
        ${glyph.completed ? "Found" : `${glyph.points} pts`}
      </span>
    </div>
  `;
}

function renderLibrary() {
  const select = $("locationSelect");
  const details = $("libraryDetails");

  select.innerHTML = `<option value="">Select a quest...</option>` + state.locations.map((location) => {
    const progress = getQuestProgress(location);
    const label = `${location.name} — ${progress.completedGlyphs}/${progress.totalGlyphs}`;
    return `<option value="${location.id}" ${state.activeLocationId === location.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
  }).join("");

  const active = getActiveLocation();

  if (!active) {
    details.innerHTML = `<p class="muted">No quest selected.</p>`;
    return;
  }

  const progress = getQuestProgress(active);

  details.innerHTML = `
    <hr />
    <h3>${escapeHtml(active.name)}</h3>
    <p>${escapeHtml(active.hint || "No clue.")}</p>
    <p><strong>Glyphs:</strong> ${progress.completedGlyphs}/${progress.totalGlyphs}</p>
    <p><strong>Points:</strong> ${progress.points}/${progress.possiblePoints}</p>
    <p class="muted">GPS: ${active.latitude.toFixed(5)}, ${active.longitude.toFixed(5)}</p>
    <div class="button-row">
      <button class="secondary-button" onclick="beginQuest('${active.id}')">Begin Trail</button>
      <button class="danger-button" onclick="deleteQuest('${active.id}')">Delete</button>
    </div>
  `;
}

function renderScannerMatch(result) {
  const active = getActiveLocation();

  if (!active) {
    $("scannerMatchCard").innerHTML = `<strong>No active quest</strong><p class="muted">Scanner can detect glyphs, but completion needs a selected quest.</p>`;
    return;
  }

  if (!result.colorFamily) {
    $("scannerMatchCard").innerHTML = `<strong>Target glyphs</strong><p class="muted">${active.glyphs.filter(g => !g.completed).map(g => g.colorFamily).join(", ") || "All found"}</p>`;
    return;
  }

  const needed = active.glyphs.some((glyph) => !glyph.completed && glyph.colorFamily === result.colorFamily);

  $("scannerMatchCard").innerHTML = `
    <strong>${needed ? "Matching objective" : "Not needed"}</strong>
    <p class="muted">Detected: ${escapeHtml(result.colorFamily)} ${escapeHtml(result.shape || "")}</p>
  `;
}

function renderStateLabel() {
  const active = getActiveLocation();

  if (active && getQuestProgress(active).isComplete) {
    $("appStateLabel").textContent = "Quest Complete";
    return;
  }

  if (active && state.currentPosition) {
    $("appStateLabel").textContent = "Trail Active";
    return;
  }

  if (active) {
    $("appStateLabel").textContent = "Target Locked";
    return;
  }

  $("appStateLabel").textContent = "Trail Idle";
}

function beginQuest(locationId) {
  state.activeLocationId = locationId;
  renderAll();
  openTab("trailTab");
}

function deleteQuest(locationId) {
  const location = state.locations.find((item) => item.id === locationId);
  if (!location) return;

  showConfirm(
    "Delete quest?",
    `Delete ${location.name}? This only removes it from this browser.`,
    () => {
      deleteQuestLocation(locationId);
      state.locations = loadQuestLocations();

      if (state.activeLocationId === locationId) {
        state.activeLocationId = null;
      }

      renderAll();
    }
  );
}

function openAdminModal() {
  const exportText = JSON.stringify(state.locations, null, 2);

  showModal(
    "Admin tools",
    `
      <p class="muted">Local browser storage only. Export before clearing.</p>
      <textarea id="adminExport" rows="7">${escapeHtml(exportText)}</textarea>
      <div class="button-row">
        <button class="secondary-button" onclick="copyAdminExport()">Copy Export</button>
        <button class="danger-button" onclick="resetAllData()">Clear All</button>
      </div>
    `,
    true
  );
}

function copyAdminExport() {
  const text = $("adminExport")?.value || "";
  navigator.clipboard?.writeText(text);
}

function resetAllData() {
  clearQuestLocations();
  state.locations = [];
  state.activeLocationId = null;
  closeModal();
  renderAll();
}

function getActiveLocation() {
  return state.locations.find((location) => location.id === state.activeLocationId) || null;
}

function showModal(title, body, isHtml = false) {
  const root = $("modalRoot");
  root.classList.remove("hidden");

  root.innerHTML = `
    <div class="modal-card">
      <h2>${escapeHtml(title)}</h2>
      ${isHtml ? body : `<p>${escapeHtml(body)}</p>`}
      <button class="primary-button full-width" onclick="closeModal()">OK</button>
    </div>
  `;
}

function showConfirm(title, body, onConfirm) {
  const root = $("modalRoot");
  root.classList.remove("hidden");

  root.innerHTML = `
    <div class="modal-card">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
      <div class="button-row">
        <button id="confirmYes" class="danger-button">Delete</button>
        <button class="secondary-button" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;

  $("confirmYes").addEventListener("click", () => {
    closeModal();
    onConfirm();
  });
}

function closeModal() {
  $("modalRoot").classList.add("hidden");
  $("modalRoot").innerHTML = "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}