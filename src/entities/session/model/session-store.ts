import { create } from 'zustand'

export type SessionStatus = 'loading' | 'authenticated' | 'guest'

type SessionState = {
  status: SessionStatus
  userId: string | null
  setUser: (userId: string | null) => void
}

/**
 * Состояние авторизации. Хранит только факт входа и id пользователя:
 * профиль (имя, роль) грузится через TanStack Query — см. useViewerQuery.
 */
export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  userId: null,
  setUser: (userId) => set({ userId, status: userId ? 'authenticated' : 'guest' }),
}))
