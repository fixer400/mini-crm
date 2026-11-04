import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Ошибки доступа / «не найдено» повторять бессмысленно — повторяем только сетевые сбои.
const NON_RETRYABLE_CODES = new Set(['PGRST116', '42501', 'P0002', '22P02'])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const code = (error as { code?: string }).code
        if (code && NON_RETRYABLE_CODES.has(code)) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
