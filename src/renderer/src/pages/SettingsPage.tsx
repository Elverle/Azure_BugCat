import { useEffect, useState } from 'react'
import { Shield, Loader2, CheckCircle2, XCircle, X, AlertTriangle } from 'lucide-react'
import { useSettings } from '@renderer/hooks/useSettings'
import { AdoConnectionSection } from '@renderer/components/settings/AdoConnectionSection'
import { LlmProviderSection } from '@renderer/components/settings/LlmProviderSection'
import { CategoriesSection } from '@renderer/components/settings/CategoriesSection'
import { Button } from '@renderer/components/ui/button'
import { ConfirmDialog } from '@renderer/components/ui/confirm-dialog'
import { cn } from '@renderer/lib/utils'

export function SettingsPage() {
  const {
    settings,
    errors,
    touched,
    loading,
    saving,
    saveResult,
    canSave,
    updateField,
    clearSecret,
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
    textToCategories
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
      setClearResult({ type: 'success', message: 'Session data cleared.' })
    } catch {
      setClearResult({ type: 'error', message: 'Could not clear the session data.' })
    } finally {
      setConfirmOpen(false)
    }
  }

  async function handleClearCatalog(): Promise<void> {
    try {
      await window.electronAPI.clearCatalog()
      setClearCatalogResult({ type: 'success', message: 'Bug history cleared.' })
    } catch {
      setClearCatalogResult({
        type: 'error',
        message: 'Could not clear the bug history.'
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
              aria-label="Dismiss error message"
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
        onClearSecret={clearSecret}
        onTestConnection={testAdoConnection}
        testResult={testAdoResult}
        testLoading={testAdoLoading}
      />

      <LlmProviderSection
        settings={settings}
        errors={errors}
        touched={touched}
        onFieldChange={updateField}
        onClearSecret={clearSecret}
        onTestConnection={testLlmConnection}
        testResult={testLlmResult}
        testLoading={testLlmLoading}
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
              aria-label="Dismiss error message"
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
            <h3 className="text-base font-semibold text-red-800">Danger zone</h3>
            <p className="text-sm text-red-700 mt-1">
              This clears the current snapshot: downloaded bugs, their categorizations and the
              similarity results. The history of bugs already seen stays available. This cannot
              be undone.
            </p>
            <div className="mt-3">
              <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                Clear session data
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
              aria-label="Dismiss error message"
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
            <h3 className="text-base font-semibold text-red-800">Clear bug history</h3>
            <p className="text-sm text-red-700 mt-1">
              This permanently deletes the whole history of bugs already seen, including
              lifecycle metadata and past categorizations. The current snapshot stays
              available. This cannot be undone.
            </p>
            <div className="mt-3">
              <Button variant="destructive" onClick={() => setConfirmCatalogOpen(true)}>
                Clear bug history
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Clear the current session?"
        description="The downloaded bugs, their current categorization and the similarity results will be deleted. The history of bugs already seen stays available. This cannot be undone."
        confirmLabel="Clear session"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleClearSession}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={confirmCatalogOpen}
        title="Clear the bug history?"
        description="All historical bug data will be permanently deleted, including categorizations and lifecycle metadata. The current snapshot stays available. This cannot be undone. Do you want to proceed?"
        confirmLabel="Clear history"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleClearCatalog}
        onCancel={() => setConfirmCatalogOpen(false)}
      />
    </div>
  )
}
