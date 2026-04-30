import { AdoConnectionConfig, WiqlResponse, WorkItemRaw, ADO_FIELDS } from './types'
import { AppError } from '../../shared/types'

function buildAuthHeader(pat: string): string {
  return `Basic ${Buffer.from(':' + pat).toString('base64')}`
}

function buildBaseUrl(orgUrl: string, projectName: string): string {
  const normalized = orgUrl.endsWith('/') ? orgUrl.slice(0, -1) : orgUrl
  return `${normalized}/${encodeURIComponent(projectName)}`
}

function throwAppError(code: AppError['code'], message: string, details?: unknown): never {
  const err: AppError = { code, message, ...(details !== undefined && { details }) }
  throw err
}

function mapResponseError(status: number, statusText: string): never {
  if (status === 401 || status === 403) {
    throwAppError('ADO_AUTH_ERROR', `Autenticazione fallita: ${status} ${statusText}`)
  }
  if (status === 404) {
    throwAppError('ADO_NOT_FOUND', `Risorsa non trovata: ${status} ${statusText}`)
  }
  throwAppError('UNKNOWN_ERROR', `Errore HTTP: ${status} ${statusText}`)
}

function isAppError(error: unknown): error is AppError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as AppError).message === 'string'
  )
}

export async function fetchWiqlQuery(config: AdoConnectionConfig): Promise<WiqlResponse> {
  if (!config.orgUrl.startsWith('https://')) {
    throwAppError('ADO_AUTH_ERROR', 'URL organizzazione non valido: deve iniziare con https://')
  }

  const baseUrl = buildBaseUrl(config.orgUrl, config.projectName)
  const url = `${baseUrl}/_apis/wit/wiql/${encodeURIComponent(config.queryId)}?api-version=7.0`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: buildAuthHeader(config.pat),
        Accept: 'application/json'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      mapResponseError(response.status, response.statusText)
    }

    return (await response.json()) as WiqlResponse
  } catch (error: unknown) {
    if (isAppError(error)) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throwAppError('ADO_TIMEOUT', 'Timeout nella connessione ad Azure DevOps')
    }
    throwAppError(
      'ADO_TIMEOUT',
      `Errore di rete: ${error instanceof Error ? error.message : 'sconosciuto'}`
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchWorkItemsBatch(
  config: AdoConnectionConfig,
  ids: number[]
): Promise<WorkItemRaw[]> {
  if (!config.orgUrl.startsWith('https://')) {
    throwAppError('ADO_AUTH_ERROR', 'URL organizzazione non valido: deve iniziare con https://')
  }

  const baseUrl = buildBaseUrl(config.orgUrl, config.projectName)
  const idsCsv = ids.join(',')
  const fieldsCsv = ADO_FIELDS.join(',')
  const url = `${baseUrl}/_apis/wit/workitems?ids=${idsCsv}&fields=${fieldsCsv}&api-version=7.0`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: buildAuthHeader(config.pat),
        Accept: 'application/json'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      mapResponseError(response.status, response.statusText)
    }

    const data = (await response.json()) as { value: WorkItemRaw[] }
    return data.value
  } catch (error: unknown) {
    if (isAppError(error)) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throwAppError('ADO_TIMEOUT', 'Timeout nella connessione ad Azure DevOps')
    }
    throwAppError(
      'ADO_TIMEOUT',
      `Errore di rete: ${error instanceof Error ? error.message : 'sconosciuto'}`
    )
  } finally {
    clearTimeout(timeout)
  }
}
