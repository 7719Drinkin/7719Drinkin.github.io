(() => {
  const body = document.body;
  if (!body?.classList.contains('music-page')) return;

  body.classList.add('music-motion-ready');

  const revealItems = [...document.querySelectorAll('.reveal')];
  revealItems.forEach((item, index) => {
    const parent = item.parentElement;
    const siblings = parent
      ? [...parent.children].filter((candidate) => candidate.classList.contains('reveal'))
      : [];
    const localIndex = siblings.indexOf(item);
    item.style.setProperty('--reveal-order', String(Math.max(0, Math.min(localIndex >= 0 ? localIndex : index, 6))));
  });

  const header = document.querySelector('.music-site-header');
  const updateHeader = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  if (window.matchMedia('(pointer: fine)').matches
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const surfaces = [...document.querySelectorAll(
      '.collection-artist-card, .album-card, .related-artist, .visual-playlist'
    )];

    surfaces.forEach((surface) => {
      let frame = 0;
      let x = 50;
      let y = 50;

      const render = () => {
        frame = 0;
        surface.style.setProperty('--pointer-x', `${x}%`);
        surface.style.setProperty('--pointer-y', `${y}%`);
      };

      surface.addEventListener('pointermove', (event) => {
        const bounds = surface.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        x = ((event.clientX - bounds.left) / bounds.width) * 100;
        y = ((event.clientY - bounds.top) / bounds.height) * 100;
        if (!frame) frame = requestAnimationFrame(render);
      }, { passive: true });

      surface.addEventListener('pointerleave', () => {
        x = 50;
        y = 50;
        if (!frame) frame = requestAnimationFrame(render);
      }, { passive: true });
    });
  }
})();
