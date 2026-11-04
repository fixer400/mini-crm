import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui/shadcn/badge'
import { TASK_STATUS_LABEL } from '../model/status'
import type { TaskStatus } from '../model/types'

// Цвета берутся из CSS-переменных --status-* (src/app/styles/index.css).
const STATUS_CLASS: Record<TaskStatus, string> = {
  new: 'bg-status-new text-status-new-foreground',
  in_progress: 'bg-status-in-progress text-status-in-progress-foreground',
  review: 'bg-status-review text-status-review-foreground',
  accepted: 'bg-status-accepted text-status-accepted-foreground',
  rework: 'bg-status-rework text-status-rework-foreground',
}

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('border-transparent', STATUS_CLASS[status], className)}>
      {TASK_STATUS_LABEL[status]}
    </Badge>
  )
}
