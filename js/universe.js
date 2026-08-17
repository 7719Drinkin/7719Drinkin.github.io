const header = document.querySelector('.universe-header');
const interestGrid = document.querySelector('#interest-grid');

function showReveal(item) {
  item.classList.add('visible', 'is-visible');
}

function observeReveals(scope = document) {
  const items = scope.querySelectorAll('.reveal:not([data-observed])');

  if (!('IntersectionObserver' in window)) {
    items.forEach(showReveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        showReveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -18px 0px' });

  items.forEach((item) => {
    item.dataset.observed = 'true';
    observer.observe(item);
  });
}

function syncGalaxyCount() {
  const count = document.querySelector('.hero-readout div:first-child strong');
  const total = interestGrid?.querySelectorAll('.interest-card').length ?? 0;
  if (count && total) count.textContent = String(total).padStart(2, '0');
}

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 22);
});

try {
  document.documentElement.classList.add('reveal-ready');
  observeReveals();
  syncGalaxyCount();
} catch (error) {
  console.warn('Universe enhancement unavailable:', error);
  document.documentElement.classList.remove('reveal-ready');
}
