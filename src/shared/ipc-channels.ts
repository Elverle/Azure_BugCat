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
  ADO_FETCH_ATTACHMENT_DATA_URL: 'ado:fetch-attachment-data-url',

  // LLM
  LLM_CATEGORIZE: 'llm:categorize',
  LLM_CATEGORIZE_CANCEL: 'llm:categorize-cancel',
  LLM_CATEGORIZE_STATUS: 'llm:categorize-status',
  LLM_CATEGORIZE_PROGRESS: 'llm:categorize-progress',
  LLM_TEST_CONNECTION: 'llm:test-connection',

  // LLM - Similarity
  LLM_FIND_SIMILAR: 'llm:find-similar',
  LLM_FIND_SIMILAR_PROGRESS: 'llm:find-similar-progress',

  // Session
  SESSION_GET: 'session:get',
  SESSION_CLEAR: 'session:clear',

  // Catalog
  CATALOG_CLEAR: 'catalog:clear',
  CATALOG_GET_CLOSED: 'catalog:get-closed',

  // Shell
  OPEN_EXTERNAL: 'shell:open-external',

  // Agent
  AGENT_CHECK_BINARY: 'agent:check-binary',
  AGENT_SELECT_DIRECTORY: 'agent:select-directory',

  // Agent Sessions
  AGENT_START: 'agent:start',
  AGENT_ABORT: 'agent:abort',
  AGENT_GET_SESSION: 'agent:get-session',
  AGENT_CHUNK: 'agent:chunk',
  AGENT_COMPLETED: 'agent:completed',
  AGENT_ERROR: 'agent:error',

  // Projects
  PROJECTS_GET: 'projects:get',
  PROJECTS_SET: 'projects:set',
  PROJECTS_VALIDATE_PATHS: 'projects:validate-paths'
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
