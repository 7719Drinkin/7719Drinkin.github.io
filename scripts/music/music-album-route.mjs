export const fallbackAlbumSlug = (album, index) => {
  const ascii = String(album?.title || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `album-${String(index + 1).padStart(2, '0')}`;
};

export const albumSlug = (album, index) => album?.slug || fallbackAlbumSlug(album, index);

export const albumCatalogName = (album) => album?.catalogName || album?.title || '';
