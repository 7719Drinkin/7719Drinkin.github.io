(() => {
  const body = document.body;
  if (!body || body.dataset.siteModule !== 'games') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  body.classList.add('games-motion-ready');

  const header = document.querySelector('.universe-header');
  const mapLayer = document.querySelector('.games-map-layer');
  const hero = document.querySelector('.games-hero');

  const updateScrollState = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 18);
    if (mapLayer) {
      body.style.setProperty('--games-map-shift', `${Math.min(window.scrollY * .055, 86)}px`);
      body.style.setProperty('--games-map-rotate', `${Math.min(window.scrollY * .0035, 2.8)}deg`);
    }
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  let observer = null;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible', 'is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
  }

  const observe = (item, index = 0) => {
    if (!(item instanceof Element) || item.dataset.gamesObserved === 'true') return;
    item.dataset.gamesObserved = 'true';
    item.style.setProperty('--games-order', String(Math.min(index, 7)));

    if (!observer || reducedMotion) {
      item.classList.add('visible', 'is-visible');
      return;
    }
    observer.observe(item);
  };

  const registerReveals = (scope = document) => {
    const items = [...scope.querySelectorAll('.reveal:not([data-games-observed])')];
    items.forEach((item, index) => {
      const parent = item.parentElement;
      const siblings = parent ? [...parent.children].filter((node) => node.classList.contains('reveal')) : [];
      const local = siblings.indexOf(item);
      observe(item, local >= 0 ? local : index);
    });
  };

  registerReveals();

  const dynamicObserver = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (!(node instanceof Element)) return;
      if (node.matches('.reveal')) observe(node, 0);
      registerReveals(node);
    }));
  });
  dynamicObserver.observe(document.body, { childList: true, subtree: true });

  if (!reducedMotion && finePointer && hero) {
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 22;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 16;
      hero.style.setProperty('--hero-x', x.toFixed(2));
      hero.style.setProperty('--hero-y', y.toFixed(2));
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--hero-x', '0');
      hero.style.setProperty('--hero-y', '0');
    }, { passive: true });
  }

  const bindPointerGlow = (surface) => {
    if (!(surface instanceof Element) || surface.dataset.gamesPointer === 'true') return;
    surface.dataset.gamesPointer = 'true';
    let frame = 0;
    let x = 50;
    let y = 50;

    const paint = () => {
      frame = 0;
      surface.style.setProperty('--pointer-x', `${x}%`);
      surface.style.setProperty('--pointer-y', `${y}%`);
    };

    surface.addEventListener('pointermove', (event) => {
      const bounds = surface.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      x = ((event.clientX - bounds.left) / bounds.width) * 100;
      y = ((event.clientY - bounds.top) / bounds.height) * 100;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });

    surface.addEventListener('pointerleave', () => {
      x = 50;
      y = 50;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
  };

  if (!reducedMotion && finePointer) {
    document.querySelectorAll('.game-archive-card').forEach(bindPointerGlow);
  }

  const AGE_DATA = {
    antiquity: {
      kicker: 'AGE I / ANTIQUITY',
      title: 'FOUNDATIONS',
      description: '从第一座城市与最初的制度开始。页面用更厚重的金色、石刻感和地图纹理表达“建立秩序”的阶段。',
      values: [
        ['PRIMARY DRIVE', 'Expansion'],
        ['VISUAL TONE', 'Stone / Gold'],
        ['ARCHIVE IDEA', 'Origins']
      ]
    },
    exploration: {
      kicker: 'AGE II / EXPLORATION',
      title: 'HORIZONS',
      description: '视野向外延伸，地图、海路与远方成为中心。界面会更偏蓝、更轻，强调发现、路线和文明之间的连接。',
      values: [
        ['PRIMARY DRIVE', 'Discovery'],
        ['VISUAL TONE', 'Lapis / Brass'],
        ['ARCHIVE IDEA', 'Routes']
      ]
    },
    modern: {
      kicker: 'AGE III / MODERN',
      title: 'SYSTEMS',
      description: '复杂系统彼此叠加，科技、文化、外交和生产共同决定最终形态。视觉上更精密、更具网格与仪表感。',
      values: [
        ['PRIMARY DRIVE', 'Optimization'],
        ['VISUAL TONE', 'Steel / Ivory'],
        ['ARCHIVE IDEA', 'Networks']
      ]
    }
  };

  const ageTabs = [...document.querySelectorAll('.games-age-tab[data-age]')];
  const agePanel = document.querySelector('[data-age-panel]');
  const ageKicker = agePanel?.querySelector('.games-age-kicker');
  const ageTitle = agePanel?.querySelector('h3');
  const ageDescription = agePanel?.querySelector(':scope > p');
  const ageValues = [...(agePanel?.querySelectorAll('.games-age-value') || [])];

  const selectAge = (age) => {
    const data = AGE_DATA[age];
    if (!data || !agePanel) return;

    ageTabs.forEach((tab) => {
      const active = tab.dataset.age === age;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', String(active));
    });

    agePanel.dataset.activeAge = age;
    if (ageKicker) ageKicker.textContent = data.kicker;
    if (ageTitle) ageTitle.textContent = data.title;
    if (ageDescription) ageDescription.textContent = data.description;

    data.values.forEach(([label, value], index) => {
      const target = ageValues[index];
      if (!target) return;
      const small = target.querySelector('small');
      const strong = target.querySelector('strong');
      if (small) small.textContent = label;
      if (strong) strong.textContent = value;
    });

    if (!reducedMotion) {
      agePanel.animate([
        { opacity: .62, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    }
  };

  ageTabs.forEach((tab) => tab.addEventListener('click', () => selectAge(tab.dataset.age)));
})();
