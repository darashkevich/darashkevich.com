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

## Submit (manual)

1. Open [https://hstspreload.org/](https://hstspreload.org/)
2. Enter `darashkevich.com`
3. Fix any blockers the checker reports
4. Submit when eligible

Do not claim the domain is preloaded until [hstspreload.org](https://hstspreload.org/) / Chromium status shows it accepted.
