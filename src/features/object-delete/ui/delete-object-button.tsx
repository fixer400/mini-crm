import { useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteObject, objectKeys, type ConstructionObject } from '@/entities/object'
import { getErrorMessage } from '@/shared/api'
import { ConfirmDialog } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'

type DeleteObjectButtonProps = {
  object: Pick<ConstructionObject, 'id' | 'name'>
  tasksCount: number
  onDeleted?: () => void
}

export function DeleteObjectButton({ object, tasksCount, onDeleted }: DeleteObjectButtonProps) {
  const queryClient = useQueryClient()

  const handleConfirm = async () => {
    try {
      await deleteObject(object.id)
      queryClient.removeQueries({ queryKey: objectKeys.detail(object.id) })
      await queryClient.invalidateQueries({ queryKey: objectKeys.list() })
      toast.success('Объект удалён')
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
      title={`Удалить объект «${object.name}»?`}
      description={
        tasksCount > 0
          ? `В объекте ${tasksCount} задач(и). Объект с задачами удалить нельзя — сначала удалите или перенесите задачи.`
          : 'Действие нельзя отменить.'
      }
      confirmText="Удалить"
      destructive
      onConfirm={handleConfirm}
    />
  )
}
