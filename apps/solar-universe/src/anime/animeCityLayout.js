import * as THREE from 'three';

export const ANIME_RED = '#cf1824';
export const ANIME_RED_DARK = '#82121a';
export const ANIME_IVORY = '#e5e2da';
export const ANIME_BLACK = '#15161a';
export const ANIME_CHARCOAL = '#252a31';

export const CITY_DIRECTION = new THREE.Vector3(0.08, 0.91, 0.405).normalize();

const REFERENCE = new THREE.Vector3(1, 0, 0);
export const CITY_TANGENT_X = new THREE.Vector3().crossVectors(REFERENCE, CITY_DIRECTION).normalize();
export const CITY_TANGENT_Z = new THREE.Vector3().crossVectors(CITY_DIRECTION, CITY_TANGENT_X).normalize();

const DEG = THREE.MathUtils.DEG2RAD;

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(edge1 - edge0, 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
}

function azimuthForDirection(direction) {
  const tangent = direction.clone().normalize().sub(
    CITY_DIRECTION.clone().multiplyScalar(direction.clone().normalize().dot(CITY_DIRECTION))
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
    Math.sin(azimuth * 3.0) * 1.55 +
    Math.sin(azimuth * 7.0 + angle * 4.0) * 0.72 +
    Math.cos(azimuth * 5.0 - angle * 2.5) * 0.38
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

  const outer = stepMask(angle, 65, 2.8) * 0.035;
  const lower = stepMask(angle, 51, 2.5) * 0.065;
  const middle = stepMask(angle, 36, 2.35) * 0.07;
  const upper = stepMask(angle, 22, 2.15) * 0.08;
  const crown = stepMask(angle, 10, 1.85) * 0.07;

  const baseRelief = radius * (
    Math.sin(normal.x * 12.7 + normal.z * 7.9) * 0.0022 +
    Math.sin(normal.y * 17.3 - normal.x * 5.1) * 0.0014
  );

  return radius * (outer + lower + middle + upper + crown) + baseRelief;
}

export function cityTier(direction) {
  const { angle } = warpedCityAngle(direction.clone().normalize());
  if (angle < 10 * DEG) return 'crown';
  if (angle < 22 * DEG) return 'upper';
  if (angle < 36 * DEG) return 'middle';
  if (angle < 51 * DEG) return 'lower';
  if (angle < 65 * DEG) return 'outskirts';
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
