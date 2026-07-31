import * as THREE from 'three';

export const SUN = {
  id: 'sun',
  number: '00',
  kind: 'star',
  title: 'Sun',
  worldName: 'SYSTEM STAR',
  status: 'ACTIVE',
  route: null,
  description: 'The central star, rendered with a layered photosphere, granulation, sunspots, chromosphere, corona, intermittent flares and restrained HDR radiance.',
  i18n: {
    zh: {
      title: '太阳',
      worldName: '系统恒星',
      status: '活跃',
      description: '系统中央的恒星，由分层光球、米粒组织、太阳黑子、色球层、日冕、间歇性耀斑和克制的 HDR 辐射共同构成。'
    }
  },
  accent: '#ffbd68',
  size: 0.95
};

export const INTERESTS = [
  {
    id: 'basketball',
    number: '01',
    kind: 'planet',
    title: 'Basketball',
    worldName: 'THE LAST COURT',
    status: 'ACTIVE',
    route: '/basketball/',
    description: 'Courts, memory, competition and the legacy that made the game larger than life.',
    i18n: {
      zh: {
        title: '篮球',
        worldName: '最后的球场',
        status: '活跃',
        description: '球场、记忆、竞争，以及那段让篮球超越比赛本身的传奇。'
      }
    },
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
    kind: 'planet',
    title: 'Games',
    worldName: 'STRATEGY WORLD',
    status: 'FORMING',
    route: '/games/',
    description: 'Strategy, civilization building and memorable virtual worlds.',
    i18n: {
      zh: {
        title: '游戏',
        worldName: '策略世界',
        status: '形成中',
        description: '策略、文明建设，以及令人难忘的虚拟世界。'
      }
    },
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
    kind: 'planet',
    title: 'Music',
    worldName: 'SOUND FOREST',
    status: 'FORMING',
    route: '/music/',
    description: 'Artists, albums and songs collected across different versions of me.',
    i18n: {
      zh: {
        title: '音乐',
        worldName: '声音森林',
        status: '形成中',
        description: '跨越人生不同阶段收集的音乐人、专辑与歌曲。'
      }
    },
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
