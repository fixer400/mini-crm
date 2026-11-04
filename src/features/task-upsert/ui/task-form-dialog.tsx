import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { objectKeys, useObjectsQuery } from '@/entities/object'
import { useExecutorsQuery } from '@/entities/profile'
import {
  createTask,
  taskKeys,
  updateTask,
  type Task,
  type TaskFormValues,
} from '@/entities/task'
import { getErrorMessage } from '@/shared/api'
import { FormField, Spinner } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog'
import { Input } from '@/shared/ui/shadcn/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select'
import { Textarea } from '@/shared/ui/shadcn/textarea'

type TaskFormDialogProps = {
  /** Если передана — режим редактирования */
  task?: Task
  /** Объект, выбранный по умолчанию при создании (из карточки объекта) */
  defaultObjectId?: string
  trigger: ReactNode
  onCreated?: (task: Task) => void
}

type Errors = Partial<Record<keyof TaskFormValues, string>>

function validate(values: TaskFormValues): Errors {
  const errors: Errors = {}
  if (!values.title.trim()) errors.title = 'Укажите название'
  if (!values.object_id) errors.object_id = 'Выберите объект'
  if (!values.assignee_id) errors.assignee_id = 'Выберите исполнителя'
  return errors
}

export function TaskFormDialog({ task, defaultObjectId, trigger, onCreated }: TaskFormDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Редактирование задачи' : 'Новая задача'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Статус меняется только кнопками действий в карточке задачи.'
              : 'Задача создаётся в статусе «Новая».'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TaskForm
            task={task}
            defaultObjectId={defaultObjectId}
            onDone={(created) => {
              setOpen(false)
              if (created) onCreated?.(created)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

type TaskFormProps = {
  task?: Task
  defaultObjectId?: string
  onDone: (created?: Task) => void
}

function TaskForm({ task, defaultObjectId, onDone }: TaskFormProps) {
  const queryClient = useQueryClient()
  const objectsQuery = useObjectsQuery()
  const executorsQuery = useExecutorsQuery()

  const [values, setValues] = useState<TaskFormValues>({
    title: task?.title ?? '',
    description: task?.description ?? '',
    object_id: task?.object_id ?? defaultObjectId ?? '',
    assignee_id: task?.assignee_id ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const mutation = useMutation({
    mutationFn: (payload: TaskFormValues) =>
      task ? updateTask(task.id, payload) : createTask(payload),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
      // Счётчики задач в списке объектов
      queryClient.invalidateQueries({ queryKey: objectKeys.list() })
      toast.success(task ? 'Задача сохранена' : 'Задача создана')
      onDone(task ? undefined : saved)
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    mutation.mutate({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <FormField label="Название" htmlFor="task-title" error={errors.title} required>
        <Input
          id="task-title"
          value={values.title}
          maxLength={200}
          onChange={(e) => set('title', e.target.value)}
          aria-invalid={Boolean(errors.title)}
          autoFocus
        />
      </FormField>

      <FormField label="Описание" htmlFor="task-description">
        <Textarea
          id="task-description"
          rows={4}
          value={values.description}
          maxLength={5000}
          onChange={(e) => set('description', e.target.value)}
        />
      </FormField>

      <FormField label="Объект" htmlFor="task-object" error={errors.object_id} required>
        <Select value={values.object_id} onValueChange={(v) => set('object_id', v)}>
          <SelectTrigger
            id="task-object"
            className="w-full"
            aria-invalid={Boolean(errors.object_id)}
            disabled={objectsQuery.isPending}
          >
            <SelectValue placeholder={objectsQuery.isPending ? 'Загрузка…' : 'Выберите объект'} />
          </SelectTrigger>
          <SelectContent>
            {objectsQuery.data?.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Исполнитель" htmlFor="task-assignee" error={errors.assignee_id} required>
        <Select value={values.assignee_id} onValueChange={(v) => set('assignee_id', v)}>
          <SelectTrigger
            id="task-assignee"
            className="w-full"
            aria-invalid={Boolean(errors.assignee_id)}
            disabled={executorsQuery.isPending}
          >
            <SelectValue
              placeholder={executorsQuery.isPending ? 'Загрузка…' : 'Выберите исполнителя'}
            />
          </SelectTrigger>
          <SelectContent>
            {executorsQuery.data?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onDone()} disabled={mutation.isPending}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {task ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogFooter>
    </form>
  )
}
