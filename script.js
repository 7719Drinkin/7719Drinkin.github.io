const header = document.querySelector('.site-header');
const cursorGlow = document.querySelector('.cursor-glow');
const revealItems = document.querySelectorAll('.reveal');
const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');

window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 24);
});

window.addEventListener('pointermove', (event) => {
  if (!cursorGlow) return;
  cursorGlow.style.transform = `translate(${event.clientX - 190}px, ${event.clientY - 190}px)`;
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12,
    rootMargin: '0px 0px -32px 0px'
  }
);

revealItems.forEach((item, index) => {
  if (item.classList.contains('gallery-card')) {
    item.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
  }
  observer.observe(item);
});

function openLightbox(image) {
  if (!lightbox || !lightboxImage) return;

  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt || 'Basketball image';
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('lightbox-open');
  lightboxClose?.focus();
}

function closeLightbox() {
  if (!lightbox || !lightboxImage) return;

  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  lightboxImage.src = '';
}

document.querySelectorAll('.gallery-card > img').forEach((image) => {
  image.setAttribute('tabindex', '0');
  image.setAttribute('role', 'button');
  image.setAttribute('aria-label', `${image.alt || 'Basketball image'}，点击放大`);

  image.addEventListener('click', () => openLightbox(image));
  image.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightbox(image);
    }
  });
});

lightboxClose?.addEventListener('click', closeLightbox);

lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox?.classList.contains('is-open')) {
    closeLightbox();
  }
});