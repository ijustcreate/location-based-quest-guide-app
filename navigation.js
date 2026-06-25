function toRadians(degrees) {
  return degrees * Math.PI / 180;
}

function toDegrees(radians) {
  return radians * 180 / Math.PI;
}

function normalizeDegrees(degrees) {
  return (degrees + 360) % 360;
}

function calculateDistanceMeters(startLat, startLng, targetLat, targetLng) {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(startLat);
  const lat2 = toRadians(targetLat);
  const deltaLat = toRadians(targetLat - startLat);
  const deltaLng = toRadians(targetLng - startLng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearingDegrees(startLat, startLng, targetLat, targetLng) {
  const lat1 = toRadians(startLat);
  const lat2 = toRadians(targetLat);
  const deltaLng = toRadians(targetLng - startLng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

function calculateArrowRotation(targetBearing, phoneHeading) {
  if (phoneHeading === null || phoneHeading === undefined) {
    return normalizeDegrees(targetBearing);
  }

  return normalizeDegrees(targetBearing - phoneHeading);
}

function getDirectionLabel(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return "North";
  if (bearing >= 22.5 && bearing < 67.5) return "Northeast";
  if (bearing >= 67.5 && bearing < 112.5) return "East";
  if (bearing >= 112.5 && bearing < 157.5) return "Southeast";
  if (bearing >= 157.5 && bearing < 202.5) return "South";
  if (bearing >= 202.5 && bearing < 247.5) return "Southwest";
  if (bearing >= 247.5 && bearing < 292.5) return "West";
  return "Northwest";
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) return "—";
  if (distanceMeters < 1) return "Less than 1 m";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(2)} km`;
}

function hasArrived(distanceMeters) {
  return Number.isFinite(distanceMeters) && distanceMeters <= 12;
}