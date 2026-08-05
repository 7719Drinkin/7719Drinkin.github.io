(() => {
  class MusicPlayer {
    constructor(root, rows) {
      this.root = root;
      this.rows = rows;
      this.audio = root.querySelector('[data-player-audio]');
      this.title = root.querySelector('[data-player-title]');
      this.artist = root.querySelector('[data-player-artist]');
      this.album = root.querySelector('[data-player-album]');
      this.toggle = root.querySelector('[data-player-toggle]');
      this.previous = root.querySelector('[data-player-prev]');
      this.next = root.querySelector('[data-player-next]');
      this.seek = root.querySelector('[data-player-seek]');
      this.volume = root.querySelector('[data-player-volume]');
      this.current = root.querySelector('[data-player-current]');
      this.duration = root.querySelector('[data-player-duration]');
      this.status = root.querySelector('[data-player-status]');
      this.expand = root.querySelector('[data-player-expand]');
      this.activeIndex = -1;
      this.seeking = false;
      this.bind();
      this.setCollapsed(true);
      this.audio.volume = Number(this.volume.value);
    }

    formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
      const minutes = Math.floor(seconds / 60);
      const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
      return `${minutes}:${remainder}`;
    }

    setCollapsed(collapsed) {
      this.root.classList.toggle('is-collapsed', collapsed);
      this.expand.setAttribute('aria-expanded', String(!collapsed));
      this.expand.setAttribute('aria-label', collapsed ? '展开播放器' : '收起播放器');
      this.expand.textContent = collapsed ? '⌄' : '⌃';
    }

    setPlayingState(isPlaying) {
      this.toggle.textContent = isPlaying ? 'Ⅱ' : '▶';
      this.toggle.setAttribute('aria-label', isPlaying ? '暂停' : '播放');
      this.root.classList.toggle('is-playing', isPlaying);

      this.rows.forEach((row, index) => {
        const active = index === this.activeIndex;
        row.classList.toggle('is-active', active);
        row.classList.toggle('is-playing', active && isPlaying);
        const action = row.querySelector('.song-row-action');
        if (action) action.textContent = active && isPlaying ? 'Ⅱ' : '▶';
      });
    }

    async selectTrack(index, { autoplay = true, expand = true } = {}) {
      if (!this.rows.length) return;

      this.activeIndex = (index + this.rows.length) % this.rows.length;
      const row = this.rows[this.activeIndex];
      const source = row.dataset.audioSrc;

      this.root.hidden = false;
      this.title.textContent = row.dataset.songTitle || 'Untitled';
      this.artist.textContent = row.dataset.songArtist || '7719 Music';
      this.album.textContent = row.dataset.songAlbum ? ` · ${row.dataset.songAlbum}` : '';
      this.status.textContent = '正在读取音频…';

      if (this.audio.dataset.source !== source) {
        this.audio.dataset.source = source;
        this.audio.src = source;
        this.audio.load();
        this.seek.value = '0';
        this.current.textContent = '0:00';
        this.duration.textContent = '0:00';
      }

      if (expand) this.setCollapsed(false);
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
        if (this.activeIndex < 0) {
          this.selectTrack(0);
          return;
        }
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
        this.setCollapsed(!this.root.classList.contains('is-collapsed'));
      });

      this.volume.addEventListener('input', () => {
        this.audio.volume = Number(this.volume.value);
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
