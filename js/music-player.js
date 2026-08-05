(() => {
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
