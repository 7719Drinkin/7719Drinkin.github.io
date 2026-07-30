document.documentElement.classList.add('reveal-ready');

const header = document.querySelector('.universe-header');
const interestGrid = document.querySelector('#interest-grid');

const fallbackInterests = [
  {
    id: 'basketball', title: 'Basketball', subtitle: 'The game never stops.',
    description: 'Legends, iconic frames and the moments that made the game larger than life.',
    route: '/basketball/', theme: 'basketball', status: 'published', number: '01',
    cover: '/assets/15942445778634938029.JPG'
  },
  {
    id: 'games', title: 'Games', subtitle: 'Worlds built one decision at a time.',
    description: 'Strategy, civilization building and memorable virtual worlds.',
    route: '/games/', theme: 'games', status: 'preview', number: '02', cover: null
  },
  {
    id: 'music', title: 'Music', subtitle: 'Soundtracks for different versions of me.',
    description: 'Artists, albums and songs collected over time.',
    route: '/music/', theme: 'music', status: 'preview', number: '03', cover: null
  }
];

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

const InterestCardFactory = {
  create(interest) {
    const link = document.createElement('a');
    link.className = 'interest-card reveal';
    link.href = interest.route;
    link.dataset.theme = interest.theme;
    link.dataset.cover = String(Boolean(interest.cover));

    const backgroundStyle = interest.cover
      ? `style="background-image:url('${interest.cover}')"`
      : '';
    const statusLabel = interest.status === 'published' ? 'OPEN' : 'PREVIEW';

    link.innerHTML = `
      <div class="interest-card-bg" ${backgroundStyle}></div>
      <div class="interest-card-content">
        <div class="interest-card-top">
          <span>${interest.number}</span>
          <span class="interest-card-status">${statusLabel}</span>
        </div>
        <div>
          <h3>${interest.title}</h3>
          <p class="interest-card-subtitle">${interest.subtitle}</p>
          <p class="interest-card-description">${interest.description}</p>
          <span class="interest-card-enter">ENTER WORLD <strong>→</strong></span>
        </div>
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

async function renderInterests() {
  if (!interestGrid) return;
  const registry = new InterestRegistry('/data/interests.json', fallbackInterests);
  const interests = await registry.getAll();
  interestGrid.replaceChildren(...interests.map((interest) => InterestCardFactory.create(interest)));
  observeReveals(interestGrid);
}

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 22);
});

observeReveals();
renderInterests();
