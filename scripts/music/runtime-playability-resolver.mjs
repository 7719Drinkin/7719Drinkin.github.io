import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const HAN_FOLD = {
  '後': '后', '傾': '倾', '聽': '听', '愛': '爱', '飛': '飞', '馬': '马',
  '牆': '墙', '實': '实', '們': '们', '過': '过', '擁': '拥', '風': '风',
  '夢': '梦', '獨': '独', '無': '无', '話': '话', '淚': '泪', '選': '选',
  '遲': '迟', '來': '来', '霧': '雾', '戀': '恋', '見': '见', '動': '动',
  '譚': '谭', '詠': '咏', '與': '与', '從': '从', '講': '讲', '個': '个',
  '離': '离', '開': '开', '訴': '诉', '隨': '随', '願': '愿', '億': '亿',
  '換': '换', '燈': '灯', '變': '变', '鬧': '闹', '裡': '里', '覓': '觅',
  '覺': '觉', '緒': '绪', '漲': '涨'
};

const foldHan = (value) => Array.from(String(value || ''), (character) => (
  HAN_FOLD[character] || character
)).join('');

export const normalizeMusicKey = (value) => foldHan(String(value || '').normalize('NFKC'))
  .toLocaleLowerCase('zh-CN')
  .replace(/[《》〈〉「」『』【】（）()·•\s_\-—–:：'".,，。!?！？]/g, '');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const catalogAlbums = (catalog) => (Array.isArray(catalog?.albums) ? catalog.albums : [])
  .map((album) => ({
    name: String(album?.name || ''),
    tracks: Array.isArray(album?.tracks) ? album.tracks : []
  }));

const findAlbum = (albums, targetName) => {
  const target = normalizeMusicKey(targetName);
  if (!target) return null;

  const exact = albums.find((album) => normalizeMusicKey(album.name) === target);
  if (exact) return exact;

  return albums.find((album) => {
    const candidate = normalizeMusicKey(album.name);
    return candidate.length >= 3 && (candidate.includes(target) || target.includes(candidate));
  }) || null;
};

const findTrack = (albums, entry) => {
  const title = normalizeMusicKey(entry.title);
  if (!title) return null;

  const preferredAlbum = entry.album ? findAlbum(albums, entry.album) : null;
  const searchAlbums = preferredAlbum ? [preferredAlbum] : albums;

  for (const album of searchAlbums) {
    const exact = album.tracks.find((track) => normalizeMusicKey(track?.title || track?.fileName) === title);
    if (exact) return exact;
  }

  for (const album of searchAlbums) {
    const partial = album.tracks.find((track) => {
      const candidate = normalizeMusicKey(track?.title || track?.fileName);
      return candidate.length >= 2 && (candidate.includes(title) || title.includes(candidate));
    });
    if (partial) return partial;
  }

  return null;
};

export function createRuntimePlayabilityResolver({ root }) {
  if (!root) throw new Error('RuntimePlayabilityResolver requires a root path.');

  const configPath = join(root, 'data/music/catalog.json');
  const runtimeDir = join(root, 'data/music/runtime');
  let configPromise = null;
  const runtimeCache = new Map();

  const loadConfig = () => {
    configPromise ??= readJson(configPath);
    return configPromise;
  };

  const loadRuntime = async (prefix) => {
    if (!runtimeCache.has(prefix)) {
      runtimeCache.set(prefix, readJson(join(runtimeDir, `${prefix}.json`)).catch(() => null));
    }
    return runtimeCache.get(prefix);
  };

  return async (entry) => {
    const config = await loadConfig();
    const prefix = config?.artists?.[entry.artistId]?.prefix;
    if (!prefix) return false;

    const runtime = await loadRuntime(prefix);
    if (!runtime || runtime.artistPrefix !== prefix) return false;

    return Boolean(findTrack(catalogAlbums(runtime), entry));
  };
}
