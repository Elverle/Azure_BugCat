# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/Elverle/Azure_BugCat/releases/tag/v1.0.0
