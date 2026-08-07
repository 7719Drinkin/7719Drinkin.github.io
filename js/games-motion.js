(() => {
  const body = document.body;
  if (!body || body.dataset.siteModule !== 'games') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.universe-header');

  body.classList.add('games-motion-ready');

  const updateScrollState = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 16);
    if (!reducedMotion) {
      body.style.setProperty('--games-image-y', `${Math.min(y * .012, 12)}px`);
    }
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
})();
