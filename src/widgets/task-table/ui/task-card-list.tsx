import { Link } from 'react-router'
import { Building2, User } from 'lucide-react'
import { TaskStatusBadge, type TaskWithRelations } from '@/entities/task'
import { routes } from '@/shared/config'
import { formatDate } from '@/shared/lib'

type TaskCardListProps = {
  tasks: TaskWithRelations[]
  hideObject?: boolean
  hideAssignee?: boolean
}

/** Мобильное представление списка задач: карточки вместо таблицы. */
export function TaskCardList({ tasks, hideObject, hideAssignee }: TaskCardListProps) {
  return (
    <ul className="grid gap-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to={routes.task(task.id)}
            className="block rounded-lg border bg-card p-4 transition-colors active:bg-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium break-words">{task.title}</span>
              <TaskStatusBadge status={task.status} className="shrink-0" />
            </div>
            <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
              {!hideObject && task.object && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0" />
                  <span className="truncate">{task.object.name}</span>
                </span>
              )}
              <span className="flex items-center justify-between gap-3">
                {!hideAssignee && task.assignee ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <User className="size-3.5 shrink-0" />
                    <span className="truncate">{task.assignee.full_name}</span>
                  </span>
                ) : (
                  <span />
                )}
                <span className="shrink-0">{formatDate(task.created_at)}</span>
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
