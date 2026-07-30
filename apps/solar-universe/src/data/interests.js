import * as THREE from 'three';

export const INTERESTS = [
  {
    id: 'basketball',
    number: '01',
    title: 'Basketball',
    worldName: 'THE LAST COURT',
    status: 'ACTIVE',
    route: '/basketball/',
    description: 'Courts, memory, competition and the legacy that made the game larger than life.',
    accent: '#d7a064',
    size: 0.98,
    orbitRadius: 7.4,
    orbitSpeed: 0.008,
    initialOrbit: 0.64,
    axialSpeed: 0.035,
    initialAxial: 0.2,
    axialTilt: THREE.MathUtils.degToRad(-9)
  },
  {
    id: 'games',
    number: '02',
    title: 'Games',
    worldName: 'STRATEGY WORLD',
    status: 'FORMING',
    route: '/games/',
    description: 'Strategy, civilization building and memorable virtual worlds.',
    accent: '#79ceff',
    size: 0.72,
    orbitRadius: 12.3,
    orbitSpeed: 0.0058,
    initialOrbit: 2.62,
    axialSpeed: 0.027,
    initialAxial: 1.1,
    axialTilt: THREE.MathUtils.degToRad(12)
  },
  {
    id: 'music',
    number: '03',
    title: 'Music',
    worldName: 'SOUND FOREST',
    status: 'FORMING',
    route: '/music/',
    description: 'Artists, albums and songs collected across different versions of me.',
    accent: '#cf9fff',
    size: 0.77,
    orbitRadius: 17.1,
    orbitSpeed: 0.0044,
    initialOrbit: 4.72,
    axialSpeed: 0.022,
    initialAxial: 2.3,
    axialTilt: THREE.MathUtils.degToRad(-17)
  }
];
