const ANIME_LANGUAGE_KEY = '7719-language';

const ANIME_COPY = {
  en: {
    navUniverse: 'UNIVERSE', navModules: 'MODULES', nav3d: '3D MODE', home: 'HOME', anime: 'ANIME',
    heroEyebrow: '04 / INTEREST', heroBody: 'Stories and memories drawn one frame at a time. This space will organize works, characters, scenes and worlds.',
    building: 'COLLECTION IN DEVELOPMENT', skeleton: 'MODULE SKELETON', moduleTitle: 'WAITING TO<br>TAKE SHAPE.',
    moduleBody: 'The structure comes first. Works and materials can be added later without redesigning the module.',
    works: 'WORKS', worksBody: 'Individual titles, viewing memories and reference entries.',
    characters: 'CHARACTERS', charactersBody: 'Characters, relationships and personal impressions.',
    worlds: 'SCENES & WORLDS', worldsBody: 'Memorable scenes, settings, lines and worldbuilding.',
    principle: 'CURRENT PRINCIPLE', principleTitle: 'KEEP THE STRUCTURE.<br>DECIDE THE CONTENT LATER.',
    principleBody: 'No specific title is attached yet, and no unconfirmed images are used. Every entry remains open for future expansion.',
    back: 'BACK TO UNIVERSE →'
  },
  zh: {
    navUniverse: '宇宙', navModules: '模块', nav3d: '3D 模式', home: '首页', anime: '动漫',
    heroEyebrow: '04 / 兴趣', heroBody: '一帧一帧绘出的世界与记忆。这里将用于整理作品、角色、名场面与世界观。',
    building: '内容建设中', skeleton: '模块骨架', moduleTitle: '等待内容<br>形成。',
    moduleBody: '先建立稳定的内容入口。后续确定作品和素材后，可以逐步扩展，而不需要重新设计整个模块。',
    works: '作品档案', worksBody: '单部作品专题、观看记忆和资料入口。',
    characters: '角色档案', charactersBody: '角色、人物关系和角色印象。',
    worlds: '名场面与世界观', worldsBody: '经典场景、设定、台词和世界构成。',
    principle: '当前原则', principleTitle: '先保留结构，<br>再决定内容。',
    principleBody: '现阶段不绑定具体动漫作品，也不使用未确认的图片。所有入口都作为后续扩展点保留。',
    back: '返回宇宙 →'
  }
};

function detectAnimeLanguage() {
  try {
    const stored = localStorage.getItem(ANIME_LANGUAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

let animeLanguage = detectAnimeLanguage();
const languageToggle = document.querySelector('#anime-language-toggle');

function applyAnimeLanguage() {
  const copy = ANIME_COPY[animeLanguage];
  document.documentElement.lang = animeLanguage === 'zh' ? 'zh-CN' : 'en';
  document.title = animeLanguage === 'zh' ? '动漫 · 7719 宇宙' : 'Anime · 7719 Universe';
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = animeLanguage === 'zh'
    ? '7719 宇宙中的动漫兴趣模块。'
    : 'Anime collection preview in 7719 Universe.';

  document.querySelectorAll('[data-copy]').forEach((element) => {
    const value = copy[element.dataset.copy];
    if (value === undefined) return;
    if (element.hasAttribute('data-html')) element.innerHTML = value;
    else element.textContent = value;
  });

  if (languageToggle) {
    languageToggle.textContent = animeLanguage === 'zh' ? 'EN' : '中文';
    languageToggle.setAttribute('aria-label', animeLanguage === 'zh' ? 'Switch to English' : '切换为中文');
  }
}

languageToggle?.addEventListener('click', () => {
  animeLanguage = animeLanguage === 'zh' ? 'en' : 'zh';
  try { localStorage.setItem(ANIME_LANGUAGE_KEY, animeLanguage); } catch {}
  applyAnimeLanguage();
});

const header = document.querySelector('.universe-header');
window.addEventListener('scroll', () => header?.classList.toggle('is-scrolled', window.scrollY > 22));

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  reveals.forEach((item) => observer.observe(item));
} else {
  reveals.forEach((item) => item.classList.add('visible'));
}

applyAnimeLanguage();
