const QUEST_STORAGE_KEY = "questCompass.savedPlaces.v2";
const QUEST_OLD_STORAGE_KEY = "questCompass.savedPlaces.v1";
const QUEST_LEGACY_KEY = "questCompassLocations";

function createGlyphObjective(colorFamily, points, evidenceRequired) {
  const now = new Date().toISOString();

  return {
    id: `glyph-${colorFamily}-${cryptoSafeId()}`,
    colorFamily,
    shape: "hollow-triangle",
    required: true,
    points: Number(points) || 50,
    evidenceRequired: Boolean(evidenceRequired),
    minimumConfidence: 72,
    completed: false,
    completedAt: null,
    evidenceImage: null,
    lastScan: null,
    createdAt: now
  };
}

function normalizeLocation(raw) {
  const now = new Date().toISOString();

  const glyphs = Array.isArray(raw.glyphs) && raw.glyphs.length
    ? raw.glyphs
    : [
        createGlyphObjective(
          raw.sigil?.colorFamily || raw.colorFamily || "red",
          raw.points || 50,
          true
        )
      ];

  return {
    id: raw.id || `loc-${cryptoSafeId()}`,
    name: raw.name || "Unnamed Quest",
    hint: raw.hint || "",
    latitude: Number(raw.latitude),
    longitude: Number(raw.longitude),
    accuracy: Number(raw.accuracy || 0),
    facingDegrees: raw.facingDegrees ?? null,
    category: raw.category || "landmark",
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    completedAt: raw.completedAt || null,
    pointsAwarded: Number(raw.pointsAwarded || 0),
    glyphs: glyphs.map(normalizeGlyph)
  };
}

function normalizeGlyph(raw) {
  return {
    id: raw.id || `glyph-${raw.colorFamily || "red"}-${cryptoSafeId()}`,
    colorFamily: raw.colorFamily || "red",
    shape: raw.shape || "hollow-triangle",
    required: raw.required !== false,
    points: Number(raw.points || 50),
    evidenceRequired: raw.evidenceRequired !== false,
    minimumConfidence: Number(raw.minimumConfidence || 72),
    completed: Boolean(raw.completed),
    completedAt: raw.completedAt || null,
    evidenceImage: raw.evidenceImage || null,
    lastScan: raw.lastScan || null,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function loadQuestLocations() {
  const raw =
    localStorage.getItem(QUEST_STORAGE_KEY) ||
    localStorage.getItem(QUEST_OLD_STORAGE_KEY) ||
    localStorage.getItem(QUEST_LEGACY_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    const normalized = list
      .map(normalizeLocation)
      .filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));

    saveQuestLocations(normalized);
    return normalized;
  } catch (error) {
    console.warn("Quest storage parse failed:", error);
    return [];
  }
}

function saveQuestLocations(locations) {
  localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(locations.map(normalizeLocation)));
}

function upsertQuestLocation(location) {
  const locations = loadQuestLocations();
  const normalized = normalizeLocation(location);
  const index = locations.findIndex((item) => item.id === normalized.id);

  if (index >= 0) {
    locations[index] = {
      ...locations[index],
      ...normalized,
      updatedAt: new Date().toISOString()
    };
  } else {
    locations.unshift(normalized);
  }

  saveQuestLocations(locations);
  return normalized;
}

function deleteQuestLocation(locationId) {
  const locations = loadQuestLocations().filter((item) => item.id !== locationId);
  saveQuestLocations(locations);
  return locations;
}

function clearQuestLocations() {
  localStorage.removeItem(QUEST_STORAGE_KEY);
  localStorage.removeItem(QUEST_OLD_STORAGE_KEY);
  localStorage.removeItem(QUEST_LEGACY_KEY);
}

function getQuestProgress(location) {
  const glyphs = location?.glyphs || [];
  const requiredGlyphs = glyphs.filter((glyph) => glyph.required);
  const completedRequired = requiredGlyphs.filter((glyph) => glyph.completed);
  const completedAll = glyphs.filter((glyph) => glyph.completed);

  return {
    totalGlyphs: glyphs.length,
    requiredGlyphs: requiredGlyphs.length,
    completedGlyphs: completedAll.length,
    completedRequiredGlyphs: completedRequired.length,
    isComplete: requiredGlyphs.length > 0 && completedRequired.length === requiredGlyphs.length,
    points: completedAll.reduce((sum, glyph) => sum + Number(glyph.points || 0), 0),
    possiblePoints: glyphs.reduce((sum, glyph) => sum + Number(glyph.points || 0), 0)
  };
}

function cryptoSafeId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(16).slice(2, 10);
}