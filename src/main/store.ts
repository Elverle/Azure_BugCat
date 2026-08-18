import { renameSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import Store from 'electron-store'
import { getEncryptionKey } from './store-encryption'

const STORE_NAME = 'bug-categorizer-config'

const defaults = {
  settings: {
    orgUrl: '',
    projectName: '',
    queryId: '',
    topN: 20,
    chunkSize: 15,
    llmProvider: 'openai',
    apiKey: '',
    pat: '',
    categories: []
  },
  session: null,
  bugCatalog: null,
  catalogMetadata: {
    lastClearedAt: null
  }
}

function buildStore(): Store<typeof defaults> {
  const instance = new Store({
    name: STORE_NAME,
    encryptionKey: getEncryptionKey(app.getPath('userData')),
    defaults
  })
  // Forces the read/decrypt now, so a corrupt config fails inside the caller's try
  // instead of at the first unrelated store access later on.
  instance.get('settings')
  return instance
}

/**
 * A config that cannot be decrypted must not brick the app at launch: it is moved
 * aside as a timestamped backup and replaced by a fresh store.
 */
function createStoreWithRecovery(): Store<typeof defaults> {
  try {
    return buildStore()
  } catch (error) {
    console.error('[Store] Config unreadable, backing it up and starting fresh:', error)
    const configPath = join(app.getPath('userData'), `${STORE_NAME}.json`)
    try {
      renameSync(configPath, `${configPath}.corrupt-${Date.now()}.bak`)
    } catch {
      // Missing or unrenameable file: the fresh store is created anyway.
    }
    return buildStore()
  }
}

export const store = createStoreWithRecovery()
