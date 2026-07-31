import { useEffect } from 'react';
import App from './App.jsx';
import { INTERESTS } from './data/interests.js';
import { ANIME_INTEREST } from './data/animeInterest.js';

if (!INTERESTS.some((interest) => interest.id === ANIME_INTEREST.id)) {
  INTERESTS.push(ANIME_INTEREST);
}

function WorldCountSync() {
  useEffect(() => {
    const sync = () => {
      const count = document.querySelector('.system-readout div:first-child strong');
      if (!count) return;
      count.textContent = document.documentElement.dataset.language === 'zh' ? '04 + 恒星' : '04 + STAR';
    };
    const observer = new MutationObserver(() => requestAnimationFrame(sync));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-language'] });
    requestAnimationFrame(sync);
    return () => observer.disconnect();
  }, []);
  return null;
}

export default function AnimeApp() {
  return <><App /><WorldCountSync /></>;
}
