import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMusicCollectionRepository } from './music/music-collection-repository.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFile(join(ROOT, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const routePath = (route) => join(String(route).replace(/^\/+/, ''), 'index.html');
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cssRuleBody = (css, selector) => {
  const match = css.match(new RegExp(`${escapeRegExp(selector)}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? '';
};
const localized = (value, language = 'zh') => {
  if (typeof value === 'string') return value;
  return value?.[language] ?? value?.zh ?? value?.en ?? '';
};

function readI18nPageData(page, label) {
  const match = page.match(/<script id="music-i18n-page-data" type="application\/json">([\s\S]*?)<\/script>/);
  assert(match, `${label} must embed canonical Music i18n page data.`);
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`${label} contains invalid Music i18n page data: ${error.message}`);
  }
}

async function main() {
  const repository = createMusicCollectionRepository({ root: ROOT });
  const collections = await repository.getVisibleCollections();
  assert(collections.length === 1, `Current Music scope expects exactly one published collection; got ${collections.length}.`);
  assert(collections[0].id === 'recently-curated', `Published collection must be recently-curated; got ${collections[0].id}.`);

  const [home, listening, homeCollectionStyles, i18nStyles, i18nRuntime] = await Promise.all([
    read('music/index.html'),
    read('music/listening/index.html'),
    read('css/music-home-collections.css'),
    read('css/music-i18n.css'),
    read('js/music-i18n.js')
  ]);

  assert(home.includes('id="collections"'), 'Music home must expose the Collections section.');
  assert(!home.includes('id="listening"'), 'Music home must not expose the old Listening section.');
  assert(home.includes('href="#collections"'), 'Music home header must link to #collections.');
  assert(home.includes('>COLLECTIONS<'), 'Music home header must identify COLLECTIONS.');
  assert(home.includes('data-music-collection-card="recently-curated"'), 'Music home must render the Recently Curated collection entry.');
  assert(home.includes('href="/music/collections/recently-curated/"'), 'Music home collection entry must link to Recently Curated.');
  assert(home.includes('/css/music-home-collections.css?v=20260821-6'), 'Music home must load the current Collections stylesheet version.');
  assert(home.includes('data-music-i18n-runtime'), 'Music home must load the Music i18n runtime that styles bilingual artist names.');
  assert(home.includes('data-music-i18n-style'), 'Music home must load the Music i18n stylesheet that defines the artist-name Chinese display font.');
  assert(home.includes('<h2><span class="music-lang-zh">专栏</span><span class="music-lang-en">COLLECTIONS</span></h2>'), 'Music home Collections heading must be language-aware.');
  assert(home.includes('data-music-bilingual-role="primary" data-music-zh="最近整理" data-music-en="Recently Curated" lang="zh-CN"'), 'Music home collection title must use the same bilingual runtime path as artist names.');
  assert(home.includes('<span class="music-lang-zh">最近整理</span><span class="music-lang-en">Recently Curated</span>'), 'Music home collection title must preserve no-JS bilingual fallback content.');
  assert(!home.includes('02 / COLLECTIONS'), 'Music home must not retain decorative Collections numbering.');
  assert(!home.includes('歌曲不单独陈列，而是在专栏里形成自己的次序与语境。'), 'Music home must not retain the redundant Collections manifesto copy.');
  assert(!home.includes('DYNAMIC COLLECTION'), 'Music home must not expose implementation-type microcopy.');
  assert(!home.includes('VIEW ALL SONGS'), 'Music home must not retain the all-songs Listening CTA.');
  assert(!home.includes('href="/music/listening/"'), 'Music home must not expose the retired Listening archive route.');

  const collectionTitleRule = cssRuleBody(homeCollectionStyles, 'body.music-page .collection-curation-copy h3');
  assert(collectionTitleRule, 'Music Collections stylesheet must define the Collection title fallback rule.');
  assert(
    collectionTitleRule.includes('font-family: var(--music-font-zh-display, var(--music-serif-zh, "Noto Serif SC", "Cormorant Garamond", serif));'),
    'Collection title fallback must resolve through the same Chinese display font token used by Music i18n.'
  );
  assert(collectionTitleRule.includes('font-size: clamp(30px, 3.4vw, 44px);'), 'Collection title desktop size must stay within the revised editorial scale.');
  assert(collectionTitleRule.includes('font-weight: 600;'), 'Collection title must preserve the artist-name weight.');
  assert(collectionTitleRule.includes('letter-spacing: .01em;'), 'Collection title fallback tracking must match the final Music i18n primary style.');

  const primaryZhRule = cssRuleBody(i18nStyles, '.music-page [data-music-bilingual-role="primary"][lang="zh-CN"]');
  assert(primaryZhRule, 'Music i18n must define the primary Chinese bilingual typography rule used by artist names.');
  assert(primaryZhRule.includes('font-family: var(--music-font-zh-display) !important;'), 'Primary Chinese bilingual typography must force the Music Chinese display font.');
  assert(primaryZhRule.includes('letter-spacing: .01em !important;'), 'Primary Chinese bilingual typography must preserve the artist-name tracking.');

  assert(i18nRuntime.includes("pageType !== 'collection-detail'"), 'Music i18n runtime must include the Collection detail extension.');
  assert(i18nRuntime.includes('document.documentElement.dataset.musicLanguage = language;'), 'Music i18n runtime must bridge the canonical html[data-music-language] state.');
  assert(i18nRuntime.includes("window.addEventListener('7719:languagechange', adoptExternalMusicLanguage);"), 'Music i18n runtime must consume the site-level language event.');
  assert(i18nRuntime.includes("document.addEventListener('universe:languagechange', adoptExternalMusicLanguage);"), 'Music i18n runtime must consume the Universe language event.');

  assert(listening.includes('data-listening-compat="collections"'), 'Legacy /music/listening/ must be a Collections compatibility route.');
  assert(listening.includes('href="/music/collections/recently-curated/"'), 'Listening compatibility route must link to Recently Curated.');
  assert(listening.includes('window.location.replace("/music/collections/recently-curated/")'), 'Listening compatibility route must redirect to Recently Curated.');
  assert(!listening.includes('data-listening-song='), 'Listening compatibility route must not render the retired all-songs archive.');
  assert(!listening.includes('music-listening-page'), 'Listening compatibility route must not retain the old Listening page shell.');

  for (const collectionEntry of collections) {
    const collection = await repository.getCollection(collectionEntry.id);
    const resolvedSongs = await repository.resolveCollectionSongs(collection.id);
    const page = await read(routePath(collection.route));
    const pageData = readI18nPageData(page, `Collection ${collection.id}`);
    const titleZh = localized(collection.title, 'zh');
    const titleEn = localized(collection.title, 'en') || titleZh;
    const descriptionZh = localized(collection.description, 'zh');
    const descriptionEn = localized(collection.description, 'en') || descriptionZh;

    assert(page.includes('class="music-page music-collection-detail-page"'), `Collection ${collection.id} must use the collection detail shell.`);
    assert(page.includes(`data-music-collection="${collection.id}"`), `Collection ${collection.id} must expose its identity on body.`);
    assert(page.includes('class="music-header-crumb music-header-crumb--current"'), `Collection ${collection.id} must expose the canonical Music breadcrumb.`);
    assert(page.includes(`>${titleEn.toUpperCase()}<`), `Collection ${collection.id} header must identify its English title.`);
    assert(page.includes('href="/music/#collections"'), `Collection ${collection.id} must return to the Music Collections section.`);
    assert(page.includes('/js/music.js?v='), `Collection ${collection.id} must load the Music reveal runtime.`);
    assert(page.includes('data-music-i18n-runtime'), `Collection ${collection.id} must load the Music i18n runtime.`);
    assert(page.includes('data-music-i18n-style'), `Collection ${collection.id} must load the Music i18n stylesheet.`);
    assert(page.includes(`<h1><span class="music-lang-zh">${titleZh}</span><span class="music-lang-en">${titleEn}</span></h1>`), `Collection ${collection.id} hero title must be language-aware.`);
    assert(page.includes(`<p class="collection-detail-description"><span class="music-lang-zh">${descriptionZh}</span><span class="music-lang-en">${descriptionEn}</span></p>`), `Collection ${collection.id} description must preserve both languages.`);
    assert(!page.includes('02 / COLLECTION'), `Collection ${collection.id} must not retain decorative Collection numbering.`);
    assert(!page.includes('CURATED, NOT COMPLETE.'), `Collection ${collection.id} must not retain editorial filler copy.`);
    assert(!page.includes('TRACK LIST'), `Collection ${collection.id} must not retain redundant track-list microcopy.`);

    assert(pageData.pageType === 'collection-detail', `Collection ${collection.id} i18n pageType must be collection-detail.`);
    assert(pageData.collection?.id === collection.id, `Collection ${collection.id} i18n data must preserve its canonical id.`);
    assert(localized(pageData.collection?.title, 'zh') === titleZh, `Collection ${collection.id} i18n data must preserve the Chinese title.`);
    assert(localized(pageData.collection?.title, 'en') === titleEn, `Collection ${collection.id} i18n data must preserve the English title.`);
    assert(localized(pageData.collection?.description, 'zh') === descriptionZh, `Collection ${collection.id} i18n data must preserve the Chinese description.`);
    assert(localized(pageData.collection?.description, 'en') === descriptionEn, `Collection ${collection.id} i18n data must preserve the English description.`);

    const renderedIds = [...page.matchAll(/data-collection-song="([^"]+)"/g)].map((match) => match[1]);
    const pageDataIds = (pageData.tracks ?? []).map((track) => track.id);
    const expectedIds = resolvedSongs.map((song) => song.songId);
    assert(renderedIds.length === resolvedSongs.length, `Collection ${collection.id} rendered ${renderedIds.length} songs; expected ${resolvedSongs.length}.`);
    assert(new Set(renderedIds).size === renderedIds.length, `Collection ${collection.id} must not render duplicate song rows.`);
    assert(JSON.stringify(renderedIds) === JSON.stringify(expectedIds), `Collection ${collection.id} rendered song order differs from its resolver.`);
    assert(JSON.stringify(pageDataIds) === JSON.stringify(expectedIds), `Collection ${collection.id} i18n track order differs from its resolver.`);

    const notePairs = [...page.matchAll(/<p class="collection-track-note"><span class="music-lang-zh">[\s\S]*?<\/span><span class="music-lang-en">[\s\S]*?<\/span><\/p>/g)];
    assert(notePairs.length === resolvedSongs.length, `Collection ${collection.id} must render a bilingual note contract for every track.`);

    const playButtons = [...page.matchAll(/<button class="collection-track-play"[\s\S]*?<\/button>/g)].map((match) => match[0]);
    playButtons.forEach((button, index) => {
      assert(button.includes('data-song-title-zh='), `Collection ${collection.id} playable trigger ${index + 1} is missing Chinese title metadata.`);
      assert(button.includes('data-song-title-en='), `Collection ${collection.id} playable trigger ${index + 1} is missing English title metadata.`);
      assert(button.includes('data-song-artist-zh='), `Collection ${collection.id} playable trigger ${index + 1} is missing Chinese artist metadata.`);
      assert(button.includes('data-song-artist-en='), `Collection ${collection.id} playable trigger ${index + 1} is missing English artist metadata.`);
      assert(button.includes('data-song-album-zh='), `Collection ${collection.id} playable trigger ${index + 1} is missing Chinese album metadata.`);
      assert(button.includes('data-song-album-en='), `Collection ${collection.id} playable trigger ${index + 1} is missing English album metadata.`);
    });

    assert(!page.includes('/music/artists/undefined/'), `Collection ${collection.id} must never invent an undefined artist route.`);
    assert(!page.includes('/music/artists/null/'), `Collection ${collection.id} must never invent a null artist route.`);
  }

  let directoryIndexExists = true;
  try {
    await access(join(ROOT, 'music/collections/index.html'));
  } catch {
    directoryIndexExists = false;
  }
  assert(!directoryIndexExists, 'Do not create a /music/collections/ directory page while only one collection exists.');

  console.log(`Validated Music Collection pages: ${collections.map((collection) => collection.id).join(', ')}; Collection detail pages now share the canonical Music i18n runtime, language state and bilingual playback metadata.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
