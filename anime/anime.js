const ANIME_LANGUAGE_KEY = '7719-language';

const ANIME_COPY = {
  en: {
    navUniverse: 'UNIVERSE',
    navModules: 'ARCHIVE',
    nav3d: '3D MODE',
    home: 'HOME',
    anime: 'ANIME',
    heroEyebrow: '04 / PERSONAL ANIMATION ARCHIVE',
    heroCaption: 'A quiet archive of drawn worlds',
    heroBody: 'Stories stay with us in fragments: a frame, a voice, a character, a place. This archive keeps the parts worth returning to.',
    enterArchive: 'OPEN THE ARCHIVE',
    scroll: 'SCROLL TO BROWSE',
    letterTitle: 'Archive\nNotes',
    archiveKicker: 'ARCHIVE INDEX',
    moduleTitle: 'GATHER THE WORLDS THAT STAY WITH ME.',
    moduleBody: 'Three quiet entries for works, characters, and scenes. The structure can grow naturally as the collection becomes more complete.',
    file: 'FILE',
    works: 'WORKS',
    worksBody: 'Individual titles, viewing memories, visual material and the reasons a story remained.',
    characters: 'CHARACTERS',
    charactersBody: 'People, relationships, gestures and the impressions that remain after the story ends.',
    worlds: 'SCENES & WORLDS',
    worldsBody: 'Frames, locations, settings, lines and small details that make an imagined world feel real.',
    building: 'ARCHIVE OPEN / MATERIALS PENDING',
    principle: '02 / EDITOR’S NOTE',
    principleTitle: 'KEEP ONLY WHAT IS WORTH REMEMBERING.',
    principleBody: 'This page is not intended to become a complete database. It will remain selective, visual and personal, leaving enough quiet space around each memory.',
    back: 'BACK TO UNIVERSE →'
  },
  zh: {
    navUniverse: '宇宙',
    navModules: '档案',
    nav3d: '3D 模式',
    home: '首页',
    anime: '动漫',
    heroEyebrow: '04 / 私人动画档案',
    heroCaption: '一册安静收拢画面与记忆的档案',
    heroBody: '故事最后留下来的，往往只是一些片段：一个画面、一种声音、一个人物、一处地方。这里收集那些值得反复回望的部分。',
    enterArchive: '翻阅档案',
    scroll: '向下翻阅',
    letterTitle: '档案\n札记',
    archiveKicker: '档案索引',
    moduleTitle: '把真正留下来的世界，慢慢整理成册。',
    moduleBody: '作品、角色、场景三个入口保持克制而清晰；随着收藏增加，内容可以自然生长，而不需要重新推翻页面结构。',
    file: '档案',
    works: '作品档案',
    worksBody: '记录单部作品、观看记忆、视觉素材，以及一段故事为什么会留下来。',
    characters: '角色档案',
    charactersBody: '整理人物、关系、动作与神情，以及故事结束之后仍然留在记忆里的印象。',
    worlds: '名场面与世界',
    worldsBody: '收藏画面、地点、设定、台词与细节，让那些虚构世界仍然保有真实的质感。',
    building: '档案已开启 / 素材待整理',
    principle: '02 / 整理手记',
    principleTitle: '只留下真正值得记住的部分。',
    principleBody: '这里不会被做成一份完整数据库。它会保持选择性、视觉性和私人感，让每段记忆之间仍然留有足够的呼吸空间。',
    back: '返回宇宙 →'
  }
};

function detectAnimeLanguage() {
  try {
    const stored = localStorage.getItem(ANIME_LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {}
  return (navigator.language || 'zh-CN').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let animeLanguage = detectAnimeLanguage();
const languageToggle = document.querySelector('#anime-language-toggle');

function applyAnimeLanguage() {
  const copy = ANIME_COPY[animeLanguage];
  document.documentElement.lang = animeLanguage === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.dataset.language = animeLanguage;
  document.title = animeLanguage === 'zh' ? '动漫 · 7719 宇宙' : 'Anime · 7719 Universe';

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.content = animeLanguage === 'zh'
      ? '7719 宇宙中的私人动漫收藏与观看记忆。'
      : 'A personal anime archive of works, characters, scenes and viewing memories in 7719 Universe.';
  }

  document.querySelectorAll('[data-copy]').forEach((element) => {
    const value = copy[element.dataset.copy];
    if (value === undefined) return;
    const normalized = String(value).replaceAll('\n', '<br>');
    if (element.hasAttribute('data-html') || String(value).includes('\n')) element.innerHTML = normalized;
    else element.textContent = value;
  });

  if (languageToggle) {
    languageToggle.textContent = animeLanguage === 'zh' ? 'EN' : '中文';
    languageToggle.setAttribute('aria-label', animeLanguage === 'zh' ? 'Switch to English' : '切换为中文');
    languageToggle.lang = animeLanguage === 'zh' ? 'en' : 'zh-CN';
  }
}

languageToggle?.addEventListener('click', () => {
  animeLanguage = animeLanguage === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem(ANIME_LANGUAGE_KEY, animeLanguage); } catch {}
  applyAnimeLanguage();
});

const header = document.querySelector('.universe-header');
const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 22);
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  reveals.forEach((item) => observer.observe(item));
} else {
  reveals.forEach((item) => item.classList.add('visible'));
}

const hero = document.querySelector('.anime-hero');
const letter = document.querySelector('.anime-letter');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

if (hero && letter && finePointer.matches && !reduceMotion.matches) {
  hero.addEventListener('pointermove', (event) => {
    const bounds = hero.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 12;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 10;
    letter.style.setProperty('--anime-shift-x', `${x.toFixed(2)}px`);
    letter.style.setProperty('--anime-shift-y', `${y.toFixed(2)}px`);
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    letter.style.setProperty('--anime-shift-x', '0px');
    letter.style.setProperty('--anime-shift-y', '0px');
  });
}

applyAnimeLanguage();
