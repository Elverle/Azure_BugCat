import { useState } from 'react'
import { Database, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Button } from '@renderer/components/ui/button'
import type { AppSettings } from '@shared/types'

interface AdoConnectionSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onTestConnection: () => Promise<void>
  testResult: { type: 'success' | 'error'; message: string } | null
  testLoading: boolean
}

export function AdoConnectionSection({
  settings,
  errors,
  touched,
  onFieldChange,
  onTestConnection,
  testResult,
  testLoading
}: AdoConnectionSectionProps): React.JSX.Element {
  const [showPat, setShowPat] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Database className="w-5 h-5" />
        Azure DevOps Connection
      </h2>

      <div className="space-y-4">
        {/* Organization URL — full width */}
        <div>
          <Label htmlFor="orgUrl">Organization URL</Label>
          <Input
            id="orgUrl"
            type="url"
            placeholder="https://dev.azure.com/your-org"
            value={settings.orgUrl}
            onChange={(e) => onFieldChange('orgUrl', e.target.value)}
          />
          {touched.orgUrl && errors.orgUrl && (
            <p className="text-xs text-red-500 mt-1">{errors.orgUrl}</p>
          )}
        </div>

        {/* Project Name + Query ID — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              type="text"
              value={settings.projectName}
              onChange={(e) => onFieldChange('projectName', e.target.value)}
            />
            {touched.projectName && errors.projectName && (
              <p className="text-xs text-red-500 mt-1">{errors.projectName}</p>
            )}
          </div>
          <div>
            <Label htmlFor="queryId">Saved Query ID</Label>
            <Input
              id="queryId"
              type="text"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={settings.queryId}
              onChange={(e) => onFieldChange('queryId', e.target.value)}
            />
            {touched.queryId && errors.queryId && (
              <p className="text-xs text-red-500 mt-1">{errors.queryId}</p>
            )}
          </div>
        </div>

        {/* Top N Bugs + PAT — side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="topN">Top N Bugs</Label>
            <Input
              id="topN"
              type="number"
              min={1}
              max={200}
              value={Number.isNaN(settings.topN) ? '' : settings.topN}
              onChange={(e) => {
                const raw = e.target.value
                onFieldChange('topN', raw.trim() === '' ? Number.NaN : parseInt(raw, 10))
              }}
            />
            {touched.topN && errors.topN && (
              <p className="text-xs text-red-500 mt-1">{errors.topN}</p>
            )}
          </div>
          <div>
            <Label htmlFor="pat">PAT</Label>
            <div className="relative">
              <Input
                id="pat"
                type={showPat ? 'text' : 'password'}
                value={settings.pat}
                onChange={(e) => onFieldChange('pat', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPat((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.pat && errors.pat && <p className="text-xs text-red-500 mt-1">{errors.pat}</p>}
          </div>
        </div>

        {/* Test Connection */}
        <div className="flex flex-col items-end gap-2">
          <Button variant="outline" disabled={testLoading} onClick={onTestConnection}>
            {testLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Test Connection
          </Button>
          {testResult && (
            <p
              className={`text-sm ${testResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
            >
              {testResult.message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
