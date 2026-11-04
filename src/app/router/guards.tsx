import { Navigate, Outlet, useLocation } from 'react-router'
import { signOut, useSessionStore, useViewerQuery } from '@/entities/session'
import { routes } from '@/shared/config'
import { ErrorState, PageLoader } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'

type LocationState = { from?: string } | null

/**
 * Пускает только вошедших пользователей с загруженным профилем.
 * Это удобство интерфейса, а не защита: данные защищает RLS в базе.
 */
export function AuthGuard() {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()
  const viewerQuery = useViewerQuery()

  if (status === 'loading') return <PageLoader className="min-h-svh" />
  if (status === 'guest') {
    return <Navigate to={routes.login} replace state={{ from: location.pathname }} />
  }
  if (viewerQuery.isPending) return <PageLoader className="min-h-svh" />
  if (viewerQuery.isError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorState error={viewerQuery.error} onRetry={() => viewerQuery.refetch()} />
        <Button variant="link" className="mt-2 w-full" onClick={() => signOut()}>
          Выйти
        </Button>
      </div>
    )
  }
  return <Outlet />
}

/** Страница входа: вошедшего пользователя отправляем туда, откуда он пришёл. */
export function GuestGuard() {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()

  if (status === 'loading') return <PageLoader className="min-h-svh" />
  if (status === 'authenticated') {
    const from = (location.state as LocationState)?.from
    return <Navigate to={from && from !== routes.login ? from : '/'} replace />
  }
  return <Outlet />
}
