---
title: 'GitHub Copilot Provider'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-04-llm-provider]]']
tags: [llm, github-copilot, provider]
lang: en
---

## Description

LLM provider implementation using the GitHub Copilot SDK (`@github/copilot-sdk`). Unlike other providers, it uses a session-based model — creates a client, opens a session, sends a message, then disconnects.

## Location

`src/main/llm/providers/copilot-provider.ts`

## Configuration

- **API Key**: Not required (uses GitHub authentication)
- **Model**: `config.model ?? 'gpt-4.1'`
- **Timeout**: 60s passed to `session.sendAndWait()`

## Implementation Notes

- **No API key validation** at construction — relies on GitHub auth session.
- Uses `approveAll` as the permission request handler. This is a **security-aware decision**: the app auto-approves any tool/permission Copilot requests because the use case is non-interactive batch categorization.
- Session lifecycle: `createSession()` → `sendAndWait()` → `disconnect()` in try/finally.
- Client stopped in outer finally: `client.stop().catch(() => {})`.

## Error Mapping

Uses string matching on error messages (Copilot SDK doesn't expose typed error classes):

- Contains `auth`/`401`/`403` → `LLM_AUTH_ERROR`
- Contains `rate`/`429` → `LLM_RATE_LIMIT`
- Contains `timeout`/`Timeout` → `LLM_TIMEOUT`

## Security Note

The `approveAll` handler means Copilot can use any tools it requests during the session. This is acceptable here because:

1. The app runs locally (desktop)
2. The prompt is controlled (categorization only)
3. No user secrets are in the conversation beyond bug titles/descriptions

## See also

- [[wiki/entities/llm-provider-factory]]
- [[wiki/concepts/llm-provider-abstraction]]
