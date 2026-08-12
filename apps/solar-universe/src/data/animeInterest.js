import * as THREE from 'three';

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
  // Keep the Anime world effectively tidally locked: the scarlet crown remains
  // on the same solar-facing side instead of rotating through the night side.
  axialSpeed: 0,
  initialAxial: 0.72,
  axialTilt: THREE.MathUtils.degToRad(4.5)
};
