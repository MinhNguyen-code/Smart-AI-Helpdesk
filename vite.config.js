import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/frontend/setup.js'],
    include: ['src/**/*.test.jsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    fs: {
      strict: true,
      // The repository also contains backend data and private backups.
      // Serve only frontend entry points, source, public assets and dependencies.
      allow: ['index.html', 'src', 'public', 'node_modules'].map(entry => path.resolve(__dirname, entry)),
      // A custom deny list replaces Vite defaults: retain them and protect
      // backend/work files even if a frontend module accidentally imports one.
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml',
        '**/.git/**', '**/server/**', '**/work/**', '**/.ci-evidence/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
