import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  integrations: [sitemap()],
  site: 'https://darashkevich.com',
  base: '/',
  trailingSlash: 'never',
  build: {
    assets: '_assets'
  }
});
