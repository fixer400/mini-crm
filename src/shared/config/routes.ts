export const routes = {
  login: '/login',
  objects: '/objects',
  object: (id: string) => `/objects/${id}`,
  tasks: '/tasks',
  task: (id: string) => `/tasks/${id}`,
} as const
