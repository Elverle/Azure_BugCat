import { useEffect, useState } from 'react'
import { FolderOpen, Trash2 } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Textarea } from '@renderer/components/ui/textarea'
import { Button } from '@renderer/components/ui/button'
import type { ProjectEntry, CodeSource } from '@shared/types'

interface ProjectRegistrySectionProps {
  projects: ProjectEntry[]
  errors: Record<string, string | null>
  touched: Record<string, boolean>
  codeSource: CodeSource
  onAddProject: () => void
  onUpdateProject: (id: string, updates: Partial<ProjectEntry>) => void
  onRemoveProject: (id: string) => void
  onSelectDirectory: () => Promise<string | null>
}

export function ProjectRegistrySection({
  projects,
  errors,
  touched,
  codeSource,
  onAddProject,
  onUpdateProject,
  onRemoveProject,
  onSelectDirectory
}: ProjectRegistrySectionProps): React.JSX.Element {
  const [keywordDrafts, setKeywordDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    setKeywordDrafts((prev) => {
      const next: Record<string, string> = { ...prev }

      for (const project of projects) {
        if (!(project.id in next)) {
          next[project.id] = project.keywords.join(', ')
        }
      }

      for (const projectId of Object.keys(next)) {
        if (!projects.some((project) => project.id === projectId)) {
          delete next[projectId]
        }
      }

      return next
    })
  }, [projects])

  async function handleSelectPath(projectId: string): Promise<void> {
    const result = await onSelectDirectory()
    if (result) {
      onUpdateProject(projectId, { path: result })
    }
  }

  function parseKeywords(value: string): string[] {
    return value
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Progetti Registrati
        </h2>
        <Button variant="outline" onClick={onAddProject}>
          + Aggiungi progetto
        </Button>
      </div>

      <div className="space-y-4">
        {projects.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            Nessun progetto registrato. Aggiungi un progetto per abilitare le sessioni agente.
          </p>
        )}

        {projects.map((project, index) => (
          <div
            key={project.id}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
          >
            {/* Name */}
            <div>
              <Label htmlFor={`project-${index}-name`}>Nome progetto</Label>
              <Input
                id={`project-${index}-name`}
                type="text"
                value={project.name}
                onChange={(e) => onUpdateProject(project.id, { name: e.target.value })}
              />
              {touched[`project-${index}-name`] && errors[`project-${index}-name`] && (
                <p className="text-xs text-red-500 mt-1">{errors[`project-${index}-name`]}</p>
              )}
            </div>

            {/* Path — only shown in local mode */}
            {codeSource === 'local' && (
              <div>
                <Label htmlFor={`project-${index}-path`}>Percorso</Label>
                <div className="flex gap-2">
                  <Input
                    id={`project-${index}-path`}
                    type="text"
                    value={project.path ?? ''}
                    onChange={(e) => onUpdateProject(project.id, { path: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleSelectPath(project.id)}
                    title="Seleziona cartella"
                  >
                    📁
                  </Button>
                </div>
                {touched[`project-${index}-path`] && errors[`project-${index}-path`] && (
                  <p className="text-xs text-red-500 mt-1">{errors[`project-${index}-path`]}</p>
                )}
              </div>
            )}
            {codeSource === 'mcp-repos' && (
              <p className="text-xs text-gray-500 italic">
                In modalità MCP Repos il nome del progetto viene usato come identificativo del
                repository Azure DevOps.
              </p>
            )}

            {/* Type */}
            <div>
              <Label className="text-sm font-medium">Tipo</Label>
              <div className="flex gap-4 mt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`project-${index}-type`}
                    checked={project.type === 'backend'}
                    onChange={() => onUpdateProject(project.id, { type: 'backend' })}
                    className="accent-blue-600"
                  />
                  Backend
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`project-${index}-type`}
                    checked={project.type === 'frontend'}
                    onChange={() => onUpdateProject(project.id, { type: 'frontend' })}
                    className="accent-blue-600"
                  />
                  Frontend
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name={`project-${index}-type`}
                    checked={project.type === 'shared'}
                    onChange={() => onUpdateProject(project.id, { type: 'shared' })}
                    className="accent-blue-600"
                  />
                  Shared
                </label>
              </div>
              {touched[`project-${index}-type`] && errors[`project-${index}-type`] && (
                <p className="text-xs text-red-500 mt-1">{errors[`project-${index}-type`]}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor={`project-${index}-description`}>Descrizione</Label>
              <Textarea
                id={`project-${index}-description`}
                rows={2}
                value={project.description}
                onChange={(e) => onUpdateProject(project.id, { description: e.target.value })}
              />
              {touched[`project-${index}-description`] &&
                errors[`project-${index}-description`] && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors[`project-${index}-description`]}
                  </p>
                )}
            </div>

            {/* Keywords */}
            <div>
              <Label htmlFor={`project-${index}-keywords`}>Keywords (separate da virgola)</Label>
              <Input
                id={`project-${index}-keywords`}
                type="text"
                value={keywordDrafts[project.id] ?? project.keywords.join(', ')}
                onChange={(e) => {
                  const value = e.target.value
                  setKeywordDrafts((prev) => ({ ...prev, [project.id]: value }))
                  onUpdateProject(project.id, {
                    keywords: parseKeywords(value)
                  })
                }}
                onBlur={(e) => {
                  const value = e.target.value
                  setKeywordDrafts((prev) => ({ ...prev, [project.id]: value }))
                  onUpdateProject(project.id, {
                    keywords: parseKeywords(value)
                  })
                }}
              />
              {touched[`project-${index}-keywords`] && errors[`project-${index}-keywords`] && (
                <p className="text-xs text-red-500 mt-1">{errors[`project-${index}-keywords`]}</p>
              )}
            </div>

            {/* Remove button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onRemoveProject(project.id)}
                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Rimuovi
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
