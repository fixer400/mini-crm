import { useQuery } from '@tanstack/react-query'
import { fetchViewer } from '../api/session-api'
import { useSessionStore } from './session-store'

export const viewerKeys = {
  all: ['viewer'] as const,
  byId: (userId: string) => [...viewerKeys.all, userId] as const,
}

export function useViewerQuery() {
  const userId = useSessionStore((s) => s.userId)
  return useQuery({
    queryKey: viewerKeys.byId(userId ?? 'anonymous'),
    queryFn: () => fetchViewer(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
  })
}

/**
 * Профиль текущего пользователя. Использовать только внутри защищённых маршрутов:
 * AuthGuard гарантирует, что профиль уже загружен.
 */
export function useViewer() {
  const { data } = useViewerQuery()
  if (!data) throw new Error('useViewer используется вне AuthGuard')
  return data
}

export function useIsManager() {
  return useViewer().role === 'manager'
}
