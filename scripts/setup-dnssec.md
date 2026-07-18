# Enable DNSSEC for darashkevich.com

Cloudflare is already the authoritative DNS (`mira` / `todd`). Enabling DNSSEC publishes DS to the parent; no separate registrar glue is needed while nameservers stay on Cloudflare.

## Apply via script (preferred)

1. Cloudflare API token with permission to edit DNSSEC for the zone (Zone DNS Edit, or the DNSSEC template).
2. Export and run:

```bash
export CLOUDFLARE_API_TOKEN=...
./scripts/setup-dnssec.sh
```

## Apply in Cloudflare Dashboard

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **darashkevich.com** → **DNS** → **Settings** (or **DNSSEC**).
2. Enable **DNSSEC**.
3. Confirm status becomes **Active**.

## Verify

```bash
dig +short DS darashkevich.com
dig +dnssec darashkevich.com SOA +multiline
```

Expect a `DS` record and DNSSEC-related flags once propagation completes.
