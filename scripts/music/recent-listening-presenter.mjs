export async function presentRecentListening(entries, {
  resolvePlayable = async () => false
} = {}) {
  if (!Array.isArray(entries)) {
    throw new TypeError('RecentListeningPresenter expects an array.');
  }
  if (typeof resolvePlayable !== 'function') {
    throw new TypeError('RecentListeningPresenter resolvePlayable dependency must be a function.');
  }

  return Promise.all(entries.map(async (entry, index) => ({
    index: String(index + 1).padStart(2, '0'),
    title: entry.title,
    artist: entry.artistNameEn || entry.artistNameZh,
    note: entry.note,
    href: entry.artistRoute
      ? `${entry.artistRoute}#songs`
      : `/music/listening/#${encodeURIComponent(entry.songId)}`,
    status: await resolvePlayable(entry) ? 'PLAYABLE' : 'ARCHIVE',
    curatedAt: entry.curatedAt
  })));
}
