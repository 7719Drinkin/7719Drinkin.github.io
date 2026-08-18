(() => {
  const ROOT_SELECTORS = [
    '#anime-series-grid',
    '#anime-character-grid',
    '#anime-scene-grid',
    '#anime-sound-list',
    '#anime-recent-list'
  ];

  const removePlaceholders = () => {
    document.querySelectorAll('.anime-empty-state').forEach((node) => node.remove());
  };

  removePlaceholders();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (![...mutation.addedNodes].some((node) => node instanceof Element)) continue;
      removePlaceholders();
      break;
    }
  });

  ROOT_SELECTORS.forEach((selector) => {
    const root = document.querySelector(selector);
    if (root) observer.observe(root, { childList: true, subtree: true });
  });
})();
