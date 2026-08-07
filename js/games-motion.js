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
    body.style.setProperty('--games-map-y', `${Math.min(y * .028, 34)}px`);
    body.style.setProperty('--games-fog-shift', `${Math.min(y * .018, 22)}px`);
    body.style.setProperty('--games-turn-rotate', `${Math.min(y * .016, 15)}deg`);
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  const items = [...document.querySelectorAll('.reveal')];
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible', 'is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });

    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add('visible', 'is-visible'));
  }

  if (!reducedMotion && finePointer && hero) {
    let frame = 0;
    let nextX = 0;
    let nextY = 0;

    const paint = () => {
      frame = 0;
      body.style.setProperty('--games-map-x', `${(nextX * .34).toFixed(2)}px`);
      hero.style.setProperty('--hero-x', nextX.toFixed(2));
      hero.style.setProperty('--hero-y', nextY.toFixed(2));
    };

    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      nextX = ((event.clientX - bounds.left) / bounds.width - .5) * 18;
      nextY = ((event.clientY - bounds.top) / bounds.height - .5) * 12;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      nextX = 0;
      nextY = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
  }
})();
