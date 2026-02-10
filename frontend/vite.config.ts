import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BASE = '/frontend-publish-management';

export default defineConfig({
  plugins: [react()],
  base: BASE + '/',
  server: {
    host: '0.0.0.0',
    proxy: {
      [BASE + '/api']: {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
