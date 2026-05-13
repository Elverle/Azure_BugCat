---
title: 'Catalog-Backed Selective Re-Categorization'
type: concept
created: 2026-05-13
updated: 2026-05-13
sources: ['[[wiki/sources/ft-12-incremental-session-cache]]']
tags: [catalog, session, llm, cache, incremental, persistence]
lang: en
---

## Definition

Catalog-backed selective re-categorization is the persistence pattern introduced in FT-12 where the application keeps a historical `bugCatalog` in the main process and only re-sends bugs to the LLM when the current open-bug inputs no longer match the signature that produced the stored categorization.

## How It Works in This Project

- `session` stores only the current open snapshot used by the renderer.
- `bugCatalog` stores every seen bug together with lifecycle metadata and the last categorization signature.
- Fetch computes a fresh signature from normalized categorization inputs and compares it with the stored `CatalogBug.inputSignature`.
- If the signature still matches and a historical categorization exists, the open snapshot reuses that categorization without an LLM call.
- If the signature differs or the bug was never categorized, the open snapshot resets category fields and marks that bug for the next `llm:categorize` run.
- Successful categorization merges back into both `session` and `bugCatalog`, so the next fetch can reuse the new result.
- Similarity analysis still runs only over open session bugs, but it enriches the historical catalog with similarity-history metadata.

## Why It Matters Here

- Reduces repeated LLM cost for unchanged bugs across repeated ADO fetches.
- Preserves a lightweight renderer payload even when the historical catalog grows large.
- Makes lifecycle metadata explicit, which prepares the codebase for future historical views without changing the dashboard's current data source.

## Trade-offs

- The signature intentionally ignores non-categorization inputs such as `assignee` and `state`, so category reuse favors stability over maximal sensitivity to every field change.
- The catalog can grow indefinitely because FT-12 adds no pruning or archival policy.
- A bug disappearing from the query is treated the same as a bug being closed from the catalog's perspective; the current model tracks absence, not the exact reason.
- The renderer cannot inspect catalog history directly yet, so the feature improves behavior and persistence before it exposes new historical UI.

## See also

- [[wiki/entities/catalog-merge-utility]]
- [[wiki/entities/store-migration]]
- [[wiki/topics/session-persistence-lifecycle]]
- [[wiki/topics/historical-bug-catalog-lifecycle]]
