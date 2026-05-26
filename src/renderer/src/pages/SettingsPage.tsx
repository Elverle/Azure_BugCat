import { useEffect, useState } from 'react'
import { Shield, Loader2, CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react'
import { useSettings } from '@renderer/hooks/useSettings'
import { AdoConnectionSection } from '@renderer/components/settings/AdoConnectionSection'
import { LlmProviderSection } from '@renderer/components/settings/LlmProviderSection'
import { AgentProviderSection } from '@renderer/components/settings/AgentProviderSection'
import { ProjectRegistrySection } from '@renderer/components/settings/ProjectRegistrySection'
import { ArchitectureContextSection } from '@renderer/components/settings/ArchitectureContextSection'
import { CategoriesSection } from '@renderer/components/settings/CategoriesSection'
import { Button } from '@renderer/components/ui/button'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { cn } from '@renderer/lib/utils'
import type { BinaryCheckResult } from '@shared/types'

export function SettingsPage() {
  const {
    settings,
    errors,
    touched,
    loading,
    saving,
    saveResult,
    isDirty,
    canSave,
    updateField,
    save,
    clearSaveResult,
    testAdoConnection,
    testAdoResult,
    testAdoLoading,
    testLlmConnection,
    testLlmResult,
    testLlmLoading,
    resetCategories,
    categoriesToText,
    textToCategories,
    addProject,
    updateProject,
    removeProject,
    checkAgentBinary,
    selectDirectory
  } = useSettings()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearResult, setClearResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [confirmCatalogOpen, setConfirmCatalogOpen] = useState(false)
  const [clearCatalogResult, setClearCatalogResult] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [binaryCheckResult, setBinaryCheckResult] = useState<BinaryCheckResult | null>(null)
  const [binaryCheckLoading, setBinaryCheckLoading] = useState(false)

  async function handleCheckBinary(): Promise<void> {
    setBinaryCheckLoading(true)
    try {
      const result = await checkAgentBinary()
      setBinaryCheckResult(result)
    } finally {
      setBinaryCheckLoading(false)
    }
  }

  // Auto-dismiss success saveResult after 3 seconds
  useEffect(() => {
    if (saveResult?.type === 'success') {
      const timer = setTimeout(() => clearSaveResult(), 10000)
      return () => clearTimeout(timer)
    }
  }, [saveResult, clearSaveResult])

  // Auto-dismiss clearResult after 10 seconds
  useEffect(() => {
    if (clearResult?.type === 'success') {
      const timer = setTimeout(() => setClearResult(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [clearResult])

  // Auto-dismiss clearCatalogResult after 10 seconds
  useEffect(() => {
    if (clearCatalogResult?.type === 'success') {
      const timer = setTimeout(() => setClearCatalogResult(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [clearCatalogResult])

  async function handleClearSession(): Promise<void> {
    try {
      await window.electronAPI.clearSession()
      setClearResult({ type: 'success', message: 'Dati sessione eliminati con successo.' })
    } catch {
      setClearResult({ type: 'error', message: 'Errore durante la pulizia dei dati sessione.' })
    } finally {
      setConfirmOpen(false)
    }
  }

  async function handleClearCatalog(): Promise<void> {
    try {
      await window.electronAPI.clearCatalog()
      setClearCatalogResult({ type: 'success', message: 'Storico bug eliminato con successo.' })
    } catch {
      setClearCatalogResult({
        type: 'error',
        message: 'Errore durante la cancellazione dello storico bug.'
      })
    } finally {
      setConfirmCatalogOpen(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure Azure DevOps connection and LLM provider
        </p>
      </div>

      {/* Security note — always visible */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center gap-2">
        <Shield className="w-4 h-4 shrink-0" />
        Credentials are stored locally in encrypted form using machine-specific keys.
      </div>

      {/* Save result feedback banner */}
      {saveResult && (
        <div
          className={cn(
            'rounded-lg p-3 text-sm flex items-center gap-2',
            saveResult.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {saveResult.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{saveResult.message}</span>
          {saveResult.type === 'error' && (
            <button
              onClick={clearSaveResult}
              aria-label="Chiudi messaggio di errore"
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Section cards */}
      <AdoConnectionSection
        settings={settings}
        errors={errors}
        touched={touched}
        onFieldChange={updateField}
        onTestConnection={testAdoConnection}
        testResult={testAdoResult}
        testLoading={testAdoLoading}
      />

      <LlmProviderSection
        settings={settings}
        errors={errors}
        touched={touched}
        onFieldChange={updateField}
        onTestConnection={testLlmConnection}
        testResult={testLlmResult}
        testLoading={testLlmLoading}
      />

      <AgentProviderSection
        settings={settings}
        errors={errors}
        touched={touched}
        onFieldChange={updateField}
        onCheckBinary={handleCheckBinary}
        binaryCheckResult={binaryCheckResult}
        binaryCheckLoading={binaryCheckLoading}
      />

      <ProjectRegistrySection
        projects={settings.projects}
        errors={errors}
        touched={touched}
        codeSource={settings.codeSource}
        onAddProject={addProject}
        onUpdateProject={updateProject}
        onRemoveProject={removeProject}
        onSelectDirectory={selectDirectory}
      />

      <ArchitectureContextSection
        settings={settings}
        errors={errors}
        touched={touched}
        onFieldChange={updateField}
      />

      <CategoriesSection
        categories={settings.categories}
        onCategoriesChange={(cats) => updateField('categories', cats)}
        onReset={resetCategories}
        categoriesToText={categoriesToText}
        textToCategories={textToCategories}
      />

      {/* Action bar */}
      <div className="flex justify-end gap-3 pt-2 pb-4">
        <Button disabled={!canSave} onClick={save}>
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Save Settings
        </Button>
      </div>

      {/* Danger zone */}
      {clearResult && (
        <div
          className={cn(
            'rounded-lg p-3 text-sm flex items-center gap-2',
            clearResult.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {clearResult.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{clearResult.message}</span>
          {clearResult.type === 'error' && (
            <button
              onClick={() => setClearResult(null)}
              aria-label="Chiudi messaggio di errore"
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="border border-red-300 rounded-lg p-4 bg-red-50/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-red-800">Zona pericolosa</h3>
            <p className="text-sm text-red-700 mt-1">
              Questa azione elimina lo snapshot corrente: bug scaricati, categorizzazioni e
              risultati di similarità. Lo storico dei bug già visti resta disponibile.
              L&apos;operazione non è reversibile.
            </p>
            <div className="mt-3">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Pulisci dati sessione
              </Button>
            </div>
          </div>
        </div>
      </div>
      {clearCatalogResult && (
        <div
          className={cn(
            'rounded-lg p-3 text-sm flex items-center gap-2',
            clearCatalogResult.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          {clearCatalogResult.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="flex-1">{clearCatalogResult.message}</span>
          {clearCatalogResult.type === 'error' && (
            <button
              onClick={() => setClearCatalogResult(null)}
              aria-label="Chiudi messaggio di errore"
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="border border-red-300 rounded-lg p-4 bg-red-50/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-base font-semibold text-red-800">Cancella storico bug</h3>
            <p className="text-sm text-red-700 mt-1">
              Questa azione elimina permanentemente tutto lo storico dei bug già visti, inclusi
              metadati di lifecycle e categorizzazioni storiche. Lo snapshot corrente resta
              disponibile. L&apos;operazione non è reversibile.
            </p>
            <div className="mt-3">
              <Button variant="destructive" onClick={() => setConfirmCatalogOpen(true)}>
                Cancella storico bug
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Conferma pulizia sessione corrente"
        description="I bug scaricati, le categorizzazioni correnti e i risultati di similarità verranno eliminati. Lo storico dei bug già visti resta disponibile. L'operazione non è reversibile."
        confirmLabel="Pulisci sessione"
        cancelLabel="Annulla"
        variant="destructive"
        onConfirm={handleClearSession}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={confirmCatalogOpen}
        title="Conferma cancellazione storico"
        description="Tutti i dati storici dei bug verranno eliminati permanentemente, incluse categorizzazioni e metadati di lifecycle. Lo snapshot corrente resta disponibile. Questa operazione non è reversibile. Vuoi procedere?"
        confirmLabel="Cancella storico"
        cancelLabel="Annulla"
        variant="destructive"
        onConfirm={handleClearCatalog}
        onCancel={() => setConfirmCatalogOpen(false)}
      />
    </div>
  )
}
