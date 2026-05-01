---
title: 'Macro-Category Scoped Similarity Analysis'
type: concept
created: 2026-05-01
updated: 2026-05-01
sources: ['[[wiki/sources/ft-10-ai-cluster-similarity]]']
tags: [llm, similarity, grouping, session, design]
lang: en
---

## Definition

A second-pass LLM workflow that compares bugs only inside the same previously assigned `macroCategory`, instead of searching for similarity across the entire bug population.

## How It Works In This Project

1. The dashboard categorization flow writes `macroCategory` values and a session-level `categorizedAt` timestamp.
2. The AI Cluster feature treats those categories as the partition boundary for a new analysis pass.
3. Each category with at least two bugs becomes one LLM request using the similar-bugs prompt and schema.
4. Results are persisted as `session.similarityResults` with an `analyzedAt` timestamp.
5. The renderer flags results as stale when categorization becomes newer than the last similarity run.

## Why This Boundary Exists

- It constrains the semantic search space, which reduces the chance of unrelated bugs being grouped together.
- It keeps prompt payloads smaller than a full-session comparison.
- It turns category failures into isolated units that can surface partial results cleanly.
- It aligns with the operator mental model already established by the dashboard grouping workflow.

## Trade-offs

| Advantage                                                    | Cost / Limitation                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| Better contextual focus for the LLM                          | Cross-category duplicates are intentionally missed                 |
| Smaller request payloads                                     | Very large categories are not chunked yet                          |
| Per-category progress and fault isolation                    | Categories are processed sequentially, so total duration can grow  |
| Results map naturally onto accordion-style renderer sections | Requires categorization to exist before similarity analysis starts |

## Related Behaviors

- Categories with fewer than two bugs are skipped entirely.
- Provider or parse failures stay local to the affected category through `CategorySimilarityResult.error`.
- The feature uses the same provider abstraction and retry helper as categorization, but a different prompt and result shape.

## See also

- [[wiki/entities/similarity-service]]
- [[wiki/entities/use-ai-cluster-hook]]
- [[wiki/topics/ai-cluster-similar-bug-detection]]
- [[wiki/topics/llm-categorization-pipeline]]
