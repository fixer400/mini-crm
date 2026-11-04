/**
 * Наполнение базы тестовыми данными.
 *
 *   npm run seed            — создать пользователей и данные (если объектов ещё нет)
 *   npm run seed -- --reset — удалить все объекты/задачи и создать заново
 *
 * Пользователи создаются через Admin API (service_role, только локально).
 * Объекты, задачи и смены статусов делаются через обычный API от имени пользователей —
 * так история статусов получается настоящей и проходит все проверки базы.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/shared/api/database.types.ts'
import { adminClient, requireEnv, SEED_USERS, signedInClient, type SeedUser } from './lib.ts'

type Client = SupabaseClient<Database>
type Status = Database['public']['Enums']['task_status']

const password = requireEnv('SEED_PASSWORD')
const reset = process.argv.includes('--reset')
const admin = adminClient()

async function ensureUser(user: SeedUser): Promise<string> {
  const attrs = {
    email: user.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: user.fullName },
    // app_metadata может менять только администратор — роль хранится здесь.
    app_metadata: { role: user.role },
  }

  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  const existing = list.users.find((u) => u.email === user.email)

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, attrs)
    if (error) throw error
    console.log(`  ↻ ${user.email} (${user.role})`)
    return existing.id
  }

  const { data, error } = await admin.auth.admin.createUser(attrs)
  if (error) throw error
  console.log(`  + ${user.email} (${user.role})`)
  return data.user.id
}

// Путь от «Новая» до нужного статуса. actor: кто делает шаг.
type Step = { to: Status; by: 'assignee' | 'manager'; comment?: string }
const PATH: Record<Status, Step[]> = {
  new: [],
  in_progress: [{ to: 'in_progress', by: 'assignee' }],
  review: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
  ],
  rework: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
    { to: 'rework', by: 'manager', comment: 'Нет фотоотчёта и акта скрытых работ. Приложите и отправьте повторно.' },
  ],
  accepted: [
    { to: 'in_progress', by: 'assignee' },
    { to: 'review', by: 'assignee' },
    { to: 'accepted', by: 'manager' },
  ],
}

async function main() {
  console.log('Пользователи:')
  const ids: Record<string, string> = {}
  for (const u of SEED_USERS) ids[u.key] = await ensureUser(u)

  const clients: Record<SeedUser['key'], Client> = {
    manager: await signedInClient('manager@example.com', password),
    manager2: await signedInClient('manager2@example.com', password),
    executor1: await signedInClient('executor1@example.com', password),
    executor2: await signedInClient('executor2@example.com', password),
  }
  const manager = clients.manager

  const { count } = await manager.from('objects').select('id', { count: 'exact', head: true })
  if (count && !reset) {
    console.log(`\nВ базе уже есть объекты (${count}). Данные не трогаю. Для пересоздания: npm run seed -- --reset`)
    return
  }
  if (reset) {
    console.log('\nОчистка данных…')
    const { error: e1 } = await manager.from('tasks').delete().not('id', 'is', null)
    if (e1) throw e1
    const { error: e2 } = await manager.from('objects').delete().not('id', 'is', null)
    if (e2) throw e2
  }

  console.log('\nОбъекты:')
  const objectsSeed = [
    { name: 'ЖК «Северный парк», корпус 2', address: 'г. Москва, ул. Лесная, д. 12' },
    { name: 'Склад «Логистик-Юг»', address: 'г. Краснодар, ул. Индустриальная, д. 4' },
    { name: 'Школа на 550 мест', address: 'г. Казань, пр. Победы, д. 101' },
  ]
  const { data: objects, error: objError } = await manager.from('objects').insert(objectsSeed).select('id, name')
  if (objError) throw objError
  objects.forEach((o) => console.log(`  + ${o.name}`))
  const [park, warehouse, school] = objects.map((o) => o.id)

  type TaskSeed = {
    title: string
    description: string
    object_id: string
    assignee: 'executor1' | 'executor2'
    author: 'manager' | 'manager2'
    status: Status
  }
  const tasksSeed: TaskSeed[] = [
    { title: 'Армирование плиты перекрытия 5 этажа', description: 'Арматура А500С Ø12, шаг 200 мм. Перед бетонированием вызвать технадзор.', object_id: park, assignee: 'executor1', author: 'manager', status: 'accepted' },
    { title: 'Монтаж опалубки 6 этажа', description: 'Щитовая опалубка, проверить вертикальность стен.', object_id: park, assignee: 'executor1', author: 'manager', status: 'review' },
    { title: 'Гидроизоляция подземного паркинга', description: 'Наплавляемая гидроизоляция в 2 слоя, нахлёст не менее 100 мм.', object_id: park, assignee: 'executor2', author: 'manager2', status: 'rework' },
    { title: 'Устройство бетонного пола', description: 'Площадь 1200 м², топпинг, нарезка швов через 6 м.', object_id: warehouse, assignee: 'executor2', author: 'manager', status: 'in_progress' },
    { title: 'Монтаж секционных ворот', description: '4 ворот 3×4 м, электропривод.', object_id: warehouse, assignee: 'executor1', author: 'manager', status: 'new' },
    { title: 'Кладка наружных стен 2 этажа', description: 'Газобетон D500, армирование каждого 4-го ряда.', object_id: school, assignee: 'executor2', author: 'manager2', status: 'review' },
    { title: 'Прокладка наружных сетей канализации', description: 'Труба ПП Ø160, уклон по проекту.', object_id: school, assignee: 'executor1', author: 'manager2', status: 'new' },
    { title: 'Разбивка осей здания', description: 'Вынос осей геодезистом, акт разбивки.', object_id: school, assignee: 'executor2', author: 'manager2', status: 'accepted' },
  ]

  console.log('\nЗадачи:')
  for (const t of tasksSeed) {
    const author = clients[t.author]
    const { data: task, error } = await author
      .from('tasks')
      .insert({ title: t.title, description: t.description, object_id: t.object_id, assignee_id: ids[t.assignee] })
      .select('id')
      .single()
    if (error) throw error

    for (const step of PATH[t.status]) {
      const client = step.by === 'manager' ? author : clients[t.assignee]
      const { error: stepError } = await client.rpc('change_task_status', {
        p_task_id: task.id,
        p_to_status: step.to,
        p_comment: step.comment ?? null,
      })
      if (stepError) throw stepError
    }
    console.log(`  + [${t.status}] ${t.title}`)
  }

  console.log('\nГотово. Вход: manager@example.com / executor1@example.com / executor2@example.com, пароль из SEED_PASSWORD.')
}

main().catch((error) => {
  console.error('\nОшибка:', error.message ?? error)
  process.exit(1)
})
