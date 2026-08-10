import * as React from 'react'
import { cn } from '@renderer/lib/utils'

// A `type` alias here breaks eslint-plugin-react's prop-types resolution for
// forwardRef components (produces false-positive react/prop-types errors);
// the empty interface is intentional passthrough of the native HTML attributes.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label className={cn('text-sm font-medium text-gray-700', className)} ref={ref} {...props} />
  )
})
Label.displayName = 'Label'

export { Label }
