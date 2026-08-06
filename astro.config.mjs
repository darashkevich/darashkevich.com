import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const SITE = 'https://darashkevich.com';

/** Public URL → source page used for lastmod. */
const PAGE_SOURCES = {
  [`${SITE}/`]: 'src/pages/index.astro',
  [`${SITE}/resume/`]: 'src/pages/resume.astro',
  [`${SITE}/privacy-policy/`]: 'src/pages/privacy-policy.astro',
  [`${SITE}/terms-of-service/`]: 'src/pages/terms-of-service.astro',
  [`${SITE}/accessibility/`]: 'src/pages/accessibility.astro'
};

function pageLastmod(sourcePath) {
  if (!sourcePath || !existsSync(sourcePath)) return undefined;
  try {
    const iso = execFileSync('git', ['log', '-1', '--format=%cI', '--', sourcePath], {
      encoding: 'utf8'
    }).trim();
    if (iso) return new Date(iso);
  } catch {
    // Fall through to mtime when git history is unavailable.
  }
  return statSync(sourcePath).mtime;
}

const pageLastmods = Object.fromEntries(
  Object.entries(PAGE_SOURCES).map(([url, source]) => [url, pageLastmod(source)])
);

const newestLastmod = Object.values(pageLastmods)
  .filter(Boolean)
  .reduce((latest, date) => (!latest || date > latest ? date : latest), undefined);

export default defineConfig({
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/flights'),
      // No priority/changefreq — search engines largely ignore them.
      lastmod: newestLastmod,
      namespaces: {
        news: false,
        xhtml: false,
        image: false,
        video: false
      },
      serialize(item) {
        const lastmod = pageLastmods[item.url];
        return {
          url: item.url,
          ...(lastmod ? { lastmod } : {})
        };
      }
    })
  ],
  site: SITE,
  base: '/',
  trailingSlash: 'always',
  // Astro 7's default "jsx" whitespace collapsing turns "in <a>" into "in<a>".
  compressHTML: false,
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
