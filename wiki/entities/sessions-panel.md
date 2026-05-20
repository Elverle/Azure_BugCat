---
title: 'Sessions Panel'
type: entity
subtype: component
created: 2026-05-18
updated: 2026-05-20
sources:
	[
		'[[wiki/sources/ft-14b-agent-sessions]]',
		'[[wiki/sources/ft-14c-mcp-azure-devops-agent-integration]]'
	]
tags: [react, component, dashboard, agent, markdown, logs]
lang: en
---

## Description

Dashboard component that renders the FT-14B agent-session experience. It shows the empty state, running status and abort action, error messaging, an accordion log of streamed chunks, and a Markdown-rendered final report after completion.

## Location

`src/renderer/src/components/dashboard/SessionsPanel.tsx`

## Props

| Prop        | Type                   | Purpose                             |
| ----------- | ---------------------- | ----------------------------------- |
| `session`   | `AgentSession \| null` | Current session to visualize        |
| `mcpStatus` | `McpStatus \| null`    | Current session MCP/fallback status |
| `onAbort`   | `() => void`           | Aborts an active running session    |

## Key Behaviors

- Shows a dedicated empty state when no FT-14B session has been started or reconnected.
- Keeps the session header always visible with status badge, MCP/fallback badge, start time, completion time, and abort action.
- Auto-scrolls the log viewport to the newest chunk while the log accordion is open.
- Renders chunk types with distinct visual treatment for plain text, tool calls, tool results, and status updates.
- Renders the final report through `react-markdown` + `remark-gfm` inside Tailwind Typography `prose` styles.
- Uses two accordions so long log streams and the final report can be expanded independently.
- Uses an inline `McpStatusBadge` helper: green `MCP` for successful FT-14C runs, amber `Fallback` with a tooltip reason when the session degraded to the full prompt path.

## Dependencies

- [[wiki/entities/shared-types]]
- `react-markdown`
- `remark-gfm`
- `@tailwindcss/typography`

## See also

- [[wiki/entities/use-agent-session-hook]]
- [[wiki/entities/dashboard-page]]
- [[wiki/topics/mcp-backed-agent-analysis]]
- [[wiki/topics/agent-analysis-sessions]]
