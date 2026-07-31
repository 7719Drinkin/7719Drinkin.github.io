function loadSiteI18n() {
  if (window.SiteI18n || document.querySelector('script[data-site-i18n]')) return;
  const script = document.createElement('script');
  script.src = '/js/site-i18n.js?v=20260731-1';
  script.dataset.siteI18n = '';
  document.head.append(script);
}

loadSiteI18n();

const header = document.querySelector('.site-header');
const cursorGlow = document.querySelector('.cursor-glow');
const galleryWall = document.querySelector('#gallery-wall');
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

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver(
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
    )
  : null;

function observeReveal(item) {
  if (!observer) {
    item.classList.add('visible');
    return;
  }
  observer.observe(item);
}

document.querySelectorAll('.reveal').forEach(observeReveal);

function applyCardShape(card, image, index) {
  if (!image.naturalWidth || !image.naturalHeight) return;

  const ratio = image.naturalWidth / image.naturalHeight;
  card.classList.remove(
    'gallery-card--wide',
    'gallery-card--tall',
    'gallery-card--feature'
  );

  if (ratio >= 1.7) {
    card.classList.add(index % 3 === 0 ? 'gallery-card--feature' : 'gallery-card--wide');
  } else if (ratio <= 0.76) {
    card.classList.add('gallery-card--tall');
  } else if (ratio >= 1.15 && index % 6 === 0) {
    card.classList.add('gallery-card--feature');
  }
}

function updateImageAria(image) {
  const label = image.alt || 'Basketball image';
  const translated = window.SiteI18n?.t('gallery.openImage', { label });
  image.setAttribute('aria-label', translated || `${label}，点击放大`);
}

function prepareGallery() {
  const images = document.querySelectorAll('.gallery-card > img');

  images.forEach((image, index) => {
    const card = image.closest('.gallery-card');
    if (!card) return;

    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    updateImageAria(image);

    const updateShape = () => applyCardShape(card, image, index);

    if (image.complete) {
      updateShape();
    } else {
      image.addEventListener('load', updateShape, { once: true });
    }

    image.addEventListener('error', () => {
      card.hidden = true;
    }, { once: true });
  });
}

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

galleryWall?.addEventListener('click', (event) => {
  const image = event.target.closest?.('.gallery-card > img');
  if (image) openLightbox(image);
});

galleryWall?.addEventListener('keydown', (event) => {
  const image = event.target.closest?.('.gallery-card > img');
  if (!image) return;

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openLightbox(image);
  }
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

window.addEventListener('7719:languagechange', () => {
  document.querySelectorAll('.gallery-card > img').forEach(updateImageAria);
});

prepareGallery();
