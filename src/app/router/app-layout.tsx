import { Navigate, Outlet } from 'react-router'
import { useViewer } from '@/entities/session'
import { routes } from '@/shared/config'
import { AppHeader } from '@/widgets/app-header'

export function AppLayout() {
  return (
    <div className="min-h-svh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

/** Стартовая страница: постановщику — объекты, исполнителю — его задачи. */
export function HomeRedirect() {
  const viewer = useViewer()
  return <Navigate to={viewer.role === 'manager' ? routes.objects : routes.tasks} replace />
}
