# CAA records for darashkevich.com (Netlify + Let’s Encrypt)

Netlify provisions certificates with Let’s Encrypt account  
`https://acme-v02.api.letsencrypt.org/acme/acct/54403714`.

Publishing CAA with that `accounturi` allows only Netlify’s LE account to issue for the apex (covers `www` SANs). Confirmed against [Netlify HTTPS docs](https://docs.netlify.com/manage/domains/secure-domains-with-https/https-ssl/).

## Apply via script (preferred)

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone → DNS → Edit
./scripts/setup-caa.sh
```

## Apply in Cloudflare Dashboard

1. **DNS** → **Records** → **Add record** → type **CAA**
2. **Name:** `@`
3. **Tag:** `Only allow specific hostnames` / `issue`
4. **CA domain name / value:**  
   `letsencrypt.org;accounturi=https://acme-v02.api.letsencrypt.org/acme/acct/54403714`
5. **Flags:** `0`
6. Save. Do **not** add other `issue` / `issuewild` rows unless you intentionally authorize another CA.

## Verify

```bash
dig +short CAA darashkevich.com
```

Expect a single `issue` value pointing at `letsencrypt.org` with Netlify’s `accounturi`.

## Caution

Wrong CAA breaks certificate renewal. If HTTPS provisioning fails after this change, remove the CAA record or fix the value, then retry Netlify → Domain management → HTTPS.
