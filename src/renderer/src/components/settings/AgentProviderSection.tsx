import { useState } from 'react'
import {
  Terminal,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Wifi
} from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Select } from '@renderer/components/ui/select'
import { Button } from '@renderer/components/ui/button'
import { CollapsibleCard } from '@renderer/components/ui/collapsible-card'
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
  const [copilotTestLoading, setCopilotTestLoading] = useState(false)
  const [copilotTestResult, setCopilotTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  const isAnthropicAuto = settings.llmProvider === 'anthropic'
  const isOpenaiAuto = settings.llmProvider === 'openai'
  const isAutoProvider = isAnthropicAuto || isOpenaiAuto

  const effectiveProvider = isAnthropicAuto
    ? 'claude-sdk'
    : isOpenaiAuto
      ? 'codex-sdk'
      : settings.agentProvider

  const showAgentApiKeyField =
    !isAutoProvider && effectiveProvider !== 'none' && effectiveProvider !== 'copilot-sdk'
  const showAgentModelField = !isAutoProvider && effectiveProvider !== 'none'

  const showCodexCheck = effectiveProvider === 'codex-sdk'
  const showByok = effectiveProvider === 'copilot-sdk'
  const copilotByokBaseUrlPlaceholder =
    settings.copilotByokProvider === 'openai'
      ? 'https://api.openai.com/v1'
      : settings.copilotByokProvider === 'anthropic'
        ? 'https://api.anthropic.com'
        : settings.copilotByokProvider === 'openrouter'
          ? 'https://openrouter.ai/api/v1'
          : 'https://example.com/v1'
  const agentModelPlaceholder =
    effectiveProvider === 'claude-sdk'
      ? 'Es. claude-sonnet-4.5'
      : effectiveProvider === 'copilot-sdk'
        ? settings.copilotByokEnabled && settings.copilotByokProvider === 'anthropic'
          ? 'Es. claude-sonnet-4.5'
          : 'Es. gpt-4.1'
        : 'Es. gpt-4.1'

  return (
    <CollapsibleCard title="Agent Provider" icon={<Terminal className="w-5 h-5" />}>
      <div className="space-y-4">
        {/* Code Source selector */}
        <div>
          <Label className="text-sm font-medium">Sorgente codice per analisi</Label>
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="codeSource"
                checked={settings.codeSource === 'local'}
                onChange={() => onFieldChange('codeSource', 'local')}
                className="accent-blue-600"
              />
              Filesystem locale
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="codeSource"
                checked={settings.codeSource === 'mcp-repos'}
                onChange={() => onFieldChange('codeSource', 'mcp-repos')}
                className="accent-blue-600"
              />
              MCP Azure DevOps Repos
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {settings.codeSource === 'mcp-repos'
              ? "L'agente leggerà il codice direttamente dai repository Azure DevOps via MCP. Non servono path locali."
              : "L'agente leggerà il codice dal filesystem locale. I progetti devono avere un percorso valido."}
          </p>
        </div>

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

        {showAgentApiKeyField && (
          <div>
            <Label htmlFor="agentApiKey">
              API Key agente
              {effectiveProvider === 'claude-sdk' && (
                <span className="text-xs font-normal text-gray-400 ml-1">(opzionale)</span>
              )}
            </Label>
            <div className="relative">
              <Input
                id="agentApiKey"
                type={showApiKey ? 'text' : 'password'}
                value={settings.agentApiKey ?? ''}
                onChange={(e) => onFieldChange('agentApiKey', e.target.value)}
                placeholder={
                  effectiveProvider === 'claude-sdk'
                    ? 'Lascia vuoto per usare la config locale di Claude Code'
                    : ''
                }
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
        )}

        {showAgentModelField && (
          <div>
            <Label htmlFor="agentModel">
              Modello agente
              <span className="text-xs font-normal text-gray-400 ml-1">(opzionale)</span>
            </Label>
            <Input
              id="agentModel"
              type="text"
              value={settings.agentModel ?? ''}
              onChange={(e) => onFieldChange('agentModel', e.target.value)}
              placeholder={agentModelPlaceholder}
            />
            {touched.agentModel && errors.agentModel && (
              <p className="text-xs text-red-500 mt-1">{errors.agentModel}</p>
            )}
            {effectiveProvider === 'copilot-sdk' && (
              <p className="text-xs text-gray-500 mt-1">
                Il Copilot SDK usa questo valore per la sessione corrente. Se lasci vuoto, BugCat
                usa il modello predefinito del provider selezionato e non riusa un vecchio valore
                rimasto da Claude Code SDK.
              </p>
            )}
          </div>
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
                  <Label htmlFor="copilotByokBaseUrl">
                    Base URL BYOK
                    {(settings.copilotByokProvider === 'openai' ||
                      settings.copilotByokProvider === 'anthropic' ||
                      settings.copilotByokProvider === 'openrouter') && (
                      <span className="text-xs font-normal text-gray-400 ml-1">(opzionale)</span>
                    )}
                  </Label>
                  <Input
                    id="copilotByokBaseUrl"
                    type="text"
                    value={settings.copilotByokBaseUrl ?? ''}
                    onChange={(e) => onFieldChange('copilotByokBaseUrl', e.target.value)}
                    placeholder={copilotByokBaseUrlPlaceholder}
                  />
                  {touched.copilotByokBaseUrl && errors.copilotByokBaseUrl && (
                    <p className="text-xs text-red-500 mt-1">{errors.copilotByokBaseUrl}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Il Copilot SDK usa `provider.baseUrl` nella SessionConfig. Se lasci vuoto,
                    BugCat usa l&apos;endpoint standard per OpenAI, Anthropic o OpenRouter.
                  </p>
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

        {/* Copilot connection test */}
        {effectiveProvider === 'copilot-sdk' && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={copilotTestLoading}
              onClick={async () => {
                setCopilotTestLoading(true)
                setCopilotTestResult(null)
                try {
                  const api = window.electronAPI as any
                  const result = await api.agentTestCopilot({
                    copilotByokEnabled: settings.copilotByokEnabled,
                    copilotByokProvider: settings.copilotByokProvider,
                    copilotByokApiKey: settings.copilotByokApiKey,
                    copilotByokBaseUrl: settings.copilotByokBaseUrl,
                    agentProvider: effectiveProvider,
                    llmProvider: settings.llmProvider
                  })
                  setCopilotTestResult(result as { success: boolean; message: string })
                } catch {
                  setCopilotTestResult({ success: false, message: 'Errore durante il test' })
                } finally {
                  setCopilotTestLoading(false)
                }
              }}
            >
              {copilotTestLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              <Wifi className="w-4 h-4 mr-1" />
              Verifica connessione Copilot
            </Button>
            {copilotTestResult && (
              <span
                className={`text-sm flex items-center gap-1 ${copilotTestResult.success ? 'text-green-600' : 'text-red-600'}`}
              >
                {copilotTestResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {copilotTestResult.message}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    {copilotTestResult.message}
                  </>
                )}
              </span>
            )}
          </div>
        )}
      </div>
    </CollapsibleCard>
  )
}
