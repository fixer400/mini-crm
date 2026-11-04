import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeAuth, useSessionStore } from '@/entities/session'

/** Подписывается на сессию Supabase и чистит кэш при смене пользователя. */
export function AuthListener({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useEffect(() => subscribeAuth(), [])

  useEffect(
    () =>
      useSessionStore.subscribe((state, prev) => {
        if (state.userId !== prev.userId) queryClient.clear()
      }),
    [queryClient],
  )

  return children
}
