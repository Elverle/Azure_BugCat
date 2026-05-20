import { spawn } from 'child_process'
import type { McpStatus } from '@shared/types'
import { resolveMcpServerPath, extractOrgName, encodePat } from './mcp-config-writer'

/**
 * Performs a simple spawn-based health check on the MCP server.
 * Verifies the server binary exists and can start without crashing.
 */

export async function checkMcpHealth(options: {
  orgUrl: string
  pat: string
  timeoutMs?: number
}): Promise<McpStatus> {
  const { orgUrl, pat, timeoutMs = 5000 } = options

  let binaryPath: string
  try {
    binaryPath = resolveMcpServerPath()
  } catch {
    return { available: false, reason: 'MCP server binary not found' }
  }

  let orgName: string
  try {
    orgName = extractOrgName(orgUrl)
  } catch (err) {
    return { available: false, reason: `Invalid org URL: ${(err as Error).message}` }
  }

  const encodedPat = encodePat(pat)

  return new Promise<McpStatus>((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let readinessTimer: ReturnType<typeof setTimeout> | null = null
    let gotOutput = false

    const child = spawn('node', [binaryPath, orgName, '--authentication', 'pat'], {
      env: { ...process.env, PERSONAL_ACCESS_TOKEN: encodedPat },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const cleanup = (): void => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (readinessTimer) {
        clearTimeout(readinessTimer)
        readinessTimer = null
      }
      try {
        child.kill()
      } catch {
        // ignore kill errors
      }
    }

    const settle = (status: McpStatus): void => {
      if (settled) return
      settled = true
      cleanup()
      resolve(status)
    }

    child.on('error', (err) => {
      settle({ available: false, reason: `Spawn error: ${err.message}` })
    })

    // The MCP server logs startup info to stderr (common for Node.js servers).
    // We treat output as a readiness signal, but wait a brief window (500ms)
    // for the process to potentially exit with an error code before declaring success.
    const onOutput = (): void => {
      if (gotOutput) return
      gotOutput = true
      readinessTimer = setTimeout(() => {
        settle({ available: true })
      }, 500)
    }

    child.stdout.on('data', onOutput)
    child.stderr.on('data', onOutput)

    child.on('close', (code) => {
      if (code !== 0 && code !== null) {
        settle({ available: false, reason: `MCP server exited with code ${code}` })
      } else if (!gotOutput) {
        // Exited cleanly without any output — still not usable
        settle({ available: false, reason: 'MCP server exited without producing output' })
      }
    })

    timer = setTimeout(() => {
      settle({ available: false, reason: 'Health check timeout' })
    }, timeoutMs)
  })
}
