# RingCX Core Defense Specification

## 1. Background and Problem

The AI-Native Engineering Challenge asks participants to build a small but complete game while documenting the full AI-native software development lifecycle.

RingCX Core Defense uses a tower defense format to model a familiar product delivery problem: customer trust is protected by cross-functional collaboration, not by one role acting alone. The player must decide where to deploy PM, QA, SE, and SDET defenders against incoming risks.

## 2. Objective and Success Metrics

### Objective

Build a playable browser-based tower defense-lite game that is small enough to complete within the challenge timeframe, but complete enough to demonstrate planning, implementation, testing, documentation, iteration, and AI-assisted workflow.

### Success Metrics

| Metric | Definition | Target for MVP |
|---|---|---|
| Playability | A player can start, play waves, and reach win/fail state | One complete run is possible |
| Rule clarity | Player can understand defender roles, waves, and trust objective | Guide and visible HUD explain core loop |
| Scope control | MVP avoids unnecessary multiplayer/backend complexity | Single-player browser MVP |
| Documentation completeness | Required challenge documents exist | README, SPEC, ARCHITECTURE, RETROSPECTIVE present |
| AI-native evidence | AI usage and iteration are documented | Retrospective captures workflow and learnings |

## 3. User Personas and Scenarios

| Persona | Scenario | Need |
|---|---|---|
| Challenge reviewer | Reviews the repository and tries the game | Clear setup, playable MVP, documented decisions |
| RingCX product/engineering teammate | Looks for reusable AI-native workflow lessons | Retrospective with concrete examples |
| Casual player | Plays a short browser game | Understandable rules, quick feedback, visible progress |

## 4. Game Rules

### Core Loop

1. Choose a map.
2. Select a defender role.
3. Place defenders on available stations.
4. Start the wave.
5. Defenders automatically attack incoming risks.
6. Player reacts by upgrading, replacing, or firing defenders.
7. Defeated risks grant Credit and XP.
8. Leaked risks reduce Customer Trust and SLA.
9. Survive all 10 waves to complete the run.

### Resources

| Resource | Meaning | Loss / Gain |
|---|---|---|
| Credit | Deployment and upgrade budget | Spent on defenders; gained from kills and mini-games |
| Customer Trust | Primary health value | Reduced when risks reach the core |
| SLA | Secondary operational health value | Reduced when risks reach the core |
| XP | Role progression signal | Gained when defenders contribute damage |

### Defender Roles

| Defender | Role | Strength | Weakness | Design Purpose |
|---|---|---|---|---|
| PM | Product/customer alignment | Strong against customer, roadmap, metric, and meeting risks | Weak technical damage | Forces product context decisions |
| QA | Quality gatekeeper | Strong against release, quality, and metric risks | Moderate technical coverage | Tests quality ownership placement |
| SE | Engineering problem solver | Strong against code, debug, architecture, and incident risks | Weak customer/product coverage | Handles technical risk pressure |
| SDET | Automation/reliability specialist | Strong against automation, debug, quality, and reliability risks | Less direct product/customer coverage | Adds automation counterplay |

### Enemy / Risk Types

| Risk | Threat | Counterplay |
|---|---|---|
| Customer | Basic customer-impacting issue | PM coverage and general damage |
| Hotfix | Engineering urgency | SE or SDET trust gate |
| VIP Sync | High-value customer pressure | PM trust gate |
| Release | Quality gate pressure | QA trust gate |
| Flaky | Automation instability | SDET trust gate |
| Roadmap | Product prioritization pressure | PM-focused damage |
| Meeting | Swarm pressure | Broad coverage and placement |
| Hackathon | Cross-functional challenge | Requires all roles |
| Trust Audit | Final boss-style risk | Requires all roles and upgraded coverage |

## 5. Scope

### P0 - Initial Challenge Milestone

| Requirement | Status |
|---|---|
| Game selected | RingCX Core Defense |
| Initial project structure | Repository root, MVP folder, reference artifacts, required docs |
| Initial specification | This SPEC.md |
| Playable MVP source present | `ringcx-core-defense-mvp/index.html` |

### P1 - Working Implementation

| Requirement | Target |
|---|---|
| Complete playable run | Player can finish or fail after 10 waves |
| Core controls | Start, pause, speed, place, upgrade, replace, fire |
| Basic balance pass | Waves are survivable with reasonable play |
| Manual validation | Browser playtest documented |

### P2 - Final Submission Polish

| Requirement | Target |
|---|---|
| Screenshots | Add to README |
| Retrospective | Complete lessons learned and AI-generated estimate |
| Demo video | Optional 3-5 minute recording |
| GitLab submission | Push final repository under challenge group |

## 6. Functional Requirements and Acceptance Criteria

### FR1: Game Selection

**User Story**  
As a challenge participant, I want a clearly selected game concept so that the project has a stable scope.

**Acceptance Criteria**

- The selected game is named in README and SPEC.
- The game genre is described as tower defense-lite/browser game.
- The scope explains why the game is small enough for the challenge.

### FR2: Start and Play a Run

**User Story**  
As a player, I want to start a run and play through waves so that the game is meaningfully playable.

**Acceptance Criteria**

- Player can launch the game in a browser.
- Player can start from the opening screen.
- Player can start at least one wave.
- Enemies move along the route.
- Defenders attack enemies when placed in valid stations.

### FR3: Defender Placement

**User Story**  
As a player, I want to place defenders on stations so that I can build a strategy before each wave.

**Acceptance Criteria**

- Player can select PM, QA, SE, or SDET.
- Player can place a selected defender on an empty station.
- Placing a defender spends Credit.
- Invalid placement is blocked or ignored.

### FR4: Defender Management

**User Story**  
As a player, I want to upgrade, replace, or fire defenders so that I can adapt strategy during the run.

**Acceptance Criteria**

- Occupied stations expose upgrade, replace, and fire actions.
- Upgrade costs Credit and improves defender effectiveness.
- Replace swaps the current defender with the selected defender.
- Fire removes the defender and grants a refund.

### FR5: Waves and Risk Pressure

**User Story**  
As a player, I want waves to introduce different risk types so that the game creates changing decisions.

**Acceptance Criteria**

- The game has 10 waves.
- Waves include multiple enemy/risk types.
- Some risks require role-specific trust gates.
- Leaked enemies reduce Trust and/or SLA.

### FR6: Win and Fail States

**User Story**  
As a player, I want clear end states so that I understand whether the defense succeeded.

**Acceptance Criteria**

- Player wins or survives after clearing all waves.
- Player fails if Customer Trust or SLA reaches zero.
- End state communicates the outcome.

### FR7: Required Documentation

**User Story**  
As a reviewer, I want required documents in the repository so that I can evaluate the AI-native development lifecycle.

**Acceptance Criteria**

- `README.md` exists.
- `SPEC.md` exists.
- `ARCHITECTURE.md` exists.
- `RETROSPECTIVE.md` exists.

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Game should run smoothly in a modern desktop browser |
| Accessibility | Core text should be readable; controls should be clickable without precision input |
| Compatibility | MVP targets modern Chrome/Edge/Safari browsers |
| Maintainability | Single-file MVP is acceptable for challenge speed, but architecture notes must explain trade-offs |
| Security | No backend, no user data, no external API dependency |

## 8. Dependencies and Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep | Documentation and final submission may slip | Freeze MVP features after initial playable validation |
| Single-file size | Harder long-term maintainability | Document as MVP trade-off; split only if needed |
| Balance uncertainty | Game may be too easy or too hard | Use manual playtest and tune wave values |
| GitLab setup dependency | Remote repo creation may require user authentication | Prepare local repo and provide remote setup steps |

## 9. Launch Plan

| Phase | Deliverable |
|---|---|
| Today | Repository structure, game selection, initial specification |
| Next | Playtest, bug fixes, README screenshots |
| Final | Complete retrospective, final docs, GitLab push, optional demo video |
