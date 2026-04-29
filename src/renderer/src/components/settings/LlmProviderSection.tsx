import { useState } from 'react'
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import type { AppSettings } from '@shared/types'

interface LlmProviderSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onTestConnection: () => Promise<void>
  testResult: { type: 'success' | 'error'; message: string } | null
  testLoading: boolean
}

const API_KEY_LABELS: Record<string, string> = {
  openai: 'OpenAI API Key',
  anthropic: 'Anthropic API Key',
  gemini: 'Gemini API Key'
}

export function LlmProviderSection({
  settings,
  errors,
  touched,
  onFieldChange,
  onTestConnection,
  testResult,
  testLoading
}: LlmProviderSectionProps): React.JSX.Element {
  const [showApiKey, setShowApiKey] = useState(false)

  const copilotStatus = settings.copilotAuthStatus ?? 'unknown'

  const statusBadge: Record<string, { className: string; label: string }> = {
    authenticated: { className: 'bg-green-100 text-green-800', label: 'Authenticated' },
    unauthenticated: { className: 'bg-red-100 text-red-800', label: 'Not Authenticated' },
    unknown: { className: 'bg-gray-100 text-gray-600', label: 'Unknown' }
  }

  const badge = statusBadge[copilotStatus] ?? statusBadge.unknown

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5" />
        LLM Provider
      </h2>

      <div className="space-y-4">
        {/* Provider select — full width */}
        <div>
          <Label htmlFor="llmProvider">Provider</Label>
          <Select
            id="llmProvider"
            value={settings.llmProvider}
            onChange={(e) => onFieldChange('llmProvider', e.target.value)}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="github-copilot">GitHub Copilot</option>
            <option value="gemini">Gemini</option>
          </Select>
          {touched.llmProvider && errors.llmProvider && (
            <p className="text-xs text-red-500 mt-1">{errors.llmProvider}</p>
          )}
        </div>

        {/* Conditional: API key or Copilot status */}
        {settings.llmProvider !== 'github-copilot' ? (
          <div>
            <Label htmlFor="apiKey">{API_KEY_LABELS[settings.llmProvider] ?? 'API Key'}</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey ?? ''}
                onChange={(e) => onFieldChange('apiKey', e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                tabIndex={-1}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.apiKey && errors.apiKey && (
              <p className="text-xs text-red-500 mt-1">{errors.apiKey}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Authentication Status</Label>
            <div>
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              GitHub Copilot uses your GitHub session. No API key needed.
            </p>
          </div>
        )}

        {/* Chunk Size */}
        <div>
          <Label htmlFor="chunkSize">Chunk Size</Label>
          <Input
            id="chunkSize"
            type="number"
            min={5}
            max={30}
            value={settings.chunkSize}
            onChange={(e) => onFieldChange('chunkSize', parseInt(e.target.value) || 0)}
          />
          {touched.chunkSize && errors.chunkSize && (
            <p className="text-xs text-red-500 mt-1">{errors.chunkSize}</p>
          )}
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
