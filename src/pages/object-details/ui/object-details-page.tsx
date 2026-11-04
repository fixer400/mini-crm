import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, MapPin, Pencil, Plus } from 'lucide-react'
import { DeleteObjectButton } from '@/features/object-delete'
import { ObjectFormDialog } from '@/features/object-upsert'
import { TaskFormDialog } from '@/features/task-upsert'
import { useObjectQuery } from '@/entities/object'
import { useIsManager } from '@/entities/session'
import { useTasksQuery } from '@/entities/task'
import { routes } from '@/shared/config'
import { ErrorState, PageHeader, PageLoader } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import { TaskListSection } from '@/widgets/task-table'

export function ObjectDetailsPage() {
  const { objectId = '' } = useParams()
  const navigate = useNavigate()
  const isManager = useIsManager()
  const objectQuery = useObjectQuery(objectId)
  // Тот же ключ, что и у TaskListSection — запрос не дублируется.
  const tasksQuery = useTasksQuery({ objectId })

  if (objectQuery.isPending) return <PageLoader />
  if (objectQuery.isError) {
    return <ErrorState error={objectQuery.error} onRetry={() => objectQuery.refetch()} />
  }

  const object = objectQuery.data

  return (
    <>
      <PageHeader
        breadcrumbs={
          <Link to={routes.objects} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="size-4" />
            Объекты
          </Link>
        }
        title={object.name}
        description={
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" />
            {object.address}
          </span>
        }
        actions={
          isManager && (
            <>
              <TaskFormDialog
                defaultObjectId={object.id}
                trigger={
                  <Button>
                    <Plus />
                    Новая задача
                  </Button>
                }
              />
              <ObjectFormDialog
                object={object}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil />
                    Изменить
                  </Button>
                }
              />
              <DeleteObjectButton
                object={object}
                tasksCount={tasksQuery.data?.length ?? 0}
                onDeleted={() => navigate(routes.objects, { replace: true })}
              />
            </>
          )
        }
      />

      <h2 className="mb-3 text-lg font-semibold">Задачи</h2>
      <TaskListSection
        filter={{ objectId }}
        hideObject
        emptyText={isManager ? 'По объекту ещё нет задач' : 'У вас нет задач по этому объекту'}
      />
    </>
  )
}
