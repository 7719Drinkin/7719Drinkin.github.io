import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH || '/solar-universe/';

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^\.\.\/basketball\/BasketballRefinements\.jsx$/,
        replacement: fileURLToPath(
          new URL('./src/basketball/BasketballRefinementsActive.jsx', import.meta.url)
        )
      }
    ]
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    target: 'es2022'
  }
});
