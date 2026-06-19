// ==================================================
// Quest Compass Storage System
// ==================================================
//
// This file only handles saved location data.
//
// It currently uses localStorage, which means:
// - free
// - fast
// - no account required
// - data only lives on this phone/browser
//
// Later this file can be swapped for a real database
// without rewriting the whole app.

const STORAGE_KEY = "questCompassLocations";

function createLocationId() {
    // Create a simple unique ID.

    return "loc-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function normalizeLocation(location) {
    // Older app versions used slightly different field names.
    // This keeps old saved locations working after UI upgrades.

    return {
        id: location.id || createLocationId(),
        name: location.name || "Unnamed Place",
        hint: location.hint || "",
        latitude: Number(location.latitude ?? location.lat),
        longitude: Number(location.longitude ?? location.lng),
        accuracy: Number(location.accuracy ?? 0),
        createdAt: location.createdAt || new Date().toISOString()
    };
}

function loadLocations() {
    // Load saved locations from localStorage.

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return [];
    }

    try {
        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(normalizeLocation);
    } catch (error) {
        // If storage gets corrupted, return an empty list.

        return [];
    }
}

function saveLocations(locations) {
    // Save the full location list.

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(locations)
    );
}

function addLocation(location) {
    // Add one saved location.

    const locations = loadLocations();

    locations.push(
        normalizeLocation(location)
    );

    saveLocations(locations);
}

function deleteLocationById(locationId) {
    // Delete one saved location by ID.

    const locations = loadLocations().filter(
        function(location) {
            return location.id !== locationId;
        }
    );

    saveLocations(locations);
}

function clearLocations() {
    // Delete all saved locations.

    localStorage.removeItem(STORAGE_KEY);
}