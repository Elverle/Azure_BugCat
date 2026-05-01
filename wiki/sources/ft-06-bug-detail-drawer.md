---
title: 'FT-06 — Pannello Dettaglio Bug (Drawer)'
type: source
created: 2026-04-30
updated: 2026-04-30
sources: []
tags: [dashboard, drawer, ipc, accessibility, azure-devops]
lang: en
---

## Summary

FT-06 adds a persistent slide-in detail drawer to the dashboard so operators can inspect one bug without leaving the current filtered workspace. The feature introduces a renderer-side `useBugDrawer()` navigation hook, a fixed right-side `BugDetailDrawer` component, and a secure `shell:open-external` IPC contract for opening the current work item in the system browser.

## Files Created

| File                                                        | Purpose                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/renderer/src/components/dashboard/BugDetailDrawer.tsx` | Slide-in detail panel with bug metadata, LLM reasoning, and footer action    |
| `src/renderer/src/hooks/useBugDrawer.ts`                    | Tracks selected bug and prev/next navigation within the current list         |
| `tests/renderer/BugDetailDrawer.spec.tsx`                   | Component coverage for drawer states, closing rules, and navigation controls |
| `tests/renderer/useBugDrawer.spec.ts`                       | Hook coverage for open/close, navigation, and filtered-list reconciliation   |
| `tests/main/open-external.spec.ts`                          | Main-process coverage for URL validation and `shell.openExternal()`          |

## Files Modified

| File                                                 | Change                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/shared/ipc-channels.ts`                         | Added `OPEN_EXTERNAL` typed channel constant                                           |
| `src/main/ipc-handlers.ts`                           | Added secure shell handler with string parsing and `https:` enforcement                |
| `src/preload/index.ts`                               | Exposed `window.electronAPI.openExternal(url)` bridge method                           |
| `src/renderer/src/pages/DashboardPage.tsx`           | Integrated drawer state, content offset, ADO settings lookup, and open-external action |
| `src/renderer/src/components/dashboard/BugTable.tsx` | Added `data-bug-click` marker plus keyboard-triggerable row drill-down                 |
| `src/renderer/src/components/dashboard/BugCard.tsx`  | Added `data-bug-click` marker plus keyboard-triggerable card drill-down                |

## Key Takeaways

1. **Detail navigation stays local to the current result set** — `useBugDrawer()` always navigates the current filtered and sorted list, so prev/next matches what the operator is already seeing.
2. **Click-outside closing is guarded** — the drawer ignores clicks coming from elements tagged with `data-bug-click`, which prevents a close-and-reopen race when the user selects a different bug.
3. **External navigation remains sandbox-safe** — the renderer never opens URLs directly; it delegates through a dedicated IPC contract that only accepts valid `https://` URLs.
4. **Dashboard layout adapts instead of overlapping** — the page adds right padding while the drawer is open, keeping the main workspace readable.
5. **Accessibility was extended to drill-down affordances** — both table rows and grouped cards are keyboard-triggerable, and drawer icon buttons expose explicit `aria-label`s.

## Architecture

```
DashboardPage
  ├─ filterBugs() → sortBugs()
  ├─ useBugDrawer(sortedBugs)
  │    ├─ selectedBug
  │    ├─ hasPrev / hasNext
  │    └─ closes if the selected bug leaves the filtered set
  ├─ BugTable / BugCard
  │    └─ onBugClick(openDrawer)
  └─ BugDetailDrawer
       ├─ Escape + click-outside close
       ├─ Prev / Next navigation
       └─ window.electronAPI.openExternal(url)
            → ipcMain.handle('shell:open-external')
            → shell.openExternal(url)
```

## See also

- [[wiki/entities/bug-detail-drawer]]
- [[wiki/entities/use-bug-drawer-hook]]
- [[wiki/entities/open-external-ipc]]
- [[wiki/concepts/click-outside-exclusion-pattern]]
- [[wiki/topics/dashboard-bug-exploration]]
