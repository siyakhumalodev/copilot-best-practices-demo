import { defineConfig, mergeConfig } from 'vite';
import shared from '../vite.config';

// Test-only proxy to the API owned by the isolated Playwright run.
export default mergeConfig(shared, defineConfig({
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5180',
      '/health': 'http://localhost:5180',
    },
  },
}));
