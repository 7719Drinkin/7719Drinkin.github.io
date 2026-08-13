(() => {
  const LUCIDE_CDN = 'https://unpkg.com/lucide@1.27.0/dist/umd/lucide.js';
  const ACTIVATION_DURATION = 760;

  const PLAYER_STATE_CSS = `
    .site-music-player {
      transition:
        width var(--player-motion-duration) var(--player-motion-easing),
        height var(--player-motion-duration) var(--player-motion-easing),
        grid-template-columns var(--player-motion-duration) var(--player-motion-easing),
        gap var(--player-motion-duration) var(--player-motion-easing),
        padding var(--player-motion-duration) var(--player-motion-easing),
        border-radius var(--player-motion-duration) var(--player-motion-easing),
        box-shadow var(--player-motion-duration) ease,
        border-color .42s ease,
        opacity .46s ease,
        transform .58s cubic-bezier(.16, 1, .3, 1);
    }

    .site-music-player:not(.is-mounted) {
      opacity: 0;
      transform: translateY(14px) scale(.985);
      pointer-events: none;
    }

    .site-music-player.is-mounted {
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    .site-music-player.is-idle {
      border-color: color-mix(in srgb, var(--artist-accent) 20%, rgba(255,255,255,.1));
      box-shadow: 0 14px 42px rgba(0,0,0,.3);
      opacity: .78;
    }

    .site-music-player.is-idle:hover {
      opacity: .96;
      border-color: color-mix(in srgb, var(--artist-accent) 34%, rgba(255,255,255,.13));
    }

    .site-music-player.is-idle .site-player-cover {
      filter: saturate(.58) brightness(.88);
      animation: none;
    }

    .site-music-player.is-idle .site-player-toggle,
    .site-music-player.is-idle .site-player-expand {
      opacity: .38;
      cursor: default;
      box-shadow: none;
    }

    .site-music-player.is-idle .site-player-copy strong {
      color: color-mix(in srgb, var(--artist-fg) 76%, transparent);
    }

    .site-music-player.is-idle .site-player-copy small {
      color: color-mix(in srgb, var(--music-muted) 82%, transparent);
    }

    .site-music-player button:disabled,
    .site-music-player input:disabled {
      cursor: default;
      pointer-events: none;
    }

    .site-music-player.is-activating .site-player-copy {
      animation: player-copy-activate .58s cubic-bezier(.16, 1, .3, 1) both;
    }

    .site-music-player.is-activating .site-player-cover {
      animation: player-cover-activate .7s cubic-bezier(.16, 1, .3, 1) both;
    }

    @keyframes player-copy-activate {
      0% { opacity: .26; transform: translateY(4px); }
      100% { opacity: 1; transform: translateY(0); }
    }

    @keyframes player-cover-activate {
      0% { filter: saturate(.58) brightness(.88); transform: scale(.94); }
      100% { filter: none; transform: scale(1); }
    }

    @media (prefers-reduced-motion: reduce) {
      .site-music-player:not(.is-mounted),
      .site-music-player.is-mounted {
        opacity: 1;
        transform: none;
      }

      .site-music-player.is-activating .site-player-copy,
      .site-music-player.is-activating .site-player-cover {
        animation: none;
      }
    }
  `;

  const installPlayerStateStyles = () => {
    if (document.querySelector('style[data-player-state-styles]')) return;
    const style = document.createElement('style');
    style.dataset.playerStateStyles = '';
    style.textContent = PLAYER_STATE_CSS;
    document.head.append(style);
  };

  const loadLucide = () => {
    if (window.lucide?.createIcons) return Promise.resolve(true);

    return new Promise((resolve) => {
      const existing = document.querySelector('script[data-lucide-player-icons]');
      if (existing) {
        existing.addEventListener('load', () => resolve(Boolean(window.lucide?.createIcons)), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = LUCIDE_CDN;
      script.async = true;
      script.dataset.lucidePlayerIcons = '';
      script.addEventListener('load', () => resolve(Boolean(window.lucide?.createIcons)), { once: true });
      script.addEventListener('error', () => resolve(false), { once: true });
      document.head.append(script);
    });
  };

  class MusicPlayer {
    constructor(root, rows) {
      this.root = root;
      this.rows = rows;
      this.audio = root.querySelector('[data-player-audio]');
      this.stateLabel = root.querySelector('.site-player-copy > span');
      this.title = root.querySelector('[data-player-title]');
      this.artist = root.querySelector('[data-player-artist]');
      this.album = root.querySelector('[data-player-album]');
      this.cover = root.querySelector('.site-player-cover');
      this.toggle = root.querySelector('[data-player-toggle]');
      this.previous = root.querySelector('[data-player-prev]');
      this.next = root.querySelector('[data-player-next]');
      this.seek = root.querySelector('[data-player-seek]');
      this.volume = root.querySelector('[data-player-volume]');
      this.volumeIcon = root.querySelector('.site-player-volume > span');
      this.current = root.querySelector('[data-player-current]');
      this.duration = root.querySelector('[data-player-duration]');
      this.status = root.querySelector('[data-player-status]');
      this.expand = root.querySelector('[data-player-expand]');
      this.activeIndex = -1;
      this.seeking = false;
      this.activationTimer = null;
      this.coverFallbackText = this.cover?.textContent?.trim() || '';

      installPlayerStateStyles();
      this.prepareIcons();
      this.bind();
      this.initializeIdleDock();
      this.audio.volume = Number(this.volume.value);

      loadLucide().then((loaded) => {
        if (loaded) this.refreshIcons();
      });
    }

    initializeIdleDock() {
      this.root.classList.add('is-idle');
      this.root.classList.remove('is-mounted');
      this.root.hidden = false;
      this.stateLabel.textContent = 'READY';
      this.title.textContent = '选择一首歌曲';
      this.artist.textContent = '从上方收藏开始播放';
      this.album.textContent = '';
      this.status.textContent = '';
      this.setCollapsed(true);
      this.setControlsEnabled(false);
      this.syncCover();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.root.classList.add('is-mounted');
        });
      });
    }

    setControlsEnabled(enabled) {
      [this.previous, this.toggle, this.next, this.expand].forEach((control) => {
        control.disabled = !enabled;
        control.setAttribute('aria-disabled', String(!enabled));
      });
      this.seek.disabled = !enabled;
      this.volume.disabled = !enabled;
    }

    activateDock() {
      if (!this.root.classList.contains('is-idle')) return;

      this.root.classList.remove('is-idle');
      this.root.classList.add('is-activating');
      this.stateLabel.textContent = 'NOW PLAYING';
      this.setControlsEnabled(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.setCollapsed(false);
        });
      });

      window.clearTimeout(this.activationTimer);
      this.activationTimer = window.setTimeout(() => {
        this.root.classList.remove('is-activating');
      }, ACTIVATION_DURATION);
    }

    formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const minutes = Math.floor(seconds / 60);
      const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${minutes}:${remainder}`;
    }

    syncCover(row = null) {
      if (!this.cover) return;

      const source = row?.dataset.coverSrc || this.root.dataset.defaultCover || '';
      if (!source) return;

      let image = this.cover.querySelector('img[data-player-cover-art]');
      if (!image) {
        this.cover.textContent = '';
        image = document.createElement('img');
        image.dataset.playerCoverArt = '';
        image.alt = '';
        image.decoding = 'async';
        image.draggable = false;
        image.addEventListener('error', () => {
          image.remove();
          this.cover.classList.remove('has-cover-art');
          this.cover.textContent = this.coverFallbackText;
        });
        this.cover.append(image);
      }

      if (image.getAttribute('src') !== source) image.src = source;
      this.cover.classList.add('has-cover-art');
    }

    prepareIcons() {
      this.previous.dataset.playerIcon = 'skip-back';
      this.previous.dataset.playerFallback = '‹';
      this.toggle.dataset.playerIcon = 'play';
      this.toggle.dataset.playerFallback = '▶';
      this.next.dataset.playerIcon = 'skip-forward';
      this.next.dataset.playerFallback = '›';
      this.expand.dataset.playerIcon = 'maximize-2';
      this.expand.dataset.playerFallback = '⌃';

      if (this.volumeIcon) {
        this.volumeIcon.dataset.playerIcon = 'volume-2';
        this.volumeIcon.dataset.playerFallback = 'VOL';
      }

      this.rows.forEach((row) => {
        const action = row.querySelector('.song-row-action');
        if (!action) return;
        action.dataset.playerIcon = 'play';
        action.dataset.playerFallback = '▶';
      });

      this.refreshIcons();
    }

    refreshIcons() {
      const iconHosts = [
        ...this.root.querySelectorAll('[data-player-icon]'),
        ...this.rows.flatMap((row) => [...row.querySelectorAll('[data-player-icon]')])
      ];

      iconHosts.forEach((host) => {
        const name = host.dataset.playerIcon;
        const fallback = host.dataset.playerFallback || '';
        host.innerHTML = window.lucide?.createIcons
          ? `<i data-lucide="${name}" aria-hidden="true"></i>`
          : `<span class="player-icon-fallback" aria-hidden="true">${fallback}</span>`;
      });

      if (window.lucide?.createIcons) {
        window.lucide.createIcons({
          attrs: {
            'stroke-width': 1.9,
            'aria-hidden': 'true'
          }
        });
      }
    }

    setCollapsed(collapsed) {
      this.root.classList.toggle('is-collapsed', collapsed);
      this.expand.setAttribute('aria-expanded', String(!collapsed));
      this.expand.setAttribute('aria-label', collapsed ? '展开播放器' : '收起播放器');
      this.expand.dataset.playerIcon = collapsed ? 'maximize-2' : 'minimize-2';
      this.expand.dataset.playerFallback = collapsed ? '⌃' : '⌄';
      this.refreshIcons();
    }

    setPlayingState(isPlaying) {
      this.toggle.dataset.playerIcon = isPlaying ? 'pause' : 'play';
      this.toggle.dataset.playerFallback = isPlaying ? 'Ⅱ' : '▶';
      this.toggle.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
      this.root.classList.toggle('is-playing', isPlaying);

      this.rows.forEach((row, index) => {
        const active = index === this.activeIndex;
        row.classList.toggle('is-active', active);
        row.classList.toggle('is-playing', active && isPlaying);
        const action = row.querySelector('.song-row-action');
        if (!action) return;
        action.dataset.playerIcon = active && isPlaying ? 'pause' : 'play';
        action.dataset.playerFallback = active && isPlaying ? 'Ⅱ' : '▶';
      });

      this.refreshIcons();
    }

    async selectTrack(index, { autoplay = true, expand = true } = {}) {
      if (!this.rows.length) return;

      this.activeIndex = (index + this.rows.length) % this.rows.length;
      const row = this.rows[this.activeIndex];
      const source = row.dataset.audioSrc;
      const wasIdle = this.root.classList.contains('is-idle');

      this.title.textContent = row.dataset.songTitle || 'Untitled';
      this.artist.textContent = row.dataset.songArtist || '7719 Music';
      this.album.textContent = row.dataset.songAlbum ? ` · ${row.dataset.songAlbum}` : '';
      this.status.textContent = '正在读取音频…';
      this.syncCover(row);

      if (this.audio.dataset.source !== source) {
        this.audio.dataset.source = source;
        this.audio.src = source;
        this.audio.load();
        this.seek.value = '0';
        this.current.textContent = '0:00';
        this.duration.textContent = '0:00';
      }

      if (wasIdle) this.activateDock();
      else if (expand) this.setCollapsed(false);

      this.rows.forEach((item, itemIndex) => {
        item.classList.toggle('is-active', itemIndex === this.activeIndex);
      });

      if (!autoplay) return;

      try {
        await this.audio.play();
        this.status.textContent = '';
      } catch {
        this.status.textContent = '浏览器阻止了自动播放，请再次点击播放按钮。';
        this.setPlayingState(false);
      }
    }

    bind() {
      this.rows.forEach((row, index) => {
        row.addEventListener('click', () => {
          if (index === this.activeIndex && !this.audio.paused) {
            this.audio.pause();
            return;
          }
          if (index === this.activeIndex && this.audio.paused && this.audio.src) {
            this.audio.play().catch(() => {
              this.status.textContent = '音频暂时无法播放，请检查对象地址。';
            });
            return;
          }
          this.selectTrack(index);
        });
      });

      this.toggle.addEventListener('click', () => {
        if (this.activeIndex < 0) return;
        if (this.audio.paused) {
          this.audio.play().catch(() => {
            this.status.textContent = '音频暂时无法播放，请检查对象地址。';
          });
        } else {
          this.audio.pause();
        }
      });

      this.previous.addEventListener('click', () => {
        this.selectTrack(this.activeIndex <= 0 ? this.rows.length - 1 : this.activeIndex - 1, { expand: false });
      });

      this.next.addEventListener('click', () => {
        this.selectTrack(this.activeIndex < 0 ? 0 : this.activeIndex + 1, { expand: false });
      });

      this.expand.addEventListener('click', () => {
        if (this.root.classList.contains('is-idle')) return;
        this.setCollapsed(!this.root.classList.contains('is-collapsed'));
      });

      this.volume.addEventListener('input', () => {
        this.audio.volume = Number(this.volume.value);
        if (this.volumeIcon) {
          const level = Number(this.volume.value);
          this.volumeIcon.dataset.playerIcon = level === 0 ? 'volume-x' : level < 0.45 ? 'volume-1' : 'volume-2';
          this.refreshIcons();
        }
      });

      this.seek.addEventListener('input', () => {
        this.seeking = true;
        if (Number.isFinite(this.audio.duration)) {
          this.current.textContent = this.formatTime((Number(this.seek.value) / 100) * this.audio.duration);
        }
      });

      this.seek.addEventListener('change', () => {
        if (Number.isFinite(this.audio.duration)) {
          this.audio.currentTime = (Number(this.seek.value) / 100) * this.audio.duration;
        }
        this.seeking = false;
      });

      this.audio.addEventListener('loadedmetadata', () => {
        this.duration.textContent = this.formatTime(this.audio.duration);
        this.status.textContent = '';
      });

      this.audio.addEventListener('durationchange', () => {
        this.duration.textContent = this.formatTime(this.audio.duration);
      });

      this.audio.addEventListener('timeupdate', () => {
        this.current.textContent = this.formatTime(this.audio.currentTime);
        if (!this.seeking && Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
          this.seek.value = String((this.audio.currentTime / this.audio.duration) * 100);
        }
      });

      this.audio.addEventListener('play', () => this.setPlayingState(true));
      this.audio.addEventListener('pause', () => this.setPlayingState(false));

      this.audio.addEventListener('ended', () => {
        if (this.rows.length > 1) this.selectTrack(this.activeIndex + 1, { expand: false });
        else this.setPlayingState(false);
      });

      this.audio.addEventListener('waiting', () => {
        this.status.textContent = '正在缓冲…';
      });

      this.audio.addEventListener('canplay', () => {
        this.status.textContent = '';
      });

      this.audio.addEventListener('error', () => {
        this.status.textContent = '音频暂时无法播放，请检查 R2 公共访问、CORS 或对象路径。';
        this.setPlayingState(false);
      });
    }
  }

  const rows = [...document.querySelectorAll('.song-row--playable')];
  const root = document.querySelector('[data-music-player]');
  if (!rows.length || !root) return;

  new MusicPlayer(root, rows);
})();
