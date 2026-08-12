import * as THREE from 'three';

export const ANIME_RED = '#cf1824';
export const ANIME_RED_DARK = '#82121a';
export const ANIME_IVORY = '#e5e2da';
export const ANIME_BLACK = '#15161a';
export const ANIME_CHARCOAL = '#252a31';

const REFERENCE = new THREE.Vector3(1, 0, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// The city is now built around the planet's actual north pole. The terrain,
// crown platform and central spire therefore share one radial/world-up axis
// instead of mounting the city on a side-facing spherical normal and then
// forcing the hero architecture upright afterward.
export const CITY_DIRECTION = WORLD_UP.clone();

export const CITY_TIER_DEGREES = {
  crown: 13,
  upper: 31,
  middle: 50,
  lower: 68,
  outskirts: 84
};

export const CITY_TANGENT_X = new THREE.Vector3().crossVectors(REFERENCE, CITY_DIRECTION).normalize();
export const CITY_TANGENT_Z = new THREE.Vector3().crossVectors(CITY_DIRECTION, CITY_TANGENT_X).normalize();

const DEG = THREE.MathUtils.DEG2RAD;

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

function azimuthForDirection(direction) {
  const normalized = direction.clone().normalize();
  const tangent = normalized.clone().sub(
    CITY_DIRECTION.clone().multiplyScalar(normalized.dot(CITY_DIRECTION))
  );
  if (tangent.lengthSq() < 1e-8) return 0;
  tangent.normalize();
  return Math.atan2(tangent.dot(CITY_TANGENT_Z), tangent.dot(CITY_TANGENT_X));
}

function warpedCityAngle(direction) {
  const normal = direction.clone().normalize();
  const angle = CITY_DIRECTION.angleTo(normal);
  const azimuth = azimuthForDirection(normal);
  const warp = DEG * (
    Math.sin(azimuth * 3.0) * 1.95 +
    Math.sin(azimuth * 7.0 + angle * 4.0) * 0.88 +
    Math.cos(azimuth * 5.0 - angle * 2.5) * 0.48
  );
  return { angle: angle + warp, azimuth };
}

function stepMask(angle, thresholdDegrees, softnessDegrees = 1.5) {
  const threshold = thresholdDegrees * DEG;
  const softness = softnessDegrees * DEG;
  return 1 - smoothstep(threshold - softness, threshold + softness, angle);
}

export function cityElevation(direction, radius) {
  const normal = direction.clone().normalize();
  const { angle } = warpedCityAngle(normal);

  const outer = stepMask(angle, CITY_TIER_DEGREES.outskirts, 1.9) * 0.05;
  const lower = stepMask(angle, CITY_TIER_DEGREES.lower, 1.7) * 0.085;
  const middle = stepMask(angle, CITY_TIER_DEGREES.middle, 1.55) * 0.10;
  const upper = stepMask(angle, CITY_TIER_DEGREES.upper, 1.45) * 0.115;
  const crown = stepMask(angle, CITY_TIER_DEGREES.crown, 1.3) * 0.105;

  const baseRelief = radius * (
    Math.sin(normal.x * 12.7 + normal.z * 7.9) * 0.0014 +
    Math.sin(normal.y * 17.3 - normal.x * 5.1) * 0.0009
  );

  return radius * (outer + lower + middle + upper + crown) + baseRelief;
}

export function cityTier(direction) {
  const { angle } = warpedCityAngle(direction.clone().normalize());
  if (angle < CITY_TIER_DEGREES.crown * DEG) return 'crown';
  if (angle < CITY_TIER_DEGREES.upper * DEG) return 'upper';
  if (angle < CITY_TIER_DEGREES.middle * DEG) return 'middle';
  if (angle < CITY_TIER_DEGREES.lower * DEG) return 'lower';
  if (angle < CITY_TIER_DEGREES.outskirts * DEG) return 'outskirts';
  return 'outside';
}

export function cityPolarDirection(radialAngle, azimuth = 0) {
  const tangent = CITY_TANGENT_X.clone().multiplyScalar(Math.cos(azimuth))
    .add(CITY_TANGENT_Z.clone().multiplyScalar(Math.sin(azimuth)));
  return CITY_DIRECTION.clone().multiplyScalar(Math.cos(radialAngle))
    .add(tangent.multiplyScalar(Math.sin(radialAngle)))
    .normalize();
}

export function citySurfaceRadius(direction, radius, extra = 0) {
  return radius + cityElevation(direction, radius) + extra;
}

function quaternionFromUpAndForward(yAxis, forwardHint) {
  let zAxis = forwardHint.clone().sub(yAxis.clone().multiplyScalar(forwardHint.dot(yAxis)));
  if (zAxis.lengthSq() < 1e-8) {
    zAxis = CITY_TANGENT_Z.clone().sub(yAxis.clone().multiplyScalar(CITY_TANGENT_Z.dot(yAxis)));
  }
  zAxis.normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
}

export function surfaceQuaternion(direction, tangentHint = null) {
  const yAxis = direction.clone().normalize();
  const forward = tangentHint || CITY_DIRECTION;
  return quaternionFromUpAndForward(yAxis, forward);
}

export function heroQuaternion() {
  // Crown and spire use exactly the same Y axis as the planet's polar city.
  // Only their horizontal facing is chosen here; no corrective lean remains.
  return quaternionFromUpAndForward(WORLD_UP, CITY_TANGENT_Z);
}
