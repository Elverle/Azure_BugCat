import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface CollapsibleCardProps {
  title: string
  icon?: React.ReactNode
  headerAction?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleCard({
  title,
  icon,
  headerAction,
  defaultOpen = true,
  children
}: CollapsibleCardProps): React.JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <button
        type="button"
        className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </span>
        <div className="flex items-center gap-2">
          {headerAction && <span onClick={(e) => e.stopPropagation()}>{headerAction}</span>}
          <ChevronDown
            className={cn(
              'w-5 h-5 text-gray-500 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </div>
      </button>
      {open && <div className="px-6 pb-6 pt-0">{children}</div>}
    </div>
  )
}
