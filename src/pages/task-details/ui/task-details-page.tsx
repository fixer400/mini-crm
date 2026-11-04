import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Pencil } from 'lucide-react'
import { TaskStatusActions } from '@/features/task-change-status'
import { DeleteTaskButton } from '@/features/task-delete'
import { TaskFormDialog } from '@/features/task-upsert'
import { useIsManager } from '@/entities/session'
import { TaskStatusBadge, useTaskQuery } from '@/entities/task'
import { routes } from '@/shared/config'
import { formatDateTime } from '@/shared/lib'
import { ErrorState, PageHeader, PageLoader } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card'
import { TaskHistory } from '@/widgets/task-history'

export function TaskDetailsPage() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const isManager = useIsManager()
  const query = useTaskQuery(taskId)

  if (query.isPending) return <PageLoader />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const task = query.data
  const backTo = task.object ? routes.object(task.object.id) : routes.tasks

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link to={backTo} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" />
            {task.object?.name ?? 'Задачи'}
          </Link>
        }
        title={task.title}
        actions={
          isManager && (
            <>
              <TaskFormDialog
                task={task}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil />
                    Изменить
                  </Button>
                }
              />
              <DeleteTaskButton task={task} onDeleted={() => navigate(backTo, { replace: true })} />
            </>
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                Статус
                <TaskStatusBadge status={task.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <TaskStatusActions task={task} />

              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Объект">
                  {task.object ? (
                    <Link to={routes.object(task.object.id)} className="hover:underline">
                      {task.object.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Field>
                <Field label="Исполнитель">{task.assignee?.full_name ?? '—'}</Field>
                <Field label="Автор">{task.author?.full_name ?? '—'}</Field>
                <Field label="Создана">{formatDateTime(task.created_at)}</Field>
              </dl>

              <dl>
                <dt className="mb-1 text-sm text-muted-foreground">Описание</dt>
                <dd className="whitespace-pre-wrap">
                  {task.description || <span className="text-muted-foreground">Нет описания</span>}
                </dd>
              </dl>
            </CardContent>
          </Card>
        </div>

        <TaskHistory taskId={task.id} />
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  )
}
