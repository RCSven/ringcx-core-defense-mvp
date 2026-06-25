# AI-Native Development Challenge Compliance

Last updated: 2026-06-23

This file tracks the project against the AI-Native Development Challenge requirements shared in the Engineering and Product & Design announcements.

## Project Identity

| Item | Value |
|---|---|
| Participant | Sven Liu |
| Repository | `sven-liu-ringcx-tower-defense` |
| GitLab group | `https://git.ringcentral.com/rc-ai-learning` |
| Project title | Sven Liu - RingCX Core Defense |
| Game | RingCX Core Defense |
| Game type | Browser tower defense-lite game |
| Primary AI tool | OpenAI Codex |

## Requirement Checklist

| Requirement | Status | Evidence |
|---|---|---|
| Create repository under the dedicated GitLab group | Done | `rc-ai-learning/sven-liu-ringcx-tower-defense` |
| Use a repository name that identifies owner and project | Done | `sven-liu-ringcx-tower-defense` |
| Select a small playable game | Done | RingCX Core Defense |
| Commit source code | Done | `ringcx-core-defense-mvp/` |
| Commit supporting project assets | Done | `reference-artifacts/`, sprite assets, GitLab Pages build script |
| Include `README.md` | Done | Project overview, run instructions, GitLab Pages notes |
| Include `SPEC.md` | Done | Rules, scope, functional requirements, acceptance criteria |
| Include `ARCHITECTURE.md` | Done | Stack, architecture overview, design decisions, AI workflow |
| Include `RETROSPECTIVE.md` | In Progress | AI tools, workflow, learnings, time estimate, improvement notes |
| Make game playable locally | Done | `ringcx-core-defense-mvp/index.html`, `std/`, `hi/` |
| Optional: make game playable from GitLab/GitDocs | In Progress | `.gitlab-ci.yml`, `tools/build_gitlab_pages.sh` |
| Optional: demo video | Not started | Candidate final polish task |

## Timeline Alignment

| Date / Milestone | Requirement | Status |
|---|---|---|
| June 25 Kickoff Webinar | Webinar announced; no need to wait to start | Project already started |
| Immediately following webinar | Repository creation and project selection | Repository and game selected before webinar |
| June 30 recommended completion target | Working implementation, documentation, retrospective | In progress |
| July 6 final submission deadline | Final submission | Pending final polish and submission confirmation |

## Current Submission Scope

The committed project is intentionally scoped as a browser game with no backend dependency. The core submission should remain focused on:

1. Playable RingCX-themed tower defense-lite game.
2. Required documentation.
3. AI-native workflow evidence.
4. GitLab repository and optional GitLab Pages deployment.

Backlog items such as leaderboard, analytics dashboards, and premium UI/UX are useful enhancements, but they should not block the required challenge deliverables.

## Guardrails

- Do not commit credentials, tokens, or local secrets.
- Do not rely on a local server for the primary reviewer experience if GitLab Pages is available.
- Do not let optional features delay required documentation and final retrospective.
- Keep temporary local telemetry databases and Python caches out of Git.
