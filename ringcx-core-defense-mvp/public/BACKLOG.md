# RingCX Core Defense Backlog

Last updated: 2026-06-21

This backlog records upcoming product, UX, analytics, and performance work for RingCX Core Defense. It is intentionally written as a living planning document, not as final implementation detail.

## How To Use This Backlog

- Use **Status** to track progress: `Idea`, `Ready`, `In Progress`, `Blocked`, `Done`.
- Use **Priority** to sequence work: `P0`, `P1`, `P2`.
- Keep each feature tied to user stories, acceptance criteria, and validation signals.
- When a feature moves into implementation, create a smaller task list under that feature.

## Current Assumptions

| Area | Assumption |
|---|---|
| Game type | Single-player browser tower defense-lite game |
| Current runtime | HTML/CSS/JavaScript MVP |
| Storage | Local browser storage first; backend can be added later |
| Target device | Modern desktop browser first, mainstream laptop compatibility preferred |
| Performance goal | Gameplay should stay responsive; analytics and visual polish must not block the game loop |
| Privacy | Do not collect unnecessary PII; leaderboard display name is optional and game-specific |

## Backlog Summary

| ID | Feature | Priority | Status | Owner / Design Input | Target Outcome |
|---|---|---:|---|---|---|
| BG-001 | Top 10 leaderboard | P0 | Ready | web-game-ui-designer | Players with a top-10 score can enter a name after the run |
| BG-002 | Gameplay analytics and feature telemetry | P1 | Ready | Product + Engineering | Understand session duration, wave performance, failure points, and feature usage |
| BG-004 | Project time tracking | P1 | In Progress | Product + Engineering | Understand AI-native effort across coding, Codex review/edit, and browser playtesting |
| BG-005 | Developer Mode Stage Jump | P1 | Ready | Product + Engineering | Enter a hidden dev panel after game launch and jump directly to a target stage checkpoint for validation |
| BG-003 | Premium UI/UX visual upgrade | P1 | Idea | web-game-hardware-assessor | Make the game feel visually impressive without harming FPS or broad compatibility |

---

# BG-001: Top 10 Leaderboard

## Background

Players need a lightweight competitive loop after each run. The leaderboard should reward strong performance, but it should not interrupt players who did not qualify. The name prompt appears only when the player's result enters the historical top 10.

## Design Input: web-game-ui-designer

The leaderboard flow should prioritize clarity and momentum:

1. The player finishes a run.
2. The result screen calculates rank.
3. If the score enters top 10, show a short name-entry modal.
4. Save the result.
5. Show the leaderboard with the new entry highlighted.

Avoid asking for a name before the player knows they earned a ranking. That creates unnecessary friction and makes the game feel heavier than it is.

## Ranking Rules

Recommended ranking order:

| Rank Order | Rule | Reason |
|---:|---|---|
| 1 | Higher final score wins | Primary competitive metric |
| 2 | Higher completed wave wins | Rewards deeper progress if score ties |
| 3 | Higher remaining Trust wins | Rewards better protection |
| 4 | Higher remaining SLA wins | Rewards operational health |
| 5 | Shorter run duration wins | Rewards efficient play only after quality metrics |
| 6 | Earlier timestamp wins | Stable deterministic tie-breaker |

## Proposed Final Score Formula

```text
Final Score =
  defeatedRiskScore
+ completedWaveScore
+ remainingTrust * 8
+ remainingSLA * 6
+ miniGameWinCount * 50
+ defenderUpgradeCount * 25
+ clearBonus
- leakPenalty
- restartPenalty
```

Initial constants:

| Component | Formula |
|---|---|
| defeatedRiskScore | Sum of defeated enemy/risk base values |
| completedWaveScore | `completedWave * 100` |
| clearBonus | `500` if all 10 waves are cleared, otherwise `0` |
| leakPenalty | `totalLeaks * 35` |
| restartPenalty | `manualRestartCount * 50` |

These are starting values, not final truth. Tune after several playtests.

## User Stories

| ID | User Story |
|---|---|
| BG-001-US1 | As a player, I want to see whether my run entered the top 10 so that the result feels meaningful. |
| BG-001-US2 | As a top-10 player, I want to enter a short display name after the run so that my score can be remembered. |
| BG-001-US3 | As a returning player, I want to view historical top scores so that I can compare runs. |

## Acceptance Criteria

| ID | Criteria |
|---|---|
| BG-001-AC1 | After each run, calculate final score and compare it with saved historical scores. |
| BG-001-AC2 | If fewer than 10 scores exist, any completed run can qualify. |
| BG-001-AC3 | If 10 scores exist, prompt for name only when the new score outranks at least one existing score. |
| BG-001-AC4 | Name input appears on the final result screen, not during active gameplay. |
| BG-001-AC5 | Name length is limited, recommended max 12-16 characters. |
| BG-001-AC6 | Empty name falls back to `Anonymous`. |
| BG-001-AC7 | Leaderboard stores only the top 10 results. |
| BG-001-AC8 | New entry is highlighted after save. |
| BG-001-AC9 | Leaderboard survives page refresh using local browser storage. |
| BG-001-AC10 | Reset leaderboard is available from a non-primary settings/control area. |

## UX Notes

| Element | Recommendation |
|---|---|
| Entry modal title | `Top 10 Defense Run` |
| Primary CTA | `Save Score` |
| Secondary CTA | `Skip` |
| Highlight | Use a bright edge/glow only on the new row; avoid full-screen effects |
| Mobile | Name input and CTA must be thumb-friendly and not cover final score |

## Implementation Notes

- Store leaderboard under a versioned key, for example `ringcxCoreDefense.leaderboard.v1`.
- Store only display name, score, wave reached, Trust, SLA, duration, timestamp, and optional map ID.
- Keep ranking calculation pure and testable.
- Avoid network dependency for P0. Backend leaderboard can be a later enhancement.

---

# BG-002: Gameplay Analytics And Feature Telemetry

## Background

The game needs lightweight data collection to understand player behavior:

- How long people play.
- Score and performance by wave.
- Where players fail or get stuck most often.
- Which features are used or ignored.
- Whether UI/UX changes hurt performance.

This must not reduce game responsiveness.

## Metrics Definitions

| Metric | Definition | Formula / Event Source | Usage |
|---|---|---|---|
| Session Duration | Time from game start to result or exit | `session_end_time - session_start_time` | Understand engagement length |
| Run Duration | Time from run start to win/fail | `run_end_time - run_start_time` | Compare run pacing |
| Wave Duration | Time spent in each wave | `wave_end_time - wave_start_time` | Identify slow or confusing waves |
| Wave Score | Score earned during one wave | Sum of enemy score + bonuses - leak penalties in wave | Balance and difficulty tuning |
| Fail Wave | Wave where Trust/SLA reaches zero | Last active wave index at fail | Find where players get stuck |
| Leak Count | Number of risks reaching core | Count of enemy leak events | Measure defensive pressure |
| Mini-game Win Rate | Successful mini-games / attempted mini-games | `wins / attempts` | Tune mini-game difficulty |
| Upgrade Usage | Number of upgrade actions per run | Count `defender_upgrade` events | Measure progression clarity |
| Replace Usage | Number of replace actions per run | Count `defender_replace` events | See if tactical adaptation is used |
| Fire Usage | Number of fire actions per run | Count `defender_fire` events | See if refund mechanic is understood |
| Guide Usage | Guide opened/skipped/completed | Guide events | Measure onboarding usefulness |
| Speed Usage | 1x/2x/4x changes | Speed control events | Understand pacing preference |
| Map Selection | Selected map per run | Map selection event | Compare map popularity and difficulty |
| Long Frame Rate | Count of frames over 50ms | Performance observer or frame timing sample | Detect performance problems |

## Feature Event Catalog

| Feature Area | Events |
|---|---|
| Session | `session_start`, `session_end`, `page_exit` |
| Run | `run_start`, `run_result`, `run_restart` |
| Wave | `wave_start`, `wave_end`, `wave_fail`, `wave_clear` |
| Defender | `defender_select`, `defender_place`, `defender_upgrade`, `defender_replace`, `defender_fire` |
| Enemy/Risk | `enemy_spawn`, `enemy_defeated`, `enemy_leaked` |
| Economy | `credit_earned`, `credit_spent`, `refund_received` |
| Mini-game | `mini_game_start`, `mini_game_success`, `mini_game_fail`, `mini_game_skip` |
| UI | `guide_open`, `guide_complete`, `guide_skip`, `pause`, `resume`, `speed_change`, `map_select` |
| Performance | `fps_sample`, `long_frame`, `memory_sample_optional` |

## User Stories

| ID | User Story |
|---|---|
| BG-002-US1 | As the game owner, I want to know where players fail most often so that I can tune wave difficulty. |
| BG-002-US2 | As the game owner, I want to know how long people play so that I can judge whether the session length is appropriate. |
| BG-002-US3 | As the game owner, I want feature usage data so that I know which mechanics are understood or ignored. |
| BG-002-US4 | As the game owner, I want telemetry collection to avoid hurting gameplay performance so that analytics does not damage the player experience. |

## Acceptance Criteria

| ID | Criteria |
|---|---|
| BG-002-AC1 | Track session start and session end timestamps. |
| BG-002-AC2 | Track each wave start/end/fail/clear with wave index. |
| BG-002-AC3 | Track per-wave score, leaks, defeated risks, remaining Trust, and remaining SLA. |
| BG-002-AC4 | Track usage count for place, upgrade, replace, fire, guide, pause, speed, map selection, and mini-games. |
| BG-002-AC5 | Track fail reason when available: Trust depleted, SLA depleted, quit/restart, or unknown. |
| BG-002-AC6 | Analytics events must not perform synchronous network calls inside the gameplay loop. |
| BG-002-AC7 | Events are buffered in memory and flushed at safe moments: run end, page hide, idle callback, or timed batch. |
| BG-002-AC8 | If backend is unavailable, events can be stored locally or exported as JSON for review. |
| BG-002-AC9 | No personal data is collected unless explicitly entered for leaderboard display. |
| BG-002-AC10 | Telemetry can be disabled with a configuration flag. |

## Performance-Safe Analytics Design

| Concern | Recommendation |
|---|---|
| Game loop overhead | Push small event objects into an in-memory queue only |
| Network cost | Batch upload later; no per-event fetch during combat |
| Storage cost | Use capped local buffer, for example latest 500-1000 events |
| Serialization | Serialize on flush, not on every event |
| Frame timing | Sample FPS periodically instead of every frame if not needed |
| Privacy | Separate leaderboard name from gameplay telemetry |

## Dashboard Questions For Later

| Question | Metric Needed |
|---|---|
| Which wave blocks players most? | Fail wave distribution |
| Which map is hardest? | Fail rate and average score by map |
| Do players understand upgrades? | Upgrade usage and upgrade timing |
| Are mini-games too hard? | Mini-game win rate by type |
| Is the run too long? | Session and run duration percentiles |
| Does high visual mode hurt gameplay? | FPS, long frames, device tier, graphics preset |

---

# BG-004: Project Time Tracking

## Background

The AI-Native Engineering Challenge retrospective asks for time spent, and the current project work is spread across implementation, Codex review/edit cycles, and browser playtesting. A single local tracker is needed so the estimate is evidence-backed instead of reconstructed from memory.

This should track project effort, not employee monitoring. The goal is retrospective accuracy and workflow learning.

## Metric Definitions

| Metric | Definition | Formula / Event Source | Usage |
|---|---|---|---|
| Total Project Time | All recorded work sessions | `sum(work_session.duration_ms)` | Retrospective time spent |
| Coding Time | Implementation-focused work | `sum(duration_ms where category = coding)` | Understand build effort |
| Codex Review/Edit Time | Time spent reviewing, editing, or steering Codex output | `sum(duration_ms where category = codex_review)` | Understand AI-native review cost |
| Browser Playtest Time | Game page visible test time | `sum(duration_ms where category = browser_test)` | Estimate validation and tuning effort |
| Last 7 Days Time | Recent project effort | `sum(duration_ms where started_at >= now - 7d)` | See current execution pace |

## Scope

| Priority | Scope |
|---|---|
| P0 | Add local SQLite `work_sessions` storage, summary API, recent sessions API, and automatic file-activity scan. |
| P0 | Auto-record browser playtest time while the game page is visible; pause when the tab is hidden. |
| P0 | Add a natural-language query box for project time and game-run questions. |
| P1 | Add export for retrospective-ready time breakdown. |
| P1 | Link project time to build/version or backlog item when a reliable source is available. |
| P2 | Add richer activity detection for editor/terminal/browser windows if an approved local source becomes available. |

## User Stories

| ID | User Story |
|---|---|
| BG-004-US1 | As the project owner, I want to see total project time by category so that the retrospective time-spent section is evidence-backed. |
| BG-004-US2 | As the project owner, I want coding/build and Codex review/edit time to be inferred automatically from project activity so that I do not need to operate a timer. |
| BG-004-US3 | As the project owner, I want browser playtest time to be captured automatically so that validation effort is not missed. |
| BG-004-US4 | As the project owner, I want to ask questions in natural language so that I can answer retrospective questions quickly. |

## Acceptance Criteria

| ID | Criteria |
|---|---|
| BG-004-AC1 | Local collector stores work sessions with category, source, activity, title, start time, end time, and duration. |
| BG-004-AC2 | Dashboard shows total project time, last-7-day time, coding time, Codex review/edit time, and browser playtest time. |
| BG-004-AC3 | Collector automatically scans project file modification activity and groups nearby changes into estimated coding/review sessions. |
| BG-004-AC4 | Dashboard supports questions such as `查询我在6月20日花在这个项目build的时间` and `查看我在6月22日开始的一周时间里，玩了多少次游戏`. |
| BG-004-AC5 | Game page records browser playtest time only when the page is visible and ignores very short accidental visits. |
| BG-004-AC6 | If the collector is offline, browser-side records can queue locally and retry later. |
| BG-004-AC7 | The system does not collect PII, keystrokes, screen contents, or unrelated desktop activity. |
| BG-004-AC8 | The feature clearly separates observed browser playtest time from estimated coding/review file activity. |

## Trade-Off Analysis

| Decision | Option A | Option B | Recommendation | Reason | Risk |
|---|---|---|---|---|---|
| Capture coding/review time | Infer from project file activity | Attempt OS/editor activity tracking | File-activity inference for P0 | Automatic, transparent, no desktop surveillance | Estimates time, not exact active attention |
| Capture playtest time | Browser page visibility | Full session replay or input tracking | Browser visibility | Lightweight and privacy-safe | Overcounts idle visible tab time |
| Storage | Local SQLite | Hosted backend | Local SQLite | Fits challenge and avoids infra dependency | Data stays on one machine |
| Granularity | Category-level sessions | Fine-grained action-level time | Category-level sessions | Good enough for retrospective | Less useful for detailed productivity analysis |
| Query interface | Rule-based project questions | General LLM-backed semantic query | Rule-based P0 | Works offline and is predictable | Limited query phrasing coverage |

## Implementation Notes

- Store work data separately from gameplay run data in `work_sessions`.
- Use categories: `coding`, `codex_review`, `browser_test`, `other`.
- Use sources: `file_activity_scan`, `browser_activity`, and future approved sources.
- Treat coding/build and Codex review/edit as automatic estimates based on grouped file modification windows.
- Treat browser playtest time as an estimate, not as proof of active gameplay.
- Do not add system-level monitoring without explicit user approval and a clear privacy review.

---

# BG-005: Developer Mode Stage Jump

## Background

During active iteration, validating a change inside a later stage is too slow if every test requires replaying the full run from stage 1. The game needs a hidden developer mode that lets the owner jump directly to a specific stage, wave, route position, and game state.

This should be treated as a development and QA tool, not a player feature. If it leaks into the normal player path, it will weaken balance validation and make run results untrustworthy.

## Proposed Backdoor Entry Design

| Layer | Design | Reason |
|---|---|---|
| Primary hidden entry | After entering the game screen, press `Ctrl+Shift+D` to open a small dev unlock prompt | Fast for repeat validation, invisible to normal mouse/touch players |
| Unlock phrase | Require typing `stage-jump` before the panel opens | Prevents accidental activation during normal playtests |
| Local shortcut | Support `?dev=1` only on local/dev builds to skip the unlock prompt | Makes repeated local testing faster without exposing production behavior |
| Session scope | Dev mode stays enabled only for the current browser tab/session unless explicitly pinned in local storage | Avoids polluting future normal playtests |
| Visible state | When enabled, show a compact `DEV` badge in the HUD | Prevents confusing developer runs with real player runs |

Do not rely on secrecy alone as the control. The safer implementation is to gate this by build/runtime config, for example `DEV_TOOLS_ENABLED`, local host detection, or an explicit debug query flag.

## Functional Scope

| Priority | Scope |
|---|---|
| P0 | Add hidden dev unlock and compact dev panel after game launch. |
| P0 | Allow jump to stage/wave 1-10 with predefined checkpoints: `start`, `mid`, `boss/pre-exit` where applicable. |
| P0 | Allow overriding Trust, SLA, Credit, speed, and selected visual preset before starting the checkpoint. |
| P0 | Add stage 4 quick presets, including `Stage 4 start`, `Stage 4 mid-pressure`, and `Stage 4 near-fail`. |
| P1 | Allow defender placement presets so a checkpoint can start with a realistic build state. |
| P1 | Allow enemy/risk queue preview and optional single-risk spawn for targeted validation. |
| P1 | Add shareable dev deep links such as `?dev=1&stage=4&checkpoint=mid&credit=800`. |
| P2 | Save named scenarios locally, for example `stage-4-route-pressure-regression`. |

## Developer Jobs-To-Be-Done

| JTBD | Desired Outcome |
|---|---|
| When I modify stage 4 pacing, I want to jump directly to the relevant point so that I can validate the change in seconds. |
| When I tune a specific enemy/risk type, I want to spawn it in a controlled state so that I can isolate the behavior from full-run noise. |
| When I review a visual or balance change, I want the game to clearly mark the run as dev-only so that I do not confuse test results with real player performance. |

## User Stories

| ID | User Story |
|---|---|
| BG-005-US1 | As the game owner, I want to unlock a hidden developer mode after entering the game so that I can access validation tools without exposing them in the normal UI. |
| BG-005-US2 | As the game owner, I want to jump directly to stage 4 or another target stage checkpoint so that I can test changes without replaying the full game. |
| BG-005-US3 | As the game owner, I want to configure Trust, SLA, Credit, speed, and build presets before jumping so that the checkpoint matches the scenario I need to validate. |
| BG-005-US4 | As the game owner, I want developer runs to be clearly labeled and excluded from leaderboard/analytics by default so that test data does not contaminate real results. |

## Acceptance Criteria

| ID | Criteria |
|---|---|
| BG-005-AC1 | `Ctrl+Shift+D` opens the developer unlock prompt only after the player has entered the game screen. |
| BG-005-AC2 | The developer panel opens only after the correct unlock phrase or when dev mode is explicitly enabled by local/dev configuration. |
| BG-005-AC3 | Developer mode is disabled in public/production builds unless an explicit development flag is present. |
| BG-005-AC4 | The panel supports selecting stage/wave 1-10 and checkpoint options relevant to that stage. |
| BG-005-AC5 | Stage 4 includes at least three presets: `Stage 4 start`, `Stage 4 mid-pressure`, and `Stage 4 near-fail`. |
| BG-005-AC6 | Jumping to a checkpoint resets active enemies, timers, resources, defender state, and wave state deterministically based on the selected preset. |
| BG-005-AC7 | The panel allows overriding Trust, SLA, Credit, speed, and visual preset before launch. |
| BG-005-AC8 | Developer runs show a visible `DEV` badge in the HUD. |
| BG-005-AC9 | Developer runs are excluded from leaderboard qualification by default. |
| BG-005-AC10 | Gameplay telemetry marks developer runs with `is_dev_run = true` or excludes them by default, depending on telemetry configuration. |
| BG-005-AC11 | Normal players cannot discover or activate developer mode through visible buttons, menus, or tutorial text. |
| BG-005-AC12 | Closing/reloading the tab returns to normal mode unless the user deliberately re-enters dev mode or uses a dev query flag. |

## Suggested Dev Panel Controls

| Control | Type | Default | Purpose |
|---|---|---|---|
| Stage | Segmented control or dropdown | Current stage | Choose validation target |
| Checkpoint | Dropdown | `start` | Choose stage position |
| Trust | Number input / stepper | Scenario default | Simulate healthy or near-fail state |
| SLA | Number input / stepper | Scenario default | Simulate operational pressure |
| Credit | Number input / stepper | Scenario default | Test economy and upgrade paths |
| Speed | Segmented control | `1x` | Validate timing and readability |
| Build preset | Dropdown | `balanced` | Start with realistic defender placement |
| Visual preset | Segmented control | Current setting | Test Low/Medium/High behavior |
| Launch | Button | N/A | Apply state and start checkpoint |

## Trade-Off Analysis

| Decision | Option A | Option B | Recommendation | Reason | Risk |
|---|---|---|---|---|---|
| Entry method | Visible dev button | Hidden keyboard unlock | Hidden keyboard unlock | Keeps normal player UI clean | Harder on touch-only devices; acceptable for dev tool |
| Access control | Secret phrase only | Runtime/dev flag plus phrase | Runtime/dev flag plus phrase | Better separation between development and public builds | Requires config discipline |
| Checkpoint model | Jump by raw wave number | Named scenario presets | Named presets plus raw override | Presets are repeatable; raw override keeps flexibility | Presets need maintenance after balance changes |
| Persistence | Always remember dev mode | Session-only by default | Session-only | Avoids contaminating normal playtests | Slightly more setup per session |
| Telemetry handling | Drop all dev telemetry | Mark dev telemetry | Mark with `is_dev_run`, exclude from player dashboards by default | Dev data is useful for debugging but should not mix with real data | Dashboards must filter correctly |

## Implementation Notes

- Keep the dev state manager separate from normal run progression so it does not create hidden dependencies in player gameplay.
- Checkpoint launch should call the same reset/start APIs as normal gameplay, then apply controlled overrides.
- Treat `stage`, `checkpoint`, `trust`, `sla`, `credit`, `speed`, and `buildPreset` as serializable scenario inputs.
- Add a pure function for scenario construction so stage 4 regressions can be tested repeatedly.
- Never allow a dev run to save leaderboard results unless a future explicit override is added.

# BG-003: Premium UI/UX Visual Upgrade

## Background

The desired direction is a more visually impressive version of the game. This should improve perceived quality, clarity, and reward feel, but it must not turn a lightweight browser MVP into a slow visual demo.

## Design Input: web-game-hardware-assessor

Current game classification:

| Category | Assessment |
|---|---|
| Current complexity | Lightweight UI/DOM game |
| Potential upgraded complexity | Medium 2D visual game if adding sprite animation, particles, richer effects |
| Main risks | DOM animation cost, excessive shadows/filters, particle count, long sessions, memory leaks |
| Product stance | Make it feel premium through art direction and readable motion, not by adding uncontrolled effects |

## Hardware Compatibility Matrix

| Device Tier | Support | Experience Quality | Main Bottleneck | Recommendation |
|---|---|---|---|---|
| Old Windows / Mac Intel | Partial support | Low-Medium | CPU/GPU, CSS effects | Provide Low preset, reduce animation and particles |
| Mainstream Windows / newer Mac Intel | Support | Medium-High | DOM layout, compositing | Target as baseline |
| Mac M1/M2/M3 or entry discrete GPU | Support | High | Mostly asset loading and effect stacking | Best default target for High preset |
| High-end GPU / Mac Pro/Max | Support | High | Not likely constrained | Can enable highest visual density, but avoid making this the only good experience |

## Visual Upgrade Direction

| Area | Recommendation |
|---|---|
| HUD | Sharper hierarchy for Trust, SLA, Credit, Wave, and Speed |
| Arena | Richer route readability, better station affordance, clearer threat lanes |
| Defenders | More distinctive role identity and upgrade state |
| Enemies/Risks | Stronger silhouettes and threat categories |
| Results | More satisfying win/fail/ranking presentation |
| Motion | Use short feedback motion for attack, reward, upgrade, and leak events |
| Audio optional | Add light UI feedback later only if it does not distract |

## Technology Options And Trade-off

| Option | Pros | Cons | Best Use |
|---|---|---|---|
| Continue DOM/CSS/SVG | Lowest rewrite risk, easiest integration | Can become expensive with many animated elements | Near-term polish |
| Canvas layer for arena effects | Better control over particles/projectiles | Adds rendering layer complexity | Medium visual upgrade |
| PixiJS/Phaser rewrite | Better sprite/animation/resource management | Higher migration cost, more dependencies | If game becomes larger after challenge |
| Three.js/WebGL visual layer | High spectacle potential | Overkill for current gameplay and worse compatibility risk | Not recommended for near-term backlog |

## User Stories

| ID | User Story |
|---|---|
| BG-003-US1 | As a player, I want the game to feel polished and responsive so that defending the core feels rewarding. |
| BG-003-US2 | As a player on a normal laptop, I want the game to remain smooth so that visual quality does not hurt playability. |
| BG-003-US3 | As the game owner, I want graphics presets so that I can support more devices without maintaining separate builds. |

## Acceptance Criteria

| ID | Criteria |
|---|---|
| BG-003-AC1 | Add Low/Medium/High visual quality presets. |
| BG-003-AC2 | Default preset is chosen conservatively based on device capability or saved preference. |
| BG-003-AC3 | High preset adds visual richness without changing gameplay rules. |
| BG-003-AC4 | Low preset disables expensive effects such as heavy blur, bloom-like filters, excessive shadows, and high particle counts. |
| BG-003-AC5 | Gameplay remains readable at all presets. |
| BG-003-AC6 | Target 60 FPS on mainstream devices for normal play; tolerate short drops only during result/reward moments. |
| BG-003-AC7 | Add FPS/long-frame telemetry before shipping heavy visuals. |

## Degradation Strategy

| Tier | Degradation |
|---|---|
| Low | Static background, minimal particles, no heavy filters, capped damage numbers |
| Medium | Moderate animations, limited particles, lightweight glow only |
| High | Richer attack trails, reward motion, animated map ambience, enhanced result screen |

## Product Guidance

Do not make the game visually impressive by making every object glow, animate, and cast shadows all the time. That will make the screen noisy and will likely hurt performance. The stronger product path is:

1. Improve information hierarchy first.
2. Add role/enemy identity second.
3. Add moment-based effects only where they teach or reward action.
4. Add performance presets before enabling a premium mode by default.

---

# Prioritized Next Steps

| Order | Task | Owner | Notes |
|---:|---|---|---|
| 1 | Implement local Top 10 leaderboard | Engineering | Lowest dependency, strong player-facing value |
| 2 | Add final score calculation | Product + Engineering | Needed before leaderboard feels fair |
| 3 | Add lightweight telemetry queue | Engineering | Must be non-blocking |
| 4 | Add local analytics export/debug view | Engineering | Useful before backend exists |
| 5 | Add project time tracking summary | Engineering | Needed for retrospective Time spent |
| 6 | Implement hidden developer mode stage jump | Engineering | Speeds up validation for later-stage balance and UI changes |
| 7 | Add FPS/long-frame sampling | Engineering | Required before heavy UI/UX polish |
| 8 | Design premium UI direction with presets | Product + UI | Do after metrics hooks exist |

# Open Questions

| Question | Why It Matters |
|---|---|
| Should leaderboard be local-only or shared across players? | Shared leaderboard requires backend and abuse prevention |
| Is display name enough, or do we need team/role labels? | More fields create more friction and privacy concerns |
| Do we need consent text for analytics? | Depends on sharing/distribution context |
| What device should be the minimum target? | Determines how aggressive premium visuals can be |
| Should analytics be stored locally for challenge only? | Simpler and safer for the AI-Native Challenge scope |
| Should developer scenarios be committed as JSON fixtures or kept inside the game code? | JSON fixtures are easier to reuse, but inline presets are faster for the MVP |

# Definition Of Done For This Backlog

This backlog is useful when:

- Each feature has priority, status, user stories, and acceptance criteria.
- Data features include metric definitions and performance constraints.
- UI/UX features include device/performance trade-offs.
- Future implementation tasks can be split directly from this document.
