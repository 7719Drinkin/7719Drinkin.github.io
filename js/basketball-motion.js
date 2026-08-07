(() => {
  const body = document.body;
  if (!body || body.dataset.siteModule !== 'basketball') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.add('basketball-motion-ready');

  const headers = [
    document.querySelector('.universe-header'),
    document.querySelector('.site-header'),
    document.querySelector('.archive-header')
  ].filter(Boolean);

  const updateHeader = () => {
    const scrolled = window.scrollY > 20;
    headers.forEach((header) => {
      header.classList.toggle('is-scrolled', scrolled);
      if (header.classList.contains('site-header')) header.classList.toggle('scrolled', scrolled);
    });

    body.style.setProperty('--court-shift', `${Math.min(window.scrollY * .08, 90)}px`);
    const number = document.querySelector('.hero-number');
    if (number) number.style.setProperty('--number-shift', `${Math.min(window.scrollY * .11, 110)}px`);
  };

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  let revealObserver = null;
  if (!reducedMotion && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible', 'is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -28px 0px' });
  }

  const observeReveal = (item, index = 0) => {
    if (!(item instanceof Element) || item.dataset.basketballObserved === 'true') return;
    item.dataset.basketballObserved = 'true';
    item.style.setProperty('--basketball-order', String(Math.min(index, 7)));

    if (!revealObserver || reducedMotion) {
      item.classList.add('visible', 'is-visible');
      return;
    }

    revealObserver.observe(item);
  };

  const registerReveals = (scope = document) => {
    const groups = [
      ...scope.querySelectorAll('.reveal, .basketball-reveal'),
      ...scope.querySelectorAll('.archive-card:not([data-basketball-observed])')
    ];

    groups.forEach((item, index) => {
      if (item.classList.contains('archive-card')) item.classList.add('basketball-reveal');
      const parent = item.parentElement;
      const siblings = parent
        ? [...parent.children].filter((candidate) => candidate.matches('.reveal, .basketball-reveal, .archive-card'))
        : [];
      const localIndex = Math.max(0, siblings.indexOf(item));
      observeReveal(item, localIndex >= 0 ? localIndex : index);
    });
  };

  registerReveals();

  const dynamicObserver = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('.archive-card')) {
          node.classList.add('basketball-reveal');
          observeReveal(node, [...node.parentElement.children].indexOf(node) % 8);
        }
        registerReveals(node);
      });
    }
  });
  dynamicObserver.observe(document.body, { childList: true, subtree: true });

  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  if (!reducedMotion && pointerFine) {
    const hero = document.querySelector('.interest-hero, .hero');
    hero?.addEventListener('pointermove', (event) => {
      const bounds = hero.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 24;
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 18;
      hero.style.setProperty('--hero-x', x.toFixed(2));
      hero.style.setProperty('--hero-y', y.toFixed(2));
    }, { passive: true });

    hero?.addEventListener('pointerleave', () => {
      hero.style.setProperty('--hero-x', '0');
      hero.style.setProperty('--hero-y', '0');
    }, { passive: true });

    const bindSurface = (surface) => {
      if (!(surface instanceof Element) || surface.dataset.basketballPointer === 'true') return;
      surface.dataset.basketballPointer = 'true';
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

    const bindAllSurfaces = (scope = document) => {
      scope.querySelectorAll('.topic-card, .gallery-card, .archive-card').forEach(bindSurface);
    };

    bindAllSurfaces();
    const surfaceObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('.topic-card, .gallery-card, .archive-card')) bindSurface(node);
        bindAllSurfaces(node);
      }));
    });
    surfaceObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
