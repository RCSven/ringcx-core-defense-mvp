# Public Telemetry Collector Setup

## Goal

Capture gameplay telemetry from both local testing and public web access, then separate them in the dashboard.

## Source Definitions

| Source | Definition | Dashboard Label |
|---|---|---|
| Local | `access_surface` is `localhost` or `file`; legacy local collector data is also treated as Local | Local |
| Public Web | `access_surface` is `public_url` | Public Web |
| LAN | `access_surface` is `lan` | LAN |
| External Playtest | `release_channel` is `external_playtest` | External Playtest |

## Netlify Configuration

The static site loads `telemetry-config.js` before `local-run-monitor/game-run-telemetry.js`.

For local builds, keep:

```js
window.RC_PUBLIC_COLLECTOR_URL = "";
window.RC_ALLOWED_COLLECTOR_ORIGINS = [];
```

For Netlify/public builds, replace it with:

```js
window.RC_PUBLIC_COLLECTOR_URL = "https://ringcx-defense-collector.<account>.workers.dev";
window.RC_ALLOWED_COLLECTOR_ORIGINS = ["https://ringcx-defense-collector.<account>.workers.dev"];
```

## Recommended Free Host

Use Cloudflare Workers + D1 for P0 public telemetry.

| Option | Fit | Reason |
|---|---|---|
| Cloudflare Workers + D1 | Recommended | Long-term free tier is enough for early public playtests; no server to keep warm |
| Python collector on VPS | Backup | More control, but not free unless a VPS already exists |
| Render/Railway free tiers | Not preferred | Free persistence/runtime limits make them risky for long-lived telemetry |

Cloudflare deployment files live in:

```text
deploy/cloudflare-collector
```

The public collector must expose the same endpoints as the local collector:

| Endpoint | Purpose |
|---|---|
| `POST /api/session/start` | session start |
| `POST /api/session/end` | session end |
| `POST /api/run/start` | run start |
| `POST /api/run/checkpoint` | in-run checkpoints |
| `POST /api/run/end` | run end |
| `POST /api/run/beacon-end` | unload-safe run end |
| `GET /api/metrics/command-center` | dashboard metrics |

## Dashboard Filter

Dashboard APIs accept:

```text
?source=all
?source=local
?source=public_web
```

The dashboard UI exposes this as the `Data Scope` segmented control.

## Data QA

1. Open the Netlify game URL.
2. Complete or fail one run.
3. Open the dashboard.
4. Switch `Data Scope` to `Public Web`.
5. Confirm the run appears under `Traffic Source Mix -> Public Web`.

## Current Limitation

Netlify cannot store telemetry by itself. Public traffic requires a reachable collector URL. A local collector at `127.0.0.1:4328` only captures the current machine.
