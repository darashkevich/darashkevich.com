# DNS / TLS hardening — darashkevich.com

Ops checklist from the site security review. Headers live in `netlify.toml`; DNS is Cloudflare.

| Control | Status (as of 2026-07-18) | Next step |
| --- | --- | --- |
| TLS / HSTS header | Live (`max-age=31536000; includeSubDomains; preload`) | Keep |
| HSTS preload list | **Pending** at [hstspreload.org](https://hstspreload.org/?domain=darashkevich.com) | Monitor until Chromium shows accepted |
| SPF | Live (`v=spf1 include:icloud.com ~all`) | Keep aligned with senders |
| DMARC | Live `p=none` + RUA to `yahor@darashkevich.com` | Review aggregates, then quarantine → reject ([setup-dmarc.md](../scripts/setup-dmarc.md)) |
| DNSSEC | No public DS yet | Enable in Cloudflare ([setup-dnssec.md](../scripts/setup-dnssec.md)) |
| CAA | Cloudflare Universal SSL issuers | Keep `letsencrypt.org` + `pki.goog` ([setup-caa.md](../scripts/setup-caa.md)); do not use Netlify-only `accounturi` |
| CSP | Site-wide baseline; map tile CDNs only on `/flights` | Keep map allowlist scoped |

## Apply DNS changes

Needs a Cloudflare API token with **Zone → DNS → Edit** (DNSSEC also needs **Zone → DNS → Read** / DNSSEC edit as offered in the token wizard):

```bash
export CLOUDFLARE_API_TOKEN=...
./scripts/setup-dnssec.sh
./scripts/setup-caa.sh
# DMARC already live; re-run only to restore p=none:
# ./scripts/setup-dmarc.sh
```

Manual UI steps are in each `scripts/setup-*.md`.

## Verify

```bash
dig +short DS darashkevich.com
dig +short CAA darashkevich.com
dig +short TXT _dmarc.darashkevich.com
curl -sI https://darashkevich.com/ | grep -i strict-transport
curl -sS 'https://hstspreload.org/api/v2/status?domain=darashkevich.com'
```
