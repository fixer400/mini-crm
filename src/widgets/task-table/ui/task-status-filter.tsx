import { TASK_STATUS_LABEL, TASK_STATUS_ORDER, type TaskStatus } from '@/entities/task'
import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui/shadcn/button'

type TaskStatusFilterProps = {
  value: TaskStatus | null
  onChange: (value: TaskStatus | null) => void
  /** Количество задач по статусам — показывается рядом с названием */
  counts: Partial<Record<TaskStatus, number>>
  total: number
}

export function TaskStatusFilter({ value, onChange, counts, total }: TaskStatusFilterProps) {
  const options: { key: TaskStatus | null; label: string; count: number }[] = [
    { key: null, label: 'Все', count: total },
    ...TASK_STATUS_ORDER.map((s) => ({ key: s, label: TASK_STATUS_LABEL[s], count: counts[s] ?? 0 })),
  ]

  return (
    // На телефоне — лента с горизонтальной прокруткой до краёв экрана, на десктопе — перенос строк.
    <div
      className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="group"
      aria-label="Фильтр по статусу"
    >
      {options.map((o) => (
        <Button
          key={o.key ?? 'all'}
          size="sm"
          variant={value === o.key ? 'default' : 'outline'}
          className="shrink-0"
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
        >
          {o.label}
          <span className={cn('tabular-nums', value === o.key ? 'opacity-80' : 'text-muted-foreground')}>
            {o.count}
          </span>
        </Button>
      ))}
    </div>
  )
}
