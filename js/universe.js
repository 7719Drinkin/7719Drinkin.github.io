function mountLanguageToggleContrast() {
  if (document.querySelector('#language-toggle-contrast')) return;
  const style = document.createElement('style');
  style.id = 'language-toggle-contrast';
  style.textContent = '.language-toggle:hover,.language-toggle:focus-visible{background:#f4f1e8!important;color:#07090d!important;}';
  document.head.append(style);
}

function loadSiteI18n() {
  mountLanguageToggleContrast();
  if (window.SiteI18n || document.querySelector('script[data-site-i18n]')) return;
  const script = document.createElement('script');
  script.src = '/js/site-i18n.js?v=20260731-1';
  script.dataset.siteI18n = '';
  script.addEventListener('load', () => requestAnimationFrame(syncAnimeState), { once: true });
  document.head.append(script);
}

loadSiteI18n();

const header = document.querySelector('.universe-header');
const interestGrid = document.querySelector('#interest-grid');

const fallbackInterests = [
  {
    id: 'basketball', title: 'Basketball', subtitle: 'The game never stops.',
    description: 'Legends, iconic frames and the moments that made the game larger than life.',
    route: '/basketball/', theme: 'basketball', status: 'published', number: '01'
  },
  {
    id: 'games', title: 'Games', subtitle: 'Worlds built one decision at a time.',
    description: 'Strategy, civilization building and memorable virtual worlds.',
    route: '/games/', theme: 'games', status: 'preview', number: '02'
  },
  {
    id: 'music', title: 'Music', subtitle: 'Soundtracks for different versions of me.',
    description: 'Artists, albums and songs collected over time.',
    route: '/music/', theme: 'music', status: 'preview', number: '03'
  },
  {
    id: 'anime', title: 'Anime', subtitle: 'Stories drawn one frame at a time.',
    description: 'Works, characters, scenes and stories collected across different stages of life.',
    route: '/anime/', theme: 'anime', status: 'preview', number: '04'
  }
];

const ANIME_COPY = {
  en: {
    aria: 'Enter the Anime galaxy',
    number: 'GALAXY 04',
    status: 'FORMING',
    kicker: 'DEVELOPING INTEREST SYSTEM',
    title: 'Anime',
    subtitle: 'Stories drawn one frame at a time.',
    description: 'Works, characters, scenes and stories collected across different stages of life.',
    enter: 'ENTER GALAXY <strong>↗</strong>'
  },
  zh: {
    aria: '进入动漫星系',
    number: '星系 04',
    status: '形成中',
    kicker: '建设中的兴趣系统',
    title: '动漫',
    subtitle: '一帧一帧绘出的世界与记忆。',
    description: '在不同人生阶段留下印象的作品、角色、场景与故事。',
    enter: '进入星系 <strong>↗</strong>'
  }
};

function getCurrentLanguage() {
  const active = window.SiteI18n?.getLanguage?.();
  if (active === 'zh' || active === 'en') return active;

  try {
    const stored = localStorage.getItem('7719-language');
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {
    // Use the document language when storage is unavailable.
  }

  return document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function syncAnimeState() {
  const card = interestGrid?.querySelector('.interest-card[data-theme="anime"]');
  if (card) {
    const copy = ANIME_COPY[getCurrentLanguage()];
    card.setAttribute('aria-label', copy.aria);
    const number = card.querySelector('.interest-card-top span:first-child');
    const status = card.querySelector('.interest-card-status');
    const kicker = card.querySelector('.interest-card-kicker');
    const title = card.querySelector('.interest-card-copy h3');
    const subtitle = card.querySelector('.interest-card-subtitle');
    const description = card.querySelector('.interest-card-description');
    const enter = card.querySelector('.interest-card-enter');

    if (number) number.textContent = copy.number;
    if (status) status.textContent = copy.status;
    if (kicker) kicker.textContent = copy.kicker;
    if (title) title.textContent = copy.title;
    if (subtitle) subtitle.textContent = copy.subtitle;
    if (description) description.textContent = copy.description;
    if (enter) enter.innerHTML = copy.enter;
  }

  const count = document.querySelector('.hero-readout div:first-child strong');
  const total = interestGrid?.querySelectorAll('.interest-card').length ?? 0;
  if (count && total) count.textContent = String(total).padStart(2, '0');
}

const languageObserver = new MutationObserver(() => requestAnimationFrame(syncAnimeState));
languageObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['lang', 'data-language']
});

class InterestRegistry {
  constructor(source, fallback) {
    this.source = source;
    this.fallback = fallback;
  }

  async getAll() {
    try {
      const response = await fetch(this.source, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Registry ${response.status}`);
      const data = await response.json();
      return Array.isArray(data) && data.length ? data : this.fallback;
    } catch (error) {
      console.warn('Using fallback interest registry:', error);
      return this.fallback;
    }
  }
}

const GalaxyFactory = {
  create(interest) {
    const link = document.createElement('a');
    const isPublished = interest.status === 'published';

    link.className = 'interest-card reveal';
    link.href = interest.route;
    link.dataset.theme = interest.theme;
    link.setAttribute('aria-label', `进入 ${interest.title} 星系`);

    if (interest.theme === 'anime') {
      link.style.setProperty('--card-accent', '#ff806f');
    }

    link.innerHTML = `
      <div class="interest-card-visual" aria-hidden="true"></div>
      <div class="interest-card-content">
        <div class="interest-card-top">
          <span>GALAXY ${interest.number}</span>
          <span class="interest-card-status">${isPublished ? 'EXPLORE' : 'FORMING'}</span>
        </div>
        <div class="interest-card-copy">
          <p class="interest-card-kicker">${isPublished ? 'ACTIVE' : 'DEVELOPING'} INTEREST SYSTEM</p>
          <h3>${interest.title}</h3>
          <p class="interest-card-subtitle">${interest.subtitle}</p>
          <p class="interest-card-description">${interest.description}</p>
        </div>
        <span class="interest-card-enter">ENTER GALAXY <strong>↗</strong></span>
      </div>
    `;

    return link;
  }
};

function showReveal(item) {
  item.classList.add('visible', 'is-visible');
}

function observeReveals(scope = document) {
  const items = scope.querySelectorAll('.reveal:not([data-observed])');

  if (!('IntersectionObserver' in window)) {
    items.forEach(showReveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        showReveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -18px 0px' });

  items.forEach((item) => {
    item.dataset.observed = 'true';
    observer.observe(item);
  });
}

async function renderGalaxies() {
  if (!interestGrid) return;

  const registry = new InterestRegistry('/data/interests.json', fallbackInterests);
  const interests = await registry.getAll();
  const cards = interests.map((interest) => GalaxyFactory.create(interest));

  interestGrid.replaceChildren(...cards);
  observeReveals(interestGrid);
  window.SiteI18n?.apply();
  requestAnimationFrame(syncAnimeState);
}

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 22);
});

try {
  document.documentElement.classList.add('reveal-ready');
  observeReveals();
  renderGalaxies().catch((error) => {
    console.warn('Galaxy rendering failed; keeping static catalog.', error);
    document.documentElement.classList.remove('reveal-ready');
  });
} catch (error) {
  console.warn('Reveal enhancement unavailable:', error);
  document.documentElement.classList.remove('reveal-ready');
}
