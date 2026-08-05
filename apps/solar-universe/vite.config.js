import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const base = process.env.VITE_BASE_PATH || '/solar-universe/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: process.env.VITE_SOURCEMAP === 'true',
    target: 'es2022',
    modulePreload: {
      resolveDependencies: (_filename, dependencies, context) => (
        context.hostType === 'html' ? [] : dependencies
      )
    }
  }
});
