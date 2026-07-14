# Search Console & Bing Webmaster verification

Hooks are wired in code. **Do not invent verification codes** — only paste values provided by Google/Bing.

## Env vars (Netlify)

| Variable | Purpose |
| --- | --- |
| `PUBLIC_GOOGLE_SITE_VERIFICATION` | Injects `<meta name="google-site-verification" …>` |
| `PUBLIC_BING_SITE_VERIFICATION` | Injects `<meta name="msvalidate.01" …>` and emits `/BingSiteAuth.xml` at build |

IndexNow key file is already published at the site root (`74f2c7e9b54140a790f7dc6ab2f9d3e1.txt`).

### Set on Netlify

1. [Netlify](https://app.netlify.com/) → **stalwart-profiterole-ca3dd0** → **Site configuration** → **Environment variables**
2. Add both `PUBLIC_*` vars (All scopes / Production + Deploy Previews)
3. Redeploy production (`./scripts/deploy-production.sh` or trigger Deploy)

Locally you can put the same keys in `.env` (gitignored).

## Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console) → **Add property** → URL prefix `https://darashkevich.com`
2. Choose **HTML tag** verification
3. Copy only the `content="…"` value (not the whole tag)
4. Set `PUBLIC_GOOGLE_SITE_VERIFICATION` to that value and redeploy
5. Click **Verify** in Search Console
6. Submit sitemap: `https://darashkevich.com/sitemap-index.xml`

## Bing Webmaster Tools

1. Open [Bing Webmaster Tools](https://www.bing.com/webmasters) → **Add a site** → `https://darashkevich.com`
2. Prefer **Import from Google Search Console** after GSC is verified, **or** use meta / XML file verification
3. For meta/XML: copy the Bing code and set `PUBLIC_BING_SITE_VERIFICATION`, then redeploy
4. Confirm `https://darashkevich.com/BingSiteAuth.xml` returns your user code after deploy
5. Submit the same sitemap URL
