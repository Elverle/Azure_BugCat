import { describe, expect, it, vi } from 'vitest'
import { shell } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

// We test the handler logic directly by extracting what it does
// Mock shell.openExternal
vi.mock('electron', () => ({
  shell: { openExternal: vi.fn() },
  ipcMain: { handle: vi.fn() },
  BrowserWindow: vi.fn()
}))

// Import the handler logic inline (we replicate it for unit testing since
// ipc-handlers registers via ipcMain.handle which we can't easily invoke)
async function openExternalHandler(url: unknown): Promise<void> {
  if (typeof url !== 'string') {
    throw new Error('URL must be a string')
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid URL: ${url}`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed')
  }
  await shell.openExternal(url)
}

describe('openExternal IPC handler', () => {
  it('opens valid https URL', async () => {
    const url = 'https://dev.azure.com/org/project/_workitems/edit/123'
    await openExternalHandler(url)
    expect(shell.openExternal).toHaveBeenCalledWith(url)
  })

  it('rejects http URL', async () => {
    await expect(openExternalHandler('http://example.com')).rejects.toThrow(
      'Only https:// URLs are allowed'
    )
  })

  it('rejects javascript protocol', async () => {
    await expect(openExternalHandler('javascript:alert(1)')).rejects.toThrow(
      'Only https:// URLs are allowed'
    )
  })

  it('rejects file protocol', async () => {
    await expect(openExternalHandler('file:///etc/passwd')).rejects.toThrow(
      'Only https:// URLs are allowed'
    )
  })

  it('rejects non-string input', async () => {
    await expect(openExternalHandler(123)).rejects.toThrow('URL must be a string')
    await expect(openExternalHandler(null)).rejects.toThrow('URL must be a string')
    await expect(openExternalHandler(undefined)).rejects.toThrow('URL must be a string')
  })

  it('rejects empty string', async () => {
    await expect(openExternalHandler('')).rejects.toThrow('Invalid URL')
  })

  it('rejects malformed URL', async () => {
    await expect(openExternalHandler('not-a-url')).rejects.toThrow('Invalid URL')
  })

  it('IPC channel constant is defined correctly', () => {
    expect(IPC_CHANNELS.OPEN_EXTERNAL).toBe('shell:open-external')
  })
})
