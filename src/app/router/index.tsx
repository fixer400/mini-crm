import { createBrowserRouter, RouterProvider } from 'react-router'
import { LoginPage } from '@/pages/login'
import { NotFoundPage } from '@/pages/not-found'
import { ObjectDetailsPage } from '@/pages/object-details'
import { ObjectsPage } from '@/pages/objects'
import { TaskDetailsPage } from '@/pages/task-details'
import { TasksPage } from '@/pages/tasks'
import { AppLayout, HomeRedirect } from './app-layout'
import { AuthGuard, GuestGuard } from './guards'

const router = createBrowserRouter([
  {
    element: <GuestGuard />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: '/objects', element: <ObjectsPage /> },
          { path: '/objects/:objectId', element: <ObjectDetailsPage /> },
          { path: '/tasks', element: <TasksPage /> },
          { path: '/tasks/:taskId', element: <TaskDetailsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
