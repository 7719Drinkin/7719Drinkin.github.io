const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

export function createPlaybackTrackView({
  song,
  album = null,
  artwork = '',
  primary = null,
  runtimeMatch = null,
  language = 'zh'
}) {
  const runtimeTrack = runtimeMatch?.track ?? null;
  const title = localized(song?.title, language)
    || String(runtimeTrack?.title || runtimeTrack?.fileName || '').trim();
  const artist = localized(primary?.name, language)
    || String(primary?.key || '').trim();
  const albumName = localized(album?.title, language)
    || String(runtimeMatch?.album?.name || '').trim();

  return {
    id: String(song?.id ?? '').trim(),
    title,
    artist,
    album: albumName,
    artwork: String(artwork || '').trim(),
    playback: runtimeTrack?.src
      ? {
          src: String(runtimeTrack.src),
          type: String(runtimeTrack.type || 'audio/mpeg'),
          key: String(runtimeTrack.key || ''),
          fileName: String(runtimeTrack.fileName || '')
        }
      : null
  };
}
