import { AppSettings, BugItem, TestConnectionResult } from '../../shared/types'
import { AdoConnectionConfig, WorkItemRaw, ADO_BATCH_SIZE } from './types'
import { fetchWiqlQuery, fetchWorkItemsBatch } from './ado-client'
import { htmlToText } from '../utils/html-to-text'
import { throwAppError } from '@shared/app-error'

function buildConfig(settings: AppSettings): AdoConnectionConfig {
  if (!settings.orgUrl?.trim()) throwAppError('ADO_AUTH_ERROR', 'Organization URL is missing')
  if (!settings.projectName?.trim()) throwAppError('ADO_AUTH_ERROR', 'Project name is missing')
  if (!settings.queryId?.trim()) throwAppError('ADO_NOT_FOUND', 'Query ID is missing')
  if (!settings.pat?.trim()) throwAppError('ADO_AUTH_ERROR', 'Personal Access Token is missing')

  return {
    orgUrl: settings.orgUrl.trim(),
    projectName: settings.projectName.trim(),
    queryId: settings.queryId.trim(),
    pat: settings.pat.trim(),
    topN: settings.topN
  }
}

function mapWorkItemToBug(item: WorkItemRaw): BugItem {
  const fields = item.fields
  const descriptionHtml = (fields['System.Description'] as string | null | undefined) ?? ''

  const assignedTo = fields['System.AssignedTo'] as
    | { displayName?: string }
    | string
    | null
    | undefined
  const tagsRaw = fields['System.Tags'] as string | null | undefined
  const tags = tagsRaw ? tagsRaw.split('; ').filter((t) => t !== '') : []
  const assignee =
    typeof assignedTo === 'string'
      ? assignedTo
      : assignedTo && typeof assignedTo === 'object'
        ? (assignedTo.displayName ?? null)
        : null

  return {
    id: (fields['System.Id'] as number) ?? item.id,
    title: (fields['System.Title'] as string) ?? '',
    state: (fields['System.State'] as string) ?? '',
    assignee,
    areaPath: (fields['System.AreaPath'] as string) ?? '',
    description: htmlToText(descriptionHtml),
    descriptionHtml,
    priority: (fields['Microsoft.VSTS.Common.Priority'] as number) ?? 0,
    createdDate: (fields['System.CreatedDate'] as string) ?? '',
    updatedDate: (fields['System.ChangedDate'] as string) ?? '',
    tags
  }
}

export interface FetchBugsResult {
  bugs: BugItem[]
  allQueryIds: number[]
}

export async function fetchBugsFromQuery(settings: AppSettings): Promise<FetchBugsResult> {
  const config = buildConfig(settings)

  const wiqlResponse = await fetchWiqlQuery(config)

  if (wiqlResponse.workItems.length === 0) {
    throwAppError('ADO_EMPTY', 'The query returned no bugs')
  }

  const allQueryIds = wiqlResponse.workItems.map((wi) => wi.id)
  let ids = allQueryIds

  if (config.topN > 0) {
    ids = ids.slice(0, config.topN)
  }

  const batches: number[][] = []
  for (let i = 0; i < ids.length; i += ADO_BATCH_SIZE) {
    batches.push(ids.slice(i, i + ADO_BATCH_SIZE))
  }

  const results: WorkItemRaw[] = []
  for (const batch of batches) {
    const items = await fetchWorkItemsBatch(config, batch)
    results.push(...items)
  }

  return { bugs: results.map(mapWorkItemToBug), allQueryIds }
}

export async function testAdoConnection(settings: AppSettings): Promise<TestConnectionResult> {
  try {
    const config = buildConfig(settings)
    const wiqlResponse = await fetchWiqlQuery(config)
    return {
      success: true,
      message: `Connection successful — ${wiqlResponse.workItems.length} bugs found`
    }
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Connection error'
    return { success: false, message }
  }
}
