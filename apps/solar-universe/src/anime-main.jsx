import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AnimeApp from './AnimeApp.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AnimeApp />
  </StrictMode>
);
