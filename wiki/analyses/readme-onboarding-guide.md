---
title: 'Analysis: Root README onboarding guide'
type: analysis
created: 2026-05-05
updated: 2026-05-05
sources:
  [
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/topics/dashboard-bug-exploration]]'
  ]
tags: [analysis, documentation, onboarding, readme]
lang: en
---

## Problem

The repository initially lacked a root README, and the first version still focused too much on developer startup details instead of end-user packaging, first-run setup, and operator-facing workflow language.

## Findings

- The first successful app run depends on FT-02 because both Azure DevOps and LLM configuration must be completed and saved before the dashboard flow is usable.
- Windows and macOS distribution need to be explained from the existing `electron-builder` targets, not from the developer-only `npm run dev` flow.
- The Azure DevOps slice requires a Saved Query UUID, project scoping, and PAT-based authentication before FT-03 fetch actions can succeed.
- The LLM slice requires provider-specific credentials, and the Generic provider adds an extra `Base URL` validation rule.
- The user workflow becomes clearer when categorization and similarity are described as backlog-ordering and duplicate-detection aids rather than low-level implementation steps.

## Outcome

- Reworked the root README so packaging for Windows `.exe` and macOS `.dmg` is the primary startup path for end users.
- Added a practical quickstart with the essential Settings fields to complete on first run.
- Reframed categorization and similarity in more functional terms, focused on triage, clustering, and duplicate detection.
- Kept troubleshooting and maintenance commands available without centering the README on developer-only startup.

## See also

- [[wiki/sources/ft-02-settings]]
- [[wiki/sources/ft-03-ado-fetch]]
- [[wiki/topics/dashboard-bug-exploration]]