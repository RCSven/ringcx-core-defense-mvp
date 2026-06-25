# RingCX Core Defense Retrospective

This document will be finalized before the challenge submission. The current version captures the AI-native workflow notes gathered so far.

## AI Tools Used

| Tool | Usage |
|---|---|
| Codex | Requirements interpretation, project migration, game iteration, documentation drafting |
| ChatGPT/Codex conversations | Challenge translation, planning, and continuity across project conversations |
| GitLab | Repository hosting and GitLab Pages deployment workflow |
| Local browser testing | Manual gameplay validation and UI review |

## Development Workflow

1. Interpreted the AI-Native Engineering Challenge requirements.
2. Selected a small browser game scope.
3. Built a RingCX-themed tower defense-lite MVP.
4. Iterated through UI, gameplay, wave, defender, and map feedback.
5. Migrated the project into the `RC Game` workspace.
6. Created challenge-required documentation and repository structure.
7. Added GitLab repository setup and GitLab Pages deployment configuration.
8. Captured follow-up backlog items for leaderboard, analytics, project time tracking, and premium UI/UX.

## What Worked Well

- AI was effective at turning a broad challenge prompt into a concrete, scoped game concept.
- Keeping the MVP as a single HTML file reduced setup and review friction.
- Iterative feedback worked well for UI/gameplay issues such as wave behavior, speed controls, map options, defender actions, and guide flow.
- The RingCX theme made abstract tower defense mechanics easier to connect to real product delivery concepts.
- GitLab Pages is a useful bonus because it turns the project from local-only into a shareable one-click demo path.

## What Did Not Work Well

- A single-file MVP became large quickly, which makes long-term maintainability harder.
- Some gameplay fixes required multiple feedback loops because timing, pause state, cooldown, and wave spawning interacted in subtle ways.
- Documentation lagged behind implementation and had to be backfilled.
- Large numbers of visual review artifacts and local telemetry files can easily pollute the repository if they are not explicitly filtered or staged carefully.

## Surprises and Discoveries

- The most useful AI workflow was not one large generation step, but repeated short iterations with concrete user feedback.
- Game state bugs appeared where UI state, pause state, mini-games, and wave timing overlapped.
- A domain-themed game can communicate business/product concepts while still functioning as a simple playable prototype.
- The deployment step surfaced real workflow issues, including protected branch behavior, default branch initialization, and CI/CD artifact structure.

## Estimated Percentage of AI-Generated Code

Current estimate: 70-85%.

This will be refined before final submission after reviewing which parts were directly generated, manually adjusted, or guided by user feedback.

## Time Spent

Current estimate:

| Activity | Time |
|---|---|
| Challenge interpretation and planning | 1-2 hours |
| MVP implementation and iteration | 5-8 hours |
| Documentation | 2-3 hours |
| Testing and validation | 1-2 hours |
| GitLab setup and deployment troubleshooting | 1-2 hours |

These are working estimates for the retrospective. The local monitor can provide a more evidence-backed time breakdown before final submission.

## What I Would Do Differently Next Time

- Write `SPEC.md` before implementation to reduce rework.
- Split game constants and pure logic earlier if the game grows beyond MVP.
- Keep a running change log during each AI-assisted iteration.
- Add a simple playtest checklist earlier.

## Key Lessons Learned

- AI is strongest when given specific feedback from a working artifact.
- Scope control matters more than feature volume for this challenge.
- Documentation should be treated as part of the product, not a final clean-up task.
- For AI-native work, preserving the reasoning trail is almost as important as preserving the source code.
