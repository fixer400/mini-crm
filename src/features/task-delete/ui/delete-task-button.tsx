import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { objectKeys } from '@/entities/object'
import { deleteTask, taskKeys, type Task } from '@/entities/task'
import { getErrorMessage } from '@/shared/api'
import { ConfirmDialog } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'

type DeleteTaskButtonProps = {
  task: Pick<Task, 'id' | 'title'>
  onDeleted?: () => void
}

export function DeleteTaskButton({ task, onDeleted }: DeleteTaskButtonProps) {
  const queryClient = useQueryClient()

  const handleConfirm = async () => {
    try {
      await deleteTask(task.id)
      queryClient.removeQueries({ queryKey: taskKeys.detail(task.id) })
      queryClient.removeQueries({ queryKey: taskKeys.history(task.id) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: objectKeys.list() })
      toast.success('Задача удалена')
      onDeleted?.()
    } catch (error) {
      toast.error(getErrorMessage(error))
      throw error
    }
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" size="sm">
          <Trash2 />
          Удалить
        </Button>
      }
      title={`Удалить задачу «${task.title}»?`}
      description="Вместе с задачей удалится её история статусов. Действие нельзя отменить."
      confirmText="Удалить"
      destructive
      onConfirm={handleConfirm}
    />
  )
}
