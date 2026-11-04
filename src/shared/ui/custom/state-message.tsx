import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from '@/shared/ui/shadcn/button'
import { getErrorMessage } from '@/shared/api'
import { cn } from '@/shared/lib'

type StateMessageProps = {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** Базовая заглушка «пусто / ошибка» по центру блока. */
export function StateMessage({ icon, title, description, action, className }: StateMessageProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center',
        className,
      )}
    >
      {icon && <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function EmptyState(props: Omit<StateMessageProps, 'icon'>) {
  return <StateMessage icon={<Inbox />} {...props} />
}

type ErrorStateProps = {
  error?: unknown
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ error, message, onRetry, className }: ErrorStateProps) {
  return (
    <StateMessage
      className={cn('border-destructive/40', className)}
      icon={<AlertTriangle className="text-destructive" />}
      title="Не удалось загрузить данные"
      description={message ?? (error ? getErrorMessage(error) : undefined)}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Повторить
          </Button>
        )
      }
    />
  )
}
