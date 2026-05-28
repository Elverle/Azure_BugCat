import { Building } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Textarea } from '@renderer/components/ui/textarea'
import { CollapsibleCard } from '@renderer/components/ui/collapsible-card'
import type { AppSettings } from '@shared/types'

interface ArchitectureContextSectionProps {
  settings: AppSettings
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  onFieldChange: (field: keyof AppSettings, value: unknown) => void
}

export function ArchitectureContextSection({
  settings,
  errors,
  touched,
  onFieldChange
}: ArchitectureContextSectionProps): React.JSX.Element {
  const charCount = (settings.architectureContext ?? '').length
  const isOverLimit = charCount > 1000

  return (
    <CollapsibleCard title="Contesto Architetturale" icon={<Building className="w-5 h-5" />}>
      <div className="space-y-4">
        {/* Architecture context textarea */}
        <div>
          <Label htmlFor="architectureContext">Contesto architetturale</Label>
          <Textarea
            id="architectureContext"
            rows={6}
            value={settings.architectureContext ?? ''}
            onChange={(e) => onFieldChange('architectureContext', e.target.value)}
          />
          <p className={`text-xs mt-1 ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount} / 1000
          </p>
          {touched.architectureContext && errors.architectureContext && (
            <p className="text-xs text-red-500 mt-1">{errors.architectureContext}</p>
          )}
        </div>

        {/* Max concurrent sessions */}
        <div>
          <Label htmlFor="maxConcurrentSessions">Sessioni agente concorrenti</Label>
          <Input
            id="maxConcurrentSessions"
            type="number"
            min={1}
            max={5}
            value={settings.maxConcurrentSessions}
            onChange={(e) => {
              const parsed = parseInt(e.target.value)
              onFieldChange('maxConcurrentSessions', isNaN(parsed) ? 1 : parsed)
            }}
          />
          {touched.maxConcurrentSessions && errors.maxConcurrentSessions && (
            <p className="text-xs text-red-500 mt-1">{errors.maxConcurrentSessions}</p>
          )}
        </div>
      </div>
    </CollapsibleCard>
  )
}
