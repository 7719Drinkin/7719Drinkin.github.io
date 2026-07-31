(() => {
  const STORAGE_KEY = '7719-language';
  const SUPPORTED_LANGUAGES = new Set(['en', 'zh']);

  const dynamicCopy = {
    'archive.frames': {
      en: '{count} FRAMES',
      zh: '{count} 张照片'
    },
    'archive.frameAlt': {
      en: 'Michael Jordan archive frame {number}',
      zh: '迈克尔·乔丹影像档案第 {number} 张'
    },
    'archive.openImage': {
      en: '{label}, click to enlarge',
      zh: '{label}，点击放大'
    },
    'gallery.openImage': {
      en: '{label}, click to enlarge',
      zh: '{label}，点击放大'
    }
  };

  const pages = {
    home: {
      title: {
        en: '7719 Universe',
        zh: '7719 宇宙'
      },
      description: {
        en: '7719 Universe — an expanding personal universe where every interest becomes an independent galaxy.',
        zh: '7719 宇宙——一个持续扩张的个人兴趣宇宙，每一种兴趣都拥有独立的星系。'
      },
      entries: [
        { selector: '.universe-brand', attr: 'aria-label', en: '7719 Universe home', zh: '7719 宇宙首页' },
        {
          selector: '.universe-nav a',
          values: {
            en: ['GALAXIES', '3D MODE', 'FEATURED', 'ABOUT', 'GITHUB'],
            zh: ['星系', '3D 模式', '精选', '关于', 'GITHUB']
          }
        },
        { selector: '.universe-hero-copy .eyebrow', en: 'FIELD NOTE 7719 / OPEN CATALOG', zh: '档案记录 7719 / 开放目录' },
        { selector: '.universe-hero-copy h1 span', en: 'PERSONAL', zh: '个人' },
        { selector: '.universe-hero-copy h1 strong', en: 'UNIVERSE', zh: '宇宙' },
        {
          selector: '.universe-tagline',
          en: 'No center. No fixed boundary. Every interest occupies its own region of space, and the catalog remains open to galaxies that have not formed yet.',
          zh: '没有中心，也没有固定边界。每一种兴趣都占据自己的空间，而这份目录始终为尚未形成的新星系开放。'
        },
        { selector: '.universe-scroll', html: true, en: 'EXPLORE THE CATALOG <span>↓</span>', zh: '探索兴趣目录 <span>↓</span>' },
        { selector: '.hero-readout', attr: 'aria-label', en: 'Universe catalog status', zh: '宇宙目录状态' },
        {
          selector: '.hero-readout div > span',
          values: {
            en: ['ACTIVE GALAXIES', 'CATALOG STATUS', 'BOUNDARY'],
            zh: ['活跃星系', '目录状态', '边界']
          }
        },
        {
          selector: '.hero-readout div > strong',
          values: {
            en: ['03', 'EXPANDING', 'OPEN'],
            zh: ['03', '持续扩张', '开放']
          }
        },
        { selector: '#galaxies .section-heading p', en: '01 / DEEP FIELD CATALOG', zh: '01 / 深空兴趣目录' },
        { selector: '#galaxies .section-heading h2', html: true, en: 'INDEPENDENT<br>GALAXIES.', zh: '独立的<br>兴趣星系。' },
        {
          selector: '#galaxies .section-heading > span',
          en: 'Each entry is a separate interest system. There is no central subject and no permanent final list.',
          zh: '每个条目都是独立的兴趣系统。这里没有中心主题，也不存在永久不变的最终清单。'
        },
        {
          selector: '#interest-grid .interest-card',
          attr: 'aria-label',
          values: {
            en: ['Enter the Basketball galaxy', 'Enter the Games galaxy', 'Enter the Music galaxy'],
            zh: ['进入篮球星系', '进入游戏星系', '进入音乐星系']
          }
        },
        {
          selector: '#interest-grid .interest-card-top span:first-child',
          values: {
            en: ['GALAXY 01', 'GALAXY 02', 'GALAXY 03'],
            zh: ['星系 01', '星系 02', '星系 03']
          }
        },
        {
          selector: '#interest-grid .interest-card-status',
          values: {
            en: ['EXPLORE', 'FORMING', 'FORMING'],
            zh: ['探索', '形成中', '形成中']
          }
        },
        {
          selector: '#interest-grid .interest-card-kicker',
          values: {
            en: ['ACTIVE INTEREST SYSTEM', 'DEVELOPING INTEREST SYSTEM', 'DEVELOPING INTEREST SYSTEM'],
            zh: ['活跃兴趣系统', '建设中的兴趣系统', '建设中的兴趣系统']
          }
        },
        {
          selector: '#interest-grid .interest-card-copy h3',
          values: {
            en: ['Basketball', 'Games', 'Music'],
            zh: ['篮球', '游戏', '音乐']
          }
        },
        {
          selector: '#interest-grid .interest-card-subtitle',
          values: {
            en: ['The game never stops.', 'Worlds built one decision at a time.', 'Soundtracks for different versions of me.'],
            zh: ['比赛永不停歇。', '每一次选择，都在构筑新的世界。', '属于人生不同阶段的声音轨迹。']
          }
        },
        {
          selector: '#interest-grid .interest-card-description',
          values: {
            en: [
              'Legends, iconic frames and the moments that made the game larger than life.',
              'Strategy, civilization building and memorable virtual worlds.',
              'Artists, albums and songs collected over time.'
            ],
            zh: [
              '传奇球员、经典影像，以及那些让篮球超越比赛本身的时刻。',
              '策略、文明建设，以及令人难忘的虚拟世界。',
              '跨越不同阶段收集的音乐人、专辑与歌曲。'
            ]
          }
        },
        { selector: '#interest-grid .interest-card-enter', html: true, values: { en: ['ENTER GALAXY <strong>↗</strong>', 'ENTER GALAXY <strong>↗</strong>', 'ENTER GALAXY <strong>↗</strong>'], zh: ['进入星系 <strong>↗</strong>', '进入星系 <strong>↗</strong>', '进入星系 <strong>↗</strong>'] } },
        { selector: '#solar-experience .section-heading p', en: '02 / OPTIONAL EXPERIENCE', zh: '02 / 可选体验' },
        { selector: '#solar-experience .section-heading h2', html: true, en: 'ORBIT THE<br>CATALOG.', zh: '环游<br>兴趣目录。' },
        {
          selector: '#solar-experience .section-heading > span',
          en: 'The same interests presented as a separate interactive 3D browsing mode.',
          zh: '以独立的交互式 3D 浏览模式，重新呈现相同的兴趣内容。'
        },
        { selector: '.solar-experience-copy .eyebrow', en: '3D EXPERIENCE / REACT THREE FIBER', zh: '3D 体验 / REACT THREE FIBER' },
        { selector: '.solar-experience-copy h3', html: true, en: 'SOLAR<br>UNIVERSE.', zh: '太阳系<br>宇宙。' },
        {
          selector: '.solar-experience-copy > p:last-child',
          en: 'Explore each interest as a miniature world. Move through the system, focus on a planet and rotate around the places and objects built into its surface.',
          zh: '把每一种兴趣作为微缩世界来探索。穿行于整个系统，聚焦某颗行星，并环绕观察建造在其表面的地点与物件。'
        },
        { selector: '.solar-experience-readout dt', values: { en: ['MODE', 'INPUT', 'FALLBACK'], zh: ['模式', '操作', '备用入口'] } },
        { selector: '.solar-experience-readout dd', values: { en: ['OPTIONAL', 'DRAG + ZOOM', 'MAIN CATALOG'], zh: ['可选', '拖动 + 缩放', '主目录'] } },
        { selector: '.solar-experience-link span', en: 'LAUNCH 3D EXPERIENCE', zh: '启动 3D 体验' },
        { selector: '#featured .section-heading p', en: '03 / FEATURED COLLECTION', zh: '03 / 精选合集' },
        { selector: '#featured .section-heading h2', html: true, en: 'THE<br>LEGACY.', zh: '不朽的<br>传奇。' },
        {
          selector: '#featured .section-heading > span',
          en: 'The first fully developed collection inside the Basketball galaxy.',
          zh: '篮球星系中第一个完整开发的专题合集。'
        },
        { selector: '.featured-copy .eyebrow', en: 'BASKETBALL / MICHAEL JORDAN', zh: '篮球 / MICHAEL JORDAN' },
        {
          selector: '.featured-copy > p:last-of-type',
          en: 'A visual tribute built around iconic frames, movement, focus and the legacy that made basketball feel larger than the game.',
          zh: '以经典影像、运动、专注与传奇为核心，向那段让篮球超越比赛本身的历史致敬。'
        },
        { selector: '.featured-copy .primary-link', html: true, en: 'VIEW COLLECTION <span>↗</span>', zh: '查看专题 <span>↗</span>' },
        { selector: '.featured-media img', attr: 'alt', en: 'Michael Jordan basketball tribute animation', zh: '迈克尔·乔丹篮球致敬动画' },
        { selector: '.featured-media figcaption', en: 'COLLECTION 01 · MOVING IMAGE ARCHIVE', zh: '专题 01 · 动态影像档案' },
        { selector: '#about .eyebrow', en: '04 / SYSTEM PRINCIPLE', zh: '04 / 系统原则' },
        { selector: '#about h2', html: true, en: 'STILL<br>EXPANDING.', zh: '仍在<br>扩张。' },
        {
          selector: '#about .about-copy p',
          values: {
            en: [
              'This site is not a fixed list of favorites. Every interest can become an independent galaxy, each galaxy can contain multiple collections, and new systems can be registered without displacing the existing ones.',
              'Basketball is simply the first developed galaxy. It is not the center of the universe.'
            ],
            zh: [
              '这个网站不是一份固定的喜好清单。每一种兴趣都可以成为独立星系，每个星系都可以容纳多个专题，而新系统的加入不会取代已有内容。',
              '篮球只是第一个被完整开发的星系，它并不是这个宇宙的中心。'
            ]
          }
        },
        { selector: '.universe-footer span:last-child', en: 'NO CENTER · NO FINAL BOUNDARY · 2026', zh: '没有中心 · 没有最终边界 · 2026' }
      ]
    },
    basketball: {
      title: { en: 'Basketball · 7719 Universe', zh: '篮球 · 7719 宇宙' },
      description: { en: 'Basketball collections in 7719 Universe.', zh: '7719 宇宙中的篮球专题合集。' },
      entries: [
        { selector: '.universe-nav a', values: { en: ['UNIVERSE', 'COLLECTIONS', 'MJ'], zh: ['宇宙', '专题', 'MJ'] } },
        { selector: '.breadcrumb a', en: 'HOME', zh: '首页' },
        { selector: '.breadcrumb span:last-child', en: 'BASKETBALL', zh: '篮球' },
        { selector: '.interest-hero .eyebrow', en: '01 / INTEREST', zh: '01 / 兴趣' },
        { selector: '.interest-hero h1', en: 'BASKETBALL', zh: '篮球' },
        {
          selector: '.interest-hero-copy > p:last-child',
          en: 'The rhythm of the court, the pressure of a final possession and the players whose moments became permanent.',
          zh: '球场的节奏、最后一攻的压力，以及那些让瞬间成为永恒的球员。'
        },
        { selector: '#collections .section-heading p', en: 'COLLECTIONS', zh: '专题合集' },
        { selector: '#collections .section-heading h2', html: true, en: 'CHOOSE A<br>STORY.', zh: '选择一段<br>故事。' },
        {
          selector: '#collections .section-heading > span',
          en: 'Michael Jordan is the first complete basketball collection. More sections can be added without changing the site core.',
          zh: 'Michael Jordan 是第一个完整的篮球专题，后续内容可以持续加入，而无需改动网站核心结构。'
        },
        { selector: '.topic-card small', values: { en: ['OPEN COLLECTION', 'COMING SOON', 'COMING SOON'], zh: ['打开专题', '即将推出', '即将推出'] } },
        { selector: '.topic-card h2', html: true, values: { en: ['MICHAEL<br>JORDAN', 'NBA<br>ARCHIVE', 'MY<br>GAME'], zh: ['MICHAEL<br>JORDAN', 'NBA<br>档案', '我的<br>篮球'] } },
        {
          selector: '.topic-card p',
          values: {
            en: [
              'Selected frames, a complete photo archive and a film tribute to the legacy of 23.',
              'Teams, eras and memorable games.',
              'Your own basketball photos, memories and videos.'
            ],
            zh: [
              '精选影像、完整照片档案，以及献给 23 号传奇的影片。',
              '球队、时代与令人难忘的比赛。',
              '属于你自己的篮球照片、记忆与视频。'
            ]
          }
        },
        { selector: '.topic-card img', attr: 'alt', en: 'Michael Jordan tribute animation', zh: '迈克尔·乔丹致敬动画' },
        { selector: '.universe-footer span', en: '7719 / BASKETBALL', zh: '7719 / 篮球' },
        { selector: '.universe-footer a', en: 'BACK TO UNIVERSE →', zh: '返回宇宙 →' }
      ]
    },
    games: {
      title: { en: 'Games · 7719 Universe', zh: '游戏 · 7719 宇宙' },
      description: { en: 'Games collection preview in 7719 Universe.', zh: '7719 宇宙中的游戏专题预览。' },
      entries: [
        { selector: '.universe-nav a', values: { en: ['UNIVERSE', 'BASKETBALL', 'MUSIC'], zh: ['宇宙', '篮球', '音乐'] } },
        { selector: '.breadcrumb a', en: 'HOME', zh: '首页' },
        { selector: '.breadcrumb span:last-child', en: 'GAMES', zh: '游戏' },
        { selector: '.interest-hero .eyebrow', en: '02 / INTEREST', zh: '02 / 兴趣' },
        { selector: '.interest-hero h1', en: 'GAMES', zh: '游戏' },
        {
          selector: '.interest-hero-copy > p:not(.eyebrow)',
          en: 'Strategy games, Civilization, screenshots, campaigns and the worlds built through decisions.',
          zh: '策略游戏、文明系列、游戏截图、战役记录，以及由每一次选择构筑的世界。'
        },
        { selector: '.coming-soon-mark', en: 'COLLECTION IN DEVELOPMENT', zh: '专题正在开发中' },
        { selector: '.universe-footer span', en: '7719 / GAMES', zh: '7719 / 游戏' },
        { selector: '.universe-footer a', en: 'BACK TO UNIVERSE →', zh: '返回宇宙 →' }
      ]
    },
    music: {
      title: { en: 'Music · 7719 Universe', zh: '音乐 · 7719 宇宙' },
      description: { en: 'Music collection preview in 7719 Universe.', zh: '7719 宇宙中的音乐专题预览。' },
      entries: [
        { selector: '.universe-nav a', values: { en: ['UNIVERSE', 'BASKETBALL', 'GAMES'], zh: ['宇宙', '篮球', '游戏'] } },
        { selector: '.breadcrumb a', en: 'HOME', zh: '首页' },
        { selector: '.breadcrumb span:last-child', en: 'MUSIC', zh: '音乐' },
        { selector: '.interest-hero .eyebrow', en: '03 / INTEREST', zh: '03 / 兴趣' },
        { selector: '.interest-hero h1', en: 'MUSIC', zh: '音乐' },
        {
          selector: '.interest-hero-copy > p:not(.eyebrow)',
          en: 'Artists, albums, playlists and the sounds connected to different periods of life.',
          zh: '音乐人、专辑、播放列表，以及与人生不同阶段相连的声音。'
        },
        { selector: '.coming-soon-mark', en: 'COLLECTION IN DEVELOPMENT', zh: '专题正在开发中' },
        { selector: '.universe-footer span', en: '7719 / MUSIC', zh: '7719 / 音乐' },
        { selector: '.universe-footer a', en: 'BACK TO UNIVERSE →', zh: '返回宇宙 →' }
      ]
    },
    mj: {
      title: { en: 'Michael Jordan · Basketball · 7719 Universe', zh: 'Michael Jordan · 篮球 · 7719 宇宙' },
      description: { en: 'A personal Michael Jordan basketball tribute collection.', zh: '个人 Michael Jordan 篮球致敬专题。' },
      entries: [
        { selector: '.site-header nav a', values: { en: ['BASKETBALL', 'WALL', 'ALL PHOTOS', 'UNIVERSE'], zh: ['篮球', '影像墙', '全部照片', '宇宙'] } },
        { selector: '.hero .eyebrow', en: 'BASKETBALL / MICHAEL JORDAN', zh: '篮球 / MICHAEL JORDAN' },
        { selector: '.hero h1 span', en: 'THE', zh: '不朽' },
        { selector: '.hero h1 strong', en: 'LEGACY', zh: '传奇' },
        { selector: '.hero-line', en: 'FOCUS · DISCIPLINE · GREATNESS', zh: '专注 · 自律 · 伟大' },
        { selector: '.scroll-cue', html: true, en: 'ENTER THE COURT <span>↓</span>', zh: '进入球场 <span>↓</span>' },
        { selector: '#legacy .section-heading p', en: '01 / LEGACY', zh: '01 / 传奇' },
        { selector: '#legacy .section-heading h2', html: true, en: 'MORE THAN<br>A GAME.', zh: '超越<br>比赛。' },
        { selector: '.display-copy', html: true, en: 'THE GAME.<br>THE FOCUS.<br>THE LEGACY.', zh: '比赛。<br>专注。<br>传奇。' },
        {
          selector: '.small-copy',
          en: 'Inspired by the player who made every moment feel larger than the game.',
          zh: '致敬那位让每个瞬间都超越比赛本身的球员。'
        },
        { selector: '.hero-image', attr: 'alt', en: 'Michael Jordan basketball tribute animation', zh: '迈克尔·乔丹篮球致敬动画' },
        { selector: '.portrait-image', attr: 'alt', en: 'Michael Jordan tribute portrait', zh: '迈克尔·乔丹致敬肖像' },
        { selector: '#moments .section-heading p', en: '02 / CURATED WALL', zh: '02 / 精选影像墙' },
        { selector: '#moments .section-heading h2', html: true, en: 'ICONIC<br>FRAMES.', zh: '经典<br>画面。' },
        { selector: '#moments .section-heading > span', en: '16 CURATED FRAMES', zh: '16 张精选画面' },
        {
          selector: '.gallery-card .card-label strong',
          values: {
            en: ['AIR', 'FLIGHT', 'FOCUS', 'CLUTCH', 'DRIVE', 'RISE', 'LEGACY', 'COURT', 'POWER', 'CRAFT', 'FIRE', '23', 'MOMENT', 'GLORY', 'ICON', 'FOREVER'],
            zh: ['腾空', '飞翔', '专注', '关键', '突破', '崛起', '传奇', '球场', '力量', '技艺', '热血', '23', '时刻', '荣耀', '经典', '永恒']
          }
        },
        {
          selector: '.gallery-card > img',
          attr: 'alt',
          values: {
            en: Array.from({ length: 16 }, (_, index) => `Michael Jordan tribute image ${String(index + 1).padStart(2, '0')}`),
            zh: Array.from({ length: 16 }, (_, index) => `迈克尔·乔丹致敬图片 ${String(index + 1).padStart(2, '0')}`)
          }
        },
        { selector: '.archive-entry-copy small', en: 'THE COMPLETE COLLECTION', zh: '完整专题合集' },
        { selector: '.archive-entry-copy strong', html: true, en: 'VIEW ALL<br>MJ PHOTOS', zh: '查看全部<br>MJ 照片' },
        { selector: '#film .section-heading p', en: '03 / FILM', zh: '03 / 影片' },
        { selector: '#film .section-heading h2', html: true, en: 'WATCH THE<br>MOMENT.', zh: '观看这个<br>时刻。' },
        { selector: '.video-frame iframe', attr: 'title', en: 'Michael Jordan basketball tribute video', zh: '迈克尔·乔丹篮球致敬视频' },
        { selector: '.finale-content p', en: 'INSPIRED BY GREATNESS.', zh: '因伟大而受到启发。' },
        { selector: '.finale-content a', en: 'BACK TO BASKETBALL →', zh: '返回篮球 →' },
        { selector: 'footer a', en: '7719 UNIVERSE', zh: '7719 宇宙' },
        { selector: 'footer span', en: 'BASKETBALL / MICHAEL JORDAN', zh: '篮球 / MICHAEL JORDAN' },
        { selector: '.lightbox', attr: 'aria-label', en: 'Image preview', zh: '图片预览' },
        { selector: '.lightbox-close', attr: 'aria-label', en: 'Close image preview', zh: '关闭图片预览' }
      ]
    },
    archive: {
      title: { en: 'MJ Photo Archive · 7719 Universe', zh: 'MJ 影像档案 · 7719 宇宙' },
      description: { en: 'Complete Michael Jordan photo archive in 7719 Universe.', zh: '7719 宇宙中的完整 Michael Jordan 照片档案。' },
      entries: [
        { selector: '.archive-header nav a', values: { en: ['BASKETBALL', 'MJ', 'ALL PHOTOS', 'UNIVERSE'], zh: ['篮球', 'MJ', '全部照片', '宇宙'] } },
        { selector: '.archive-hero .eyebrow', en: 'BASKETBALL / MICHAEL JORDAN', zh: '篮球 / MICHAEL JORDAN' },
        { selector: '.archive-hero h1', html: true, en: 'MJ<br><span>ARCHIVE.</span>', zh: 'MJ<br><span>影像档案。</span>' },
        { selector: '.archive-meta span:last-child', en: 'NO CROPPING · ORIGINAL PROPORTIONS', zh: '不裁剪 · 保留原始比例' },
        { selector: '#archive-status', en: 'Loading the complete archive…', zh: '正在读取全部素材…' },
        { selector: 'footer a:first-child', en: '← BACK TO MJ', zh: '← 返回 MJ' },
        { selector: 'footer a:last-child', en: 'BACK TO UNIVERSE →', zh: '返回宇宙 →' },
        { selector: '.archive-lightbox', attr: 'aria-label', en: 'Image preview', zh: '图片预览' },
        { selector: '.archive-lightbox-close', attr: 'aria-label', en: 'Close image preview', zh: '关闭图片预览' }
      ]
    }
  };

  function interpolate(value, variables = {}) {
    return String(value).replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? '');
  }

  function detectLanguage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED_LANGUAGES.has(stored)) return stored;
    } catch (error) {
      console.warn('Language preference storage unavailable:', error);
    }

    const preferred = navigator.languages?.[0] || navigator.language || 'en';
    return preferred.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function getPageKey() {
    const path = window.location.pathname
      .replace(/\/index\.html$/, '/')
      .replace(/\/+$/, '') || '/';

    if (path === '/') return 'home';
    if (path === '/basketball') return 'basketball';
    if (path === '/games') return 'games';
    if (path === '/music') return 'music';
    if (path === '/basketball/michael-jordan') return 'mj';
    if (path === '/basketball/michael-jordan/archive') return 'archive';
    return null;
  }

  let currentLanguage = detectLanguage();
  let observer;
  let applyTimer;

  function setNodeValue(node, value, entry) {
    if (!node || value === undefined || value === null) return;
    const nextValue = String(value);

    if (entry.attr) {
      if (node.getAttribute(entry.attr) !== nextValue) node.setAttribute(entry.attr, nextValue);
      return;
    }

    if (entry.html) {
      if (node.innerHTML !== nextValue) node.innerHTML = nextValue;
      return;
    }

    if (node.textContent !== nextValue) node.textContent = nextValue;
  }

  function applyEntry(entry, language) {
    const nodes = document.querySelectorAll(entry.selector);
    const values = entry.values ? entry.values[language] : entry[language];

    nodes.forEach((node, index) => {
      const value = Array.isArray(values) ? values[index] : values;
      setNodeValue(node, value, entry);
    });
  }

  function updateToggle() {
    const toggle = document.querySelector('[data-language-toggle]');
    if (!toggle) return;

    const nextLanguage = currentLanguage === 'zh' ? 'en' : 'zh';
    toggle.textContent = currentLanguage === 'zh' ? 'EN' : '中文';
    toggle.dataset.nextLanguage = nextLanguage;
    toggle.setAttribute(
      'aria-label',
      currentLanguage === 'zh' ? 'Switch to English' : '切换为中文'
    );
  }

  function applyTranslations({ emit = false } = {}) {
    const page = pages[getPageKey()];
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    document.documentElement.dataset.language = currentLanguage;

    if (page) {
      document.title = page.title[currentLanguage];
      const description = document.querySelector('meta[name="description"]');
      if (description) description.setAttribute('content', page.description[currentLanguage]);
      page.entries.forEach((entry) => applyEntry(entry, currentLanguage));
    }

    updateToggle();

    if (emit) {
      window.dispatchEvent(new CustomEvent('7719:languagechange', {
        detail: { language: currentLanguage }
      }));
    }
  }

  function scheduleApply() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => applyTranslations(), 20);
  }

  function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.has(language) || language === currentLanguage) return;
    currentLanguage = language;

    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn('Unable to save language preference:', error);
    }

    applyTranslations({ emit: true });
  }

  function mountToggle() {
    if (document.querySelector('[data-language-toggle]')) return;
    const nav = document.querySelector('.universe-nav, .site-header nav, .archive-header nav');
    if (!nav) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'language-toggle';
    toggle.dataset.languageToggle = '';
    toggle.addEventListener('click', () => setLanguage(currentLanguage === 'zh' ? 'en' : 'zh'));
    nav.append(toggle);
  }

  function mountStyles() {
    if (document.querySelector('#site-language-styles')) return;
    const style = document.createElement('style');
    style.id = 'site-language-styles';
    style.textContent = `
      .language-toggle {
        appearance: none;
        border: 1px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1;
        min-width: 3.2rem;
        padding: 0.52rem 0.68rem;
        text-transform: none;
        transition: opacity 160ms ease, background-color 160ms ease, color 160ms ease;
      }
      .language-toggle:hover,
      .language-toggle:focus-visible {
        background: currentColor;
        color: #07090d;
        outline: none;
      }
      @media (max-width: 760px) {
        .language-toggle {
          font-size: 0.66rem;
          min-width: 2.8rem;
          padding: 0.44rem 0.52rem;
        }
      }
    `;
    document.head.append(style);
  }

  function init() {
    mountStyles();
    mountToggle();
    applyTranslations({ emit: true });

    observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.SiteI18n = {
    getLanguage: () => currentLanguage,
    setLanguage,
    apply: () => applyTranslations(),
    t(key, variables = {}) {
      const entry = dynamicCopy[key];
      if (!entry) return key;
      return interpolate(entry[currentLanguage], variables);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
