function applyGalleryBackground(image) {
  const card = image.closest('.gallery-card');
  if (!card) return;

  const source = image.currentSrc || image.src;
  if (!source) return;

  const escapedSource = source.replace(/"/g, '%22');
  card.style.setProperty('--gallery-bg', `url("${escapedSource}")`);
}

function prepareContainedGallery() {
  document.querySelectorAll('.gallery-card > img').forEach((image) => {
    if (image.complete && image.naturalWidth > 0) {
      applyGalleryBackground(image);
    } else {
      image.addEventListener('load', () => applyGalleryBackground(image), { once: true });
    }
  });
}

prepareContainedGallery();
