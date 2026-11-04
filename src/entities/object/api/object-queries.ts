import { useQuery } from '@tanstack/react-query'
import { fetchObject, fetchObjects } from './object-api'

export const objectKeys = {
  all: ['objects'] as const,
  list: () => [...objectKeys.all, 'list'] as const,
  detail: (id: string) => [...objectKeys.all, 'detail', id] as const,
}

export function useObjectsQuery() {
  return useQuery({ queryKey: objectKeys.list(), queryFn: fetchObjects })
}

export function useObjectQuery(id: string) {
  return useQuery({ queryKey: objectKeys.detail(id), queryFn: () => fetchObject(id) })
}
