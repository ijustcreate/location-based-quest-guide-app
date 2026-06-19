// ==================================================
// Quest Compass Navigation System
// ==================================================
//
// This file handles the math for navigation.
//
// It calculates:
// - Distance between two GPS points
// - Direction from the user to the target
// - Simple arrow direction
// - Arrival status
//
// Keeping this separate prevents app.js from becoming a junk drawer.

function toRadians(degrees) {
    // Convert degrees to radians because JavaScript trig functions use radians.
    return degrees * Math.PI / 180;
}

function toDegrees(radians) {
    // Convert radians back into degrees for compass-style direction.
    return radians * 180 / Math.PI;
}

function calculateDistanceMeters(startLat, startLng, targetLat, targetLng) {
    // Haversine formula.
    // This estimates distance across the surface of Earth.

    const earthRadiusMeters = 6371000;

    const lat1 = toRadians(startLat);
    const lat2 = toRadians(targetLat);

    const deltaLat = toRadians(targetLat - startLat);
    const deltaLng = toRadians(targetLng - startLng);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadiusMeters * c;
}

function calculateBearingDegrees(startLat, startLng, targetLat, targetLng) {
    // Bearing means "what compass direction should I travel?"
    // 0 degrees = north
    // 90 degrees = east
    // 180 degrees = south
    // 270 degrees = west

    const lat1 = toRadians(startLat);
    const lat2 = toRadians(targetLat);

    const deltaLng =
        toRadians(targetLng - startLng);

    const y =
        Math.sin(deltaLng) * Math.cos(lat2);

    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(deltaLng);

    const bearing =
        toDegrees(
            Math.atan2(y, x)
        );

    // Normalize bearing so it is always between 0 and 360.
    return (bearing + 360) % 360;
}

function getDirectionLabel(bearing) {
    // Converts degrees into a human-readable compass direction.

    if (bearing >= 337.5 || bearing < 22.5) {
        return "North";
    }

    if (bearing >= 22.5 && bearing < 67.5) {
        return "Northeast";
    }

    if (bearing >= 67.5 && bearing < 112.5) {
        return "East";
    }

    if (bearing >= 112.5 && bearing < 157.5) {
        return "Southeast";
    }

    if (bearing >= 157.5 && bearing < 202.5) {
        return "South";
    }

    if (bearing >= 202.5 && bearing < 247.5) {
        return "Southwest";
    }

    if (bearing >= 247.5 && bearing < 292.5) {
        return "West";
    }

    return "Northwest";
}

function formatDistance(distanceMeters) {
    // Keep distance readable for normal humans.

    if (distanceMeters < 1) {
        return "Less than 1 meter";
    }

    if (distanceMeters < 1000) {
        return Math.round(distanceMeters) + " meters";
    }

    const kilometers =
        distanceMeters / 1000;

    return kilometers.toFixed(2) + " km";
}

function hasArrived(distanceMeters) {
    // Arrival radius.
    // 10 meters is forgiving enough for normal phone GPS.

    return distanceMeters <= 10;
}