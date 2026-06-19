// ==================================================
// Quest Compass Storage System
// ==================================================
//
// This file only handles saving and loading data.
//
// Right now it uses localStorage.
// That means saved locations stay on this phone/browser.
//
// Later, this can be replaced with Supabase, Firebase,
// GitHub-backed JSON, or another real database without
// rewriting the whole app.

const STORAGE_KEY = "questCompassLocations";

function createLocationId() {
    // Create a simple unique ID for saved locations.

    return "loc-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
}

function normalizeLocation(location) {
    // Older saved locations may use latitude/longitude.
    // Future data may use lat/lng.
    // This keeps both working.

    return {
        id: location.id || createLocationId(),
        name: location.name || "Unnamed Location",
        latitude: Number(location.latitude ?? location.lat),
        longitude: Number(location.longitude ?? location.lng),
        accuracy: Number(location.accuracy ?? 0),
        createdAt: location.createdAt || new Date().toISOString()
    };
}

function loadLocations() {
    // Read saved locations from browser storage.

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
        // If storage gets corrupted, fail safely.

        return [];
    }
}

function saveLocations(locations) {
    // Convert the location list into text and save it.

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(locations)
    );
}

function addLocation(location) {
    // Add one location to the saved list.

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