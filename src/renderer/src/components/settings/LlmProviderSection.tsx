import { useState } from 'react'
import { Bot, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { CollapsibleCard } from '@renderer/components/ui/collapsible-card'
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
  gemini: 'Gemini API Key',
  openrouter: 'OpenRouter API Key',
  generic: 'API Key'
}

const MODEL_PLACEHOLDERS: Record<string, string> = {
  openai: 'gpt-4.1-mini',
  anthropic: 'claude-sonnet-4.6',
  gemini: 'gemini-2.5-flash',
  openrouter: 'openai/gpt-4.1-mini',
  generic: 'gpt-4.1-mini'
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

  return (
    <CollapsibleCard title="LLM Provider" icon={<Bot className="w-5 h-5" />}>
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
            <option value="generic">Generico</option>
            <option value="gemini">Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </Select>
          {touched.llmProvider && errors.llmProvider && (
            <p className="text-xs text-red-500 mt-1">{errors.llmProvider}</p>
          )}
        </div>

        {/* API Key */}
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

        {/* Generic-only field */}
        {settings.llmProvider === 'generic' && (
          <div>
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              type="text"
              placeholder="https://api.example.com/v1"
              value={settings.baseUrl ?? ''}
              onChange={(e) => onFieldChange('baseUrl', e.target.value)}
            />
            {touched.baseUrl && errors.baseUrl && (
              <p className="text-xs text-red-500 mt-1">{errors.baseUrl}</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="llmModel">Model</Label>
          <Input
            id="llmModel"
            type="text"
            placeholder={MODEL_PLACEHOLDERS[settings.llmProvider] ?? 'gpt-4o'}
            value={settings.llmModel ?? ''}
            onChange={(e) => onFieldChange('llmModel', e.target.value)}
          />
        </div>

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
    </CollapsibleCard>
  )
}
