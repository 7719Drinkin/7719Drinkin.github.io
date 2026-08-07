(() => {
  const body = document.body;
  if (!body || body.dataset.siteModule !== 'games') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const header = document.querySelector('.universe-header');
  const hero = document.querySelector('.games-hero');

  body.classList.add('games-motion-ready');

  const updateScrollState = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 16);
    body.style.setProperty('--games-map-y', `${Math.min(y * .035, 42)}px`);
    body.style.setProperty('--games-map-rotate', `${Math.min(y * .0018, 1.4)}deg`);
    body.style.setProperty('--games-compass-rotate', `${Math.min(y * .012, 12)}deg`);
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  const items = [...document.querySelectorAll('.reveal')];
  items.forEach((item, index) => item.style.setProperty('--games-order', String(Math.min(index, 5))));

  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible', 'is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });

    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add('visible', 'is-visible'));
  }

  if (!reducedMotion && finePointer && hero) {
    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 20;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 15;
      hero.style.setProperty('--hero-x', x.toFixed(2));
      hero.style.setProperty('--hero-y', y.toFixed(2));
      body.style.setProperty('--games-map-x', `${(x * .24).toFixed(2)}px`);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--hero-x', '0');
      hero.style.setProperty('--hero-y', '0');
      body.style.setProperty('--games-map-x', '0px');
    }, { passive: true });
  }
})();
