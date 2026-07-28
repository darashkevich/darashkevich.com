# CAA records for darashkevich.com (Cloudflare Universal SSL)

Primary hosting is Cloudflare Workers Static Assets. Universal SSL issues
certificates via **Let’s Encrypt** and **Google Trust Services** — not a
Netlify-scoped Let’s Encrypt `accounturi`.

## Apply via script (preferred)

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone → DNS → Edit
./scripts/setup-caa.sh
```

The script publishes:

- `0 issue "letsencrypt.org"`
- `0 issue "pki.goog;cansignhttpexchanges=yes"`

## Apply in Cloudflare Dashboard

1. **DNS** → **Records** → remove any apex CAA still bound to a Netlify
   `accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/…`
2. **Add record** → type **CAA**, **Name:** `@`, **Tag:** `issue`
3. Value: `letsencrypt.org` (flags `0`)
4. Add a second `issue` record for `pki.goog;cansignhttpexchanges=yes`
5. Save. See [Cloudflare CAA docs](https://developers.cloudflare.com/ssl/edge-certificates/caa-records/).

## Verify

```bash
dig +short CAA darashkevich.com
```

Expect `letsencrypt.org` and `pki.goog` `issue` values (no Netlify-only accounturi).

## Caution

Wrong CAA breaks certificate renewal. If HTTPS provisioning fails after this
change, remove the CAA records or fix the values, then wait for Cloudflare
Universal SSL to re-issue.
