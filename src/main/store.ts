import { randomBytes } from 'crypto'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import Store from 'electron-store'
import { machineIdSync } from 'node-machine-id'

function getEncryptionKey(): string {
  try {
    return machineIdSync(true)
  } catch {
    // Machine ID unavailable — generate and persist a random key
    const keyPath = join(app.getPath('userData'), '.bugcat-key')
    if (existsSync(keyPath)) {
      return readFileSync(keyPath, 'utf-8').trim()
    }
    const generated = randomBytes(32).toString('hex')
    writeFileSync(keyPath, generated, { mode: 0o600 })
    return generated
  }
}

const encryptionKey = getEncryptionKey()

export const store = new Store({
  name: 'bug-categorizer-config',
  encryptionKey,
  defaults: {
    settings: {
      orgUrl: '',
      projectName: '',
      queryId: '',
      topN: 20,
      chunkSize: 15,
      llmProvider: 'openai',
      apiKey: '',
      pat: '',
      categories: [],
      agentProvider: 'none',
      agentApiKey: '',
      agentModel: '',
      copilotByokEnabled: false,
      copilotByokProvider: undefined,
      copilotByokApiKey: '',
      copilotByokBaseUrl: '',
      projects: [],
      architectureContext: '',
      maxConcurrentSessions: 5,
      codeSource: 'local'
    },
    session: null,
    bugCatalog: null,
    catalogMetadata: {
      lastClearedAt: null
    },
    agentSessions: []
  }
})
