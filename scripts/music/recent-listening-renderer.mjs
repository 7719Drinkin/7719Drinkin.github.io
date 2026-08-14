const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export function renderRecentListening(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('RecentListeningRenderer expects an array.');
  }

  return items.map((item) => `<a class="collection-song-row reveal" href="${escapeHtml(item.href)}">
    <span>${escapeHtml(item.index)}</span>
    <div>
      <strong>${escapeHtml(item.title)}</strong>
      <small>${escapeHtml(item.artist)}</small>
    </div>
    <p>${escapeHtml(item.note)}</p>
    <em>${escapeHtml(item.status)}</em>
    <b aria-hidden="true">↗</b>
  </a>`).join('');
}
