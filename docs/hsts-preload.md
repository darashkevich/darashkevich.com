# HSTS preload submission

This site already sends:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

via Netlify (`netlify.toml`). That header alone does **not** mean the domain is on the Chromium HSTS preload list.

## Before submitting

Confirm:

1. HTTPS works on the apex and `www` (redirects are fine)
2. All HTTP requests redirect to HTTPS
3. The HSTS header includes `preload` and `includeSubDomains` with `max-age` ≥ 31536000
4. You understand preload is effectively permanent and hard to undo

Quick check:

```bash
curl -sI https://darashkevich.com/ | grep -i strict-transport
```

## Status

As of 2026-07-18 the preload API reports `status: "pending"` for `darashkevich.com` (submitted; not yet on the Chromium list). Preloadable check returned no errors.

```bash
curl -sS 'https://hstspreload.org/api/v2/status?domain=darashkevich.com'
curl -sS 'https://hstspreload.org/api/v2/preloadable?domain=darashkevich.com'
```

## Submit (manual, if status is `unknown` / not submitted)

1. Open [https://hstspreload.org/](https://hstspreload.org/)
2. Enter `darashkevich.com`
3. Fix any blockers the checker reports
4. Submit when eligible

Do not claim the domain is preloaded until [hstspreload.org](https://hstspreload.org/) / Chromium status shows `preloaded` / accepted.
