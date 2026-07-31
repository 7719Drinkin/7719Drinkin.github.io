import * as THREE from 'three';

export const ANIME_INTEREST = {
  id: 'anime', number: '04', kind: 'planet', title: 'Anime', worldName: 'FRAME WORLD', status: 'FORMING',
  route: '/anime/', description: 'Works, characters and stories remembered one frame at a time.',
  i18n: { zh: { title: '动漫', worldName: '分镜世界', status: '形成中', description: '由一帧帧画面所保存的作品、角色与故事。' } },
  accent: '#ff806f', size: 0.8, orbitRadius: 20.4, orbitSpeed: 0.0036, initialOrbit: 5.58,
  axialSpeed: 0.024, initialAxial: 0.72, axialTilt: THREE.MathUtils.degToRad(10)
};
