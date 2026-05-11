# Bug Categorizer

Applicazione desktop per trasformare una Saved Query di Azure DevOps in una vista di lavoro piu leggibile: i bug vengono raccolti, organizzati in categorie, e poi analizzati per individuare casi simili o potenziali duplicati.

> [!IMPORTANT]
> Credenziali Azure DevOps, API key dei provider e dati di sessione vengono salvati in locale tramite `electron-store` cifrato e legato alla macchina corrente.

## Cosa Fa

- Recupera i bug da Azure DevOps a partire da una Saved Query gia esistente.
- Li organizza in gruppi funzionali, cosi il team non deve leggere ogni item uno per uno per capire dove si concentra il lavoro.
- Permette di filtrare, raggruppare e aprire il dettaglio di ogni bug in una dashboard unica.
- Evidenzia bug simili all'interno della stessa categoria, utile per riconoscere cluster, sovrapposizioni e possibili duplicati.
- Mantiene in locale settings e ultima sessione, cosi il lavoro puo riprendere rapidamente.

## Funzionalita Principali

- Import dei bug via Azure DevOps REST API e Saved Query UUID.
- Supporto a piu provider LLM: OpenAI, Anthropic, Gemini, OpenRouter e Generic.
- Categorizzazione progressiva con avanzamento visibile e cancellazione manuale.
- Dashboard con vista completa, gruppi per categoria e analisi di similarita.
- Apertura sicura dei work item Azure DevOps dal dettaglio bug.

## In Breve: Categorizzazione E Similarita

### Categorizzazione

La categorizzazione serve a dare ordine al backlog.

- Ogni bug viene assegnato a una macro-categoria e a una sotto-categoria.
- Il sistema restituisce anche una motivazione sintetica, utile per capire perchè il bug è stato messo in quel gruppo.
- Il risultato pratico è una lista meno caotica, più adatta a triage, pianificazione e confronto tra aree di problema.

### Analisi Similarita

L'analisi di similarita interviene dopo la categorizzazione.

- Lavora dentro le macro-categorie gia individuate.
- Cerca gruppi di bug che sembrano riferirsi allo stesso problema o a problemi molto vicini.
- Aiuta a individuare duplicati, pattern ricorrenti e aree dove conviene consolidare il lavoro.

## Distribuzione Per Utenti Windows E Mac

Se vuoi preparare un pacchetto da distribuire agli utenti finali, usa il comando di packaging invece di `npm run dev`.

```bash
npm install
npm run package
```

I pacchetti vengono generati nella cartella `dist-electron/`.

### Windows

- Il target configurato e `nsis`, quindi il risultato atteso e un installer `.exe`.
- Esegui il packaging da una macchina Windows per ottenere il pacchetto piu lineare da distribuire agli utenti Windows.
- Una volta generato l'installer, puoi condividerlo direttamente: l'utente lo apre e completa l'installazione guidata.

### macOS

- Il target configurato e `dmg`, quindi per gli utenti Mac il pacchetto da distribuire e un file `.dmg`.
- Per generare il pacchetto macOS in modo affidabile conviene eseguire `npm run package` da un Mac.
- L'utente Mac apre il `.dmg`, trascina l'app in `Applications` e la avvia da li.
- Se l'app non e firmata, al primo avvio puo essere necessario usare `tasto destro > Apri` per superare il blocco iniziale di Gatekeeper.

> [!NOTE]
> Gli utenti finali che ricevono l'installer Windows o il pacchetto macOS non hanno bisogno di Node.js o npm.

## Quickstart Operativo

Alla prima apertura dell'app vai subito nella pagina `Settings` e compila questi dati minimi.

### 1. Azure DevOps Connection

| Campo            | Obbligatorio | Esempio                                | A cosa serve                                             |
| ---------------- | ------------ | -------------------------------------- | -------------------------------------------------------- |
| Organization URL | Si           | `https://dev.azure.com/your-org`       | Identifica l'organizzazione Azure DevOps da interrogare. |
| Project Name     | Si           | `PaymentsPlatform`                     | Limita il lavoro al project corretto.                    |
| Saved Query ID   | Si           | `12345678-1234-1234-1234-123456789abc` | Dice all'app quale query usare per recuperare i bug.     |
| Top N Bugs       | Si           | `20`                                   | Decide quanti bug importare nella sessione.              |
| PAT              | Si           | `ado_pat_...`                          | Permette all'app di autenticarsi verso Azure DevOps.     |

### 2. LLM Provider

| Campo      | Obbligatorio | Esempio                      | A cosa serve                                                     |
| ---------- | ------------ | ---------------------------- | ---------------------------------------------------------------- |
| Provider   | Si           | `OpenAI`                     | Sceglie il motore AI da usare per categorizzazione e similarita. |
| API Key    | Si           | `sk-...`                     | Autentica il provider scelto.                                    |
| Base URL   | Solo Generic | `https://api.example.com/v1` | Serve solo per endpoint OpenAI-compatible personalizzati.        |
| Model      | Consigliato  | `gpt-4.1-mini`               | Definisce il modello effettivamente usato.                       |
| Chunk Size | Si           | `15`                         | Decide quanti bug inviare per volta al provider.                 |

### 3. Categories

- Se vuoi guidare la categorizzazione, inserisci una categoria per riga.
- Se lasci il campo vuoto, il sistema genera le categorie automaticamente.

### 4. Salva E Verifica

1. Premi `Test Connection` nella sezione Azure DevOps.
2. Premi `Test Connection` nella sezione LLM Provider.
3. Premi `Save Settings`.

## Flusso Di Utilizzo

1. Apri l'app e completa le `Settings`.
2. Vai in dashboard e premi `Fetch Bugs`.
3. Quando i bug sono caricati, premi `Categorize`.
4. Leggi i risultati in vista tabellare oppure raggruppata.
5. Apri la tab `Similarita` per vedere gruppi di bug che sembrano collegati tra loro.
6. Usa il drawer di dettaglio per verificare metadati, motivazione della categoria e link al work item Azure DevOps.

## Requisiti Per Creare I Pacchetti

- Node.js 20 o superiore
- npm
- Una macchina Windows per creare l'installer `.exe`
- Una macchina macOS per creare il pacchetto `.dmg`

## Stack Tecnologico

- Electron + electron-vite
- React 18 + TypeScript
- Tailwind CSS
- Vitest per test unitari e di integrazione
- `electron-store` per la persistenza locale cifrata

## Comandi Utili Per Manutenzione

```bash
npm run package
npm run build
npm run test
npm run test:coverage
```

> [!NOTE]
> Lo script `npm run lint` usa ancora la configurazione ESLint legacy e al momento non e allineato a ESLint 9.

## Struttura Del Progetto

```text
src/
  main/       Main process Electron, handler IPC, servizi Azure DevOps e LLM
  preload/    Bridge sicuro esposto al renderer
  renderer/   Applicazione React, pagine, hook e componenti UI
  shared/     Contratti cross-process e tipi di dominio
tests/
  main/       Test del main process
  renderer/   Test renderer e UI
wiki/         Base di conoscenza tecnica interna del progetto
```

## Troubleshooting

> [!TIP]
> I problemi piu comuni derivano da Settings incompleti, credenziali scadute o mismatch tra provider e model.

- Se `Saved Query ID` non viene accettato, verifica di aver copiato un vero UUID.
- Se il fetch Azure DevOps fallisce, ricontrolla Organization URL, Project Name, Query ID e PAT.
- Se il test LLM fallisce, verifica API key, provider selezionato, model e Base URL del provider Generic.
- Se una categorizzazione viene annullata, l'app ripristina il dataset persistito precedente e non mantiene risultati parziali.

## Riferimenti Aggiuntivi

- La documentazione tecnica interna e mantenuta nella cartella `wiki/`.
- Lo storico delle delivery e mantenuto in `feature-index.md`.
