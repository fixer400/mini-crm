import type { Enums, Tables, TablesInsert } from '@/shared/api'

export type TaskStatus = Enums<'task_status'>

export type Task = Tables<'tasks'>

type PersonRef = { id: string; full_name: string } | null

/** Задача вместе со связанными сущностями. Связь может быть null, если RLS её скрыл. */
export type TaskWithRelations = Task & {
  object: { id: string; name: string } | null
  assignee: PersonRef
  author: PersonRef
}

export type TaskHistoryEntry = Tables<'task_status_history'> & {
  actor: PersonRef
}

export type TaskFormValues = Required<TablesInsert<'tasks'>>

export type TasksFilter = {
  objectId?: string
  assigneeId?: string
}
