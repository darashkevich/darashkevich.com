import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [sitemap()],
  site: 'https://darashkevich.com',
  base: '/',
  trailingSlash: 'always',
  // Bind to localhost by default; use `npm run dev:lan` for device/Simple Browser preview.
  server: {
    host: process.env.ASTRO_DEV_HOST === 'true',
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
