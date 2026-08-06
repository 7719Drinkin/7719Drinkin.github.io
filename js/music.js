const playerAudio = document.querySelector('[data-player-audio]');

if (playerAudio) {
  playerAudio.preload = 'none';
  playerAudio.removeAttribute('src');
}

const catalogPage = document.body.dataset.musicCatalogPage;
if (catalogPage && !document.querySelector('script[data-music-catalog-loader]')) {
  const script = document.createElement('script');
  script.src = '/js/music-catalog.js?v=20260806-albums-2';
  script.dataset.musicCatalogLoader = '';
  document.body.append(script);
}

const revealItems = [...document.querySelectorAll('.reveal')];

if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}
