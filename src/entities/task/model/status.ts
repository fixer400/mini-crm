import type { TaskStatus } from './types'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export const TASK_STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'review', 'rework', 'accepted']

export type TransitionActor = 'assignee' | 'manager'

export type TaskTransition = {
  from: TaskStatus
  to: TaskStatus
  actor: TransitionActor
  /** Подпись кнопки */
  actionLabel: string
  requiresComment: boolean
}

/**
 * Разрешённые переходы статусов.
 * Это зеркало проверки в функции БД public.change_task_status — UI использует его
 * только чтобы показать нужные кнопки. Настоящая защита — на стороне базы.
 */
export const TASK_TRANSITIONS: TaskTransition[] = [
  { from: 'new', to: 'in_progress', actor: 'assignee', actionLabel: 'Взять в работу', requiresComment: false },
  { from: 'in_progress', to: 'review', actor: 'assignee', actionLabel: 'Отправить на проверку', requiresComment: false },
  { from: 'rework', to: 'in_progress', actor: 'assignee', actionLabel: 'Взять в работу', requiresComment: false },
  { from: 'review', to: 'accepted', actor: 'manager', actionLabel: 'Принять', requiresComment: false },
  { from: 'review', to: 'rework', actor: 'manager', actionLabel: 'Вернуть на доработку', requiresComment: true },
]

type ViewerLike = { id: string; role: 'manager' | 'executor' }
type TaskLike = { status: TaskStatus; assignee_id: string }

export function getAvailableTransitions(task: TaskLike, viewer: ViewerLike): TaskTransition[] {
  return TASK_TRANSITIONS.filter((t) => {
    if (t.from !== task.status) return false
    if (t.actor === 'manager') return viewer.role === 'manager'
    return task.assignee_id === viewer.id
  })
}
