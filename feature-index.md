# Feature Index

Track every deliverable here using explicit prefixes:

- `FT-##` for features
- `min-##` for minor improvements related to an existing feature
- `fix-##` for fixes/bugfixes related to an existing feature

| #   | Item ID | Description                                                                            | Status   |
| --- | ------- | -------------------------------------------------------------------------------------- | -------- |
| 1   | FT-01   | Electron scaffold and base infrastructure                                              | Complete |
| 2   | FT-02   | Settings page and configuration persistence                                            | Complete |
| 3   | FT-03   | Bug retrieval from Azure DevOps                                                        | Complete |
| 4   | FT-04   | LLM provider abstraction and categorization                                            | Complete |
| 5   | FT-05   | Main dashboard: table, filters and grouping                                            | Complete |
| 6   | FT-06   | Bug detail drawer                                                                      | Complete |
| 7   | FT-07   | Data persistence and session handling                                                  | Complete |
| 8   | FT-08   | GenericProvider (OpenAI-compatible, replaces Copilot)                                  | Complete |
| 9   | FT-09   | Structured Output (response_format / json_schema)                                      | Complete |
| 10  | FT-10   | AI Cluster: Similar Bug Detection                                                      | Complete |
| 11  | FT-11   | OpenRouter Provider via SDK                                                            | Complete |
| 12  | min-01  | Refactor architecture provider LLM and cleanup (FT-04, FT-11)                          | Complete |
| 13  | min-02  | User-triggered cancellation for categorization flow (FT-04, FT-05)                     | Complete |
| 14  | fix-01  | Lint cleanup and stabilization of cancel flow (FT-04, FT-05)                           | Complete |
| 15  | min-03  | Main README with overview, Settings setup and operational flow                         | Complete |
| 16  | min-04  | README with Windows/macOS packaging, quickstart and functional copy                    | Complete |
| 17  | FT-12   | Incremental Session Cache & Selective Re-Categorization                                | Complete |
| 18  | min-05  | Counter of newly fetched bugs after a fetch (FT-05, FT-12)                             | Complete |
| 19  | FT-13   | Closed history: KPI page for closed/done bugs                                          | Complete |
| 20  | min-06  | History-clear baseline and bug detail in the closed KPIs (FT-13)                       | Complete |
| 21  | min-07  | Detail filter and per-category collapse in the closed history (FT-13)                  | Complete |
| 22  | min-08  | OpenRouter provider rewritten on the shared OpenAI-compatible core, SDK removed (FT-11) | Complete |
| 23  | min-09  | English UI: machine-value sentinels, code-based error titles, system-locale dates       | Complete |
| 24  | FT-14   | OS keychain protection for the Azure DevOps PAT and the LLM API key                     | Complete |
| 25  | min-10  | Public project page: license, identity metadata, english README, contributing guide and changelog | Complete |
| 26  | min-11  | CI and release workflows with packaged installers for Windows and macOS                 | Complete |
