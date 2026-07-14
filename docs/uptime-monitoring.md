# Lightweight uptime monitoring

Pick one. Both are enough for a portfolio homepage.

## Option A — UptimeRobot / Better Stack (free)

1. Create a free account at [UptimeRobot](https://uptimerobot.com/) or [Better Stack](https://betterstack.com/uptime)
2. Add an HTTPS monitor for `https://darashkevich.com/` every 5 minutes
3. Alert to `yahor@darashkevich.com` (and optionally Slack/SMS)
4. Optional: also monitor `https://darashkevich.com/sitemap-index.xml`

## Option B — GitHub scheduled curl (already in repo)

Workflow: `.github/workflows/uptime-check.yml`

- Runs every 15 minutes + on demand
- `GET https://darashkevich.com/` must return HTTP 200
- Fails the job (and notifies via GitHub Actions) if the site is down

No third-party signup required; alerts depend on GitHub notification settings for failed workflows.
