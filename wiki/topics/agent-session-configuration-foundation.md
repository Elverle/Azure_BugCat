---
title: 'Agent Session Configuration Foundation'
type: topic
created: 2026-05-17
updated: 2026-05-26
sources:
  [
    '[[wiki/sources/ft-14a-agent-configuration-project-registry]]',
    '[[wiki/sources/ft-14b-agent-sessions]]',
    '[[wiki/sources/ft-14f-provider-auth-parity-analysis]]'
  ]
tags: [settings, agent, projects, ipc, migration, foundation]
lang: en
---

## Overview

FT-14A prepares the application for future agent-session execution by extending the Settings route with all the configuration needed to choose an agent runtime, describe the local codebase landscape, and constrain future concurrency. FT-14B now consumes that persisted contract to launch real sessions, but the Settings route remains the source of truth for provider derivation, local project targeting, architecture hints, and session concurrency limits. FT-14F tightens that foundation with explicit provider/auth diagnostics and a renderer-visible availability model that reuses the same persisted settings snapshot.

## Main Surfaces

- [[wiki/entities/agent-provider-section]] - agent runtime selection, auto-derivation, BYOK, and Codex CLI check
- [[wiki/entities/agent-availability]] - pure renderer-side availability derivation reused by FT-14 launch surfaces
- [[wiki/entities/project-registry-section]] - CRUD editor for local project targets
- [[wiki/entities/architecture-context-section]] - narrative architecture hints and max concurrent sessions
- [[wiki/entities/use-settings-hook]] - orchestration for derivation, sanitization, validation, and persistence
- [[wiki/entities/ipc-handlers]] - privileged filesystem and binary checks

## Data Flow

```text
SettingsPage
  -> LlmProviderSection updates llmProvider
  -> useSettings auto-derives agentProvider when applicable
  -> AgentProviderSection renders effective provider UI
  -> AgentProviderSection can test Copilot connectivity with draft BYOK/subscription settings
  -> ProjectRegistrySection edits settings.projects
  -> ArchitectureContextSection edits architectureContext + maxConcurrentSessions
  -> save()
       -> sanitizeSettingsBeforeSave()
       -> validateSettings()
       -> validateProjectPaths() via IPC
       -> settings:set
       -> encrypted electron-store
```

## Invariants

- `anthropic` and `openai` imply a derived agent provider; the user does not see a manual dropdown in those cases.
- BYOK settings are only meaningful for `copilot-sdk` and are cleared when that mode is inactive.
- FT-14F derives launch availability from the persisted settings snapshot, so Dashboard launchers and the Settings route stay consistent about whether analysis should be blocked.
- Project path checks are limited to `exists` plus `isDirectory`; FT-14A does not inspect repository type, Git status, or language stack.
- `maxConcurrentSessions` is constrained to the inclusive range `1..5`.
- Schema v4 guarantees that old installations gain the new settings fields without losing previous configuration.
- FT-14B reads the selected provider, project registry, and architecture context directly from this persisted foundation rather than duplicating them in renderer-local state.
- Claude's blank manual `agentApiKey` remains a valid local-auth path; FT-14F documents it as a hint, not a validation failure.

## See also

- [[wiki/concepts/agent-provider-auto-derivation]]
- [[wiki/concepts/proactive-agent-configuration-blocking]]
- [[wiki/concepts/settings-sanitization-before-save]]
- [[wiki/concepts/dynamic-collection-touched-state]]
- [[wiki/concepts/schema-versioned-store-migration]]
- [[wiki/topics/agent-analysis-sessions]]
