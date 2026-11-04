import type { ReactNode } from 'react'
import { Label } from '@/shared/ui/shadcn/label'
import { cn } from '@/shared/lib'

type FormFieldProps = {
  label: ReactNode
  htmlFor: string
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  children: ReactNode
}

/** Подпись + поле + текст ошибки. */
export function FormField({ label, htmlFor, error, hint, required, className, children }: FormFieldProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
