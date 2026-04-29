import { useEffect } from 'react'
import { Shield, Loader2, CheckCircle2, XCircle, X } from 'lucide-react'
import { useSettings } from '@renderer/hooks/useSettings'
import { AdoConnectionSection } from '@renderer/components/settings/AdoConnectionSection'
import { LlmProviderSection } from '@renderer/components/settings/LlmProviderSection'
import { CategoriesSection } from '@renderer/components/settings/CategoriesSection'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'

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
    textToCategories
  } = useSettings()

  // Auto-dismiss success saveResult after 3 seconds
  useEffect(() => {
    if (saveResult?.type === 'success') {
      const timer = setTimeout(() => clearSaveResult(), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveResult, clearSaveResult])

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
            <button onClick={clearSaveResult} className="text-red-600 hover:text-red-800">
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
    </div>
  )
}
