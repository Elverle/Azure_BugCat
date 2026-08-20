---
title: 'Analysis: Root README onboarding guide'
type: analysis
created: 2026-05-05
updated: 2026-08-20
sources:
  [
    '[[wiki/sources/ft-02-settings]]',
    '[[wiki/sources/ft-03-ado-fetch]]',
    '[[wiki/topics/dashboard-bug-exploration]]'
  ]
tags: [analysis, documentation, onboarding, readme]
lang: en
---

> **Superseded (2026-08-20):** commit `d4f5589` ("rewrite the readme as a public project page", min-10) replaced the Italian, developer-oriented README this analysis describes with a full rewrite in English, aimed at the project's public GitHub audience rather than at an internal operator. Everything below this notice is kept as the historical record of the FT-02/FT-03-era onboarding README (created 2026-05-05, last touched 2026-05-05) — it no longer describes `README.md` as it exists today. See [`README.md`](../../README.md) for the current content; the sections that carry the most conceptual continuity from this analysis are **Quickstart** (Settings walkthrough), **Settings reference** (the same field table this analysis called for), **How it works** (categorization/similarity/closed-history explained functionally), a new **Privacy & data** section documenting exactly what leaves the machine and how the PAT/API key are now keychain-encrypted (see [[wiki/entities/secret-storage]]), and a **Troubleshooting** table keyed by the error dialog titles from [[wiki/entities/labels-utility]]. The rewrite also adds sections this analysis never covered: **Download & install** (unsigned Windows/macOS installers), **How it's built** (pointing at `feature/`, `feature-index.md`, and this wiki as the project's paper trail), and **Roadmap**.

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