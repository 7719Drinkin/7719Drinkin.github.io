(() => {
  const player = document.querySelector('[data-persistent-player]');
  const audio = document.querySelector('[data-persistent-audio]');
  const turntable = player?.querySelector('[data-persistent-turntable]');
  const transportToggle = player?.querySelector('[data-persistent-toggle]');

  if (!player || !audio || !turntable || !transportToggle) return;

  const isCollapsed = () => player.classList.contains('is-collapsed');

  const syncTurntableSemantics = () => {
    const interactive = isCollapsed() && !player.hidden;

    if (interactive) {
      turntable.setAttribute('role', 'button');
      turntable.setAttribute('tabindex', '0');
      turntable.setAttribute('aria-label', audio.paused ? '播放' : '暂停');
      return;
    }

    turntable.removeAttribute('role');
    turntable.setAttribute('tabindex', '-1');
    turntable.removeAttribute('aria-label');
  };

  const activateTurntable = () => {
    if (!isCollapsed() || player.hidden) return;
    transportToggle.click();
  };

  turntable.addEventListener('click', activateTurntable);
  turntable.addEventListener('keydown', (event) => {
    if (!isCollapsed()) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activateTurntable();
  });

  audio.addEventListener('play', syncTurntableSemantics);
  audio.addEventListener('pause', syncTurntableSemantics);
  audio.addEventListener('ended', syncTurntableSemantics);

  const observer = new MutationObserver(syncTurntableSemantics);
  observer.observe(player, { attributes: true, attributeFilter: ['class', 'hidden'] });

  syncTurntableSemantics();
})();
