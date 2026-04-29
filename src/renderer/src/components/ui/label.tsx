import * as React from 'react'
import { cn } from '@renderer/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => {
  return (
    <label className={cn('text-sm font-medium text-gray-700', className)} ref={ref} {...props} />
  )
})
Label.displayName = 'Label'

export { Label }
