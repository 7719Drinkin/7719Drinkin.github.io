(() => {
  const root = document.documentElement;
  const STORAGE_KEY = '7719:universe:language';

  const copy = {
    zh: {
      'meta.description': '7719 Universe — 一方仍在生长的个人天地。',
      'nav.label': '主导航',
      'nav.galaxies': '星系',
      'nav.three': '3D 模式',
      'nav.featured': '精选',
      'nav.about': '关于',
      'hero.eyebrow': '卷一 / 天地',
      'hero.line1': '一方',
      'hero.line2': '天地',
      'hero.quote': '天地有大美而不言。',
      'hero.source': '— 《庄子·知北游》',
      'hero.explore': '入此天地',
      'hero.status.label': '宇宙状态',
      'hero.readout.galaxies': '星系',
      'hero.readout.catalog': '状态',
      'hero.readout.catalogValue': '生长',
      'hero.readout.boundary': '边界',
      'hero.readout.boundaryValue': '未定',
      'galaxies.eyebrow': '01 / 万象',
      'galaxies.title': '仰观<br>万象',
      'galaxies.quote': '仰观宇宙之大，俯察品类之盛。',
      'galaxies.source': '— 王羲之《兰亭集序》',
      'card.galaxy': '星系',
      'card.explore': '可进入',
      'card.forming': '生长中',
      'card.active': '活跃星系',
      'card.developing': '正在形成',
      'card.enter': '进入星系',
      'card.basketball.title': '篮球',
      'card.basketball.quote': '会当凌绝顶，一览众山小。',
      'card.basketball.source': '— 杜甫《望岳》',
      'card.games.title': '游戏',
      'card.games.quote': '人生如逆旅，我亦是行人。',
      'card.games.source': '— 苏轼《临江仙·送钱穆父》',
      'card.music.title': '音乐',
      'card.music.quote': '此曲只应天上有，人间能得几回闻。',
      'card.music.source': '— 杜甫《赠花卿》',
      'card.anime.title': '动画',
      'card.anime.quote': '俱怀逸兴壮思飞，欲上青天揽明月。',
      'card.anime.source': '— 李白《宣州谢朓楼饯别校书叔云》',
      'card.basketball.aria': '进入篮球星系',
      'card.games.aria': '进入游戏星系',
      'card.music.aria': '进入音乐星系',
      'card.anime.aria': '进入动画星系',
      'solar.eyebrow': '02 / 星汉',
      'solar.title': '游于<br>星汉',
      'solar.quote': '星汉灿烂，若出其里。',
      'solar.source': '— 曹操《观沧海》',
      'solar.card.eyebrow': '3D 体验 / REACT THREE FIBER',
      'solar.card.title': '行星<br>之间',
      'solar.card.copy': '拖拽、缩放、绕行。',
      'solar.mode': '模式',
      'solar.mode.value': '可选',
      'solar.input': '操作',
      'solar.input.value': '拖拽 + 缩放',
      'solar.fallback': '返回',
      'solar.fallback.value': '主目录',
      'solar.launch': '进入 3D 宇宙',
      'featured.eyebrow': '03 / 扶摇',
      'featured.title': '扶摇<br>而上',
      'featured.quote': '大鹏一日同风起，扶摇直上九万里。',
      'featured.source': '— 李白《上李邕》',
      'featured.card.eyebrow': '篮球 / 迈克尔·乔丹',
      'featured.card.copy': '起跳、停顿、出手。其余交给时间。',
      'featured.view': '查看收藏',
      'featured.caption': '收藏 01 · 动态影像',
      'about.eyebrow': '04 / 求索',
      'about.title': '未有<br>穷期',
      'about.quote': '路漫漫其修远兮，吾将上下而求索。',
      'about.source': '— 屈原《离骚》',
      'about.copy': '没有中心，也没有终点。兴趣会生长，星系会继续出现。',
      'footer.tagline': '上下求索 · 2026',
      'language.label': '语言',
      'language.zh': '中文',
      'language.en': 'English'
    },
    en: {
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
      'footer.tagline': 'STILL SEEKING · 2026',
      'language.label': 'Language',
      'language.zh': 'Chinese',
      'language.en': 'English'
    }
  };

  const getStoredLanguage = () => {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'zh' || value === 'en' ? value : null;
    } catch {
      return null;
    }
  };

  const setStoredLanguage = (language) => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Language switching still works when storage is unavailable.
    }
  };

  const initialLanguage = getStoredLanguage()
    || (navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en');

  const applyLanguage = (language, persist = true) => {
    const selected = language === 'en' ? 'en' : 'zh';
    const dictionary = copy[selected];

    root.lang = selected === 'zh' ? 'zh-CN' : 'en';
    root.dataset.universeLanguage = selected;

    document.querySelectorAll('[data-i18n]').forEach((node) => {
      const value = dictionary[node.dataset.i18n];
      if (typeof value === 'string') node.textContent = value;
    });

    document.querySelectorAll('[data-i18n-html]').forEach((node) => {
      const value = dictionary[node.dataset.i18nHtml];
      if (typeof value === 'string') node.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const value = dictionary[node.dataset.i18nAriaLabel];
      if (typeof value === 'string') node.setAttribute('aria-label', value);
    });

    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', dictionary['meta.description']);

    const languageGroup = document.querySelector('.universe-language');
    if (languageGroup) languageGroup.setAttribute('aria-label', dictionary['language.label']);

    document.querySelectorAll('[data-language-choice]').forEach((button) => {
      const isActive = button.dataset.languageChoice === selected;
      button.setAttribute('aria-pressed', String(isActive));
      const labelKey = button.dataset.languageChoice === 'zh' ? 'language.zh' : 'language.en';
      button.setAttribute('aria-label', dictionary[labelKey]);
    });

    if (persist) setStoredLanguage(selected);
    document.dispatchEvent(new CustomEvent('universe:languagechange', { detail: { language: selected } }));
  };

  document.querySelectorAll('[data-language-choice]').forEach((button) => {
    button.addEventListener('click', () => applyLanguage(button.dataset.languageChoice));
  });

  applyLanguage(initialLanguage, false);
})();