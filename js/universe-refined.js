(() => {
  const root = document.documentElement;
  const body = document.body;
  if (!body?.classList.contains('universe-home')) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('universe-motion-ready');

  const assignRevealOrder = (scope = document) => {
    scope.querySelectorAll('.reveal').forEach((item, index) => {
      const siblings = item.parentElement
        ? [...item.parentElement.children].filter((candidate) => candidate.classList.contains('reveal'))
        : [];
      const localIndex = siblings.indexOf(item);
      item.style.setProperty('--reveal-order', String(Math.max(0, Math.min(localIndex >= 0 ? localIndex : index, 6))));
    });
  };

  const installPointerLight = (surface) => {
    if (surface.dataset.pointerLight === 'true') return;
    surface.dataset.pointerLight = 'true';

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

  const decorateSurfaces = (scope = document) => {
    if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
    scope.querySelectorAll('.interest-card, .solar-experience-entry, .featured-collection')
      .forEach(installPointerLight);
  };

  const applyInterestCovers = async () => {
    const grid = document.querySelector('#interest-grid');
    if (!grid) return;

    let interests = [];
    try {
      const response = await fetch('/data/interests.json', { cache: 'force-cache' });
      if (response.ok) interests = await response.json();
    } catch {
      return;
    }

    const coverByTheme = new Map(
      (Array.isArray(interests) ? interests : [])
        .filter((interest) => interest?.theme && interest?.cover)
        .map((interest) => [interest.theme, interest.cover])
    );

    const install = () => {
      grid.querySelectorAll('.interest-card[data-theme]').forEach((card) => {
        const cover = coverByTheme.get(card.dataset.theme);
        const visual = card.querySelector('.interest-card-visual');
        if (!cover || !visual || visual.querySelector('img.interest-card-cover')) return;

        visual.querySelectorAll('img').forEach((image) => image.remove());

        const image = document.createElement('img');
        image.className = 'interest-card-cover';
        image.src = cover;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.setAttribute('aria-hidden', 'true');
        visual.prepend(image);
      });
      assignRevealOrder(grid);
      decorateSurfaces(grid);
    };

    install();
    const observer = new MutationObserver(install);
    observer.observe(grid, { childList: true });
  };

  const navLinks = [...document.querySelectorAll('.universe-nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter((entry) => entry.section);

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      sections.forEach(({ link, section }) => {
        link.classList.toggle('is-active', section === visible.target);
      });
    }, {
      rootMargin: '-28% 0px -58% 0px',
      threshold: [0, .12, .3, .55]
    });

    sections.forEach(({ section }) => observer.observe(section));
  }

  const deepField = document.querySelector('.deep-field');
  if (deepField && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      deepField.style.setProperty('--field-x', `${x}px`);
      deepField.style.setProperty('--field-y', `${y}px`);
    };

    window.addEventListener('pointermove', (event) => {
      x = ((event.clientX / window.innerWidth) - .5) * -10;
      y = ((event.clientY / window.innerHeight) - .5) * -8;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
  }

  assignRevealOrder();
  decorateSurfaces();
  applyInterestCovers();
})();
