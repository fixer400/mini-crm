import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { TaskFormDialog } from '@/features/task-upsert'
import { useViewer } from '@/entities/session'
import { routes } from '@/shared/config'
import { PageHeader } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import { TaskListSection } from '@/widgets/task-table'

/** Для исполнителя — «Мои задачи», для постановщика — все задачи по всем объектам. */
export function TasksPage() {
  const viewer = useViewer()
  const navigate = useNavigate()
  const isManager = viewer.role === 'manager'

  if (!isManager) {
    return (
      <>
        <PageHeader title="Мои задачи" description="Задачи, назначенные на вас" />
        {/* RLS и так вернёт только свои задачи; фильтр — для явности запроса. */}
        <TaskListSection filter={{ assigneeId: viewer.id }} hideAssignee emptyText="Вам пока не назначено задач" />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Все задачи"
        description="Задачи по всем объектам"
        actions={
          <TaskFormDialog
            onCreated={(task) => navigate(routes.task(task.id))}
            trigger={
              <Button>
                <Plus />
                Новая задача
              </Button>
            }
          />
        }
      />
      <TaskListSection />
    </>
  )
}
