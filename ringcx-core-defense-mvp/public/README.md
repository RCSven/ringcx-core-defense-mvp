# RingCX Core Defense

RingCX Core Defense is a browser-based tower defense-lite game built for the AI-Native Engineering Challenge.

The project theme is based on RingCX product delivery work: players deploy cross-functional defenders such as PM, QA, SE, and SDET to protect the Customer Trust Core from incoming product, quality, customer, and engineering risks.

## Play Online

Play the hosted version without cloning the repository or running a local server:

- [Play Game - GitLab Pages](http://sven-liu-ringcx-tower-defense-97d864.pages.git.ringcentral.com/)
- [Play Game - Netlify fallback](https://stalwart-dodol-72f038.netlify.app/)

## Game Description

The player starts each run with limited Credit, Customer Trust, and SLA health. During planning, the player places defenders on map stations. During each wave, risks travel along the route toward the Customer Trust Core. Defenders attack risks based on role strengths, placement, upgrades, and trust-gate requirements.

The current release includes:

- A playable single-player browser game.
- Four defender roles: PM, QA, SE, and SDET.
- Multiple enemy/risk types, including customer issues, hotfixes, release gates, flaky automation, roadmap pressure, meetings, hackathon pressure, and final trust audit.
- Ten waves with increasing pressure.
- Four selectable maps: S Route, Spiral Queue, Split Merge, and Fast Lane.
- Defender placement, upgrade, replace, and fire actions.
- Pause and speed controls.
- Short mini-game incidents that can grant wave-specific bonuses.
- A local monitor for gameplay run metrics and project time tracking.

## Project Structure

```text
.
├── README.md
├── BACKLOG.md
├── SPEC.md
├── ARCHITECTURE.md
├── RETROSPECTIVE.md
├── CHALLENGE_COMPLIANCE.md
├── reference-artifacts/
│   ├── ringcx-core-early-game-flow.svg
│   ├── ringcx-core-defense-flow.svg
│   ├── ringcx-defense-game-logic.svg
│   ├── ringcx-defense-game-logic-v2.svg
│   └── ringcx-defense-progression-formulas.svg
└── ringcx-core-defense-mvp/
    ├── index.html
    ├── local-run-monitor/
    ├── docs/
    └── tools/
```

## Setup

No package installation is required to play locally. The game runs as a static browser app with supporting assets, docs, telemetry, and monitor pages.

## Run

Open the game directly in a browser:

```text
ringcx-core-defense-mvp/index.html
```

Or serve it locally from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/ringcx-core-defense-mvp/
```

For test sharing, add channel and attribution parameters such as `channel`, `share_id`, and `utm_source` to the playable URL.

## GitLab Pages

For a no-login share URL, deploy through GitLab Pages instead of ChatGPT Sites.
The repository includes a Pages pipeline in `.gitlab-ci.yml`.

Repository:

```text
https://git.ringcentral.com/rc-ai-learning/sven-liu-ringcx-tower-defense
```

The pipeline builds this static artifact:

```text
public/
├── index.html
├── local-run-monitor/
├── docs/
├── tools/
├── assets/
├── review-mockups/
└── *.md
```

Run the same build locally with:

```bash
sh tools/build_gitlab_pages.sh
```

GitLab Pages assigns the final URL under `Deploy -> Pages` after the pipeline passes. Use the assigned URL until a custom Pages domain is configured. A custom domain normally still needs GitLab Pages domain setup plus DNS ownership validation by the GitLab/RingCentral admin path.

## Public Play URL

GitLab remains the source repository and challenge evidence. For the lowest
friction playtest experience, publish the generated `public/` folder to a free
static host such as Netlify Drop or Cloudflare Pages Direct Upload.

Build the public package:

```bash
sh tools/build_gitlab_pages.sh
```

Then upload this folder:

```text
public/
```

Current hosted playable demo:

- [Play Game - GitLab Pages](http://sven-liu-ringcx-tower-defense-97d864.pages.git.ringcentral.com/)
- [Play Game - Netlify fallback](https://stalwart-dodol-72f038.netlify.app/)
- [Product architecture demo](https://stalwart-dodol-72f038.netlify.app/docs/product-architecture-interactive.html)

See the public access and telemetry plan:

```text
ringcx-core-defense-mvp/docs/public-access-std-hi-telemetry-plan.md
```

## Local Monitor

The local monitor stores gameplay run metrics and project time tracking in a local SQLite database.

Start the collector:

```bash
python3 ringcx-core-defense-mvp/tools/local_run_collector.py
```

Start the dashboard:

```bash
python3 ringcx-core-defense-mvp/tools/local_dashboard_server.py
```

Then open:

```text
http://127.0.0.1:4319
```

Project time categories are `coding`, `codex_review`, `browser_test`, and `other`.

- Coding/build and Codex review/edit time are automatically estimated from project file activity windows.
- Browser playtest time is recorded automatically while the game tab is visible.
- The tracker does not collect keystrokes, screen contents, or unrelated desktop activity.

If port `4318` is already occupied by an older collector, start the collector on another port:

```bash
RC_COLLECTOR_PORT=4328 python3 ringcx-core-defense-mvp/tools/local_run_collector.py
```

Then open the dashboard with:

```text
http://127.0.0.1:4319/?api=http://127.0.0.1:4328
```

To send browser playtest time to the alternate collector, open the game with:

```text
http://localhost:8000/ringcx-core-defense-mvp/?collector=http://127.0.0.1:4328
```

## Screenshots

Screenshots will be added after the first full visual validation pass.

## Backlog

Future feature ideas, analytics requirements, leaderboard rules, and UI/UX performance notes are tracked in:

```text
BACKLOG.md
```

## Public Deployment Guide

Public playtest deployment steps are tracked in:

```text
PUBLIC_DEPLOYMENT.md
```

## Challenge Status

Current milestone: repository created, project selected, initial structure complete, and required documentation created.

Next milestone: validation pass, GitLab Pages verification, retrospective completion, and final submission before July 6.

Requirement tracking is maintained in:

```text
CHALLENGE_COMPLIANCE.md
```
