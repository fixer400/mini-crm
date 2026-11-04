import { useState, type FormEvent } from 'react'
import { useViewer } from '@/entities/session'
import { getAvailableTransitions, type TaskTransition, type TaskWithRelations } from '@/entities/task'
import { FormField, Spinner } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog'
import { Textarea } from '@/shared/ui/shadcn/textarea'
import { useChangeTaskStatus } from '../model/use-change-status'

type TaskStatusActionsProps = {
  task: Pick<TaskWithRelations, 'id' | 'status' | 'assignee_id'>
}

/**
 * Кнопки доступных переходов статуса для текущего пользователя.
 * Если действий нет — компонент ничего не рендерит.
 */
export function TaskStatusActions({ task }: TaskStatusActionsProps) {
  const viewer = useViewer()
  const mutation = useChangeTaskStatus(task.id)
  const [commentFor, setCommentFor] = useState<TaskTransition | null>(null)

  const transitions = getAvailableTransitions(task, viewer)
  if (!transitions.length) return null

  const handleClick = (transition: TaskTransition) => {
    if (transition.requiresComment) {
      setCommentFor(transition)
      return
    }
    mutation.mutate({ to: transition.to })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.to}
            variant={t.requiresComment ? 'outline' : 'default'}
            className="flex-1 sm:flex-none"
            disabled={mutation.isPending}
            onClick={() => handleClick(t)}
          >
            {mutation.isPending && mutation.variables?.to === t.to && <Spinner />}
            {t.actionLabel}
          </Button>
        ))}
      </div>

      <CommentDialog
        transition={commentFor}
        pending={mutation.isPending}
        onCancel={() => setCommentFor(null)}
        onSubmit={(comment) =>
          commentFor &&
          mutation.mutate(
            { to: commentFor.to, comment },
            { onSuccess: () => setCommentFor(null) },
          )
        }
      />
    </>
  )
}

type CommentDialogProps = {
  transition: TaskTransition | null
  pending: boolean
  onCancel: () => void
  onSubmit: (comment: string) => void
}

function CommentDialog({ transition, pending, onCancel, onSubmit }: CommentDialogProps) {
  return (
    <Dialog open={Boolean(transition)} onOpenChange={(open) => !open && !pending && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transition?.actionLabel}</DialogTitle>
          <DialogDescription>
            Опишите, что нужно исправить. Комментарий увидит исполнитель в истории задачи.
          </DialogDescription>
        </DialogHeader>
        {transition && <CommentForm pending={pending} onCancel={onCancel} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function CommentForm({ pending, onCancel, onSubmit }: Omit<CommentDialogProps, 'transition'>) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const value = comment.trim()
    if (!value) {
      setError('Комментарий обязателен')
      return
    }
    onSubmit(value)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <FormField label="Комментарий" htmlFor="status-comment" error={error} required>
        <Textarea
          id="status-comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            setError(undefined)
          }}
          aria-invalid={Boolean(error)}
          autoFocus
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Отмена
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          Вернуть на доработку
        </Button>
      </DialogFooter>
    </form>
  )
}
