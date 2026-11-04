import { useMemo, useState } from 'react'
import { useTasksQuery, type TaskStatus, type TasksFilter } from '@/entities/task'
import { EmptyState, ErrorState, PageLoader } from '@/shared/ui/custom'
import { TaskStatusFilter } from './task-status-filter'
import { TaskTable } from './task-table'

type TaskListSectionProps = {
  filter?: TasksFilter
  hideObject?: boolean
  hideAssignee?: boolean
  emptyText?: string
}

/** Список задач с загрузкой, ошибкой, пустым состоянием и фильтром по статусу. */
export function TaskListSection({
  filter = {},
  hideObject,
  hideAssignee,
  emptyText = 'Задач пока нет',
}: TaskListSectionProps) {
  const query = useTasksQuery(filter)
  const [status, setStatus] = useState<TaskStatus | null>(null)

  const counts = useMemo(() => {
    const result: Partial<Record<TaskStatus, number>> = {}
    for (const t of query.data ?? []) result[t.status] = (result[t.status] ?? 0) + 1
    return result
  }, [query.data])

  if (query.isPending) return <PageLoader className="min-h-40" />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  if (!query.data.length) return <EmptyState title={emptyText} />

  const visible = status ? query.data.filter((t) => t.status === status) : query.data

  return (
    <div className="grid gap-4">
      <TaskStatusFilter value={status} onChange={setStatus} counts={counts} total={query.data.length} />
      {visible.length ? (
        <TaskTable tasks={visible} hideObject={hideObject} hideAssignee={hideAssignee} />
      ) : (
        <EmptyState title="Нет задач с таким статусом" />
      )}
    </div>
  )
}
