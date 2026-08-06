(() => {
  const cards = [...document.querySelectorAll('.visual-card--video[data-video-embed]')];
  if (!cards.length) return;

  const appendAutoplay = (url) => {
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set('autoplay', '1');
    return parsed.toString();
  };

  cards.forEach((card) => {
    const trigger = card.querySelector('[data-video-play]');
    const stage = card.querySelector('.visual-video-stage');
    if (!trigger || !stage) return;

    trigger.addEventListener('click', () => {
      if (card.classList.contains('is-playing')) return;

      const iframe = document.createElement('iframe');
      iframe.src = appendAutoplay(card.dataset.videoEmbed);
      iframe.title = card.dataset.videoTitle || '外部视频播放器';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.allowFullscreen = true;

      stage.append(iframe);
      card.classList.add('is-playing');
      iframe.focus({ preventScroll: true });
    });
  });
})();
