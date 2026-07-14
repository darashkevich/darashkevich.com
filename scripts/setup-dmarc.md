# DMARC setup for darashkevich.com

Starter policy (monitor-only — does not reject mail):

```
v=DMARC1; p=none; rua=mailto:yahor@darashkevich.com; fo=1
```

## Apply via script (preferred)

1. Create a Cloudflare API token with **Zone → DNS → Edit** for `darashkevich.com`.
2. Export and run:

```bash
export CLOUDFLARE_API_TOKEN=...   # optional: CLOUDFLARE_ZONE_ID=...
./scripts/setup-dmarc.sh
```

## Apply in Cloudflare Dashboard

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) → select **darashkevich.com** → **DNS** → **Records**.
2. Add a **TXT** record:
   - **Name:** `_dmarc`
   - **Content:** `v=DMARC1; p=none; rua=mailto:yahor@darashkevich.com; fo=1`
   - **TTL:** Auto (or 1 hour)
3. Save, then verify:

```bash
dig +short TXT _dmarc.darashkevich.com
```

## After `p=none` reports look clean

Tighten gradually (weeks apart), only once SPF/DKIM are correct for sending domains:

1. `p=none` (current) → review aggregate reports at `yahor@darashkevich.com`
2. `p=quarantine; pct=10` → increase `pct`
3. `p=reject` when legitimate mail is consistently authenticated

Also confirm SPF and DKIM exist for the hosts that send mail as `@darashkevich.com` (Google Workspace, transactional providers, etc.).
