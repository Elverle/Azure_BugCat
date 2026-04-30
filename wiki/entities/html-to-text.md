---
title: 'html-to-text Utility'
type: entity
subtype: service
created: 2026-04-30
updated: 2026-04-30
sources: ['[[wiki/sources/ft-03-ado-fetch]]']
tags: [utility, html, text-processing]
lang: en
---

## Description

Pure function that converts HTML strings (from ADO work item descriptions) to semantically-preserved plain text. Handles null/undefined input gracefully.

## Location

`src/main/utils/html-to-text.ts`

## Public API

```typescript
export function htmlToText(html: string | null | undefined): string
```

Returns empty string for falsy input.

## Conversion Rules

| HTML Element                | Output                                               |
| --------------------------- | ---------------------------------------------------- |
| `<pre>`, `<code>`           | Preserved verbatim (extracted before processing)     |
| `<br>`                      | `\n`                                                 |
| `</p>`, `</div>`, `</h1-6>` | `\n\n`                                               |
| `<li>`                      | `\n- `                                               |
| `<td>`, `<th>`              | `\|` separator                                       |
| Other tags                  | Stripped                                             |
| HTML entities               | Decoded (`&amp;`, `&lt;`, `&#x...;`, `&#...;`, etc.) |

## Design Notes

- Uses placeholder pattern (`\x00PRESERVE_N\x00`) to protect `<pre>`/`<code>` from tag stripping
- Normalizes whitespace: multiple spaces → single space, 3+ newlines → double newline
- No external dependencies — regex-based parsing sufficient for ADO HTML output

## See also

- [[wiki/entities/ado-service]] — consumer of this utility
- [[wiki/sources/ft-03-ado-fetch]]
