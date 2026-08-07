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
    if (!reducedMotion) body.style.setProperty('--games-map-y', `${Math.min(y * .02, 24)}px`);
  };

  updateScrollState();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  const revealItems = [...document.querySelectorAll('.reveal')];
  if (!reducedMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible', 'is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('visible', 'is-visible'));
  }

  if (!reducedMotion && finePointer && hero) {
    let frame = 0;
    let x = 0;

    const paint = () => {
      frame = 0;
      body.style.setProperty('--games-map-x', `${x.toFixed(2)}px`);
    };

    hero.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width) return;
      x = (((event.clientX - bounds.left) / bounds.width) - .5) * 5;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      x = 0;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
  }
})();
