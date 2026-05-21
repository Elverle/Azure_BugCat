# Feature Index

Track every deliverable here using explicit prefixes:

- `FT-##` for features
- `min-##` for minor improvements related to an existing feature
- `fix-##` for fixes/bugfixes related to an existing feature

| #   | Item ID | Description                                                                                                                                | Status   |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | FT-01   | Scaffold Electron + Infrastruttura Base                                                                                                    | Complete |
| 2   | FT-02   | Pagina Settings e Persistenza Configurazione                                                                                               | Complete |
| 3   | FT-03   | Recupero Bug da Azure DevOps                                                                                                               | Complete |
| 4   | FT-04   | LLM Provider Abstraction e Categorizzazione                                                                                                | Complete |
| 5   | FT-05   | Dashboard Principale: Tabella, Filtri e Raggruppamenti                                                                                     | Complete |
| 6   | FT-06   | Pannello Dettaglio Bug (Drawer)                                                                                                            | Complete |
| 7   | FT-07   | Persistenza Dati e Gestione Sessione                                                                                                       | Complete |
| 8   | FT-08   | GenericProvider (OpenAI-compatible, replaces Copilot)                                                                                      | Complete |
| 9   | FT-09   | Structured Output (response_format / json_schema)                                                                                          | Complete |
| 10  | FT-10   | AI Cluster: Similar Bug Detection                                                                                                          | Complete |
| 11  | FT-11   | OpenRouter Provider via SDK                                                                                                                | Complete |
| 12  | min-01  | Refactor architecture provider LLM and cleanup (FT-04, FT-11)                                                                              | Complete |
| 13  | min-02  | User-triggered cancellation for categorization flow (FT-04, FT-05)                                                                         | Complete |
| 14  | fix-01  | Lint cleanup and stabilization of cancel flow (FT-04, FT-05)                                                                               | Complete |
| 15  | min-03  | README principale con overview, setup Settings e flusso operativo                                                                          | Complete |
| 16  | min-04  | README con packaging Windows/macOS, quickstart e copy funzionale                                                                           | Complete |
| 17  | FT-12   | Incremental Session Cache & Selective Re-Categorization                                                                                    | Complete |
| 18  | min-05  | Contatore nuovi bug recuperati dopo la fetch (FT-05, FT-12)                                                                                | Complete |
| 19  | FT-13   | Storico Chiusi: pagina KPI per bug storici closed/done                                                                                     | Complete |
| 20  | min-06  | Baseline pulizia storico e dettaglio bug nei KPI chiusi (FT-13)                                                                            | Complete |
| 21  | min-07  | Filtro dettaglio e collapse per categoria nello storico chiusi (FT-13)                                                                     | Complete |
| 22  | FT-14A  | Agent Configuration & Project Registry                                                                                                     | Complete |
| 23  | FT-14B  | Agent Sessions end-to-end per analisi bug con Claude/Codex/Copilot                                                                         | Complete |
| 24  | fix-02  | Allineamento Copilot SDK runner: BYOK base URL, permessi read-only e risoluzione nativa del Copilot CLI con fallback Electron (FT-14B)     | Complete |
| 25  | fix-03  | Visibilità del modello agente per Copilot SDK ed eliminazione del valore nascosto persistito (FT-14A, FT-14B)                              | Complete |
| 26  | fix-04  | Aumento del timeout di attesa `session.idle` per Copilot SDK a 10 minuti (FT-14B)                                                          | Complete |
| 27  | FT-14C  | Integrazione MCP Azure DevOps per sessioni agente con health check, fallback al prompt completo e badge stato MCP/Fallback                 | Complete |
| 28  | FT-14D  | Analisi cross-repo e suggerimento progetti con primary intelligente, secondari opzionali e prompt multi-repo read-only                     | Complete |
| 29  | min-08  | Statistiche token per sessioni agente con usage provider-aware e sezione `Statistiche` nel workspace Sessioni (FT-14B, FT-14D)             | Complete |
| 30  | fix-05  | Ripristino import relativi per le usage stats dei runner agente, compatibili con il bundle electron-vite del main process (FT-14B, min-08) | Complete |
| 31  | FT-14E  | Workspace multi-session per sessioni agente con persistenza 24h, crash recovery, list/detail panels, badge MCP e azioni report             | Complete |
| 32  | fix-06  | Rimozione del residuo legacy single-session dopo FT-14E: cleanup di hook/panel/test inutilizzati e del vecchio evento MCP dedicato         | Complete |
| 33  | fix-07  | Keyword dei progetti in Settings: input comma-separated con draft libero e parsing in array                                                | Complete |
