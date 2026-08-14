const countOccurrences = (source, token) => source.split(token).length - 1;

export function replaceHtmlRegion(source, {
  startMarker,
  endMarker,
  content
}) {
  if (typeof source !== 'string') throw new TypeError('HtmlRegionUpdater source must be a string.');
  if (!startMarker || !endMarker) throw new Error('HtmlRegionUpdater requires start and end markers.');
  if (countOccurrences(source, startMarker) !== 1 || countOccurrences(source, endMarker) !== 1) {
    throw new Error(`Expected exactly one HTML region marker pair: ${startMarker} / ${endMarker}`);
  }

  const startIndex = source.indexOf(startMarker);
  const endIndex = source.indexOf(endMarker);
  if (endIndex <= startIndex) throw new Error('HTML region end marker must follow its start marker.');

  const markerLineStart = source.lastIndexOf('\n', startIndex) + 1;
  const indent = source.slice(markerLineStart, startIndex).match(/^\s*/)?.[0] ?? '';
  const body = String(content ?? '')
    .trim()
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');

  const before = source.slice(0, startIndex + startMarker.length);
  const after = source.slice(endIndex);
  return `${before}\n${body}\n${indent}${after}`;
}
