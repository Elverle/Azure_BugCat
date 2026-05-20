import { createRequire } from 'module'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Writes/merges `.mcp.json` in the project directory for Claude/Codex MCP integration.
 * The PAT is NEVER written in cleartext — only as ${PERSONAL_ACCESS_TOKEN} placeholder.
 */

const require = createRequire(import.meta.url)

export function resolveMcpServerPath(): string {
  try {
    return require.resolve('@azure-devops/mcp/dist/index.js')
  } catch {
    throw new Error(
      'Could not resolve @azure-devops/mcp/dist/index.js. Ensure @azure-devops/mcp is installed.'
    )
  }
}

export function extractOrgName(orgUrl: string): string {
  const trimmed = orgUrl.replace(/\/+$/, '')
  const url = new URL(trimmed)
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments[segments.length - 1]
  if (!last) {
    throw new Error(`Cannot extract organization name from URL: ${orgUrl}`)
  }
  return last
}

export function encodePat(rawPat: string): string {
  return Buffer.from(':' + rawPat).toString('base64')
}

export async function writeMcpConfig(projectPath: string, orgUrl: string): Promise<void> {
  const binaryPath = resolveMcpServerPath()
  const orgName = extractOrgName(orgUrl)

  const azureDevOpsEntry = {
    command: 'node',
    args: [binaryPath, orgName, '--authentication', 'pat'],
    env: {
      PERSONAL_ACCESS_TOKEN: '${PERSONAL_ACCESS_TOKEN}'
    }
  }

  const configPath = join(projectPath, '.mcp.json')
  let existing: Record<string, unknown> | null = null

  try {
    const content = await readFile(configPath, { encoding: 'utf-8' })
    existing = JSON.parse(content) as Record<string, unknown>
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'ENOENT'
    ) {
      existing = null
    } else if (err instanceof SyntaxError) {
      console.warn('.mcp.json exists but contains invalid JSON — overwriting')
      existing = null
    } else {
      throw err
    }
  }

  let config: Record<string, unknown>
  if (existing) {
    const rawServers = existing.mcpServers
    const mcpServers: Record<string, unknown> =
      rawServers && typeof rawServers === 'object' && !Array.isArray(rawServers)
        ? (rawServers as Record<string, unknown>)
        : {}
    mcpServers['azure-devops'] = azureDevOpsEntry
    config = { ...existing, mcpServers }
  } else {
    config = {
      mcpServers: {
        'azure-devops': azureDevOpsEntry
      }
    }
  }

  await writeFile(configPath, JSON.stringify(config, null, 2), { encoding: 'utf-8' })
}
