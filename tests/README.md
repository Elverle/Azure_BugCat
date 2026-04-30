# Test Suite

La suite copre la logica implementata finora nelle feature FT-01, FT-02 e FT-03.

## Aree coperte

- `tests/main/ado-client.spec.ts`: costruzione richieste ADO, auth header, mapping errori HTTP/rete
- `tests/main/ado-service.spec.ts`: validazione configurazione, batching, topN, mapping work item
- `tests/main/html-to-text.spec.ts`: conversione HTML → testo plain text
- `tests/main/ipc-handlers.spec.ts`: wiring IPC per settings/session/ADO/LLM test connection
- `tests/renderer/validation.spec.ts`: validazione dei campi settings
- `tests/renderer/useSettings.spec.ts`: caricamento settings, save validation, test connection con stato corrente del form

## Limiti attuali

- Nessun test end-to-end Electron UI.
- Nessun test LLM reale: il provider layer di FT-04 non è ancora implementato.
- I componenti visuali shadcn/ui non sono testati direttamente; la copertura è concentrata sulla logica.
