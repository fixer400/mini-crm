import { Plus } from 'lucide-react'
import { ObjectFormDialog } from '@/features/object-upsert'
import { useObjectsQuery } from '@/entities/object'
import { useIsManager } from '@/entities/session'
import { EmptyState, ErrorState, PageHeader, PageLoader } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import { ObjectCardList, ObjectTable } from '@/widgets/object-table'

export function ObjectsPage() {
  const isManager = useIsManager()
  const query = useObjectsQuery()

  return (
    <>
      <PageHeader
        title="Объекты"
        description={isManager ? 'Все строительные объекты' : 'Объекты, в которых у вас есть задачи'}
        actions={
          isManager && (
            <ObjectFormDialog
              trigger={
                <Button>
                  <Plus />
                  Новый объект
                </Button>
              }
            />
          )
        }
      />

      {query.isPending ? (
        <PageLoader />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length ? (
        <>
          <div className="md:hidden">
            <ObjectCardList objects={query.data} />
          </div>
          <div className="hidden md:block">
            <ObjectTable objects={query.data} />
          </div>
        </>
      ) : (
        <EmptyState
          title="Объектов пока нет"
          description={
            isManager
              ? 'Создайте первый объект, чтобы ставить по нему задачи.'
              : 'Здесь появятся объекты, когда вам назначат задачи.'
          }
        />
      )}
    </>
  )
}
