import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 animate-spin', className)} aria-hidden />
}

export function PageLoader({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-[40vh] items-center justify-center', className)} role="status">
      <Spinner className="size-6 text-muted-foreground" />
      <span className="sr-only">Загрузка…</span>
    </div>
  )
}
