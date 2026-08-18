(() => {
  const root = document.querySelector('[data-anime-background-root]');
  if (!root) return;

  const layers = Array.from(root.querySelectorAll('[data-anime-background-layer]'));
  if (layers.length < 2) return;

  const sections = [
    ['hero', '.anime-hero'],
    ['series', '#series'],
    ['characters', '#characters'],
    ['scenes', '#scenes'],
    ['sound', '#sound'],
    ['recent', '#recent'],
  ];

  const manifestUrl = '/data/anime/home-backgrounds.json?v=20260818-1';
  let activeLayerIndex = -1;
  let currentSrc = '';

  const preload = (entry) => new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(entry);
    image.onerror = () => resolve(null);
    image.src = entry.src;
  });

  const setLayerImage = (layer, entry) => {
    layer.style.backgroundImage = `url(${JSON.stringify(entry.src)})`;
    layer.style.backgroundPosition = entry.position || 'center';
  };

  const showBackground = (entry) => {
    if (!entry || entry.src === currentSrc) return;

    const nextLayerIndex = activeLayerIndex === 0 ? 1 : 0;
    const incoming = layers[nextLayerIndex];
    const outgoing = activeLayerIndex >= 0 ? layers[activeLayerIndex] : null;

    setLayerImage(incoming, entry);
    root.classList.add('has-image');

    requestAnimationFrame(() => {
      incoming.classList.add('is-active');
      outgoing?.classList.remove('is-active');
    });

    activeLayerIndex = nextLayerIndex;
    currentSrc = entry.src;
  };

  const buildSectionMap = (backgrounds) => {
    const explicit = new Map();

    backgrounds.forEach((background) => {
      const assignedSections = Array.isArray(background.sections)
        ? background.sections
        : background.section
          ? [background.section]
          : [];

      assignedSections.forEach((section) => {
        if (sections.some(([id]) => id === section)) explicit.set(section, background);
      });
    });

    return new Map(sections.map(([id], index) => [
      id,
      explicit.get(id) || backgrounds[index % backgrounds.length],
    ]));
  };

  const init = async () => {
    let manifest;

    try {
      const response = await fetch(manifestUrl, { cache: 'no-store' });
      if (!response.ok) return;
      manifest = await response.json();
    } catch {
      return;
    }

    const configured = Array.isArray(manifest?.backgrounds)
      ? manifest.backgrounds.filter((entry) => entry && typeof entry.src === 'string' && entry.src.trim())
      : [];

    if (!configured.length) return;

    const loaded = (await Promise.all(configured.map(preload))).filter(Boolean);
    if (!loaded.length) return;

    const sectionMap = buildSectionMap(loaded);
    const observed = sections
      .map(([id, selector]) => ({ id, element: document.querySelector(selector) }))
      .filter(({ element }) => element);

    if (!('IntersectionObserver' in window) || !observed.length) {
      showBackground(loaded[0]);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      const sectionId = visible.target.dataset.animeBackgroundSection;
      showBackground(sectionMap.get(sectionId));
    }, {
      root: null,
      rootMargin: '-42% 0px -42% 0px',
      threshold: 0,
    });

    observed.forEach(({ id, element }) => {
      element.dataset.animeBackgroundSection = id;
      observer.observe(element);
    });

    const viewportCenter = window.innerHeight / 2;
    const initial = observed.find(({ element }) => {
      const rect = element.getBoundingClientRect();
      return rect.top <= viewportCenter && rect.bottom >= viewportCenter;
    });

    showBackground(sectionMap.get(initial?.id || 'hero') || loaded[0]);
  };

  init();
})();
