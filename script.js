const header = document.querySelector('.site-header');
const cursorGlow = document.querySelector('.cursor-glow');
const galleryWall = document.querySelector('#gallery-wall');
const lightbox = document.querySelector('.lightbox');
const lightboxImage = document.querySelector('.lightbox-image');
const lightboxClose = document.querySelector('.lightbox-close');

const galleryAssets = [
  '10196131834617797520.JPG',
  '10488980165229573680.JPG',
  '11646838632284565940.JPG',
  '11775843438435290282.JPG',
  '12114021349949282200.JPG',
  '1239998823771454063.JPG',
  '12847381581561420996.JPG',
  '13448986505012058779.JPG',
  '13770826023627815810.JPG',
  '14460113893979216777.JPG',
  '15842363397869260745.JPG',
  '16706842144915762594.JPG',
  '17454109953899054768.JPG',
  '1772568631635563604.JPG',
  '17902989961743219615.JPG',
  '18251605632468628377.JPG',
  '18253063394609317568.JPG',
  '2652687421338529423.JPG',
  '3144560115330642069.JPG',
  '4011015036539168366.JPG',
  '5389104262546023871.JPG',
  '5543702097446741135.JPG',
  '5871951938263597975.JPG',
  '6127921922343028898.JPG',
  '6559299601612294778.JPG',
  '7101048833175915428.JPG',
  '7536346419200841865.JPG',
  '766830060986178739.JPG',
  '805425783341768885.JPG',
  '8348272524936605862.PNG',
  '860836072413442557.JPG',
  '8767494982985058687.JPG',
  '8861091300699424969.JPG',
  '9402786197928152254.JPG',
  '9936908639502117191.JPG',
  '994436124432461512.JPG'
];

const galleryLabels = [
  'AIR', 'FLIGHT', 'FOCUS', 'CLUTCH', 'DRIVE', 'RISE',
  'LEGACY', 'COURT', 'HEART', 'POWER', 'CRAFT', 'FIRE',
  'ICON', '23'
];

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

function observeReveal(item, index = 0) {
  if (item.classList.contains('gallery-card')) {
    item.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
  }
  observer.observe(item);
}

document.querySelectorAll('.reveal').forEach((item, index) => {
  observeReveal(item, index);
});

function applyCardShape(card, image, index) {
  const ratio = image.naturalWidth / image.naturalHeight;
  card.classList.remove(
    'gallery-card--wide',
    'gallery-card--tall',
    'gallery-card--feature'
  );

  if (ratio >= 1.7) {
    card.classList.add(index % 3 === 0 ? 'gallery-card--feature' : 'gallery-card--wide');
    return;
  }

  if (ratio <= 0.76) {
    card.classList.add('gallery-card--tall');
    return;
  }

  if (ratio >= 1.15 && index % 7 === 0) {
    card.classList.add('gallery-card--feature');
  }
}

function createGalleryCard(filename, index) {
  const card = document.createElement('article');
  card.className = 'gallery-card reveal';

  const image = document.createElement('img');
  image.src = `assets/${filename}`;
  image.alt = `Michael Jordan tribute image ${String(index + 1).padStart(2, '0')}`;
  image.loading = index < 6 ? 'eager' : 'lazy';
  image.decoding = 'async';
  image.tabIndex = 0;
  image.setAttribute('role', 'button');
  image.setAttribute('aria-label', `${image.alt}，点击放大`);

  image.addEventListener('load', () => {
    applyCardShape(card, image, index);
  });

  image.addEventListener('error', () => {
    card.remove();
  });

  const label = document.createElement('div');
  label.className = 'card-label';
  label.innerHTML = `
    <span>${String(index + 1).padStart(2, '0')}</span>
    <strong>${galleryLabels[index % galleryLabels.length]}</strong>
  `;

  card.append(image, label);
  return card;
}

function buildGallery() {
  if (!galleryWall) return;

  galleryWall.replaceChildren();
  galleryAssets.forEach((filename, index) => {
    const card = createGalleryCard(filename, index);
    galleryWall.append(card);
    observeReveal(card, index);
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
  const image = event.target.closest('.gallery-card > img');
  if (image) openLightbox(image);
});

galleryWall?.addEventListener('keydown', (event) => {
  const image = event.target.closest('.gallery-card > img');
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

buildGallery();
