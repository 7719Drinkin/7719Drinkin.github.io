export const LANGUAGE_STORAGE_KEY = '7719-language';

const COPY = {
  en: {
    pageTitle: '7719 Solar Universe',
    header: {
      homeAria: 'Return to the 7719 Universe home page',
      subtitle: 'SOLAR UNIVERSE / R3F',
      controlsAria: '3D Universe controls',
      mainSite: 'MAIN SITE',
      source: 'SOURCE',
      reset: 'RESET VIEW',
      switchLanguage: '切换为中文',
      languageButton: '中文'
    },
    intro: {
      aria: '3D Universe introduction',
      kicker: '7719 / MINIATURE INTEREST WORLDS',
      body: 'Each interest is a small world shaped by its places, objects and stories.'
    },
    readout: {
      aria: 'Rendering status',
      worlds: 'WORLDS',
      worldCount: '03 + STAR',
      render: 'RENDER',
      camera: 'CAMERA',
      cameraFree: 'CELESTIAL FREE',
      cameraLocked: 'ECLIPTIC LOCK'
    },
    controls: {
      aria: '3D display controls',
      mode: 'MODE',
      quality: 'QUALITY+',
      eco: 'ECO',
      orbits: 'ORBITS',
      gravityGrid: 'GRAVITY GRID',
      on: 'ON',
      off: 'OFF',
      solarOutput: 'SOLAR OUTPUT',
      solarAria: 'Solar output visual intensity {percent}%'
    },
    panel: {
      close: 'Close celestial information',
      star: 'STAR',
      planet: 'PLANET',
      enter: 'ENTER INTEREST',
      selected: 'SELECTED CELESTIAL BODY'
    },
    help: {
      drag: 'DRAG',
      freeRotate: 'FREE ROTATE',
      aboveEcliptic: 'ABOVE ECLIPTIC',
      scroll: 'SCROLL',
      zoom: 'ZOOM',
      click: 'CLICK',
      selectBody: 'SELECT BODY',
      doubleClick: 'DOUBLE CLICK',
      enter: 'ENTER'
    },
    affiliation: 'PERSONAL NON-COMMERCIAL TRIBUTE · NOT AFFILIATED WITH THE NBA OR CHICAGO BULLS'
  },
  zh: {
    pageTitle: '7719 太阳宇宙',
    header: {
      homeAria: '返回 7719 宇宙首页',
      subtitle: '太阳宇宙 / R3F',
      controlsAria: '3D 宇宙控制',
      mainSite: '主站',
      source: '源代码',
      reset: '重置视角',
      switchLanguage: 'Switch to English',
      languageButton: 'EN'
    },
    intro: {
      aria: '3D 宇宙介绍',
      kicker: '7719 / 微缩兴趣世界',
      body: '每一种兴趣都是一个微缩世界，由其中的地点、物件和故事共同塑造。'
    },
    readout: {
      aria: '渲染状态',
      worlds: '世界',
      worldCount: '03 + 恒星',
      render: '渲染',
      camera: '相机',
      cameraFree: '天体自由视角',
      cameraLocked: '黄道锁定'
    },
    controls: {
      aria: '3D 显示控制',
      mode: '模式',
      quality: '高质量+',
      eco: '节能',
      orbits: '轨道',
      gravityGrid: '引力网格',
      on: '开',
      off: '关',
      solarOutput: '太阳输出',
      solarAria: '太阳输出视觉强度 {percent}%'
    },
    panel: {
      close: '关闭天体信息',
      star: '恒星',
      planet: '行星',
      enter: '进入兴趣世界',
      selected: '已选择天体'
    },
    help: {
      drag: '拖动',
      freeRotate: '自由旋转',
      aboveEcliptic: '黄道面上方',
      scroll: '滚轮',
      zoom: '缩放',
      click: '单击',
      selectBody: '选择天体',
      doubleClick: '双击',
      enter: '进入页面'
    },
    affiliation: '个人非商业致敬项目 · 与 NBA 或芝加哥公牛队无官方关联'
  }
};

function interpolate(value, variables = {}) {
  return String(value).replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? '');
}

export function detectLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // Storage can be unavailable in strict browser contexts.
  }

  const preferred = navigator.languages?.[0] || navigator.language || 'en';
  return preferred.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function persistLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Keep the in-memory language when storage is unavailable.
  }
}

export function translate(language, path, variables = {}) {
  const segments = path.split('.');
  let value = COPY[language] ?? COPY.en;

  for (const segment of segments) {
    value = value?.[segment];
  }

  if (value === undefined) return path;
  return interpolate(value, variables);
}

export function localizeInterest(interest, language) {
  if (!interest) return interest;
  const localized = interest.i18n?.[language];
  return localized ? { ...interest, ...localized } : interest;
}
