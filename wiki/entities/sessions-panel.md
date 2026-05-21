---
title: 'Sessions Panel'
type: entity
subtype: component
created: 2026-05-18
updated: 2026-05-21
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]',
		'[[wiki/sources/ft-14d-cross-repo-project-suggestions]]',
		'[[wiki/sources/ft-14e-multi-session-agent-workspace]]'
	]
tags: [react, component, dashboard, agent, markdown, logs, legacy, removed]
lang: en
---

## Description

Historical FT-14B single-session Dashboard component. It was superseded by [[wiki/entities/session-workspace]] in FT-14E and removed from the codebase in `fix-06` once the last compatibility references disappeared.

## Location

Removed from the codebase in `fix-06`. The active replacement is [[wiki/entities/session-detail-panel]] inside [[wiki/entities/session-workspace]].

## Former Props

| Prop        | Type                   | Purpose                             |
| ----------- | ---------------------- | ----------------------------------- |
| `session`   | `AgentSession \| null` | Current session to visualize        |
| `mcpStatus` | `McpStatus \| null`    | Current session MCP/fallback status |
| `onAbort`   | `() => void`           | Aborts an active running session    |

## Historical Behaviors

- Shows a dedicated empty state when no FT-14B session has been started or reconnected.
- Keeps the session header always visible with status badge, MCP/fallback badge, start time, completion time, and abort action.
- Auto-scrolls the log viewport to the newest chunk while the log accordion is open.
- Renders chunk types with distinct visual treatment for plain text, tool calls, tool results, and status updates.
- Renders the final report through `react-markdown` + `remark-gfm` inside Tailwind Typography `prose` styles.
- Renders a third accordion-like `Statistiche` section after the report for completed/error/aborted sessions, showing input/output/total tokens and related provider metrics when available.
- Falls back to a readable `Metriche token non disponibili` state when a provider does not expose usage data for the finished run.
- Uses independent accordion state so long log streams, the final report, and the statistics area can be expanded independently.
- Uses an inline `McpStatusBadge` helper: green `MCP` for successful FT-14C runs, amber `Fallback` with a tooltip reason when the session degraded to the full prompt path.

## Dependencies

- [[wiki/entities/shared-types]]
- `react-markdown`
- `remark-gfm`
- `@tailwindcss/typography`

## See also

- [[wiki/entities/session-workspace]]
- [[wiki/entities/session-detail-panel]]
- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/dashboard-page]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
