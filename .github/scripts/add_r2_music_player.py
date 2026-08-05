from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / "scripts/build-music-pages.mjs"
DETAIL = ROOT / "data/music/artists/zhang-yusheng.json"
PLAYER_JS = ROOT / "js/music-player.js"
PLAYER_CSS = ROOT / "css/music-player.css"

AUDIO_URL = (
    "https://pub-87d3791e454e4672b255abea93cc2968.r2.dev/"
    "tom-chang/%E5%BC%A0%E9%9B%A8%E7%94%9F%20-%20"
    "%E5%A6%82%E6%9E%9C%E4%BD%A0%E8%A6%81%E9%9B%A2%E9%96%8B%E6%88%91.mp3"
)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one {label} block, found {count}.")
    return text.replace(old, new, 1)


def update_detail() -> None:
    detail = json.loads(DETAIL.read_text(encoding="utf-8"))
    songs = detail.setdefault("selectedSongs", [])
    song = {
        "title": "如果你要離開我",
        "album": None,
        "year": None,
        "note": "第一首接入本站播放器的张雨生收藏。",
        "audio": {
            "src": AUDIO_URL,
            "type": "audio/mpeg",
        },
    }

    existing = next((item for item in songs if item.get("title") == song["title"]), None)
    if existing:
        existing.update(song)
    else:
        songs.insert(0, song)

    DETAIL.write_text(
        json.dumps(detail, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def update_generator() -> None:
    text = GENERATOR.read_text(encoding="utf-8")

    stylesheet = '  <link rel="stylesheet" href="/css/music.css?v=20260805-1">'
    if "/css/music-player.css" not in text:
        text = text.replace(
            stylesheet,
            stylesheet + '\n  <link rel="stylesheet" href="/css/music-player.css?v=20260805-1">',
        )

    old_render = '''function renderSongs(songs = []) {
  if (!songs.length) {
    return `<div class="artist-empty"><span>SELECTED SONGS</span><p>精选歌曲将在后续整理后加入。</p></div>`;
  }
  return songs.map((song, index) => {
    const meta = [song.album, song.year].filter(Boolean).join(' · ') || 'COLLECTION NOTE';
    const content = `
      <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(song.title)}</h3><p>${escapeHtml(meta)}</p></div>
      <small>${escapeHtml(song.note ?? '')}</small>`;
    return song.url
      ? `<a class="song-row" href="${escapeHtml(song.url)}" target="_blank" rel="noreferrer">${content}<b>↗</b></a>`
      : `<article class="song-row">${content}<b>—</b></article>`;
  }).join('');
}'''

    new_render = '''function renderSongs(songs = [], artistName = '') {
  if (!songs.length) {
    return `<div class="artist-empty"><span>SELECTED SONGS</span><p>精选歌曲将在后续整理后加入。</p></div>`;
  }
  return songs.map((song, index) => {
    const meta = [song.album, song.year].filter(Boolean).join(' · ') || 'COLLECTION NOTE';
    const content = `
      <span class="song-index">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(song.title)}</h3><p>${escapeHtml(meta)}</p></div>
      <small>${escapeHtml(song.note ?? '')}</small>`;

    if (song.audio?.src) {
      return `<button class="song-row song-row--playable" type="button"
        data-audio-src="${escapeHtml(song.audio.src)}"
        data-audio-type="${escapeHtml(song.audio.type ?? 'audio/mpeg')}"
        data-song-title="${escapeHtml(song.title)}"
        data-song-artist="${escapeHtml(artistName)}"
        data-song-album="${escapeHtml(song.album ?? '')}"
        aria-label="播放 ${escapeHtml(song.title)}">${content}<b class="song-row-action" aria-hidden="true">▶</b></button>`;
    }

    return song.url
      ? `<a class="song-row" href="${escapeHtml(song.url)}" target="_blank" rel="noreferrer">${content}<b>↗</b></a>`
      : `<article class="song-row">${content}<b>—</b></article>`;
  }).join('');
}'''

    if "song-row--playable" not in text:
        text = replace_once(text, old_render, new_render, "renderSongs")

    text = text.replace(
        "${renderSongs(detail.selectedSongs)}",
        "${renderSongs(detail.selectedSongs, nameEn)}",
    )
    text = text.replace(
        "这里记录个人选择与聆听印象，不提供站内音频托管。",
        "音频文件由外部对象存储提供，并通过本站播放器进行播放。",
    )

    player_markup = '''
  <aside class="site-music-player" data-music-player hidden aria-label="网站音乐播放器">
    <audio data-player-audio preload="metadata"></audio>
    <div class="site-player-track">
      <span class="site-player-label">NOW PLAYING</span>
      <strong data-player-title>尚未选择歌曲</strong>
      <small><span data-player-artist>7719 Music</span><span data-player-album></span></small>
    </div>
    <div class="site-player-center">
      <div class="site-player-buttons">
        <button type="button" data-player-prev aria-label="上一首">‹</button>
        <button class="site-player-toggle" type="button" data-player-toggle aria-label="播放">▶</button>
        <button type="button" data-player-next aria-label="下一首">›</button>
      </div>
      <div class="site-player-progress">
        <time data-player-current>0:00</time>
        <input data-player-seek type="range" min="0" max="100" value="0" step="0.1" aria-label="播放进度">
        <time data-player-duration>0:00</time>
      </div>
      <p class="site-player-status" data-player-status aria-live="polite"></p>
    </div>
    <div class="site-player-volume">
      <span aria-hidden="true">VOL</span>
      <input data-player-volume type="range" min="0" max="1" value="0.8" step="0.05" aria-label="音量">
      <button type="button" data-player-close aria-label="收起播放器">×</button>
    </div>
  </aside>
'''

    footer_anchor = '''  </main>

  <footer class="universe-footer">
    <a href="/music/">← MUSIC DIRECTORY</a>'''
    if "data-music-player" not in text:
        text = replace_once(
            text,
            footer_anchor,
            "  </main>\n" + player_markup + '''
  <footer class="universe-footer">
    <a href="/music/">← MUSIC DIRECTORY</a>''',
            "artist player mount",
        )

    script_tag = '  <script src="/js/music.js?v=20260805-1"></script>'
    if "/js/music-player.js" not in text:
        text = text.replace(
            script_tag,
            script_tag + '\n  <script src="/js/music-player.js?v=20260805-1"></script>',
        )

    GENERATOR.write_text(text, encoding="utf-8")


def write_player_js() -> None:
    PLAYER_JS.write_text(r'''(() => {
  const rows = [...document.querySelectorAll('.song-row--playable')];
  const player = document.querySelector('[data-music-player]');
  if (!rows.length || !player) return;

  const audio = player.querySelector('[data-player-audio]');
  const title = player.querySelector('[data-player-title]');
  const artist = player.querySelector('[data-player-artist]');
  const album = player.querySelector('[data-player-album]');
  const toggle = player.querySelector('[data-player-toggle]');
  const previous = player.querySelector('[data-player-prev]');
  const next = player.querySelector('[data-player-next]');
  const seek = player.querySelector('[data-player-seek]');
  const volume = player.querySelector('[data-player-volume]');
  const current = player.querySelector('[data-player-current]');
  const duration = player.querySelector('[data-player-duration]');
  const status = player.querySelector('[data-player-status]');
  const close = player.querySelector('[data-player-close]');

  let activeIndex = -1;
  let seeking = false;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  };

  const setPlayingState = (isPlaying) => {
    toggle.textContent = isPlaying ? 'Ⅱ' : '▶';
    toggle.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
    player.classList.toggle('is-playing', isPlaying);
    rows.forEach((row, index) => {
      const active = index === activeIndex;
      row.classList.toggle('is-active', active);
      row.classList.toggle('is-playing', active && isPlaying);
      const action = row.querySelector('.song-row-action');
      if (action) action.textContent = active && isPlaying ? 'Ⅱ' : '▶';
    });
  };

  const selectTrack = async (index, shouldPlay = true) => {
    if (!rows.length) return;
    activeIndex = (index + rows.length) % rows.length;
    const row = rows[activeIndex];
    const source = row.dataset.audioSrc;

    player.hidden = false;
    title.textContent = row.dataset.songTitle || 'Untitled';
    artist.textContent = row.dataset.songArtist || '7719 Music';
    album.textContent = row.dataset.songAlbum ? ` · ${row.dataset.songAlbum}` : '';
    status.textContent = '正在读取音频…';

    if (audio.src !== source) {
      audio.src = source;
      audio.load();
      seek.value = '0';
      current.textContent = '0:00';
      duration.textContent = '0:00';
    }

    rows.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === activeIndex));

    if (!shouldPlay) return;
    try {
      await audio.play();
      status.textContent = '';
    } catch (error) {
      status.textContent = '浏览器阻止了自动播放，请再次点击播放按钮。';
      setPlayingState(false);
    }
  };

  rows.forEach((row, index) => {
    row.addEventListener('click', () => {
      if (index === activeIndex && !audio.paused) {
        audio.pause();
        return;
      }
      if (index === activeIndex && audio.paused && audio.src) {
        audio.play().catch(() => {
          status.textContent = '音频暂时无法播放，请检查 R2 公共访问和对象路径。';
        });
        return;
      }
      selectTrack(index);
    });
  });

  toggle.addEventListener('click', () => {
    if (activeIndex < 0) {
      selectTrack(0);
      return;
    }
    if (audio.paused) {
      audio.play().catch(() => {
        status.textContent = '音频暂时无法播放，请检查 R2 公共访问和对象路径。';
      });
    } else {
      audio.pause();
    }
  });

  previous.addEventListener('click', () => selectTrack(activeIndex <= 0 ? rows.length - 1 : activeIndex - 1));
  next.addEventListener('click', () => selectTrack(activeIndex < 0 ? 0 : activeIndex + 1));

  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value);
  });
  audio.volume = Number(volume.value);

  seek.addEventListener('input', () => {
    seeking = true;
    if (Number.isFinite(audio.duration)) {
      current.textContent = formatTime((Number(seek.value) / 100) * audio.duration);
    }
  });
  seek.addEventListener('change', () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    }
    seeking = false;
  });

  close.addEventListener('click', () => {
    player.hidden = true;
  });

  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = formatTime(audio.duration);
    status.textContent = '';
  });
  audio.addEventListener('durationchange', () => {
    duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', () => {
    current.textContent = formatTime(audio.currentTime);
    if (!seeking && Number.isFinite(audio.duration) && audio.duration > 0) {
      seek.value = String((audio.currentTime / audio.duration) * 100);
    }
  });
  audio.addEventListener('play', () => setPlayingState(true));
  audio.addEventListener('pause', () => setPlayingState(false));
  audio.addEventListener('ended', () => {
    if (rows.length > 1) selectTrack(activeIndex + 1);
    else setPlayingState(false);
  });
  audio.addEventListener('waiting', () => {
    status.textContent = '正在缓冲…';
  });
  audio.addEventListener('canplay', () => {
    status.textContent = '';
  });
  audio.addEventListener('error', () => {
    status.textContent = '音频暂时无法播放，请检查 R2 公共访问、CORS 或对象路径。';
    setPlayingState(false);
  });
})();
''', encoding="utf-8")


def write_player_css() -> None:
    PLAYER_CSS.write_text(r'''.music-artist-page {
  padding-bottom: 118px;
}

.song-row--playable {
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--music-line);
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.song-row--playable.is-active {
  background: color-mix(in srgb, var(--artist-accent) 11%, transparent);
  box-shadow: inset 3px 0 0 var(--artist-accent);
}

.song-row--playable:focus-visible {
  outline: 2px solid var(--artist-accent);
  outline-offset: -2px;
}

.song-row-action {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--artist-accent) 55%, transparent);
  border-radius: 50%;
  font-size: 11px;
}

.site-music-player {
  position: fixed;
  right: 18px;
  bottom: 18px;
  left: 18px;
  z-index: 80;
  display: grid;
  min-height: 96px;
  grid-template-columns: minmax(220px, 0.75fr) minmax(360px, 1.3fr) minmax(170px, 0.45fr);
  align-items: center;
  gap: 26px;
  padding: 16px 20px;
  border: 1px solid color-mix(in srgb, var(--artist-accent) 40%, rgba(255, 255, 255, 0.18));
  background: color-mix(in srgb, var(--artist-bg) 90%, black);
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.48);
  backdrop-filter: blur(24px);
}

.site-music-player[hidden] {
  display: none;
}

.site-player-track {
  min-width: 0;
}

.site-player-label {
  color: var(--artist-accent);
  font-family: "DM Mono", monospace;
  font-size: 9px;
  letter-spacing: 0.18em;
}

.site-player-track strong {
  display: block;
  overflow: hidden;
  margin-top: 7px;
  font-size: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-player-track small {
  display: block;
  overflow: hidden;
  margin-top: 5px;
  color: var(--music-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-player-center {
  display: grid;
  gap: 9px;
}

.site-player-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.site-player-buttons button,
.site-player-volume button {
  display: grid;
  width: 34px;
  height: 34px;
  padding: 0;
  place-items: center;
  border: 1px solid var(--music-line);
  border-radius: 50%;
  color: var(--artist-fg);
  background: transparent;
  cursor: pointer;
}

.site-player-buttons .site-player-toggle {
  width: 42px;
  height: 42px;
  border-color: var(--artist-accent);
  color: var(--artist-bg);
  background: var(--artist-accent);
  font-size: 13px;
}

.site-player-progress {
  display: grid;
  grid-template-columns: 42px minmax(120px, 1fr) 42px;
  align-items: center;
  gap: 10px;
}

.site-player-progress time,
.site-player-volume span {
  color: var(--music-muted);
  font-family: "DM Mono", monospace;
  font-size: 9px;
}

.site-music-player input[type="range"] {
  width: 100%;
  accent-color: var(--artist-accent);
  cursor: pointer;
}

.site-player-status {
  min-height: 14px;
  margin: 0;
  color: var(--music-muted);
  font-size: 10px;
  text-align: center;
}

.site-player-volume {
  display: grid;
  grid-template-columns: auto minmax(70px, 1fr) 34px;
  align-items: center;
  gap: 10px;
}

@media (max-width: 900px) {
  .music-artist-page {
    padding-bottom: 170px;
  }

  .site-music-player {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
  }

  .site-player-center {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .site-player-volume {
    grid-template-columns: 34px;
  }

  .site-player-volume > span,
  .site-player-volume > input {
    display: none;
  }
}

@media (max-width: 560px) {
  .music-artist-page {
    padding-bottom: 190px;
  }

  .site-music-player {
    right: 8px;
    bottom: 8px;
    left: 8px;
    padding: 13px;
  }

  .site-player-track strong {
    font-size: 16px;
  }

  .site-player-progress {
    grid-template-columns: 36px minmax(80px, 1fr) 36px;
    gap: 6px;
  }
}
''', encoding="utf-8")


def main() -> None:
    update_detail()
    update_generator()
    write_player_js()
    write_player_css()
    print("R2-backed site music player files prepared.")


if __name__ == "__main__":
    main()
