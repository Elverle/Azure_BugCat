# Spec-Planner — Iteration 1

## Feature Context

- **Feature:** Analisi cross-repo e suggerimento progetti
- **Feature #:** FT-14D
- **Feature Type:** full-stack

---

## Part 1: Requirements

### Functional Requirements

#### Project Matching Heuristics

- **FR-MATCH-001:** Selezione automatica progetto principale
  - Description: Il sistema deve suggerire un progetto principale in base a heuristics (areaPath, tags, macroCategory, titolo del bug confrontati con `keywords`, `type` e `name` dei progetti registrati). Il match è "forte" quando almeno due segnali convergono sullo stesso progetto.
  - Acceptance Criteria:
    - Given un bug con areaPath "Backend\\Payments" e un progetto con keywords ["payments", "backend"], When si apre il dialog di analisi, Then il progetto viene pre-selezionato come suggerito.
    - Given un bug senza match forte, When si apre il dialog, Then nessun progetto è pre-selezionato.
  - Priority: Must-Have

- **FR-MATCH-002:** Suggerimento progetti secondari
  - Description: Il sistema deve suggerire progetti secondari in base a regole deterministiche: (a) tutti i progetti di tipo `shared` sono sempre suggeriti; (b) se il primary è `backend`, i progetti `frontend` sono suggeriti e viceversa.
  - Acceptance Criteria:
    - Given un primary di tipo `backend` e un progetto `shared`, When si apre il dialog, Then il progetto `shared` è pre-selezionato come secondario suggerito.
    - Given un primary di tipo `backend` e un progetto `frontend`, When si apre il dialog, Then il progetto `frontend` appare suggerito.
  - Priority: Must-Have

- **FR-MATCH-003:** Override utente su primary e secondari
  - Description: L'utente deve poter cambiare la selezione primary e aggiungere/rimuovere secondari indipendentemente dal suggerimento.
  - Acceptance Criteria:
    - Given un progetto suggerito come primary, When l'utente seleziona un altro progetto, Then il dialog accetta la selezione.
  - Priority: Must-Have

#### Session Start Dialog (UI)

- **FR-UI-001:** Dialog di avvio con primary + secondari
  - Description: Il componente `AnalyzeButton` deve essere esteso (o sostituito) con un dialog/panel che mostra: un dropdown primary (pre-selezionato da heuristics), una lista di checkboxes per i secondari (pre-checkati per i suggeriti), ed un pulsante di avvio.
  - Acceptance Criteria:
    - Given 4 progetti registrati, When l'utente apre il dialog, Then vede dropdown primary + 3 checkboxes (tutti tranne il primary scelto).
  - Priority: Must-Have

- **FR-UI-002:** Warning oltre 3 secondari
  - Description: Quando l'utente seleziona più di 3 secondari, la UI mostra un avviso visivo (non bloccante) che indica un potenziale peggioramento delle performance/qualità del prompt.
  - Acceptance Criteria:
    - Given 4 secondari selezionati, When la vista aggiorna, Then appare un warning arancione testuale.
    - Given 3 o meno secondari, Then nessun warning.
  - Priority: Must-Have

#### IPC & Data Contract

- **FR-IPC-001:** Estensione `AgentStartPayload`
  - Description: `AgentStartPayload` deve includere `secondaryProjectIds: string[]` opzionale (default `[]`).
  - Priority: Must-Have

- **FR-IPC-002:** Estensione `RunParams`
  - Description: `RunParams` deve includere `secondaryPaths: string[]` per informare il runner dei percorsi secondari (usato per il prompt e per il logging).
  - Priority: Must-Have

- **FR-IPC-003:** Estensione `AgentSession`
  - Description: `AgentSession` deve includere `secondaryProjectIds: string[]` per il tracking.
  - Priority: Must-Have

#### Prompt Builder Cross-Repo

- **FR-PROMPT-001:** Sezione secondari nel prompt Analyze
  - Description: Quando almeno un secondario è selezionato, `buildAnalyzePrompt` deve aggiungere una sezione "## Secondary Projects" elencando per ciascuno: name, path assoluto, type, description. Quando zero secondari, la sezione viene omessa.
  - Acceptance Criteria:
    - Given 2 secondari, When si genera il prompt, Then contiene la sezione con i 2 progetti.
    - Given 0 secondari, When si genera il prompt, Then la sezione "Secondary Projects" non compare.
  - Priority: Must-Have

- **FR-PROMPT-002:** Sezione secondari nel prompt MCP
  - Description: Stessa logica di FR-PROMPT-001 applicata a `buildMcpPrompt`.
  - Priority: Must-Have

- **FR-PROMPT-003:** Architecture context strutturato nel prompt
  - Description: L'`architectureContext` globale e la `description` di ciascun progetto secondario devono entrare nel prompt come contesto strutturato separato (non mischiato al bug body).
  - Priority: Must-Have

#### Logging

- **FR-LOG-001:** Etichettatura read secondari nel log
  - Description: I chunk di tipo `tool_result` che riguardano file in path secondari devono essere distinguibili nel log della sessione. Il main deve aggiungere un tag `[secondary:{projectName}]` nel content del chunk quando il path del tool_result rientra in uno dei secondaryPaths.
  - Acceptance Criteria:
    - Given un chunk con path `/repos/shared-lib/src/index.ts` e secondaryPaths che include `/repos/shared-lib`, When il chunk viene emesso, Then il content inizia con `[secondary:shared-lib]`.
  - Priority: Should-Have

### Non-Functional Requirements

- **NFR-PERF-001:** La funzione di matching (selectPrimaryProject + suggestSecondaryProjects) deve completarsi in < 5ms per 20 progetti e un bug con 10 tags.
- **NFR-UX-001:** Il dialog di avvio sessione non deve introdurre più di un click aggiuntivo rispetto al flusso attuale quando il suggerimento automatico è corretto.
- **NFR-MAINT-001:** Le funzioni di matching devono essere pure (nessun side-effect, nessun accesso a store) per testabilità unitaria.

### Constraints

- La feature resta Analyze-only; il campo `mode` in `AgentStartPayload` non cambia.
- I secondari sono read-only concettualmente ma l'enforcement write-level è fuori scope (FT-14G/H).
- La struttura corrente ha un singolo `AnalyzeButton` dentro `BugDetailDrawer`; il nuovo dialog deve mantenere compatibilità con quel punto di ingresso.
- Il preload layer usa typing loose (`unknown`); le conversioni e validazioni avvengono nel renderer hook e nell'IPC handler.

### Assumptions

- I `ProjectEntry` già contengono `keywords` popolati dall'utente; se vuoti, il matching produce score zero.
- L'utente ha almeno 1 progetto configurato per poter avviare una sessione (invariante già esistente).
- Il path di un progetto è assoluto e accessibile dal filesystem locale.
- `architectureContext` in `AppSettings` è un singolo campo testo globale (non per-progetto).

### Out of Scope

- Modalità Fix
- Enforcement write-level su secondari (FT-14G/H)
- Workspace finale multi-sessione (FT-14E)
- Persistenza sessioni su disco
- Modifica/creazione di nuovi canali IPC (si estende solo il payload dell'esistente `AGENT_START`)

### Edge Cases

| Scenario                                                      | Expected Behavior                                                                   | Related Requirement     |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------- |
| 0 progetti configurati                                        | Il dialog mostra messaggio "Configura almeno un progetto" (comportamento esistente) | FR-UI-001               |
| 1 solo progetto                                               | Primary pre-selezionato, nessun secondario disponibile                              | FR-UI-001, FR-MATCH-002 |
| Bug senza tags, areaPath generico, titolo generico            | Nessun match forte, nessun primary suggerito, utente deve scegliere                 | FR-MATCH-001            |
| Tutti i progetti sono `shared`                                | Primo suggerito come primary, restanti come secondari                               | FR-MATCH-001/002        |
| Primary cambiato dall'utente a un progetto che era secondario | Il progetto rimosso dai secondari, suggerimenti ricalcolati                         | FR-MATCH-003            |
| Progetto secondario con path non accessibile                  | L'avvio sessione fallisce con errore chiaro dal main (validazione path)             | FR-IPC-001              |
| Chunk tool_result con path che non matcha nessun secondario   | Nessun tag aggiunto, chunk normale                                                  | FR-LOG-001              |

---

## Part 2: Implementation Plan

### Summary

- **Total Tasks:** 12
- **Parallelizable:** 8 (67%)
- **Execution Waves:** 4

### Execution Waves

#### Wave 1 — Shared Types & Pure Logic

**Execution:** PARALLEL

| Task ID | Type      | Title                         | Description                                                                             | Files                                            | Depends On | Complexity |
| ------- | --------- | ----------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- | ---------- |
| T-001   | IMPLEMENT | Estendere types condivisi     | Aggiungere `secondaryProjectIds` a payload, session e RunParams                         | `src/shared/types.ts`, `src/main/agent/types.ts` | None       | S          |
| T-002   | IMPLEMENT | Creare modulo project-matcher | Implementare `selectPrimaryProject()` e `suggestSecondaryProjects()` come funzioni pure | `src/main/agent/project-matcher.ts`              | None       | M          |
| T-003   | TEST      | Test project-matcher          | Unit test delle heuristics con scenari edge                                             | `tests/main/project-matcher.spec.ts`             | None       | M          |

#### Wave 2 — Prompt Builder & Session Manager

**Execution:** PARALLEL (dopo Wave 1)

| Task ID | Type      | Title                               | Description                                                            | Files                                     | Depends On | Complexity |
| ------- | --------- | ----------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- | ---------- | ---------- |
| T-004   | IMPLEMENT | Estendere prompt-builder cross-repo | Aggiungere sezione secondari a `buildAnalyzePrompt` e `buildMcpPrompt` | `src/main/agent/prompt-builder.ts`        | T-001      | M          |
| T-005   | TEST      | Test prompt-builder cross-repo      | Verificare generazione prompt con 0, 1, N secondari                    | `tests/main/agent-prompt-builder.spec.ts` | T-004      | S          |
| T-006   | IMPLEMENT | Estendere SessionManager            | Passare `secondaryProjectIds` nella session e nelle RunParams          | `src/main/agent/session-manager.ts`       | T-001      | S          |
| T-007   | IMPLEMENT | Chunk tagging secondari             | Aggiungere logica di etichettatura chunk per percorsi secondari        | `src/main/agent/session-manager.ts`       | T-001      | S          |

#### Wave 3 — IPC Handler & Preload

**Execution:** SEQUENTIAL (dipende dalla logica main completata)

| Task ID | Type      | Title                              | Description                                                                               | Files                             | Depends On                 | Complexity |
| ------- | --------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- | -------------------------- | ---------- |
| T-008   | IMPLEMENT | Aggiornare IPC handler AGENT_START | Risolvere secondaryProjectIds, validare path, passarli a prompt builder e session manager | `src/main/ipc-handlers.ts`        | T-002, T-004, T-006, T-007 | M          |
| T-009   | TEST      | Test IPC handler con secondari     | Verificare avvio con/senza secondari, errori per path invalidi                            | `tests/main/ipc-handlers.spec.ts` | T-008                      | M          |

#### Wave 4 — Renderer (UI)

**Execution:** PARALLEL

| Task ID | Type      | Title                              | Description                                                                                        | Files                                                         | Depends On   | Complexity |
| ------- | --------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------ | ---------- |
| T-010   | IMPLEMENT | Nuovo componente AnalyzeStartPanel | Sostituire `AnalyzeButton` con panel che include primary dropdown + secondary checkboxes + warning | `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx` | T-001, T-002 | L          |
| T-011   | IMPLEMENT | Aggiornare useAgentSession hook    | Estendere `startSession` per accettare `secondaryProjectIds` e passarli nel payload                | `src/renderer/src/hooks/useAgentSession.ts`                   | T-001        | S          |
| T-012   | TEST      | Test AnalyzeStartPanel             | Testare suggerimenti, selezione, warning, e invocazione onAnalyze                                  | `tests/renderer/AnalyzeStartPanel.spec.tsx`                   | T-010        | M          |

### Critical Path

T-001 → T-004 → T-008 → T-010 (critical path: 4 tasks)

### Task Details

#### T-001: Estendere types condivisi

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. In `src/shared/types.ts`:
     - `AgentStartPayload`: aggiungere `secondaryProjectIds?: string[]`
     - `AgentSession`: aggiungere `secondaryProjectIds: string[]`
  2. In `src/main/agent/types.ts`:
     - `RunParams`: aggiungere `secondaryPaths?: string[]`
- **Acceptance Criteria:** I tipi compilano correttamente; nessun errore TypeScript nel progetto.
- **Testing Approach:** Type-check only (compilation).
- **Output:** 2 file modificati.

#### T-002: Creare modulo project-matcher

- **Type:** IMPLEMENT
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Creare `src/main/agent/project-matcher.ts` con due funzioni pure:
     ```ts
     export function selectPrimaryProject(
       bug: CategorizedBug,
       projects: ProjectEntry[]
     ): string | null
     export function suggestSecondaryProjects(primaryId: string, projects: ProjectEntry[]): string[]
     ```
  2. `selectPrimaryProject`:
     - Calcolare uno score per ogni progetto basato su:
       - `areaPath` contiene keyword del progetto (+2)
       - `tags` del bug matchano keyword del progetto (+2 per tag matchato)
       - `macroCategory` o `subCategory` matchano keyword (+1)
       - `title` del bug contiene keyword (+1 per keyword)
       - `type` del progetto allineato a segnali del bug (es. areaPath contiene "Backend" e progetto è `backend`) (+1)
     - Restituire l'id del progetto con score più alto, oppure `null` se score max < 2 (soglia "match forte").
  3. `suggestSecondaryProjects`:
     - Filtrare fuori il primary.
     - Aggiungere tutti i `shared`.
     - Se primary è `backend`, aggiungere `frontend` e viceversa.
     - Restituire array di id (massimo tutti quelli che matchano le regole).
- **Acceptance Criteria:** Le funzioni sono pure, non accedono allo store, e restituiscono risultati deterministici.
- **Testing Approach:** TDD — scrivere test prima dell'implementazione (T-003 in parallelo).
- **Output:** `src/main/agent/project-matcher.ts`

#### T-003: Test project-matcher

- **Type:** TEST
- **Wave:** 1 — PARALLEL
- **Implementation Notes:**
  1. Creare `tests/main/project-matcher.spec.ts`.
  2. Scenari:
     - Bug con areaPath "Backend\\Payments" matcha progetto con keywords ["payments"].
     - Bug senza match forte → `null`.
     - Un solo progetto → sempre suggerito come primary (score >= 2 per default? No, solo se match).
     - `suggestSecondaryProjects`: con primary backend, shared+frontend suggeriti.
     - `suggestSecondaryProjects`: con primary frontend, shared+backend suggeriti.
     - `suggestSecondaryProjects`: tutti shared → suggeriti tutti tranne primary.
     - `suggestSecondaryProjects`: 1 progetto → array vuoto.
- **Acceptance Criteria:** Tutti i test passano con `npx vitest run tests/main/project-matcher.spec.ts`.
- **Testing Approach:** Unit test puri.
- **Output:** `tests/main/project-matcher.spec.ts`

#### T-004: Estendere prompt-builder cross-repo

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Aggiungere parametro opzionale `secondaryProjects?: ProjectEntry[]` a `buildAnalyzePrompt` e `buildMcpPrompt`.
  2. Se `secondaryProjects` è vuoto o undefined, nessuna sezione aggiunta.
  3. Se presente, aggiungere dopo "## Project Context":

     ```
     ## Secondary Projects (read-only context)

     | Project | Path | Type | Description |
     |---------|------|------|-------------|
     | name1   | /abs/path | backend | desc |
     ```

  4. Aggiungere nelle istruzioni al task: "You may also read files from the secondary projects listed above for additional context. These projects are read-only references."

- **Acceptance Criteria:** Il prompt include la sezione solo quando secondaryProjects ha elementi; i path sono assoluti.
- **Testing Approach:** Post-implementation (T-005).
- **Output:** `src/main/agent/prompt-builder.ts` modificato.

#### T-005: Test prompt-builder cross-repo

- **Type:** TEST
- **Wave:** 2 — PARALLEL (dopo T-004)
- **Implementation Notes:**
  1. Estendere `tests/main/agent-prompt-builder.spec.ts` con nuovi test:
     - `buildAnalyzePrompt` senza secondari → no sezione.
     - `buildAnalyzePrompt` con 2 secondari → sezione presente con path e nomi.
     - `buildMcpPrompt` con secondari → sezione presente.
     - Verificare che path assoluti compaiono nel prompt.
- **Acceptance Criteria:** Test passano.
- **Testing Approach:** Unit test.
- **Output:** `tests/main/agent-prompt-builder.spec.ts` modificato.

#### T-006: Estendere SessionManager

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Aggiungere `secondaryProjectIds: string[]` al parametro di `start()`.
  2. Salvare il campo nella `currentSession`.
  3. Aggiungere `secondaryPaths` al blocco `runParams` passato al runner.
- **Acceptance Criteria:** La session creata contiene `secondaryProjectIds`; il runner riceve `secondaryPaths`.
- **Testing Approach:** Aggiornare test esistente `tests/main/agent-session-manager.spec.ts`.
- **Output:** `src/main/agent/session-manager.ts` modificato.

#### T-007: Chunk tagging secondari

- **Type:** IMPLEMENT
- **Wave:** 2 — PARALLEL
- **Implementation Notes:**
  1. Nel callback `onChunk` dentro `SessionManager.runSession`, se `chunk.type === 'tool_result'` e il `chunk.content` contiene un path che è sotto uno dei `secondaryPaths`, prepend `[secondary:{projectName}]` al content.
  2. Implementare helper inline `tagSecondaryChunk(chunk, secondaryPaths, secondaryNames)`.
  3. I `secondaryPaths` e nomi vengono passati come parte del contesto della sessione.
- **Acceptance Criteria:** Chunk da percorsi secondari hanno il tag; chunk da primary o senza path non vengono modificati.
- **Testing Approach:** Unit test nel file session-manager spec.
- **Output:** `src/main/agent/session-manager.ts` modificato.

#### T-008: Aggiornare IPC handler AGENT_START

- **Type:** IMPLEMENT
- **Wave:** 3 — SEQUENTIAL
- **Implementation Notes:**
  1. Estrarre `secondaryProjectIds` da payload (default `[]`).
  2. Risolvere `secondaryProjects: ProjectEntry[]` da `settings.projects`.
  3. Validare che tutti i path secondari siano accessibili (come già fatto per primary); se uno fallisce, restituire errore.
  4. Passare `secondaryProjects` a `buildAnalyzePrompt` / `buildMcpPrompt`.
  5. Passare `secondaryProjectIds` e `secondaryPaths` al `sessionManager.start()`.
  6. Includere `secondaryProjectIds` nel return value.
- **Acceptance Criteria:** L'handler gestisce correttamente 0 e N secondari; errore chiaro se un path non è accessibile.
- **Testing Approach:** Post-implementation (T-009).
- **Output:** `src/main/ipc-handlers.ts` modificato.

#### T-009: Test IPC handler con secondari

- **Type:** TEST
- **Wave:** 3 — SEQUENTIAL (dopo T-008)
- **Implementation Notes:**
  1. In `tests/main/ipc-handlers.spec.ts`, aggiungere casi:
     - Avvio con 0 secondari → successo, session senza secondari.
     - Avvio con 2 secondari validi → successo, prompt contiene sezione.
     - Avvio con 1 secondario con path invalido → errore.
- **Acceptance Criteria:** Test passano.
- **Testing Approach:** Integration test con mock store/runner.
- **Output:** `tests/main/ipc-handlers.spec.ts` modificato.

#### T-010: Nuovo componente AnalyzeStartPanel

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Creare `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`.
  2. Props: `bugId`, `bug: CategorizedBug`, `projects: ProjectEntry[]`, `onAnalyze: (bugId, primaryId, secondaryIds) => void`, `isAnalyzing: boolean`.
  3. Internamente:
     - Usare `selectPrimaryProject` (importato come logica pura duplicata nel renderer oppure esposto via IPC).
       - **Decisione:** duplicare la logica nel renderer come `src/renderer/src/lib/project-matcher.ts` (stesse funzioni pure, import da shared types). Questo evita una chiamata IPC sincrona.
     - Dropdown primary pre-selezionato.
     - Checkboxes secondari con suggeriti pre-checkati tramite `suggestSecondaryProjects`.
     - Warning arancione se > 3 secondari selezionati.
  4. Aggiornare `BugDetailDrawer.tsx` per usare `AnalyzeStartPanel` al posto di `AnalyzeButton`.
  5. Aggiornare `handleAnalyze` in `DashboardPage.tsx` per accettare `secondaryProjectIds`.
- **Acceptance Criteria:** Il dialog mostra primary suggerito, secondari suggeriti, warning funzionante; invocazione corretta.
- **Testing Approach:** Component test (T-012).
- **Output:** `src/renderer/src/components/dashboard/AnalyzeStartPanel.tsx`, `src/renderer/src/lib/project-matcher.ts`, file drawer e page aggiornati.

#### T-011: Aggiornare useAgentSession hook

- **Type:** IMPLEMENT
- **Wave:** 4 — PARALLEL
- **Implementation Notes:**
  1. Modificare `startSession` signature: `(bugId: number, primaryProjectId: string, secondaryProjectIds?: string[]) => Promise<void>`.
  2. Passare `secondaryProjectIds` nel payload di `api.agentStart`.
  3. Includere `secondaryProjectIds` nella session locale.
- **Acceptance Criteria:** Hook compila, sessione locale include secondari.
- **Testing Approach:** Aggiornare test esistente (se presente) o coprire in T-012.
- **Output:** `src/renderer/src/hooks/useAgentSession.ts` modificato.

#### T-012: Test AnalyzeStartPanel

- **Type:** TEST
- **Wave:** 4 — PARALLEL (dopo T-010)
- **Implementation Notes:**
  1. Creare `tests/renderer/AnalyzeStartPanel.spec.tsx`.
  2. Scenari:
     - Render con 3 progetti: primary suggerito selezionato, shared pre-checkato.
     - Selezione di 4 secondari mostra warning.
     - Cambio primary rimuove il progetto dai secondari.
     - Click "Analizza" chiama onAnalyze con primary + secondari.
     - 0 progetti → messaggio.
- **Acceptance Criteria:** Test passano con `npx vitest run tests/renderer/AnalyzeStartPanel.spec.tsx`.
- **Testing Approach:** Component test con jsdom + mock.
- **Output:** `tests/renderer/AnalyzeStartPanel.spec.tsx`

### Risk Register

| Risk                                                                      | Impact | Likelihood | Mitigation                                                                                                     |
| ------------------------------------------------------------------------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------- |
| Match heuristics produce suggerimenti fuorvianti con keyword generiche    | Medium | Medium     | Soglia minima score=2; UI mostra sempre "suggerito" senza forzare                                              |
| Duplicazione logica project-matcher tra main e renderer diverge nel tempo | Low    | Medium     | Estrarre in `src/shared/project-matcher.ts` se il build tool lo permette; altrimenti test identici su entrambi |
| Prompt troppo lungo con molti secondari riduce qualità LLM                | Medium | Low        | Warning UI a 3 secondari; nota nel prompt che i secondari sono solo contesto                                   |
| Path secondari su disco non accessibili al momento dell'analisi           | Low    | Low        | Validazione in IPC handler prima di avviare la sessione                                                        |

---

### Completeness Assessment

- Functional coverage: **High** — tutte le FR-REPO e FR aggiuntive mappate a task
- Non-functional coverage: **High** — performance, UX, manutenibilità coperti
- Task-to-requirement mapping: **Complete**

| Requirement   | Tasks               |
| ------------- | ------------------- |
| FR-MATCH-001  | T-002, T-003, T-010 |
| FR-MATCH-002  | T-002, T-003, T-010 |
| FR-MATCH-003  | T-010, T-011        |
| FR-UI-001     | T-010, T-012        |
| FR-UI-002     | T-010, T-012        |
| FR-IPC-001    | T-001, T-008, T-011 |
| FR-IPC-002    | T-001, T-006, T-008 |
| FR-IPC-003    | T-001, T-006, T-008 |
| FR-PROMPT-001 | T-004, T-005, T-008 |
| FR-PROMPT-002 | T-004, T-005, T-008 |
| FR-PROMPT-003 | T-004, T-005        |
| FR-LOG-001    | T-007, T-009        |

### Status

**APPROVED**

---

## Decisions (User Confirmed)

1. **Logica matcher nel renderer:** IPC dedicato (`AGENT_SUGGEST_PROJECTS`). Se c'è latenza percepita, implementare un loader. Nessuna duplicazione di codice.
2. **Soglia match forte:** score >= 3 (almeno 3 segnali convergenti o un singolo segnale molto forte).
3. **Single-project UX:** Auto-select silenzioso — se esiste un solo progetto, skip del dropdown e avvio diretto.
