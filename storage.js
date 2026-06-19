// ==================================================
// Quest Compass Storage System
// ==================================================

// This file ONLY handles saving data.
//
// Keeping storage separate means we can later
// replace localStorage with:
//
// - Supabase
// - Firebase
// - SQL
// - Cloud Sync
//
// without rewriting app.js



const STORAGE_KEY =
    "questCompassLocations";



function loadLocations() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {

        return [];

    }

    return JSON.parse(saved);
}



function saveLocations(locations) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(locations)
    );
}



function addLocation(location) {

    const locations =
        loadLocations();

    locations.push(location);

    saveLocations(locations);
}



function deleteLocation(index) {

    const locations =
        loadLocations();

    locations.splice(index, 1);

    saveLocations(locations);
}



function clearLocations() {

    localStorage.removeItem(
        STORAGE_KEY
    );

}