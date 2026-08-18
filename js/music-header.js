(() => {
  const root = document.documentElement;
  const STORAGE_KEY = '7719-language';

  const readLanguage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'zh') return stored;
    } catch {
      // Keep the static document language when storage is unavailable.
    }

    return root.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  };

  const applyLanguage = (language) => {
    root.dataset.musicLanguage = language === 'en' ? 'en' : 'zh';
  };

  applyLanguage(readLanguage());

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && (event.newValue === 'en' || event.newValue === 'zh')) {
      applyLanguage(event.newValue);
    }
  });

  window.addEventListener('7719:languagechange', (event) => {
    applyLanguage(event.detail?.language);
  });

  document.addEventListener('universe:languagechange', (event) => {
    applyLanguage(event.detail?.language);
  });

  window.MusicHeaderLanguage = {
    apply: applyLanguage,
    getLanguage: readLanguage
  };
})();
