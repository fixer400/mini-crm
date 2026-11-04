import { supabase } from '@/shared/api'
import { useSessionStore } from './session-store'

/**
 * Подписка на изменения сессии Supabase. Вызывается один раз при старте приложения.
 * Внутри колбэка не делаем запросы к Supabase (известная проблема дедлока в supabase-js),
 * только обновляем стор — профиль догрузит TanStack Query.
 */
export function subscribeAuth() {
  const { setUser } = useSessionStore.getState()

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user.id ?? null)
  })

  return () => data.subscription.unsubscribe()
}
