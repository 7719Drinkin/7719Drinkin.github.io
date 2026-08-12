import * as THREE from 'three';

export const ANIME_RED = '#cf1824';
export const ANIME_RED_DARK = '#82121a';
export const ANIME_IVORY = '#e5e2da';
export const ANIME_BLACK = '#15161a';
export const ANIME_CHARCOAL = '#252a31';

// The city is intentionally placed on the front-upper hemisphere rather than
// near the pole. With the Anime planet's initial axial rotation this exposes
// the terraced slope to the default camera instead of presenting only its rim.
export const CITY_DIRECTION = new THREE.Vector3(-0.18, 0.70, 0.69).normalize();

export const CITY_TIER_DEGREES = {
  crown: 12,
  upper: 27,
  middle: 43,
  lower: 59,
  outskirts: 74
};

const REFERENCE = new THREE.Vector3(1, 0, 0);
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
    Math.sin(azimuth * 3.0) * 1.8 +
    Math.sin(azimuth * 7.0 + angle * 4.0) * 0.82 +
    Math.cos(azimuth * 5.0 - angle * 2.5) * 0.44
  );
  return { angle: angle + warp, azimuth };
}

function stepMask(angle, thresholdDegrees, softnessDegrees = 2.1) {
  const threshold = thresholdDegrees * DEG;
  const softness = softnessDegrees * DEG;
  return 1 - smoothstep(threshold - softness, threshold + softness, angle);
}

export function cityElevation(direction, radius) {
  const normal = direction.clone().normalize();
  const { angle } = warpedCityAngle(normal);

  // Cumulative artificial terraces. The crown rises roughly 0.41R above the
  // base sphere, while the outskirts begin as a broad shallow urban shelf.
  const outer = stepMask(angle, CITY_TIER_DEGREES.outskirts, 3.1) * 0.045;
  const lower = stepMask(angle, CITY_TIER_DEGREES.lower, 2.8) * 0.075;
  const middle = stepMask(angle, CITY_TIER_DEGREES.middle, 2.6) * 0.09;
  const upper = stepMask(angle, CITY_TIER_DEGREES.upper, 2.35) * 0.105;
  const crown = stepMask(angle, CITY_TIER_DEGREES.crown, 2.0) * 0.095;

  const baseRelief = radius * (
    Math.sin(normal.x * 12.7 + normal.z * 7.9) * 0.0018 +
    Math.sin(normal.y * 17.3 - normal.x * 5.1) * 0.0011
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

export function surfaceQuaternion(direction, tangentHint = null) {
  const yAxis = direction.clone().normalize();
  let zAxis;

  if (tangentHint) {
    zAxis = tangentHint.clone().sub(yAxis.clone().multiplyScalar(tangentHint.dot(yAxis)));
  } else {
    zAxis = CITY_DIRECTION.clone().sub(yAxis.clone().multiplyScalar(CITY_DIRECTION.dot(yAxis)));
  }

  if (zAxis.lengthSq() < 1e-8) {
    zAxis = CITY_TANGENT_Z.clone().sub(yAxis.clone().multiplyScalar(CITY_TANGENT_Z.dot(yAxis)));
  }

  zAxis.normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

  const basis = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}
