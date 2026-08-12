export const ANIME_INTEREST = {
  id: 'anime',
  number: '04',
  kind: 'planet',
  title: 'Anime',
  worldName: 'SCARLET ASCENT',
  status: 'FORMING',
  route: '/anime/',
  description: 'A drawn city-world rising through stark terraces, monumental stairs and a scarlet crown.',
  i18n: {
    zh: {
      title: '动漫',
      worldName: '绯红天阶',
      status: '形成中',
      description: '一座沿巨大台地向上攀升的动画都市世界，以黑白建筑、绯红中轴与高塔构成强烈层级。'
    }
  },
  accent: '#cf1824',
  size: 0.8,
  orbitRadius: 38.5,
  orbitSpeed: 0.003,
  initialOrbit: 5.58,
  // Anime is presented upright and effectively tidally locked. With the
  // axial body fixed inside the orbital pivot, the same city face continues
  // to point toward the system star while the planet travels around it.
  axialSpeed: 0,
  // Rotate the local crown direction onto the inward, sun-facing hemisphere.
  initialAxial: -0.92,
  // Keep this world level. Its monumental spire should never lean because of
  // an orbital/planetary presentation tilt.
  axialTilt: 0
};
