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
  // Keep the polar city level and stable. The orbital pivot supplies the
  // synchronous world rotation while the axial body itself does not spin.
  axialSpeed: 0,
  // With the city centered on +Y, this value only turns the city around its
  // vertical axis so the monumental stair opens toward the default focus view.
  initialAxial: 1.9,
  axialTilt: 0
};
