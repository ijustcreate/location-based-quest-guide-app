// ==================================================
// Quest Compass Navigation System
// ==================================================
//
// This file handles GPS navigation math.
//
// It calculates:
// - distance between user and target
// - bearing toward target
// - direction label
// - arrow rotation corrected by phone heading

function toRadians(degrees) {
    // JavaScript trig functions use radians, not degrees.

    return degrees * Math.PI / 180;
}

function toDegrees(radians) {
    // Convert radians back into degrees.

    return radians * 180 / Math.PI;
}

function normalizeDegrees(degrees) {
    // Keep degrees between 0 and 360.

    return (degrees + 360) % 360;
}

function calculateDistanceMeters(startLat, startLng, targetLat, targetLng) {
    // Haversine formula.
    // Good enough for real-world GPS distance.

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
    // Bearing is the map direction from current location to target.
    //
    // 0 = north
    // 90 = east
    // 180 = south
    // 270 = west

    const lat1 = toRadians(startLat);
    const lat2 = toRadians(targetLat);

    const deltaLng = toRadians(targetLng - startLng);

    const y =
        Math.sin(deltaLng) * Math.cos(lat2);

    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(deltaLng);

    const bearing =
        toDegrees(Math.atan2(y, x));

    return normalizeDegrees(bearing);
}

function calculateArrowRotation(targetBearing, phoneHeading) {
    // This is the important compass correction.
    //
    // targetBearing = where the target is on the map.
    // phoneHeading = where the phone is facing.
    //
    // Without phoneHeading, the arrow is map-relative.
    // With phoneHeading, the arrow is phone-relative.

    if (phoneHeading === null || phoneHeading === undefined) {
        return targetBearing;
    }

    return normalizeDegrees(targetBearing - phoneHeading);
}

function getDirectionLabel(bearing) {
    // Convert bearing degrees into readable direction names.

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
    // Keep distance readable.

    if (distanceMeters < 1) {
        return "Less than 1 meter";
    }

    if (distanceMeters < 1000) {
        return Math.round(distanceMeters) + " meters";
    }

    return (distanceMeters / 1000).toFixed(2) + " km";
}

function hasArrived(distanceMeters) {
    // Phone GPS is imperfect.
    // 10 meters is a forgiving arrival radius.

    return distanceMeters <= 10;
}