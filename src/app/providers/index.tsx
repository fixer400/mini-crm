import type { ReactNode } from 'react'
import { Toaster } from '@/shared/ui/shadcn/sonner'
import { TooltipProvider } from '@/shared/ui/shadcn/tooltip'
import { AuthListener } from './auth-listener'
import { QueryProvider } from './query-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthListener>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </AuthListener>
    </QueryProvider>
  )
}
