/**
 * Typed IPC channel definitions.
 * All IPC communication between Main and Renderer goes through these channels.
 */
export const IPC_CHANNELS = {
  // Ping (test)
  PING: 'ping',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Azure DevOps
  ADO_FETCH_BUGS: 'ado:fetch-bugs',
  ADO_TEST_CONNECTION: 'ado:test-connection',

  // LLM
  LLM_CATEGORIZE: 'llm:categorize',
  LLM_CATEGORIZE_PROGRESS: 'llm:categorize-progress',
  LLM_TEST_CONNECTION: 'llm:test-connection',

  // Session
  SESSION_GET: 'session:get',
  SESSION_CLEAR: 'session:clear'
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
