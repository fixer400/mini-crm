import { ArrowRight } from 'lucide-react'
import { TaskStatusBadge, useTaskHistoryQuery } from '@/entities/task'
import { formatDateTime } from '@/shared/lib'
import { ErrorState, PageLoader } from '@/shared/ui/custom'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card'

export function TaskHistory({ taskId }: { taskId: string }) {
  const query = useTaskHistoryQuery(taskId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>История статусов</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <PageLoader className="min-h-24" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <ol className="relative grid gap-5 border-l pl-5">
            {/* Новые записи сверху */}
            {[...query.data].reverse().map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-muted-foreground" />
                <div className="flex flex-wrap items-center gap-2">
                  {entry.from_status ? (
                    <>
                      <TaskStatusBadge status={entry.from_status} />
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Создана</span>
                  )}
                  <TaskStatusBadge status={entry.to_status} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {entry.actor?.full_name ?? 'Пользователь'} · {formatDateTime(entry.changed_at)}
                </div>
                {entry.comment && (
                  <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
                    {entry.comment}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
