---
title: 'Copilot SDK Runner'
type: entity
subtype: service
created: 2026-05-18
updated: 2026-05-18
sources: ['[[wiki/sources/ft-14b-agent-sessions]]']
tags: [agent, copilot, sdk, streaming, preview]
lang: en
---

## Description

GitHub-backed FT-14B runner implemented with `@github/copilot-sdk`. It opens a Copilot client session, streams partial assistant text and tool activity into the shared chunk model, and returns the final response once `sendAndWait()` resolves.

## Location

`src/main/agent/runners/copilot-sdk-runner.ts`

## Runtime Behavior

- Creates `CopilotClient` with `cwd = primaryPath` so the spawned CLI process inherits the target repo as its working context.
- In Electron, prefers the native optional executable package for the current platform (`@github/copilot-win32-x64`, `@github/copilot-darwin-arm64`, and similar) instead of letting the SDK launch the JS loader through `process.execPath`.
- Falls back to `ELECTRON_RUN_AS_NODE=1` only if the native optional executable cannot be resolved for the current platform.
- Calls `client.start()` before creating a session and passes `workingDirectory = primaryPath` in the `SessionConfig`.
- Builds `provider` only for Copilot BYOK mode, mapping FT-14 settings to the SDK `ProviderConfig` (`type`, `baseUrl`, `apiKey`) instead of misusing `CopilotClientOptions`.
- Uses a read-only permission handler: shell and write requests are rejected, read-only operations are approved once.
- Enables `streaming: true`, listens to `assistant.message_delta` for partial text, `assistant.message` for the final assembled message, and `tool.execution_*` events for log visibility.
- Aborts the running session with `session.abort()` and falls back to `client.forceStop()` during cancellation.
- Calls `session.sendAndWait()` with an explicit 10 minute timeout instead of the SDK default 60 second wait for `session.idle`.

## Notes

- If the final synchronous response contains content and no streamed text was accumulated, the runner emits one final `text` chunk from the resolved response.
- OpenAI, OpenRouter, generic OpenAI-compatible endpoints, and Gemini-compatible OpenAI endpoints are mapped to the SDK `provider.type = openai`; Anthropic BYOK uses `provider.type = anthropic`.
- Standard base URLs are inferred for OpenAI, Anthropic, and OpenRouter when the BYOK base URL field is blank; generic and Gemini-compatible BYOK modes require an explicit base URL.
- This native-executable preference fixes the Electron/Windows failure mode where the spawned loader surfaced `error: too many arguments. Expected 0 arguments but got 1.` because the JS entrypoint was being launched through an incompatible executable path.
- `supportsFixMode` and `supportsMcp` are both `false`.

## Dependencies

- [[wiki/entities/agent-session-manager]]
- [[wiki/concepts/read-only-agent-analysis-sandboxing]]

## See also

- [[wiki/entities/agent-runner-factory]]
- [[wiki/topics/agent-analysis-sessions]]
