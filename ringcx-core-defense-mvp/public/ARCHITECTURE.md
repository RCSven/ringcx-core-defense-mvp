# RingCX Core Defense Architecture

## Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| UI | HTML, CSS, vanilla JavaScript | Fastest path to a playable browser MVP with no build setup |
| Runtime | Browser | Easy for reviewers to run locally |
| Rendering | DOM + SVG paths | Good enough for tower defense-lite movement and map visualization |
| State | In-memory JavaScript state object | Simple MVP state model, easy to inspect and iterate |
| Assets | Inline styles/SVG plus reference artifacts | Minimizes dependency and setup risk |

## Architecture Overview

The MVP is implemented as a single-page browser game in:

```text
ringcx-core-defense-mvp/index.html
```

The file contains:

- HTML shell for the game screen and panels.
- CSS for layout, HUD, map, defender cards, enemies, modals, and feedback.
- JavaScript data definitions for maps, defenders, enemies, waves, and game state.
- JavaScript game logic for placement, wave spawning, movement, damage, rewards, upgrades, mini-games, and end-state handling.

## Major Modules

| Area | Responsibility |
|---|---|
| Map definitions | Route paths, station positions, map captions |
| Defender definitions | Role stats, role tags, progression labels, colors |
| Enemy definitions | Risk types, HP, speed, trust-gate requirements, damage |
| Wave definitions | Ordered list of risk pressure over 10 waves |
| Render functions | Update HUD, map, defenders, wave preview, battle log |
| Game loop | Move enemies, spawn risks, process defender attacks, resolve leaks |
| Economy | Credit costs, refunds, rewards, upgrades |
| Mini-games | Short incident drills that pause the game and add bonuses |
| End state | Win/survive/fail messaging |

## State Model

The game uses one central in-memory state object. It tracks:

- Current wave.
- Credit.
- Customer Trust.
- SLA.
- Running/paused status.
- Selected defender.
- Placed defenders by station.
- Active enemies.
- Spawn queue.
- Role XP and levels.
- Mini-game bonuses.
- Battle log.

This is intentionally simple for the MVP. It makes AI-assisted iteration faster because the main behavior can be inspected in one place.

## Design Decisions

| Decision | Rationale | Trade-off |
|---|---|---|
| Single HTML file | Lowest setup friction for challenge reviewers | Large file is less maintainable than modular source |
| Vanilla JS | Avoids dependency installation and build tooling | Less structure than React/Vite or a game engine |
| DOM/SVG rendering | Easy to debug and visually inspect | Not optimized for large numbers of entities |
| RingCX-themed mechanics | Connects gameplay to participant domain knowledge | More niche than a generic tower defense theme |
| Role-tag damage model | Encodes PM/QA/SE/SDET differences without complex combat | Requires tuning to avoid unclear damage math |

## AI Tooling Used

| Tool | Usage |
|---|---|
| Codex | Game design iteration, implementation support, bug fixing, documentation drafting |
| ChatGPT/Codex conversation history | Requirements clarification, challenge interpretation, project migration context |

## Agent Workflow

The project uses an AI-native workflow:

1. Interpret challenge requirements.
2. Select a scoped game concept.
3. Generate and iterate the MVP implementation.
4. Review issues through playtest feedback.
5. Patch behavior and UI problems.
6. Document specification, architecture, and retrospective learnings.

## Future Architecture Improvements

| Improvement | When to Do It |
|---|---|
| Split CSS/JS into separate files | If the game receives more features after challenge submission |
| Add automated tests for pure functions | Before adding more combat rules or maps |
| Add saved balance constants | If wave tuning becomes frequent |
| Add screenshot capture workflow | Before final README polish |
