import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  /** Кнопки действий справа от заголовка */
  actions?: ReactNode
  /** Ссылка «назад» или хлебные крошки над заголовком */
  breadcrumbs?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-2', className)}>
      {breadcrumbs && <div className="text-sm text-muted-foreground">{breadcrumbs}</div>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{title}</h1>
          {description && <p className="mt-1 text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
