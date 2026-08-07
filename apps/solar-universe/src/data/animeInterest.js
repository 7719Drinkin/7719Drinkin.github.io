import * as THREE from 'three';

export const ANIME_INTEREST = {
  id: 'anime',
  number: '04',
  kind: 'planet',
  title: 'Anime',
  worldName: 'MEMORY FOLIO',
  status: 'FORMING',
  route: '/anime/',
  description: 'Works, characters and scenes kept as a quiet personal archive of drawn worlds.',
  i18n: {
    zh: {
      title: '动漫',
      worldName: '记忆册页',
      status: '形成中',
      description: '把作品、角色与场景收拢成一册安静的私人动画记忆档案。'
    }
  },
  accent: '#d0b97f',
  size: 0.8,
  orbitRadius: 38.5,
  orbitSpeed: 0.003,
  initialOrbit: 5.58,
  axialSpeed: 0.024,
  initialAxial: 0.72,
  axialTilt: THREE.MathUtils.degToRad(10)
};
