import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { changeTaskStatus, TASK_STATUS_LABEL, taskKeys, type TaskStatus } from '@/entities/task'
import { getErrorMessage } from '@/shared/api'

export function useChangeTaskStatus(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { to: TaskStatus; comment?: string }) =>
      changeTaskStatus({ taskId, ...params }),
    onSuccess: (task) => {
      toast.success(`Статус: «${TASK_STATUS_LABEL[task.status]}»`)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
    // И при успехе, и при ошибке (например, статус уже сменил кто-то другой) — перечитываем.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.history(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    },
  })
}
