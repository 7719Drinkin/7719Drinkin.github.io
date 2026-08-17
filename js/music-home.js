const HOME_DATA_URL = '/data/music/home.json';
const DEFAULT_QUOTES = ['只是狂歌一曲，恍惚间就化入无穷'];

const TYPE_DELAY_MS = 120;
const DELETE_DELAY_MS = 50;
const HOLD_DELAY_MS = 1500;
const BETWEEN_QUOTES_MS = 280;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const loadHeroQuotes = async () => {
  try {
    const response = await fetch(HOME_DATA_URL, {
      credentials: 'same-origin',
      cache: 'force-cache',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error(`Music home data ${response.status}`);

    const data = await response.json();
    const quotes = Array.isArray(data?.heroQuotes)
      ? data.heroQuotes.map((value) => String(value || '').trim()).filter(Boolean)
      : [];

    return quotes.length ? quotes : DEFAULT_QUOTES;
  } catch {
    return DEFAULT_QUOTES;
  }
};

const initHeroTypewriter = async () => {
  const root = document.querySelector('[data-music-hero-quote]');
  const textNode = root?.querySelector('[data-music-hero-quote-text]');
  if (!root || !textNode) return;

  const fallbackQuote = textNode.textContent?.trim() || DEFAULT_QUOTES[0];
  if (!reducedMotion.matches) textNode.textContent = '';

  const quotes = await loadHeroQuotes();
  const firstQuote = quotes[0] || fallbackQuote;

  if (reducedMotion.matches) {
    textNode.textContent = firstQuote;
    root.dataset.quoteIndex = '0';
    root.setAttribute('aria-label', firstQuote);
    return;
  }

  let quoteIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  let timer = 0;

  const write = () => {
    const quote = quotes[quoteIndex] || firstQuote;
    const characters = Array.from(quote);

    characterIndex = deleting
      ? Math.max(0, characterIndex - 1)
      : Math.min(characters.length, characterIndex + 1);

    textNode.textContent = characters.slice(0, characterIndex).join('');
    root.dataset.quoteIndex = String(quoteIndex);

    if (!deleting && characterIndex === characters.length) {
      root.setAttribute('aria-label', quote);
      if (quotes.length === 1) return;

      timer = window.setTimeout(() => {
        deleting = true;
        write();
      }, HOLD_DELAY_MS);
      return;
    }

    if (deleting && characterIndex === 0) {
      deleting = false;
      quoteIndex = (quoteIndex + 1) % quotes.length;
      root.setAttribute('aria-label', quotes[quoteIndex]);
      timer = window.setTimeout(write, BETWEEN_QUOTES_MS);
      return;
    }

    timer = window.setTimeout(write, deleting ? DELETE_DELAY_MS : TYPE_DELAY_MS);
  };

  root.setAttribute('aria-label', firstQuote);
  timer = window.setTimeout(write, 260);
  window.addEventListener('pagehide', () => window.clearTimeout(timer), { once: true });
};

const restoreFallbackRecord = () => {
  const stage = document.querySelector('[data-music-gramophone]');
  if (!stage) return;

  stage.classList.remove(
    'collection-gramophone-stage',
    'is-loading',
    'is-ready',
    'is-error'
  );
  stage.removeAttribute('data-music-gramophone');
  stage.setAttribute('aria-hidden', 'true');

  stage.querySelector('[data-gramophone-canvas]')?.remove();
  stage.querySelector('.collection-gramophone-credit')?.remove();

  const fallback = stage.querySelector('.collection-gramophone-fallback');
  if (fallback) fallback.replaceWith(...fallback.children);
};

restoreFallbackRecord();
initHeroTypewriter();
