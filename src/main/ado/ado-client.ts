import {
  AdoConnectionConfig,
  WiqlResponse,
  WorkItemRaw,
  ADO_FIELDS,
  ADO_REQUEST_TIMEOUT_MS
} from './types'
import { isAppError, throwAppError } from '@shared/app-error'

function buildAuthHeader(pat: string): string {
  return `Basic ${Buffer.from(':' + pat).toString('base64')}`
}

function buildBaseUrl(orgUrl: string, projectName: string): string {
  const normalized = orgUrl.endsWith('/') ? orgUrl.slice(0, -1) : orgUrl
  return `${normalized}/${encodeURIComponent(projectName)}`
}

function normalizeOrgUrl(orgUrl: string): string {
  return orgUrl.endsWith('/') ? orgUrl.slice(0, -1) : orgUrl
}

function validateHttpsOrgUrl(orgUrl: string): void {
  if (!orgUrl.startsWith('https://')) {
    throwAppError('ADO_AUTH_ERROR', 'Invalid organization URL: it must start with https://')
  }
}

function isAllowedAttachmentUrl(orgUrl: string, attachmentUrl: string): boolean {
  try {
    const org = new URL(normalizeOrgUrl(orgUrl))
    const attachment = new URL(attachmentUrl)

    return (
      attachment.protocol === 'https:' &&
      attachment.origin === org.origin &&
      attachment.pathname.startsWith(`${org.pathname}/`) &&
      attachment.pathname.includes('/_apis/wit/attachments/')
    )
  } catch {
    return false
  }
}

const FALLBACK_ATTACHMENT_CONTENT_TYPE = 'image/png'

// Matches a single, well-formed image media type token (e.g. `image/png`,
// `image/svg+xml`) once any `;charset=...` parameter has been stripped. This
// rejects values that merely start with `image/`, such as
// `image/png, text/html` — what `Headers.get()` returns when an upstream
// response (or a proxy) repeats the content-type header — which would
// otherwise terminate the media type at the comma and corrupt the resulting
// data url.
const IMAGE_CONTENT_TYPE_PATTERN = /^image\/[a-z0-9][a-z0-9.+-]*$/

/**
 * Only echo the response content-type into the data url when it is actually a
 * single, valid image media type; anything else (e.g. a mislabelled or
 * malicious response, or a multi-header value) is replaced with a safe
 * fallback instead of being trusted verbatim.
 */
function sanitizeAttachmentContentType(rawContentType: string | null): string {
  const mediaType = (rawContentType ?? '').split(';')[0].trim().toLowerCase()
  return IMAGE_CONTENT_TYPE_PATTERN.test(mediaType) ? mediaType : FALLBACK_ATTACHMENT_CONTENT_TYPE
}

function mapResponseError(status: number, statusText: string): never {
  if (status === 401 || status === 403) {
    throwAppError('ADO_AUTH_ERROR', `Authentication failed: ${status} ${statusText}`)
  }
  if (status === 404) {
    throwAppError('ADO_NOT_FOUND', `Resource not found: ${status} ${statusText}`)
  }
  throwAppError('UNKNOWN_ERROR', `HTTP error: ${status} ${statusText}`)
}

export async function fetchWiqlQuery(config: AdoConnectionConfig): Promise<WiqlResponse> {
  validateHttpsOrgUrl(config.orgUrl)

  const baseUrl = buildBaseUrl(config.orgUrl, config.projectName)
  const url = `${baseUrl}/_apis/wit/wiql/${encodeURIComponent(config.queryId)}?api-version=7.0`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ADO_REQUEST_TIMEOUT_MS)

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
      throwAppError('ADO_TIMEOUT', 'Azure DevOps connection timed out')
    }
    throwAppError(
      'ADO_TIMEOUT',
      `Network error: ${error instanceof Error ? error.message : 'unknown'}`
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchWorkItemsBatch(
  config: AdoConnectionConfig,
  ids: number[]
): Promise<WorkItemRaw[]> {
  validateHttpsOrgUrl(config.orgUrl)

  const baseUrl = buildBaseUrl(config.orgUrl, config.projectName)
  const idsCsv = ids.join(',')
  const fieldsCsv = ADO_FIELDS.join(',')
  const url = `${baseUrl}/_apis/wit/workitems?ids=${idsCsv}&fields=${fieldsCsv}&api-version=7.0`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ADO_REQUEST_TIMEOUT_MS)

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
      throwAppError('ADO_TIMEOUT', 'Azure DevOps connection timed out')
    }
    throwAppError(
      'ADO_TIMEOUT',
      `Network error: ${error instanceof Error ? error.message : 'unknown'}`
    )
  } finally {
    clearTimeout(timeout)
  }
}

export async function fetchAdoAttachmentDataUrl(
  config: AdoConnectionConfig,
  attachmentUrl: string
): Promise<string> {
  validateHttpsOrgUrl(config.orgUrl)

  if (!isAllowedAttachmentUrl(config.orgUrl, attachmentUrl)) {
    throwAppError('ADO_NOT_FOUND', 'Invalid Azure DevOps attachment URL')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ADO_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(attachmentUrl, {
      method: 'GET',
      headers: {
        Authorization: buildAuthHeader(config.pat),
        Accept: '*/*'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      mapResponseError(response.status, response.statusText)
    }

    const contentType = sanitizeAttachmentContentType(response.headers.get('content-type'))
    const buffer = Buffer.from(await response.arrayBuffer())
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch (error: unknown) {
    if (isAppError(error)) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throwAppError('ADO_TIMEOUT', 'Azure DevOps connection timed out')
    }
    throwAppError(
      'ADO_TIMEOUT',
      `Network error: ${error instanceof Error ? error.message : 'unknown'}`
    )
  } finally {
    clearTimeout(timeout)
  }
}
