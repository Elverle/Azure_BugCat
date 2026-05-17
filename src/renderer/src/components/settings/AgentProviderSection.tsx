import { useState } from 'react'
import { Terminal, Eye, EyeOff, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import type { AppSettings, BinaryCheckResult } from '@shared/types'

interface AgentProviderSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
  onCheckBinary: () => Promise<void>
  binaryCheckResult: BinaryCheckResult | null
  binaryCheckLoading: boolean
}

export function AgentProviderSection({
  settings,
  errors,
  touched,
  onFieldChange,
  onCheckBinary,
  binaryCheckResult,
  binaryCheckLoading
}: AgentProviderSectionProps): React.JSX.Element {
  const [showApiKey, setShowApiKey] = useState(false)

  const isAnthropicAuto = settings.llmProvider === 'anthropic'
  const isOpenaiAuto = settings.llmProvider === 'openai'
  const isAutoProvider = isAnthropicAuto || isOpenaiAuto

  const effectiveProvider = isAnthropicAuto
    ? 'claude-sdk'
    : isOpenaiAuto
      ? 'codex-sdk'
      : settings.agentProvider

  const showManualFields =
    !isAutoProvider && effectiveProvider !== 'none' && effectiveProvider !== 'copilot-sdk'

  const showCodexCheck = effectiveProvider === 'codex-sdk'
  const showByok = effectiveProvider === 'copilot-sdk'

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Terminal className="w-5 h-5" />
        Agent Provider
      </h2>

      <div className="space-y-4">
        {/* Provider selection / auto badge */}
        {isAnthropicAuto && (
          <div>
            <Label>Provider agente</Label>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Claude Code SDK (automatico)
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Usa la API key già configurata. Nessun prerequisito aggiuntivo.
            </p>
          </div>
        )}

        {isOpenaiAuto && (
          <div>
            <Label>Provider agente</Label>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Codex CLI (automatico)
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Prerequisito: <code className="bg-gray-100 px-1 rounded">npm i -g @openai/codex</code>
            </p>
          </div>
        )}

        {!isAutoProvider && (
          <div>
            <Label htmlFor="agentProvider">Provider agente</Label>
            <Select
              id="agentProvider"
              value={settings.agentProvider}
              onChange={(e) => onFieldChange('agentProvider', e.target.value)}
            >
              <option value="claude-sdk">Claude Code SDK</option>
              <option value="codex-sdk">Codex CLI</option>
              <option value="copilot-sdk">Copilot SDK</option>
              <option value="none">Nessuno</option>
            </Select>
            {touched.agentProvider && errors.agentProvider && (
              <p className="text-xs text-red-500 mt-1">{errors.agentProvider}</p>
            )}
          </div>
        )}

        {/* Codex CLI check */}
        {showCodexCheck && (
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={binaryCheckLoading} onClick={onCheckBinary}>
              {binaryCheckLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Verifica installazione CLI
            </Button>
            {binaryCheckResult && (
              <span
                className={`text-sm flex items-center gap-1 ${binaryCheckResult.installed ? 'text-green-600' : 'text-red-600'}`}
              >
                {binaryCheckResult.installed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Installato{binaryCheckResult.version ? ` (v${binaryCheckResult.version})` : ''}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {binaryCheckResult.error ?? 'Non trovato'}
                  </>
                )}
              </span>
            )}
          </div>
        )}

        {/* Manual fields: API key + model */}
        {showManualFields && (
          <>
            <div>
              <Label htmlFor="agentApiKey">API Key agente</Label>
              <div className="relative">
                <Input
                  id="agentApiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.agentApiKey ?? ''}
                  onChange={(e) => onFieldChange('agentApiKey', e.target.value)}
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
              {touched.agentApiKey && errors.agentApiKey && (
                <p className="text-xs text-red-500 mt-1">{errors.agentApiKey}</p>
              )}
            </div>

            <div>
              <Label htmlFor="agentModel">Modello agente</Label>
              <Input
                id="agentModel"
                type="text"
                value={settings.agentModel ?? ''}
                onChange={(e) => onFieldChange('agentModel', e.target.value)}
              />
              {touched.agentModel && errors.agentModel && (
                <p className="text-xs text-red-500 mt-1">{errors.agentModel}</p>
              )}
            </div>
          </>
        )}

        {/* BYOK section for Copilot SDK */}
        {showByok && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded p-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              SDK in public preview
            </div>

            <div>
              <Label className="text-sm font-medium">Modalità autenticazione</Label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="copilotByok"
                    checked={!settings.copilotByokEnabled}
                    onChange={() => onFieldChange('copilotByokEnabled', false)}
                    className="accent-blue-600"
                  />
                  Abbonamento Copilot
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="copilotByok"
                    checked={!!settings.copilotByokEnabled}
                    onChange={() => onFieldChange('copilotByokEnabled', true)}
                    className="accent-blue-600"
                  />
                  BYOK
                </label>
              </div>
            </div>

            {settings.copilotByokEnabled && (
              <>
                <div>
                  <Label htmlFor="copilotByokProvider">Provider BYOK</Label>
                  <Select
                    id="copilotByokProvider"
                    value={settings.copilotByokProvider ?? ''}
                    onChange={(e) => onFieldChange('copilotByokProvider', e.target.value)}
                  >
                    <option value="">-- Seleziona --</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="gemini">Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="generic">Generico</option>
                  </Select>
                  {touched.copilotByokProvider && errors.copilotByokProvider && (
                    <p className="text-xs text-red-500 mt-1">{errors.copilotByokProvider}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="copilotByokApiKey">API Key BYOK</Label>
                  <Input
                    id="copilotByokApiKey"
                    type="password"
                    value={settings.copilotByokApiKey ?? ''}
                    onChange={(e) => onFieldChange('copilotByokApiKey', e.target.value)}
                  />
                  {touched.copilotByokApiKey && errors.copilotByokApiKey && (
                    <p className="text-xs text-red-500 mt-1">{errors.copilotByokApiKey}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
