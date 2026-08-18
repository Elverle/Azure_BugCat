import type { WebContents } from 'electron'

/**
 * The renderer is a local SPA with hash routing: no top-level navigation away
 * from the loaded document is ever legitimate, so any `will-navigate` attempt
 * (e.g. a link or a compromised script trying to navigate the window) is
 * cancelled — except a navigation that targets the document already loaded.
 *
 * That "same document" case is exactly what a reload is: a renderer-initiated
 * `location.reload()` (which is how Vite's dev client triggers a full reload,
 * and how the app itself might reload) fires `will-navigate` with the current
 * URL (optionally with a different hash), not with `webContents.reload()`'s
 * bypass. Blocking it unconditionally would silently break `npm run dev`
 * full-reloads while leaving the developer staring at stale code, so we let
 * same-document navigations through and only cancel navigations to a
 * different document.
 */
export function attachNavigationGuard(webContents: WebContents): void {
  webContents.on('will-navigate', (event, url) => {
    const current = webContents.getURL()
    const sameDocument = Boolean(current) && url.split('#')[0] === current.split('#')[0]
    if (sameDocument) return
    event.preventDefault()
  })
}
