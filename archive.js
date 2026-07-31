function loadSiteI18n() {
  if (window.SiteI18n || document.querySelector('script[data-site-i18n]')) return;
  const script = document.createElement('script');
  script.src = '/js/site-i18n.js?v=20260731-1';
  script.dataset.siteI18n = '';
  document.head.append(script);
}

loadSiteI18n();

const archiveGrid = document.querySelector('#archive-grid');
const archiveStatus = document.querySelector('#archive-status');
const archiveCount = document.querySelector('#archive-count');
const lightbox = document.querySelector('.archive-lightbox');
const lightboxImage = document.querySelector('.archive-lightbox-image');
const lightboxClose = document.querySelector('.archive-lightbox-close');

const assetsApi = 'https://api.github.com/repos/7719Drinkin/7719Drinkin.github.io/contents/assets?ref=main';
const supportedImage = /\.(jpe?g|png|gif|webp)$/i;

const fallbackAssets = [
  '10196131834617797520.JPG', '10488980165229573680.JPG',
  '11349219704037530993.JPG', '11646838632284565940.JPG',
  '11775843438435290282.JPG', '11957335010598600622.JPG',
  '12114021349949282200.JPG', '1239998823771454063.JPG',
  '12772253911567008621.JPG', '12847381581561420996.JPG',
  '13107004743345770654.JPG', '13448986505012058779.JPG',
  '13662551537550473438.JPG', '13770826023627815810.JPG',
  '14460113893979216777.JPG', '15618924384798525331.JPG',
  '15815936170156050909.GIF', '15842363397869260745.JPG',
  '15942445778634938029.JPG', '16569224312694583431.JPG',
  '16706842144915762594.JPG', '17454109953899054768.JPG',
  '17592230360523509352.JPG', '1772568631635563604.JPG',
  '17875664781730591592.JPG', '17882157698450135981.JPG',
  '17902989961743219615.JPG', '17927622445513162888.JPG',
  '18251605632468628377.JPG', '18253063394609317568.JPG',
  '2267006286102278737.JPG', '2652687421338529423.JPG',
  '2694247222568911187.JPG', '3144560115330642069.JPG',
  '3895433547667554457.JPG', '4011015036539168366.JPG',
  '5238116327339691924.JPG', '5389104262546023871.JPG',
  '5535133119414967923.JPG', '5543702097446741135.JPG',
  '5644423739626037232.JPG', '5871951938263597975.JPG',
  '6074975195853087597.JPG', '6127921922343028898.JPG',
  '6540924030745025334.JPG', '6559299601612294778.JPG',
  '6638817091273363583.JPG', '7101048833175915428.JPG',
  '7536346419200841865.JPG', '766830060986178739.JPG',
  '8011104956391261818.JPG', '805425783341768885.JPG',
  '8182737598988070763.JPG', '8348272524936605862.PNG',
  '8604422230054413478.JPG', '860836072413442557.JPG',
  '8767494982985058687.JPG', '8861091300699424969.JPG',
  '9402786197928152254.JPG', '9936908639502117191.JPG',
  '994436124432461512.JPG', 'moment-02.jpg'
];

let currentItems = [];

function translate(key, variables, fallback) {
  const value = window.SiteI18n?.t(key, variables);
  return value && value !== key ? value : fallback;
}

function renderArchive(items) {
  if (!archiveGrid) return;
  currentItems = items;
  archiveGrid.replaceChildren();

  items.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = 'archive-card';

    const image = document.createElement('img');
    const number = String(index + 1).padStart(2, '0');
    image.src = item.url;
    image.alt = translate(
      'archive.frameAlt',
      { number },
      `Michael Jordan archive frame ${number}`
    );
    image.loading = index < 10 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute(
      'aria-label',
      translate('archive.openImage', { label: image.alt }, `${image.alt}，点击放大`)
    );
    image.addEventListener('error', () => card.remove(), { once: true });

    const indexLabel = document.createElement('span');
    indexLabel.className = 'archive-card-index';
    indexLabel.textContent = number;
    card.append(image, indexLabel);
    archiveGrid.append(card);
  });

  archiveStatus?.remove();
  if (archiveCount) {
    archiveCount.textContent = translate(
      'archive.frames',
      { count: items.length },
      `${items.length} FRAMES`
    );
  }
}

async function loadArchive() {
  try {
    const response = await fetch(assetsApi, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const files = await response.json();
    const images = files
      .filter((file) => file.type === 'file' && supportedImage.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((file) => ({ name: file.name, url: file.download_url }));
    renderArchive(images);
  } catch (error) {
    console.warn('Using local archive fallback:', error);
    renderArchive(fallbackAssets.map((name) => ({ name, url: `/assets/${encodeURIComponent(name)}` })));
  }
}

function openLightbox(image) {
  if (!lightbox || !lightboxImage) return;
  lightboxImage.src = image.currentSrc || image.src;
  lightboxImage.alt = image.alt;
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

archiveGrid?.addEventListener('click', (event) => {
  const image = event.target.closest?.('.archive-card img');
  if (image) openLightbox(image);
});

archiveGrid?.addEventListener('keydown', (event) => {
  const image = event.target.closest?.('.archive-card img');
  if (!image || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  openLightbox(image);
});

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLightbox();
});
window.addEventListener('7719:languagechange', () => {
  if (currentItems.length) renderArchive(currentItems);
});

loadArchive();
