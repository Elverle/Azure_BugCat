import type { WebContents } from 'electron'

/**
 * The renderer is a local SPA with hash routing: no top-level navigation away
 * from the loaded document is ever legitimate, so any `will-navigate` attempt
 * (e.g. a link or a compromised script trying to navigate the window) is blocked.
 *
 * Note: dev reload / HMR does not fire `will-navigate`, so the dev flow is
 * unaffected by this guard.
 */
export function attachNavigationGuard(webContents: WebContents): void {
  webContents.on('will-navigate', (event) => {
    event.preventDefault()
  })
}
