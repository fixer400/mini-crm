/**
 * Проверка защиты «в обход интерфейса»: те же запросы, что мог бы отправить
 * злоумышленник с anon-ключом из браузера и логином исполнителя.
 *
 *   npm run check:security
 *
 * Нужны данные из npm run seed. Скрипт ничего не ломает, если защита работает.
 * service_role НЕ используется — только публичный ключ.
 */
import { anonClient, requireEnv, signedInClient } from './lib.ts'

const password = requireEnv('SEED_PASSWORD')
let failed = 0

function report(ok: boolean, title: string, details?: string) {
  if (!ok) failed++
  console.log(`${ok ? '  ✓' : '  ✗'} ${title}${details ? `  — ${details}` : ''}`)
}

/** Ожидаем, что операция не прошла: либо ошибка, либо 0 затронутых строк. */
async function expectBlocked(
  title: string,
  run: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>,
) {
  const { error, data } = await run()
  const affected = Array.isArray(data) ? data.length : data ? 1 : 0
  report(Boolean(error) || affected === 0, title, error?.message ?? `строк: ${affected}`)
}

async function main() {
  const anon = anonClient()
  const manager = await signedInClient('manager@example.com', password)
  const e1 = await signedInClient('executor1@example.com', password)
  const e2 = await signedInClient('executor2@example.com', password)
  const e1Id = (await e1.auth.getUser()).data.user!.id
  const e2Id = (await e2.auth.getUser()).data.user!.id

  const { data: allTasks } = await manager.from('tasks').select('id, status, assignee_id, object_id')
  const all = allTasks ?? []
  const foreign = all.find((t) => t.assignee_id === e2Id)
  const ownNew = all.find((t) => t.assignee_id === e1Id && t.status === 'new')
  const ownReview = all.find((t) => t.assignee_id === e1Id && t.status === 'review')
  if (!foreign || !ownNew || !ownReview) throw new Error('Нет подходящих задач — запустите npm run seed -- --reset')

  console.log('\nРегистрация и анонимный доступ')
  {
    const { error } = await anon.auth.signUp({ email: `intruder${Date.now()}@example.com`, password: 'Passw0rd!123' })
    report(Boolean(error), 'открытая регистрация отключена', error?.message ?? 'регистрация прошла!')
  }
  {
    const { data, error } = await anon.from('tasks').select('id')
    report(Boolean(error) || !data?.length, 'без входа задачи не читаются', error?.message ?? `строк: ${data?.length}`)
  }

  console.log('\nИсполнитель читает только своё')
  {
    const { data } = await e1.from('tasks').select('id, assignee_id')
    report(Boolean(data?.length) && data!.every((t) => t.assignee_id === e1Id), 'в списке только свои задачи', `строк: ${data?.length}`)
  }
  {
    const { data } = await e1.from('tasks').select('id').eq('id', foreign.id)
    report(data?.length === 0, 'чужая задача по id не читается')
  }
  {
    const { data } = await e1.from('task_status_history').select('id').eq('task_id', foreign.id)
    report(data?.length === 0, 'история чужой задачи не читается')
  }
  {
    const visibleObjects = new Set(all.filter((t) => t.assignee_id === e1Id).map((t) => t.object_id))
    const { data } = await e1.from('objects').select('id')
    report(Boolean(data) && data!.every((o) => visibleObjects.has(o.id)), 'видны только объекты со своими задачами', `строк: ${data?.length}`)
  }

  console.log('\nИсполнитель не меняет данные напрямую')
  await expectBlocked('изменить чужую задачу', () =>
    e1.from('tasks').update({ title: 'взлом' }).eq('id', foreign.id).select('id'))
  await expectBlocked('изменить свою задачу (поля меняет только постановщик)', () =>
    e1.from('tasks').update({ title: 'взлом' }).eq('id', ownNew.id).select('id'))
  await expectBlocked('сменить статус обычным UPDATE', () =>
    // @ts-expect-error — status намеренно не входит в тип Update
    e1.from('tasks').update({ status: 'accepted' }).eq('id', ownReview.id).select('id'))
  await expectBlocked('удалить свою задачу', () => e1.from('tasks').delete().eq('id', ownNew.id).select('id'))
  await expectBlocked('создать задачу', () =>
    e1.from('tasks').insert({ title: 'x', object_id: ownNew.object_id, assignee_id: e1Id }).select('id'))
  await expectBlocked('создать объект', () => e1.from('objects').insert({ name: 'x', address: 'y' }).select('id'))
  await expectBlocked('выдать себе роль постановщика', () =>
    // @ts-expect-error — profiles недоступна для записи
    e1.from('profiles').update({ role: 'manager' }).eq('id', e1Id).select('id'))

  console.log('\nПереходы статусов проверяет база')
  await expectBlocked('взять в работу чужую задачу', () =>
    e1.rpc('change_task_status', { p_task_id: foreign.id, p_to_status: 'in_progress' }))
  await expectBlocked('«Новая» → «На проверке» (перепрыгнуть шаг)', () =>
    e1.rpc('change_task_status', { p_task_id: ownNew.id, p_to_status: 'review' }))
  await expectBlocked('исполнитель сам принимает свою задачу', () =>
    e1.rpc('change_task_status', { p_task_id: ownReview.id, p_to_status: 'accepted' }))
  await expectBlocked('постановщик возвращает без комментария', () =>
    manager.rpc('change_task_status', { p_task_id: ownReview.id, p_to_status: 'rework', p_comment: '  ' }))
  await expectBlocked('постановщик берёт задачу в работу за исполнителя', () =>
    manager.rpc('change_task_status', { p_task_id: ownNew.id, p_to_status: 'in_progress' }))

  console.log('\nИсторию нельзя подделать')
  await expectBlocked('добавить запись в историю', () =>
    // @ts-expect-error — insert в историю запрещён и типами
    manager.from('task_status_history').insert({ task_id: ownNew.id, to_status: 'accepted', changed_by: e1Id }).select('id'))
  await expectBlocked('изменить запись истории', () =>
    // @ts-expect-error — update истории запрещён и типами
    manager.from('task_status_history').update({ comment: 'подделка' }).eq('task_id', ownNew.id).select('id'))
  await expectBlocked('удалить запись истории', () =>
    manager.from('task_status_history').delete().eq('task_id', ownNew.id).select('id'))

  console.log(failed ? `\n✗ Провалено проверок: ${failed}` : '\n✓ Все проверки пройдены')
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error('\nОшибка:', error.message ?? error)
  process.exit(1)
})
