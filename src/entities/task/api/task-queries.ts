import { useQuery } from '@tanstack/react-query'
import type { TasksFilter } from '../model/types'
import { fetchTask, fetchTaskHistory, fetchTasks } from './task-api'

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filter: TasksFilter) => [...taskKeys.lists(), filter] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  history: (id: string) => [...taskKeys.all, 'history', id] as const,
}

export function useTasksQuery(filter: TasksFilter = {}) {
  return useQuery({ queryKey: taskKeys.list(filter), queryFn: () => fetchTasks(filter) })
}

export function useTaskQuery(id: string) {
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: () => fetchTask(id) })
}

export function useTaskHistoryQuery(id: string) {
  return useQuery({ queryKey: taskKeys.history(id), queryFn: () => fetchTaskHistory(id) })
}
