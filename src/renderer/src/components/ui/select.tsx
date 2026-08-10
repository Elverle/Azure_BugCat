import * as React from 'react'
import { cn } from '@renderer/lib/utils'

// A `type` alias here breaks eslint-plugin-react's prop-types resolution for
// forwardRef components (produces false-positive react/prop-types errors);
// the empty interface is intentional passthrough of the native HTML attributes.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      className={cn(
        'flex h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Select.displayName = 'Select'

export { Select }
