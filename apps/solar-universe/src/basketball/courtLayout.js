export const COURT_SCALE_XZ = 0.68;
export const COURT_SURFACE_OFFSET = 0.045;
export const COURT_LENGTH = 1.02;
export const COURT_WIDTH = 0.59;

export const HOOP_GROUP_X = 0.41;
export const HOOP_RIM_HEIGHT = 0.36;
export const HOOP_RIM_BACKSET = 0.23;

export function courtSurfaceY(radius) {
  return radius + COURT_SURFACE_OFFSET;
}

export function hoopRimPosition(radius, side = 1) {
  const normalizedSide = side >= 0 ? 1 : -1;

  return {
    x: normalizedSide * (HOOP_GROUP_X - HOOP_RIM_BACKSET) * COURT_SCALE_XZ,
    y: courtSurfaceY(radius) + HOOP_RIM_HEIGHT,
    z: 0
  };
}
