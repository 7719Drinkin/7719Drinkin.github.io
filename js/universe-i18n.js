(() => {
  const root = document.documentElement;

  const chineseOverrides = {
    'hero.line1': '个人',
    'hero.line2': '宇宙'
  };

  const english = {
    'meta.description': '7719 Universe — a personal universe that keeps expanding.',
    'nav.label': 'Primary navigation',
    'nav.galaxies': 'GALAXIES',
    'nav.three': '3D MODE',
    'nav.featured': 'FEATURED',
    'nav.about': 'ABOUT',
    'hero.eyebrow': 'BOOK I / HEAVEN & EARTH',
    'hero.line1': 'PERSONAL',
    'hero.line2': 'UNIVERSE',
    'hero.quote': 'Heaven and earth hold a great beauty, yet say nothing.',
    'hero.source': '— Zhuangzi · Zhi Bei You',
    'hero.explore': 'ENTER THE FIELD',
    'hero.status.label': 'Universe status',
    'hero.readout.galaxies': 'GALAXIES',
    'hero.readout.catalog': 'STATUS',
    'hero.readout.catalogValue': 'GROWING',
    'hero.readout.boundary': 'BOUNDARY',
    'hero.readout.boundaryValue': 'OPEN',
    'galaxies.eyebrow': '01 / MANY FORMS',
    'galaxies.title': 'LOOK UP<br>AT WORLDS',
    'galaxies.quote': 'Look up: the universe is vast. Look down: the world teems with forms.',
    'galaxies.source': '— Wang Xizhi · Preface to the Orchid Pavilion',
    'card.galaxy': 'GALAXY',
    'card.explore': 'OPEN',
    'card.forming': 'FORMING',
    'card.active': 'ACTIVE SYSTEM',
    'card.developing': 'TAKING SHAPE',
    'card.enter': 'ENTER GALAXY',
    'card.basketball.title': 'Basketball',
    'card.basketball.quote': 'One day I will stand on the summit and see the lesser peaks below.',
    'card.basketball.source': '— Du Fu · Gazing at Mount Tai',
    'card.games.title': 'Games',
    'card.games.quote': 'Life is a roadside inn; I too am only passing through.',
    'card.games.source': '— Su Shi · Linjiangxian',
    'card.music.title': 'Music',
    'card.music.quote': 'Such music belongs in heaven; how rarely is it heard on earth.',
    'card.music.source': '— Du Fu · Presented to Hua Qing',
    'card.anime.title': 'Anime',
    'card.anime.quote': 'Our thoughts take wing; we would climb the blue sky and seize the moon.',
    'card.anime.source': '— Li Bai · Farewell at Xie Tiao Tower',
    'card.basketball.aria': 'Enter Basketball galaxy',
    'card.games.aria': 'Enter Games galaxy',
    'card.music.aria': 'Enter Music galaxy',
    'card.anime.aria': 'Enter Anime galaxy',
    'solar.eyebrow': '02 / THE MILKY WAY',
    'solar.title': 'AMONG<br>THE STARS',
    'solar.quote': 'The Milky Way blazes, as though born from within it.',
    'solar.source': '— Cao Cao · Viewing the Sea',
    'solar.card.eyebrow': '3D EXPERIENCE / REACT THREE FIBER',
    'solar.card.title': 'BETWEEN<br>PLANETS',
    'solar.card.copy': 'Drag. Zoom. Orbit.',
    'solar.mode': 'MODE',
    'solar.mode.value': 'OPTIONAL',
    'solar.input': 'INPUT',
    'solar.input.value': 'DRAG + ZOOM',
    'solar.fallback': 'RETURN',
    'solar.fallback.value': 'MAIN CATALOG',
    'solar.launch': 'ENTER 3D UNIVERSE',
    'featured.eyebrow': '03 / RISE',
    'featured.title': 'RIDE<br>THE WIND',
    'featured.quote': 'When the great roc catches the wind, it rises ninety thousand li.',
    'featured.source': '— Li Bai · To Li Yong',
    'featured.card.eyebrow': 'BASKETBALL / MICHAEL JORDAN',
    'featured.card.copy': 'Rise. Hang. Release. Let time decide the rest.',
    'featured.view': 'VIEW COLLECTION',
    'featured.caption': 'COLLECTION 01 · MOVING IMAGE',
    'about.eyebrow': '04 / SEEKING',
    'about.title': 'STILL<br>SEEKING',
    'about.quote': 'The road is long; I will search high and low.',
    'about.source': '— Qu Yuan · Li Sao',
    'about.copy': 'No center. No final edge. Interests grow; new galaxies appear.',
    'footer.tagline': 'STILL SEEKING · 2026'
  };

  const originalText = new Map();
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    if (!originalText.has(node.dataset.i18n)) originalText.set(node.dataset.i18n, node.textContent);
  });

  const originalHtml = new Map();
  document.querySelectorAll('[data-i18n-html]').forEach((node) => {
    if (!originalHtml.has(node.dataset.i18nHtml)) originalHtml.set(node.dataset.i18nHtml, node.innerHTML);
  });

  const originalAria = new Map();
  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    if (!originalAria.has(node.dataset.i18nAriaLabel)) {
      originalAria.set(node.dataset.i18nAriaLabel, node.getAttribute('aria-label') || '');
    }
  });

  const meta = document.querySelector('meta[name="description"]');
  const originalMeta = meta?.getAttribute('content') || '';
  const languageGroup = document.querySelector('.universe-language');

  const syncControls = (language) => {
    const isEnglish = language === 'en';
    if (languageGroup) languageGroup.setAttribute('aria-label', isEnglish ? 'Language' : '语言');

    document.querySelectorAll('[data-language-choice]').forEach((button) => {
      const active = button.dataset.languageChoice === language;
      button.setAttribute('aria-pressed', String(active));
      if (button.dataset.languageChoice === 'zh') {
        button.setAttribute('aria-label', isEnglish ? 'Chinese' : '中文');
      } else {
        button.setAttribute('aria-label', 'English');
      }
    });
  };

  const applyLanguage = (language) => {
    const selected = language === 'en' ? 'en' : 'zh';
    const dictionary = selected === 'en' ? english : null;

    root.lang = selected === 'en' ? 'en' : 'zh-CN';
    root.dataset.universeLanguage = selected;

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      const value = selected === 'en'
        ? dictionary?.[key]
        : (chineseOverrides[key] ?? originalText.get(key));
      if (typeof value === 'string') node.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((node) => {
      const key = node.dataset.i18nHtml;
      const value = dictionary?.[key] ?? originalHtml.get(key);
      if (typeof value === 'string') node.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const key = node.dataset.i18nAriaLabel;
      const value = dictionary?.[key] ?? originalAria.get(key);
      if (typeof value === 'string') node.setAttribute('aria-label', value);
    });

    if (meta) meta.setAttribute('content', selected === 'en' ? english['meta.description'] : originalMeta);
    syncControls(selected);
    document.dispatchEvent(new CustomEvent('universe:languagechange', { detail: { language: selected } }));
  };

  document.querySelectorAll('[data-language-choice]').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(button.dataset.languageChoice));
  });

  // The static HTML is the canonical Chinese version. Keep the title explicitly Chinese
  // even when an older HTML document is still cached while the new script has arrived.
  Object.entries(chineseOverrides).forEach(([key, value]) => {
    const node = document.querySelector(`[data-i18n="${key}"]`);
    if (node) node.textContent = value;
  });

  root.lang = 'zh-CN';
  root.dataset.universeLanguage = 'zh';
  syncControls('zh');
})();
