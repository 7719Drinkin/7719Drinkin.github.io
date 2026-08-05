import * as THREE from 'three';

export const MUSIC_PUPPET_CELESTIAL = {
  id: 'music-puppet',
  parentId: 'music',
  number: '03-A',
  kind: 'satellite',
  title: 'Kou Shi Xin Fei Puppet',
  worldName: 'THEATRICAL SATELLITE',
  status: 'ORBITING',
  route: '/music/',
  description: 'A medium-poly theatrical puppet-head celestial body inspired by the visual language of Chang Yu-sheng’s album Kou Shi Xin Fei.',
  i18n: {
    zh: {
      title: '《口是心非》木偶',
      worldName: '戏剧木偶卫星',
      status: '环绕中',
      description: '一颗以张雨生《口是心非》专辑视觉语言为灵感的中模戏剧木偶头天体。'
    }
  },
  accent: '#c36c57',
  size: 0.48,
  orbitRadius: 2.45,
  orbitSpeed: 0.105,
  initialOrbit: 1.18,
  orbitInclination: THREE.MathUtils.degToRad(27),
  axialSpeed: 0.14,
  initialAxial: -0.38,
  axialTilt: THREE.MathUtils.degToRad(-8)
};
