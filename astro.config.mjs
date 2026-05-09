import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [sitemap()],
  site: 'https://darashkevich.com',
  base: '/',
  trailingSlash: 'never',
  // Listen on all interfaces so Simple Browser / device preview can connect; Box Drive often breaks native FS watchers.
  server: {
    host: true,
    port: 4321,
    strictPort: false
  },
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000
      }
    }
  },
  build: {
    assets: '_assets'
  }
});
