export interface AdoConnectionConfig {
  orgUrl: string
  projectName: string
  queryId: string
  pat: string
  topN: number
}

export interface QueryStrategy {
  getWorkItemIds(config: AdoConnectionConfig): Promise<number[]>
}

export interface WiqlResponse {
  workItems: Array<{ id: number; url: string }>
}

export interface WorkItemResponse {
  count: number
  value: Array<WorkItemRaw>
}

export interface WorkItemRaw {
  id: number
  fields: Record<string, unknown>
}

export const ADO_FIELDS = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.AssignedTo',
  'System.AreaPath',
  'System.Description',
  'Microsoft.VSTS.Common.Priority',
  'System.CreatedDate',
  'System.ChangedDate',
  'System.Tags'
] as const

export const ADO_BATCH_SIZE = 200

/** Per-request ceiling: every single call to Azure DevOps aborts after this. */
export const ADO_REQUEST_TIMEOUT_MS = 30_000
