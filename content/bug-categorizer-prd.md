**Bug Categorizer Dashboard**

Product Requirements Document

Versione 1.0 \| Piattaforma: Electron + TypeScript

Stato: Draft \| Data: 2026

# Indice

[Indice [2](#indice)](#indice)

[1. Executive Summary [4](#executive-summary)](#executive-summary)

[1.1 Decision Log --- Scelte architetturali chiave [4](#decision-log-scelte-architetturali-chiave)](#decision-log-scelte-architetturali-chiave)

[2. Contesto e Problema [5](#contesto-e-problema)](#contesto-e-problema)

[2.1 Situazione attuale [5](#situazione-attuale)](#situazione-attuale)

[2.2 Problema [5](#problema)](#problema)

[2.3 Utenti target [5](#utenti-target)](#utenti-target)

[3. Obiettivi e Success Criteria [6](#obiettivi-e-success-criteria)](#obiettivi-e-success-criteria)

[3.1 Obiettivi di prodotto [6](#obiettivi-di-prodotto)](#obiettivi-di-prodotto)

[3.2 Success Criteria (verificabili) [6](#success-criteria-verificabili)](#success-criteria-verificabili)

[4. Architettura e Stack Tecnico [7](#architettura-e-stack-tecnico)](#architettura-e-stack-tecnico)

[4.1 Stack [7](#stack)](#stack)

[4.2 Architettura Electron --- IPC Security [7](#architettura-electron-ipc-security)](#architettura-electron-ipc-security)

[4.3 LLM Provider Abstraction [7](#llm-provider-abstraction)](#llm-provider-abstraction)

[4.4 Strategia Chunking e Progressività [8](#strategia-chunking-e-progressività)](#strategia-chunking-e-progressività)

[5. User Stories [9](#user-stories)](#user-stories)

[6. Feature Breakdown --- Sviluppo Agentifico [10](#feature-breakdown-sviluppo-agentico)](#feature-breakdown-sviluppo-agentico)

[FT-01 --- Scaffold Electron + Infrastruttura Base [10](#ft-01-scaffold-electron-infrastruttura-base)](#ft-01-scaffold-electron-infrastruttura-base)

[Scope [10](#scope)](#scope)

[Criteri di Accettazione [10](#criteri-di-accettazione)](#criteri-di-accettazione)

[FT-02 --- Pagina Settings e Persistenza Configurazione [10](#ft-02-pagina-settings-e-persistenza-configurazione)](#ft-02-pagina-settings-e-persistenza-configurazione)

[Scope [10](#scope-1)](#scope-1)

[Criteri di Accettazione [11](#criteri-di-accettazione-1)](#criteri-di-accettazione-1)

[FT-03 --- Recupero Bug da Azure DevOps [11](#ft-03-recupero-bug-da-azure-devops)](#ft-03-recupero-bug-da-azure-devops)

[Scope [11](#scope-2)](#scope-2)

[Criteri di Accettazione [12](#criteri-di-accettazione-2)](#criteri-di-accettazione-2)

[Note tecniche --- v2 backlog [12](#note-tecniche-v2-backlog)](#note-tecniche-v2-backlog)

[FT-04 --- LLM Provider Abstraction e Categorizzazione [12](#ft-04-llm-provider-abstraction-e-categorizzazione)](#ft-04-llm-provider-abstraction-e-categorizzazione)

[Scope [12](#scope-3)](#scope-3)

[Criteri di Accettazione [13](#criteri-di-accettazione-3)](#criteri-di-accettazione-3)

[FT-05 --- Dashboard Principale: Tabella, Filtri e Raggruppamenti [13](#ft-05-dashboard-principale-tabella-filtri-e-raggruppamenti)](#ft-05-dashboard-principale-tabella-filtri-e-raggruppamenti)

[Scope [13](#scope-4)](#scope-4)

[Criteri di Accettazione [14](#criteri-di-accettazione-4)](#criteri-di-accettazione-4)

[FT-06 --- Pannello Dettaglio Bug (Drawer) [14](#ft-06-pannello-dettaglio-bug-drawer)](#ft-06-pannello-dettaglio-bug-drawer)

[Scope [14](#scope-5)](#scope-5)

[Criteri di Accettazione [15](#criteri-di-accettazione-5)](#criteri-di-accettazione-5)

[FT-07 --- Persistenza Dati e Gestione Sessione [15](#ft-07-persistenza-dati-e-gestione-sessione)](#ft-07-persistenza-dati-e-gestione-sessione)

[Scope [15](#scope-6)](#scope-6)

[Criteri di Accettazione [15](#criteri-di-accettazione-6)](#criteri-di-accettazione-6)

[7. Prompt LLM --- Specifiche [16](#prompt-llm-specifiche)](#prompt-llm-specifiche)

[7.1 System Prompt (standard) [16](#system-prompt-standard)](#system-prompt-standard)

[7.2 User Message per Chunk [16](#user-message-per-chunk)](#user-message-per-chunk)

[7.3 Gestione Risposta Malformata [16](#gestione-risposta-malformata)](#gestione-risposta-malformata)

[8. Gestione Errori --- Matrice [17](#gestione-errori-matrice)](#gestione-errori-matrice)

[9. Roadmap [18](#roadmap)](#roadmap)

[9.1 v1 --- Scope corrente (questo PRD) [18](#v1-scope-corrente-questo-prd)](#v1-scope-corrente-questo-prd)

[9.2 v2 --- Backlog tracciato [18](#v2-backlog-tracciato)](#v2-backlog-tracciato)

[10. Fuori Scope (v1) [19](#fuori-scope-v1)](#fuori-scope-v1)

[11. Tipi TypeScript Condivisi (Riferimento) [20](#tipi-typescript-condivisi-riferimento)](#tipi-typescript-condivisi-riferimento)

# 1. Executive Summary {#executive-summary}

Bug Categorizer Dashboard è un\'applicazione desktop (Electron) che consente a team QA, PM e sviluppatori di recuperare bug da Azure DevOps tramite Saved Query, categorizzarli automaticamente mediante un Large Language Model e visualizzarli in una dashboard interattiva con filtri, raggruppamenti e pannello di dettaglio.

L\'applicativo sostituisce processi manuali basati su script PowerShell e categorizzazione a keyword, portando intelligenza semantica direttamente nel flusso di lavoro quotidiano --- completamente offline rispetto ai dati, con tutto il processing in locale.

## 1.1 Decision Log --- Scelte architetturali chiave {#decision-log-scelte-architetturali-chiave}

| **Decisione**    | **Scelta**                                   | **Motivazione**                                                                        |
|------------------|----------------------------------------------|----------------------------------------------------------------------------------------|
| Runtime          | Electron (desktop)                           | Sicurezza: API keys mai in rete; persistenza su filesystem; nessun server da mantenere |
| Persistenza      | electron-store / SQLite                      | File locali con crittografia opzionale; nessun DB remoto; refresh dati configurabile   |
| LLM Chunking     | Batch di 10-20 bug per chiamata              | Bilancia qualità (no allucinazioni da contesto enorme) e numero di richieste API       |
| Progressività    | UI aggiorna chunk per chunk                  | UX reattiva: i bug categorizzati appaiono man mano, no spinner globale                 |
| LLM Provider     | OpenAI / Claude / GitHub Copilot / Gemini    | Interfaccia astratta che gestisce i provider tramite relative SDK                      |
| Categorie        | Lista piatta in v1, gerarchica in v2         | Semplicità di implementazione e prompt; struttura predisposta per evoluzione           |
| HTML→Testo       | Strip tags in v1, cheerio/linkedom in v2     | Gestione base sufficiente per testo; tracciamento per tabelle e immagini embedded      |
| Auth ADO         | Basic auth con PAT                           | Standard Azure DevOps REST API; PAT mai trasmesso in rete (tutto locale Electron)      |
| Design Reference | design.html come riferimento visivo primario | Guida layout, gerarchia visiva, spacing e stile dei componenti durante lo sviluppo     |

# 2. Contesto e Problema {#contesto-e-problema}

## 2.1 Situazione attuale {#situazione-attuale}

I team che utilizzano Azure DevOps per il tracciamento dei bug dipendono attualmente da:

- Script PowerShell eseguiti manualmente per esportare bug da Saved Query

- Categorizzazione basata su keyword matching --- fragile, rigida, richiedente manutenzione continua

- Nessuna vista aggregata interattiva: i dati vivono in Excel o in DevOps stesso

- Ogni cambio di tassonomia richiede aggiornamento degli script

## 2.2 Problema {#problema}

L\'assenza di uno strumento dedicato causa:

- Overhead operativo elevato per QA lead e PM nella fase di analisi settimanale/sprint

- Categorizzazione incoerente tra team members

- Impossibilità di identificare pattern e cluster di bug in modo rapido

- Dipendenza da developer per modifiche agli script

## 2.3 Utenti target {#utenti-target}

| **Ruolo** | **Bisogno primario**                                                | **Frequenza utilizzo** |
|-----------|---------------------------------------------------------------------|------------------------|
| QA Lead   | Configurare connessioni, monitorare qualità categorizzazione        | Giornaliera            |
| PM        | Analizzare pattern bug, filtrare per sprint/area, esportare insight | Più volte a settimana  |
| Developer | Verificare bug assegnati, filtrare per componente                   | A richiesta            |

# 3. Obiettivi e Success Criteria {#obiettivi-e-success-criteria}

## 3.1 Obiettivi di prodotto {#obiettivi-di-prodotto}

- Eliminare la dipendenza da script manuali per recupero e categorizzazione bug

- Fornire una tassonomia semantica automatica e personalizzabile

- Ridurre il tempo di analisi settimanale dei bug del team da ore a minuti

- Garantire sicurezza delle credenziali senza infrastruttura server

## 3.2 Success Criteria (verificabili) {#success-criteria-verificabili}

| **\#** | **Criterio**                                                                                                                              | **Metrica**                                 |
|--------|-------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| 1      | Configurazione persistente: parametri (Org, Project, Query ID, PAT, LLM provider, API key ove prevista) sopravvivono al riavvio dell\'app | Dati presenti nel config store dopo restart |
| 2      | Caricamento bug: fino a 200 bug recuperati dalla Saved Query via REST API in meno di 10 secondi                                           | Tempo misurato in app, success rate \>99%   |
| 3      | Categorizzazione LLM: macro-categoria, sotto-categoria e motivazione assegnate a ciascun bug in chunk progressivi                         | 100% dei bug categorizzati al completamento |
| 4      | Multi-provider: cambio provider (OpenAI ↔ Claude ↔ GitHub Copilot↔Gemini) senza modifiche al codice                                       | Test funzionale su tutti e 4 i provider     |
| 5      | Filtri e raggruppamenti aggiornano la vista in tempo reale (\<100ms)                                                                      | Latenza UI misurata su dataset 200 bug      |
| 6      | Pannello dettaglio mostra tutte le informazioni inclusa motivazione LLM                                                                   | Verifica visiva su campione bug             |
| 7      | KPI aggiornate dinamicamente al variare dei filtri (riflettono selezione corrente)                                                        | Confronto KPI pre/post filtro               |
| 8      | Errori (PAT errato, credenziali provider non valide, rete) mostrano messaggi comprensibili                                                | Test error path su ciascun tipo di errore   |

# 4. Architettura e Stack Tecnico {#architettura-e-stack-tecnico}

## 4.1 Stack {#stack}

| **Layer**          | **Tecnologia**                                               | **Note**                                                                             |
|--------------------|--------------------------------------------------------------|--------------------------------------------------------------------------------------|
| Desktop runtime    | Electron 30+                                                 | Main process + Renderer; IPC per comunicazione sicura                                |
| UI Framework       | React 18 + TypeScript                                        | Renderer Electron via Vite o electron-vite                                           |
| Styling            | Tailwind CSS                                                 | Utility-first; componenti UI con shadcn/ui o Radix                                   |
| Persistenza config | electron-store (JSON cifrato)                                | API keys e PAT memorizzati in store locale; sessione Copilot delegata a SDK/keychain |
| Persistenza dati   | electron-store o SQLite (better-sqlite3)                     | Bug + categorizzazioni tra sessioni                                                  |
| Azure DevOps       | REST API v7.x                                                | WIQL endpoint + Work Items batch; auth Basic+PAT                                     |
| LLM Providers      | OpenAI SDK / Anthropic SDK / GitHub Copilot SDK / Gemini SDK | Interfaccia astratta LLMProvider; chunking 10-20 bug                                 |
| HTML→Testo         | Strip tags custom v1; cheerio v2                             | Gestione descrizioni bug da Azure DevOps                                             |

## 4.2 Architettura Electron --- IPC Security {#architettura-electron-ipc-security}

In Electron, le chiamate alle API esterne (Azure DevOps, LLM providers) avvengono esclusivamente nel Main Process, mai nel Renderer. Il Renderer comunica tramite IPC (ipcRenderer/ipcMain) con handler dedicati. Le credenziali provider non sono mai accessibili dal codice del Renderer.

| **Processo**     | **Responsabilità**                                                       | **Accesso**                                        |
|------------------|--------------------------------------------------------------------------|----------------------------------------------------|
| Main Process     | Chiamate HTTP a ADO e LLM; lettura/scrittura store; gestione credenziali | Filesystem, rete, store cifrato                    |
| Renderer (React) | UI, stato applicazione, visualizzazione dati, filtri                     | Solo IPC --- nessun accesso diretto a rete o store |
| Preload Script   | Bridge IPC sicuro con contextBridge; espone API whitelisted              | API selezionate da Main al Renderer                |

## 4.3 LLM Provider Abstraction {#llm-provider-abstraction}

Interfaccia TypeScript condivisa implementata da ciascun provider:

| Provider         | SDK / Libreria      | Auth                                                        |
|------------------|---------------------|-------------------------------------------------------------|
| OpenAI           | openai SDK          | Bearer API key                                              |
| Anthropic Claude | @anthropic-ai/sdk   | x-api-key header                                            |
| Gemini Google    | @google/genai       | API key from Google AI Studio                               |
| GitHub Copilot   | @github/copilot-sdk | Utente GitHub autenticato (Copilot CLI in v1 / OAuth in v2) |

Il chunking opera a livello dell\'interfaccia LLMProvider: ogni implementazione riceve un array di bug (chunk da N elementi) e restituisce CategorizedBug\[\]. Il chiamante gestisce la progressività e l\'aggregazione dei risultati.

## 4.4 Strategia Chunking e Progressività {#strategia-chunking-e-progressività}

- Chunk size configurabile (default 15, range 5-30) --- esposto in Settings avanzate

- Chiamate LLM sequenziali per chunk (evita rate limit); concurrency opzionale in v2

- Per ogni chunk completato, il Renderer riceve i dati via IPC e aggiorna la UI immediatamente

- Barra di avanzamento: X/N bug categorizzati, con stima tempo rimanente

- Errori su singolo chunk: messaggio non bloccante, possibilità di retry su quel chunk

# 5. User Stories {#user-stories}

| **\#** | **Ruolo**   | **Voglio\...**                                                                           | **Così che\...**                                                    |
|--------|-------------|------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| US-01  | QA Lead     | Configurare connessione ADO e provider LLM una volta sola                                | Non devo reinserire i parametri ad ogni sessione                    |
| US-02  | PM          | Caricare i bug di una Saved Query con un click                                           | Vedo subito i dati aggiornati senza script manuali                  |
| US-03  | PM          | Avviare la categorizzazione LLM e vedere i risultati man mano                            | Posso iniziare l\'analisi mentre l\'elaborazione prosegue           |
| US-04  | PM          | Definire categorie personalizzate (o lasciar decidere al sistema)                        | La tassonomia riflette il vocabolario del mio team                  |
| US-05  | Developer   | Selezionare il provider LLM disponibile e usare l\'autenticazione richiesta dal provider | Non sono vincolato a un singolo fornitore                           |
| US-06  | Team member | Filtrare bug per stato, assegnatario, categoria e testo libero                           | Mi concentro sui bug rilevanti per me                               |
| US-07  | Team member | Raggruppare i bug per macro-categoria, sotto-categoria o assegnatario                    | Identifico cluster e aree problematiche a colpo d\'occhio           |
| US-08  | QA Lead     | Aprire il pannello dettaglio di un bug e leggere la motivazione LLM                      | Valuto la qualità della categorizzazione e intervengo se necessario |
| US-09  | Utente      | Vedere messaggi di errore chiari per PAT scaduto o autenticazione provider fallita       | So esattamente come risolvere il problema                           |
| US-10  | PM          | Avere KPI aggiornate dinamicamente in base ai filtri attivi                              | Le metriche riflettono sempre la vista corrente                     |

# 6. Feature Breakdown --- Sviluppo Agentico {#feature-breakdown-sviluppo-agentico}

Il progetto viene suddiviso in 7 feature indipendenti, sviluppabili sequenzialmente da un agente. Ogni feature ha confini chiari, deliverable definiti e criteri di accettazione verificabili. L\'ordine riflette le dipendenze tecniche.

## FT-01 --- Scaffold Electron + Infrastruttura Base {#ft-01-scaffold-electron-infrastruttura-base}

**Priorità:** Critica --- prerequisito per tutte le altre feature

**User Stories:** ---

**Dipendenze:** Nessuna

### Scope

- Inizializzazione progetto Electron con electron-vite (Vite + React + TypeScript)

- Configurazione Main Process, Renderer, Preload Script con contextBridge

- Struttura cartelle: src/main, src/renderer, src/preload, src/shared (tipi TypeScript condivisi)

- Installazione dipendenze base: Tailwind CSS, electron-store, shadcn/ui (o Radix UI)

- IPC boilerplate: pattern di comunicazione Main↔Renderer con handler tipizzati

- electron-store configurato con cifratura (encryptionKey derivata da machineId)

- Script npm: dev, build, package (electron-builder configurato per Windows/macOS/Linux)

- ESLint + Prettier + path aliases configurati

- Componente shell dell\'applicazione: layout con topbar di navigazione (Dashboard / Settings) coerente con design.html

Riferimento design: seguire design.html per font Inter, topbar bianca con branding, fondo gray-50, card bianche con border/shadow leggere e linguaggio visuale clean corporate

### Criteri di Accettazione

1.  npm run dev avvia l\'app Electron senza errori

2.  La topbar mostra le voci di navigazione e il routing funziona

3.  electron-store persiste un valore di test tra riavvii dell\'app

4.  npm run build genera un eseguibile distribuibile

5.  contextBridge espone correttamente le API IPC al Renderer senza node integration

## FT-02 --- Pagina Settings e Persistenza Configurazione {#ft-02-pagina-settings-e-persistenza-configurazione}

**Priorità:** Critica

**User Stories:** US-01, US-05

**Dipendenze:** FT-01

### Scope

- Form Settings con validazione in tempo reale per i seguenti campi:

  - Organization URL Azure DevOps (URL validation)

  - Project name (non vuoto)

  - Saved Query ID (UUID format)

  - Top N bugs da caricare (intero, 1-200, default 20)

  - Provider LLM: select OpenAI / Anthropic Claude / GitHub Copilot / Gemini

  - API Key del provider selezionato (campo password, visibilità toggle) per OpenAI / Claude

GitHub Copilot: nessuna API key manuale; usa la sessione GitHub autenticata disponibile tramite Copilot SDK

- PAT Azure DevOps (campo password, visibilità toggle)

- Chunk size per categorizzazione LLM (intero, 5-30, default 15)

<!-- -->

- Sezione Categorie: textarea o lista editabile di stringhe (lista piatta); pulsante reset a default; nota UX che le categorie vuote attivano auto-categorizzazione

- Persistenza via electron-store (Main Process); IPC handler per get/set configurazione

- Pulsante Save con feedback visivo; pulsante Test Connection per ADO e per LLM (ping)

- Nota UX visibile: le credenziali sono salvate localmente in forma cifrata o nel keychain di sistema, a seconda del provider

Nota UX: durante lo sviluppo, design.html va considerato il riferimento visivo primario per struttura, densità informativa e tono dell'interfaccia

### Criteri di Accettazione

1.  Tutti i campi vengono salvati e recuperati correttamente al riavvio

2.  Validazione impedisce il salvataggio con campi obbligatori vuoti o malformati

3.  Test Connection ADO restituisce feedback entro 5 secondi (successo o errore leggibile)

4.  Test Connection LLM restituisce feedback entro 5 secondi

5.  Cambio provider LLM aggiorna i campi di autenticazione: API key per OpenAI/Claude/Gemini; stato sessione GitHub per Copilot

6.  La lista categorie viene salvata e ripristinata correttamente

## FT-03 --- Recupero Bug da Azure DevOps {#ft-03-recupero-bug-da-azure-devops}

**Priorità:** Critica

**User Stories:** US-02

**Dipendenze:** FT-01, FT-02

### Scope

- IPC handler nel Main Process: fetchBugsFromQuery()

- Fase 1: chiamata GET \_apis/wit/wiql/{queryId}?api-version=7.0 per ottenere la lista di Work Item IDs dalla Saved Query

- Fase 2: chiamata GET \_apis/wit/workitems?ids={csv}&fields={fields}&api-version=7.0 in batch da massimo 200 IDs per chiamata

- Campi recuperati: ID, titolo, stato, assegnatario, area path, descrizione (HTML), priorità, data creazione, data modifica, tag

- Autenticazione: Basic auth con header Authorization: Basic base64(\':\' + PAT)

- Conversione HTML→testo per il campo descrizione: utility TypeScript (strip tags, decode HTML entities, normalizza whitespace multipli/newline)

- Gestione paginazione se il risultato WIQL supera i 200 IDs (loop su batch)

- Rispetto del limite Top N configurato in Settings

- Gestione errori tipizzata: PAT non valido (401), query non trovata (404), rete non raggiungibile, timeout 30s

- Architettura predisposta per future query WIQL custom (strategy pattern: QueryStrategy interface)

### Criteri di Accettazione

1.  Bug recuperati correttamente da una Saved Query reale con PAT valido

2.  Limite Top N rispettato (non vengono caricati più bug del configurato)

3.  PAT non valido genera errore con messaggio \'PAT non valido o scaduto\'

4.  Query ID non trovato genera errore con messaggio \'Query non trovata\'

5.  La descrizione HTML viene convertita in testo leggibile (no tag residui)

6.  Dataset di 200 bug recuperato in meno di 10 secondi su connessione standard

### Note tecniche --- v2 backlog {#note-tecniche-v2-backlog}

- Supporto HTML ricco (tabelle, liste annidate, immagini) via cheerio o linkedom

- Supporto WIQL custom come modalità alternativa di input (QueryStrategy: SavedQuery \| CustomWIQL)

## FT-04 --- LLM Provider Abstraction e Categorizzazione {#ft-04-llm-provider-abstraction-e-categorizzazione}

**Priorità:** Alta

**User Stories:** US-03, US-04, US-05

**Dipendenze:** FT-01, FT-02, FT-03

### Scope

- Interfaccia TypeScript LLMProvider nel Main Process:

  - Metodo: categorizeBugChunk(bugs: BugItem\[\], categories?: string\[\]): Promise\<CategorizedBug\[\]\>

  - Quattro implementazioni concrete: OpenAIProvider, AnthropicProvider, GitHubCopilotProvider, GeminiProvider

  - Factory function che istanzia il provider corretto in base alla configurazione

- Logica di chunking: splitIntoChunks(bugs, chunkSize) --- array di array

- IPC handler: categorizeBugs(bugIds) --- itera sui chunk, per ogni chunk completato invia update progressivo al Renderer via ipcMain.emit o webContents.send

- Schema JSON della risposta LLM atteso: { results: \[{ bugId, macroCategory, subCategory, categoryReason }\] }

- System prompt standard (vedi sezione 7) --- iniettato automaticamente; categorie opzionali come vincolo

- Gestione errori LLM: rate limit (retry con backoff esponenziale), API key invalida o sessione Copilot non autenticata, timeout, risposta malformata (JSON parse error con fallback a categoria \'Non categorizzato\')

- GitHub Copilot: integrazione tramite @github/copilot-sdk con CopilotClient(); autenticazione tramite utente GitHub già autenticato (Copilot CLI) in v1, modello gpt-4.1 o configurabile

### Criteri di Accettazione

1.  Tutti e 4 i provider producono output con lo stesso schema JSON

2.  Il Renderer riceve aggiornamenti progressivi (chunk per chunk) durante la categorizzazione

3.  Con categorie personalizzate definite, l\'LLM le usa come vincolo

4.  Con categorie vuote, l\'LLM auto-categorizza liberamente

5.  Rate limit genera retry automatico (max 3 tentativi con backoff)

6.  API key invalida o sessione Copilot non autenticata genera messaggio di errore specifico nel Renderer

7.  JSON malformato nella risposta LLM non crasha l\'app (fallback a \'Non categorizzato\')

## FT-05 --- Dashboard Principale: Tabella, Filtri e Raggruppamenti {#ft-05-dashboard-principale-tabella-filtri-e-raggruppamenti}

**Priorità:** Alta

**User Stories:** US-06, US-07, US-10

**Dipendenze:** FT-01, FT-03, FT-04

### Scope

- Layout dashboard: KPI cards in alto, controlli filtro/raggruppamento, vista principale

- KPI cards (aggiornate dinamicamente al variare dei filtri):

  - Bug totali nel filtro corrente

  - Bug aperti nel filtro corrente

  - Numero di macro-categorie distinte

  - Top 3 assegnatari per numero bug

- Filtri (tutti combinabili, aggiornano la vista in real-time):

  - Stato (multi-select: Active, Resolved, Closed, \...)

  - Assegnatario (multi-select con ricerca)

  - Macro-categoria (multi-select)

  - Sotto-categoria (multi-select, dipendente dalla macro-categoria selezionata)

  - Testo libero su titolo e descrizione (debounce 200ms)

- Toggle vista tabella / vista card

- Vista tabella: colonne ID, Titolo, Stato, Assegnatario, Area Path, Macro-cat, Sotto-cat, con sorting per colonna (click header)

- Vista card: card per bug con badge colorati per stato e categoria; evidenza visiva cluster (stessa sotto-categoria = colore sfondo identico nel gruppo)

- Raggruppamento: nessuno / per macro-categoria / per sotto-categoria / per assegnatario --- intestazioni di gruppo con contatore bug

- Pulsante Reset Filtri

- Badge colorati: stato (Active=rosso, Resolved=verde, Closed=grigio) e categoria (colori assegnati deterministicamente dalla stringa categoria)

Riferimento design: la dashboard deve richiamare design.html con gerarchia composta da topbar, header azioni, KPI cards, filter bar compatta e lista raggruppata in accordion/table hybrid con superfici bianche, bordi sottili e accenti indigo/purple

### Criteri di Accettazione

1.  Filtri aggiornano la lista bug in meno di 100ms su dataset da 200 bug

2.  KPI riflettono sempre i bug nella vista filtrata corrente

3.  Sorting per colonna funziona correttamente (asc/desc, toggle)

4.  Raggruppamento mostra intestazioni di gruppo con contatore

5.  Bug con stessa sotto-categoria hanno evidenza visiva coerente in vista card

6.  Reset Filtri riporta la vista allo stato iniziale

7.  Toggle vista tabella/card non perde lo stato dei filtri

L'implementazione mantiene una coerenza visiva evidente con design.html per layout, spacing, pesi tipografici e comportamento del drawer

## FT-06 --- Pannello Dettaglio Bug (Drawer) {#ft-06-pannello-dettaglio-bug-drawer}

**Priorità:** Media

**User Stories:** US-08

**Dipendenze:** FT-05

### Scope

- Drawer laterale (side panel) che si apre al click su un bug in tabella o card

- Contenuto del pannello:

  - Header: ID bug + titolo + badge stato

  - Metadati: assegnatario, area path, priorità, data creazione, data ultima modifica, tag

  - Descrizione completa (testo convertito da HTML, con preservazione dei paragrafi)

  - Sezione Categorizzazione LLM: macro-categoria (badge), sotto-categoria (badge), motivazione (testo completo)

- Navigazione prev/next tra i bug nel dataset filtrato corrente (non si chiude tra un bug e l\'altro)

- Pulsante copia link al bug su Azure DevOps (apre nel browser di sistema)

- Chiusura con tasto Esc o click fuori dal pannello

- Stato \'non ancora categorizzato\' mostrato se la categorizzazione non è stata eseguita

Riferimento design: il drawer deve seguire design.html con pannello fisso a destra (\~400px), header compatto, card LLM evidenziata, dettagli ADO in griglia e CTA finale \'View in Azure DevOps\'

### Criteri di Accettazione

1.  Il drawer mostra tutti i campi richiesti per un bug categorizzato

2.  La navigazione prev/next scorre i bug del filtro corrente (non dell\'intero dataset)

3.  Il link \'Apri in Azure DevOps\' si apre nel browser di sistema

4.  Esc chiude il pannello

5.  Bug non categorizzato mostra stato esplicito (non messaggio di errore)

## FT-07 --- Persistenza Dati e Gestione Sessione {#ft-07-persistenza-dati-e-gestione-sessione}

**Priorità:** Media

**User Stories:** US-01

**Dipendenze:** FT-01, FT-03, FT-04

### Scope

- Salvataggio automatico dei bug recuperati e delle categorizzazioni su electron-store o SQLite (better-sqlite3)

- Al riavvio dell\'app, i dati dell\'ultima sessione vengono ripristinati automaticamente (con timestamp del recupero mostrato in UI)

- Pulsante \'Ricarica da Azure DevOps\' per forzare il refresh (sovrascrive i dati salvati)

- Pulsante \'Ricategorizza\' per forzare una nuova categorizzazione LLM sui bug già caricati

- Indicatore in UI: \'Dati aggiornati il GG/MM/AAAA HH:MM\'

- Cancellazione dati: pulsante \'Pulisci dati sessione\' in Settings (con conferma)

- Gestione schema versioning per electron-store (migration in caso di aggiornamento app)

### Criteri di Accettazione

1.  Dopo riavvio, i bug e le categorizzazioni dell\'ultima sessione sono disponibili senza nuovo recupero

2.  Il timestamp di aggiornamento è visibile e corretto

3.  Ricarica da ADO sovrascrive correttamente i dati precedenti

4.  Pulisci dati sessione richiede conferma e svuota correttamente lo store

# 7. Prompt LLM --- Specifiche {#prompt-llm-specifiche}

## 7.1 System Prompt (standard) {#system-prompt-standard}

Il system prompt viene iniettato automaticamente e non è modificabile dall\'utente in v1. Il contenuto è il seguente (schema JSON atteso in output):

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p>You are a software quality analyst. Categorize each bug below.</p>
<p>Return ONLY valid JSON, no markdown, no preamble.</p>
<p>Schema: { "results": [{ "bugId": number, "macroCategory": string, "subCategory": string, "categoryReason": string }] }</p>
<p>[IF categories provided] Use ONLY these categories: {categories_list}</p>
<p>[IF no categories] Assign categories freely based on content.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 7.2 User Message per Chunk {#user-message-per-chunk}

Per ogni chunk, il messaggio utente contiene i bug serializzati in JSON compatto:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><p>Categorize these bugs:</p>
<p>[{"id":1234,"title":"Login fails on Safari","description":"..."},...]</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 7.3 Gestione Risposta Malformata {#gestione-risposta-malformata}

- JSON.parse sulla risposta; se fallisce: log dell\'errore, bug del chunk marcati come \'Non categorizzato / Errore parsing\'

- Validazione schema: verifica presenza di bugId, macroCategory, subCategory, categoryReason in ogni item

- bugId mancante: skip dell\'item con warning

- Campo stringa vuoto: sostituito con \'N/D\'

# 8. Gestione Errori --- Matrice {#gestione-errori-matrice}

| **Errore**       | **Causa**                                                  | **Messaggio UI**                             | **Azione suggerita**                                        |
|------------------|------------------------------------------------------------|----------------------------------------------|-------------------------------------------------------------|
| ADO 401          | PAT non valido o scaduto                                   | \"PAT non valido o scaduto\"                 | Verificare PAT in Settings                                  |
| ADO 404          | Query ID non trovata                                       | \"Query non trovata nel progetto\"           | Verificare Query ID                                         |
| ADO 0 risultati  | Query vuota                                                | \"Nessun bug trovato nella query\"           | Verificare filtri in Azure DevOps                           |
| ADO Timeout      | Rete non raggiungibile                                     | \"Impossibile contattare Azure DevOps\"      | Verificare connessione di rete                              |
| LLM 401          | Credenziali provider non valide / sessione Copilot assente | \"Autenticazione non valida per {provider}\" | Aggiornare API key o autenticare GitHub Copilot in Settings |
| LLM 429          | Rate limit raggiunto                                       | \"Limite richieste raggiunto, retry\...\"    | Automatico (backoff esponenziale)                           |
| LLM Timeout      | Provider non raggiungibile                                 | \"Timeout LLM su chunk X/N\"                 | Retry manuale su quel chunk                                 |
| JSON parse error | Risposta LLM malformata                                    | \"Risposta non valida su chunk X\"           | Bug marcati \'Non categorizzato\'                           |
| Store error      | Disco pieno / permessi                                     | \"Impossibile salvare i dati\"               | Verificare spazio disco                                     |

# 9. Roadmap {#roadmap}

## 9.1 v1 --- Scope corrente (questo PRD) {#v1-scope-corrente-questo-prd}

| **Feature** | **Descrizione**                       | **Status**    |
|-------------|---------------------------------------|---------------|
| FT-01       | Scaffold Electron + Infrastruttura    | Da sviluppare |
| FT-02       | Settings e Persistenza Configurazione | Da sviluppare |
| FT-03       | Recupero Bug da Azure DevOps          | Da sviluppare |
| FT-04       | LLM Abstraction e Categorizzazione    | Da sviluppare |
| FT-05       | Dashboard con Filtri e Raggruppamenti | Da sviluppare |
| FT-06       | Pannello Dettaglio Bug (Drawer)       | Da sviluppare |
| FT-07       | Persistenza Dati e Gestione Sessione  | Da sviluppare |

## 9.2 v2 --- Backlog tracciato {#v2-backlog-tracciato}

- HTML ricco: supporto tabelle, liste annidate, immagini embedded (via cheerio/linkedom) --- tracciato da FT-03

- Categorie gerarchiche (albero macro/sotto-categoria) in Settings --- tracciato da FT-02

- Supporto WIQL custom come input alternativo a Saved Query ID (QueryStrategy pattern già predisposto in FT-03)

- Prompt custom per singoli bug (analisi approfondita puntuale)

- Concurrency LLM configurabile (più chunk in parallelo con rate limit awareness)

- Export CSV/Excel della dashboard con filtri applicati

- Temi dark/light

- Auto-update dell\'app (electron-updater)

# 10. Fuori Scope (v1) {#fuori-scope-v1}

| **Elemento OUT of scope**                         | **Note / Evoluzione futura**                 |
|---------------------------------------------------|----------------------------------------------|
| Modifica dei bug su Azure DevOps                  | Applicazione sola lettura                    |
| Autenticazione utente / multi-tenant              | App single-user locale                       |
| Caching server-side / database remoto             | Tutto in locale su filesystem                |
| Fallback categorizzazione offline (keyword-based) | LLM obbligatorio per categorizzare           |
| Deployment production / CI/CD pipeline            | Distribuzione manuale in v1                  |
| WIQL custom (query ad hoc)                        | Architettura predisposta, implementazione v2 |
| Prompt custom per singoli bug                     | Evoluzione futura v2                         |
| Esecuzione CLI Azure (az cli, gh cli)             | API REST sufficiente e più stabile           |
| GitHub Copilot via CLI (gh copilot)               | Non usata; integrazione via Copilot SDK      |

# 11. Tipi TypeScript Condivisi (Riferimento) {#tipi-typescript-condivisi-riferimento}

I seguenti tipi sono definiti in src/shared/types.ts e condivisi tra Main Process e Renderer tramite il preload script. Rappresentano il contratto dei dati tra i layer.

| **Tipo / Interfaccia**  | **Campi principali**                                                                                                         |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------|
| BugItem                 | id, title, state, assignee, areaPath, description (testo), priority, createdDate, updatedDate, tags\[\]                      |
| CategorizedBug          | extends BugItem + macroCategory, subCategory, categoryReason, categorizedAt                                                  |
| AppSettings             | orgUrl, projectName, queryId, topN, chunkSize, llmProvider, apiKey? (OpenAI/Claude), pat, categories\[\], copilotAuthStatus? |
| LLMProvider (interface) | categorizeBugChunk(bugs, categories?): Promise\<CategorizedBug\[\]\>                                                         |
| SessionData             | bugs: CategorizedBug\[\], fetchedAt: Date, categorizedAt?: Date                                                              |
| AppError                | code: ErrorCode, message: string, details?: unknown                                                                          |
| ChunkProgress           | total: number, completed: number, currentChunk: CategorizedBug\[\]                                                           |
