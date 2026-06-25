# Netlify Telemetry Collector Setup

## Goal

Capture telemetry from remote Netlify or Git-hosted static builds by routing gameplay events to a Netlify Function collector backed by Netlify Blobs.

```text
Remote game page
  -> /.netlify/functions/telemetry/api/*
  -> Netlify Blobs
  -> local dashboard with ?api=https://stalwart-dodol-72f038.netlify.app/.netlify/functions/telemetry
```

## Important

Do not deploy only the `public/` folder if telemetry is required. A `public/`-only deploy ships the game HTML/JS, but it does not deploy `netlify/functions/telemetry.js`.

Deploy from the project root:

```text
ringcx-core-defense-mvp/
```

Netlify should see:

```text
netlify.toml
package.json
public/
netlify/functions/telemetry.js
```

Drag-and-drop zip deploys are not the recommended path for this telemetry backend. They can publish the static game page, but in testing they did not publish the Netlify Function endpoint. Use a Git-connected Netlify build for the collector.

## Build Settings

| Setting | Value |
|---|---|
| Base directory | `ringcx-core-defense-mvp` |
| Publish directory | `public` |
| Functions directory | `netlify/functions` |
| Build command | `npm install` or empty if Netlify installs dependencies automatically |

## Public Game Config

`public/telemetry-config.js` is now configured as:

```js
window.RC_PUBLIC_COLLECTOR_URL = "https://stalwart-dodol-72f038.netlify.app/.netlify/functions/telemetry";
window.RC_ALLOWED_COLLECTOR_ORIGINS = ["https://stalwart-dodol-72f038.netlify.app"];
```

For another Git/Netlify/static URL, keep the collector URL the same. The MVP collector accepts anonymous telemetry from any origin by default so Git-hosted static builds can report without another platform account.

For production hardening, add only approved game page origins to the Netlify environment variable:

```text
RC_ALLOWED_ORIGINS=https://stalwart-dodol-72f038.netlify.app,https://your-git-hosted-game.example.com
```

## Verify

After deploy:

```bash
curl -sS https://stalwart-dodol-72f038.netlify.app/.netlify/functions/telemetry/api/health
```

Expected:

```json
{"ok":true,"service":"ringcx-defense-netlify-collector"}
```

Dashboard:

```text
http://127.0.0.1:4319/?api=https://stalwart-dodol-72f038.netlify.app/.netlify/functions/telemetry
```

Then play a run on the remote site and check:

- `Data Scope -> Public Web`
- `Traffic Source Mix`
- `Device Mix`
- `Mini-game Performance`
- `Recent Runs`
