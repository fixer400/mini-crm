import { supabase } from '@/shared/api'
import type {
  Task,
  TaskFormValues,
  TaskHistoryEntry,
  TaskStatus,
  TasksFilter,
  TaskWithRelations,
} from '../model/types'

// Явные имена внешних ключей нужны, т.к. tasks дважды ссылается на profiles.
const TASK_SELECT = `
  *,
  object:objects ( id, name ),
  assignee:profiles!tasks_assignee_id_fkey ( id, full_name ),
  author:profiles!tasks_author_id_fkey ( id, full_name )
` as const

export async function fetchTasks(filter: TasksFilter = {}): Promise<TaskWithRelations[]> {
  let query = supabase.from('tasks').select(TASK_SELECT).order('created_at', { ascending: false })
  if (filter.objectId) query = query.eq('object_id', filter.objectId)
  if (filter.assigneeId) query = query.eq('assignee_id', filter.assigneeId)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchTask(id: string): Promise<TaskWithRelations> {
  const { data, error } = await supabase.from('tasks').select(TASK_SELECT).eq('id', id).single()
  if (error) throw error
  return data
}

export async function fetchTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_status_history')
    .select('*, actor:profiles!task_status_history_changed_by_fkey ( id, full_name )')
    .eq('task_id', taskId)
    .order('changed_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export async function createTask(values: TaskFormValues): Promise<Task> {
  // status и author_id не передаём: база выставит «Новая» и текущего пользователя сама.
  const { data, error } = await supabase.from('tasks').insert(values).select('*').single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, values: TaskFormValues): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(values)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { data, error } = await supabase.from('tasks').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data.length) throw new Error('Задача не найдена или нет прав на удаление')
}

/** Смена статуса — только через функцию БД, которая проверяет права и переход. */
export async function changeTaskStatus(params: {
  taskId: string
  to: TaskStatus
  comment?: string
}): Promise<Task> {
  const { data, error } = await supabase.rpc('change_task_status', {
    p_task_id: params.taskId,
    p_to_status: params.to,
    p_comment: params.comment ?? null,
  })
  if (error) throw error
  return data
}
