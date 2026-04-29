import { useState, useEffect } from 'react'
import { Tags, Info } from 'lucide-react'
import { Textarea } from '@renderer/components/ui/textarea'
import { Button } from '@renderer/components/ui/button'
import { Label } from '@renderer/components/ui/label'

interface CategoriesSectionProps {
  categories: string[]
  onCategoriesChange: (categories: string[]) => void
  onReset: () => void
  categoriesToText: (categories: string[]) => string
  textToCategories: (text: string) => string[]
}

export function CategoriesSection({
  categories,
  onCategoriesChange,
  onReset,
  categoriesToText,
  textToCategories
}: CategoriesSectionProps): React.JSX.Element {
  const [textValue, setTextValue] = useState(() => categoriesToText(categories))

  useEffect(() => {
    setTextValue(categoriesToText(categories))
  }, [categories, categoriesToText])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Tags className="w-5 h-5" />
        Categories
      </h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="categories">Categories (one per line)</Label>
          <Textarea
            id="categories"
            placeholder="Enter one category per line..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onBlur={() => onCategoriesChange(textToCategories(textValue))}
            className="min-h-[160px]"
          />
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            className="text-red-600"
            onClick={() => {
              if (window.confirm('Reset categories? The LLM will auto-generate categories.')) {
                onReset()
              }
            }}
          >
            Reset to default
          </Button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          When categories are empty, the LLM will auto-generate categories based on the bugs.
        </div>
      </div>
    </div>
  )
}
