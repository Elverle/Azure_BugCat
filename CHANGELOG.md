# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-08-31

Maintenance release. Nothing changes in how the app looks or behaves; the
dependencies underneath it are current.

### Changed

- Updated the Electron runtime to 41.10.7 and refreshed the bundled
  dependencies, clearing every advisory reported by `npm audit`. None of them
  were reachable in 1.0.0 — the app registers no custom protocol, renders no
  iframes, and runs its window with `contextIsolation` and `sandbox` enabled —
  so this is preventive maintenance rather than a fix for an exploitable flaw.
- Moved the router to React Router 7. Routes, navigation, and the interface
  around them are unchanged.

## [1.0.0] - 2026-08-31

First public release.

### Added

- Fetch bugs from a saved Azure DevOps work item query, with an incremental
  session cache that only re-reads what changed.
- Categorize bugs with the LLM provider of your choice — OpenAI, Anthropic,
  Google Gemini, OpenRouter, or any OpenAI-compatible endpoint.
- Detect similar and duplicate bugs across the fetched set.
- Track closed bugs over time on a dedicated KPI page.
- Store the Azure DevOps token and the LLM API key in the operating system
  keychain (DPAPI on Windows, Keychain on macOS, libsecret on Linux), falling
  back to the previous local storage where no keyring is available.
- Packaged installers for Windows and macOS, built from source on every tag.

[1.0.1]: https://github.com/Elverle/Azure_BugCat/releases/tag/v1.0.1
[1.0.0]: https://github.com/Elverle/Azure_BugCat/releases/tag/v1.0.0
