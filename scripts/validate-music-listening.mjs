import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [songsRaw, artistsRaw, listeningPage] = await Promise.all([
  read('data/music/songs.json'),
  read('data/music/artists.json'),
  read('music/listening/index.html')
]);

const songs = JSON.parse(songsRaw).songs ?? [];
const artists = JSON.parse(artistsRaw).filter((artist) => artist?.status !== 'draft');

assert(listeningPage.includes('class="music-page music-listening-page"'), 'Listening page must use the Music page shell.');
assert(listeningPage.includes('music-header-current'), 'Listening page must expose the canonical Music breadcrumb current item.');
assert(listeningPage.includes('>LISTENING<'), 'Listening header must identify the LISTENING route.');

const renderedIds = [...listeningPage.matchAll(/data-listening-song="([^"]+)"/g)].map((match) => match[1]);
assert(renderedIds.length === songs.length, `Listening page rendered ${renderedIds.length} songs; expected ${songs.length}.`);
assert(new Set(renderedIds).size === renderedIds.length, 'Listening page must not render duplicate song rows.');

for (const song of songs) {
  assert(renderedIds.includes(song.id), `Listening page is missing canonical song ${song.id}.`);
}

for (const artist of artists) {
  if (!songs.some((song) => (song.artists ?? []).some((entry) => entry?.key === artist.id))) continue;
  assert(listeningPage.includes(`href="${artist.route}"`), `Listening page must link known profile artist ${artist.id}.`);
}

assert(!listeningPage.includes('href="/music/artists/undefined/"'), 'Listening page must never invent an undefined artist route.');
assert(!listeningPage.includes('href="/music/artists/null/"'), 'Listening page must never invent a null artist route.');

console.log(`Validated transitional Music Listening archive: ${songs.length} song(s), ${artists.length} published profile(s).`);
