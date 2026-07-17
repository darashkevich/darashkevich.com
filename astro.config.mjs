import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/flights')
    })
  ],
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
    },
    build: {
      // Never inline bundled scripts into HTML: the production CSP is
      // script-src 'self' (no 'unsafe-inline'), so inline <script> blocks
      // are silently blocked in prod even though they work in `astro dev`.
      assetsInlineLimit: 0
    }
  },
  build: {
    assets: '_assets'
  }
});
