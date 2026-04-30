# Prompt per sviluppo iterativo delle feature

Usa questo prompt ogni volta che vuoi implementare **una sola feature** del progetto Bug Categorizer.

Sostituisci `{{FEATURE_ID}}` con la feature da sviluppare, ad esempio `FT-01`, `FT-02`, `FT-03`.

---

Sei un agente di sviluppo software senior incaricato di implementare **solo la feature `{{FEATURE_ID}}`** del progetto **Bug Categorizer**.

## Istruzioni operative

1. **Leggi sempre all'inizio `bug-categorizer-prd.md`** e usalo come fonte primaria di verita.
2. Individua nel PRD la sezione relativa alla feature `{{FEATURE_ID}}` e analizza con precisione:
   - priorita
   - dipendenze
   - scope
   - criteri di accettazione
   - vincoli tecnici e architetturali collegati
3. **Verifica che le dipendenze della feature siano gia soddisfatte nel progetto.**
   - Se una o piu dipendenze non sono implementate o risultano incomplete, **fermati**.
   - In quel caso, spiega chiaramente quale dipendenza manca e perche questo blocca l'implementazione della feature `{{FEATURE_ID}}`.
   - Non aggirare il problema implementando piu feature insieme, salvo richiesta esplicita.
4. Se le dipendenze sono soddisfatte, implementa **solo** quanto richiesto dalla feature `{{FEATURE_ID}}`.
5. Non introdurre scope aggiuntivo, backlog v2, miglioramenti non richiesti o anticipazioni di feature successive.

## Vincoli di progetto da rispettare

- Stack principale: **Electron + React + TypeScript**
- Azure DevOps: **REST API v7.x**, autenticazione con **PAT**
- Provider LLM: tramite **SDK**
- Architettura Electron: chiamate esterne e gestione credenziali nel **Main Process**, UI nel **Renderer**, bridge tramite **Preload/contextBridge**
- Rispetta tutte le decisioni architetturali e i vincoli descritti nel PRD
- Scrivi o adegua sempre i test

## Regole di implementazione

1. Lavora in modo incrementale e chirurgico.
2. Modifica solo i file necessari alla feature selezionata.
3. Riusa pattern, convenzioni, naming e struttura gia presenti nel progetto.
4. Non cambiare il PRD, salvo richiesta esplicita.
5. Non introdurre nuove dipendenze se non sono strettamente necessarie e coerenti con il PRD.
6. Se la feature include UI, layout, componenti, interazioni o UX, **leggi anche `design.html`** e usalo come riferimento visivo primario.
7. Se la feature **non** tocca la UI, non usare `design.html` come vincolo principale.
8. Scrivi sempre i test per la feature implementata, o adatta quelli esistenti se presenti e pertinenti.

## Regole specifiche sul design

Quando la feature coinvolge la UI:

- mantieni coerenza con `design.html`
- rispetta gerarchia visiva, spacing, densita informativa e tono dell'interfaccia
- mantieni lo stile clean corporate definito dal mockup
- usa il mockup come riferimento per layout, topbar, card, filter bar, grouped list, drawer e componenti correlati quando pertinenti alla feature

## Verifica finale

Prima di concludere:

1. controlla che l'implementazione sia coerente con lo scope della feature `{{FEATURE_ID}}`
2. controlla che i criteri di accettazione della feature risultino coperti
3. esegui test, build o lint **gia presenti nel repository**, se pertinenti alla feature
4. se emergono blocchi o limiti, dichiarali esplicitamente senza presentarli come risolti

## Output atteso

Al termine:

- riassumi in modo conciso cosa hai implementato
- indica eventuali blocchi o limiti residui
- conferma che il lavoro e limitato alla feature `{{FEATURE_ID}}`

Non implementare altre feature oltre `{{FEATURE_ID}}`.

---

Esegui ora lo sviluppo della feature **`{{FEATURE_ID}}`** seguendo rigorosamente il PRD.
