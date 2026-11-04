/**
 * Офлайн-тест миграций и правил доступа: Postgres в WASM (PGlite) + эмуляция схемы auth Supabase.
 *   npm run test:db
 * Проверяет RLS, привилегии на колонки, переходы статусов и неизменяемость истории
 * без подключения к облачному Supabase.
 */
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve(import.meta.dirname, '../migrations')
const migration = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join(';\n')
const db = new PGlite()

// --- Эмуляция окружения Supabase ---
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    raw_app_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  -- Как в Supabase: по умолчанию новые таблицы открыты для anon/authenticated (закрывает RLS + наши revoke)
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`)
await db.exec(migration)
console.log('migration applied')

const ids = {}
for (const [key, email, name, role] of [
  ['m', 'manager@test', 'Менеджер', 'manager'],
  ['e1', 'e1@test', 'Исполнитель 1', null],
  ['e2', 'e2@test', 'Исполнитель 2', 'executor'],
]) {
  const r = await db.query(
    `insert into auth.users (email, raw_user_meta_data, raw_app_meta_data) values ($1, $2, $3) returning id`,
    [email, { full_name: name, role: 'manager' /* попытка через user_metadata — должна игнорироваться */ }, role ? { role } : {}],
  )
  ids[key] = r.rows[0].id
}

let failed = 0
async function as(user, sql, params = []) {
  await db.exec('reset role')
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ? ids[user] : ''])
  await db.exec(user ? 'set role authenticated' : 'set role anon')
  try {
    return await db.query(sql, params)
  } finally {
    await db.exec('reset role')
  }
}
async function expectOk(title, user, sql, params, check) {
  try {
    const r = await as(user, sql, params)
    if (check && !check(r)) throw new Error('check failed: ' + JSON.stringify(r.rows))
    console.log('  ok   ', title)
    return r
  } catch (e) {
    failed++
    console.log('  FAIL ', title, '->', e.message)
  }
}
async function expectErr(title, user, sql, params, re) {
  try {
    const r = await as(user, sql, params)
    failed++
    console.log('  FAIL ', title, '-> no error', JSON.stringify(r.rows))
  } catch (e) {
    if (re && !re.test(e.message)) {
      failed++
      console.log('  FAIL ', title, '-> unexpected error:', e.message)
    } else console.log('  ok   ', title, `(${e.message})`)
  }
}

console.log('profiles')
const roles = (await db.query('select email, role from public.profiles order by email')).rows
console.log('  ', roles)
if (roles.find((r) => r.email === 'e1@test').role !== 'executor') { failed++; console.log('  FAIL user_metadata role leaked') }

console.log('manager CRUD')
const obj = await expectOk('менеджер создаёт объект', 'm', `insert into objects (name, address) values ('ЖК Север', 'ул. Ленина 1') returning id`, [], (r) => r.rows.length === 1)
const objId = obj.rows[0].id
const obj2 = await expectOk('менеджер создаёт 2-й объект', 'm', `insert into objects (name, address) values ('Склад', 'ул. Мира 5') returning id`)
const obj2Id = obj2.rows[0].id
await expectErr('исполнитель не создаёт объект', 'e1', `insert into objects (name, address) values ('x','y')`, [], /row-level security/)
await expectErr('менеджер не может задать статус при создании', 'm',
  `insert into tasks (title, object_id, assignee_id, status) values ('t', $1, $2, 'accepted')`, [objId, ids.e1], /permission denied/)
await expectErr('менеджер не может подделать автора', 'm',
  `insert into tasks (title, object_id, assignee_id, author_id) values ('t', $1, $2, $3)`, [objId, ids.e1, ids.e2], /permission denied/)
await expectErr('исполнителем нельзя назначить менеджера', 'm',
  `insert into tasks (title, object_id, assignee_id) values ('t', $1, $2)`, [objId, ids.m], /исполнитель/)
const t1 = await expectOk('менеджер создаёт задачу для e1', 'm',
  `insert into tasks (title, object_id, assignee_id) values ('Залить фундамент', $1, $2) returning id, status, author_id`, [objId, ids.e1],
  (r) => r.rows[0].status === 'new' && r.rows[0].author_id === ids.m)
const t1Id = t1.rows[0].id
const t2 = await expectOk('менеджер создаёт задачу для e2 во 2-м объекте', 'm',
  `insert into tasks (title, object_id, assignee_id) values ('Крыша', $1, $2) returning id`, [obj2Id, ids.e2])
const t2Id = t2.rows[0].id
await expectErr('исполнитель не создаёт задачу', 'e1',
  `insert into tasks (title, object_id, assignee_id) values ('t', $1, $2)`, [objId, ids.e1], /row-level security/)
await expectOk('история «— → new» создана', 'm', `select * from task_status_history where task_id = $1`, [t1Id],
  (r) => r.rows.length === 1 && r.rows[0].from_status === null && r.rows[0].to_status === 'new')

console.log('visibility')
await expectOk('e1 видит только свою задачу', 'e1', `select id from tasks`, [], (r) => r.rows.length === 1 && r.rows[0].id === t1Id)
await expectOk('e1 видит только свой объект', 'e1', `select id from objects`, [], (r) => r.rows.length === 1 && r.rows[0].id === objId)
await expectOk('e2 не видит задачу e1', 'e2', `select id from tasks where id = $1`, [t1Id], (r) => r.rows.length === 0)
await expectOk('e2 не видит историю задачи e1', 'e2', `select id from task_status_history where task_id = $1`, [t1Id], (r) => r.rows.length === 0)
await expectOk('e1 видит профиль автора и свой', 'e1', `select email from profiles order by email`, [], (r) => r.rows.map((x) => x.email).join() === 'e1@test,manager@test')
await expectOk('менеджер видит все профили', 'm', `select id from profiles`, [], (r) => r.rows.length === 3)
await expectErr('anon не читает задачи', null, `select * from tasks`, [], /permission denied/)
await expectErr('anon не вызывает RPC', null, `select change_task_status($1, 'in_progress')`, [t1Id], /permission denied/)

console.log('direct writes')
await expectErr('e1 не меняет статус напрямую', 'e1', `update tasks set status = 'accepted' where id = $1`, [t1Id], /permission denied/)
await expectErr('менеджер не меняет статус напрямую', 'm', `update tasks set status = 'accepted' where id = $1`, [t1Id], /permission denied/)
await expectOk('e1 не может изменить задачу (0 строк)', 'e1', `update tasks set title = 'hack' where id = $1 returning id`, [t1Id], (r) => r.rows.length === 0)
await expectOk('e2 не может удалить чужую задачу (0 строк)', 'e2', `delete from tasks where id = $1 returning id`, [t1Id], (r) => r.rows.length === 0)
await expectErr('нельзя вставить историю', 'm', `insert into task_status_history (task_id, to_status, changed_by) values ($1, 'accepted', $2)`, [t1Id, ids.m], /permission denied/)
await expectErr('нельзя изменить историю', 'm', `update task_status_history set comment = 'x'`, [], /permission denied/)
await expectErr('нельзя удалить историю', 'm', `delete from task_status_history`, [], /permission denied/)
await expectErr('нельзя сменить себе роль', 'e1', `update profiles set role = 'manager' where id = $1`, [ids.e1], /permission denied/)
await expectErr('нельзя вызвать триггерную функцию', 'e1', `select handle_new_user()`, [], /permission denied|trigger/)

console.log('transitions')
await expectErr('e2 не трогает задачу e1', 'e2', `select change_task_status($1, 'in_progress')`, [t1Id], /не найдена/)
await expectErr('new → review запрещён', 'e1', `select change_task_status($1, 'review')`, [t1Id], /недоступен/)
await expectErr('менеджер не берёт в работу', 'm', `select change_task_status($1, 'in_progress')`, [t1Id], /недоступен/)
await expectOk('e1: new → in_progress', 'e1', `select (change_task_status($1, 'in_progress')).status`, [t1Id], (r) => r.rows[0].status === 'in_progress')
await expectErr('e1 не принимает сам', 'e1', `select change_task_status($1, 'accepted')`, [t1Id], /недоступен/)
await expectOk('e1: in_progress → review', 'e1', `select (change_task_status($1, 'review')).status`, [t1Id])
await expectErr('e1 не принимает с review', 'e1', `select change_task_status($1, 'accepted')`, [t1Id], /недоступен/)
await expectErr('rework без комментария', 'm', `select change_task_status($1, 'rework', '   ')`, [t1Id], /комментарий/)
await expectOk('m: review → rework с комментарием', 'm', `select (change_task_status($1, 'rework', 'Переделать опалубку')).status`, [t1Id])
await expectErr('rework → review запрещён', 'e1', `select change_task_status($1, 'review')`, [t1Id], /недоступен/)
await expectOk('e1: rework → in_progress', 'e1', `select (change_task_status($1, 'in_progress')).status`, [t1Id])
await expectOk('e1: in_progress → review', 'e1', `select (change_task_status($1, 'review')).status`, [t1Id])
await expectOk('m: review → accepted', 'm', `select (change_task_status($1, 'accepted')).status`, [t1Id])
await expectErr('accepted — финальный', 'm', `select change_task_status($1, 'rework', 'x')`, [t1Id], /недоступен/)
await expectOk('история полная и корректная', 'e1',
  `select from_status, to_status, comment, changed_by from task_status_history where task_id = $1 order by id`, [t1Id],
  (r) => {
    const s = r.rows.map((x) => `${x.from_status ?? '-'}>${x.to_status}`).join(',')
    console.log('        ', s)
    return s === '->new,new>in_progress,in_progress>review,review>rework,rework>in_progress,in_progress>review,review>accepted'
      && r.rows[3].comment === 'Переделать опалубку' && r.rows[3].changed_by === ids.m
  })

console.log('delete')
await expectErr('объект с задачами не удаляется', 'm', `delete from objects where id = $1`, [objId], /foreign key/)
await expectOk('менеджер удаляет задачу', 'm', `delete from tasks where id = $1 returning id`, [t2Id], (r) => r.rows.length === 1)
await expectOk('после этого объект удаляется', 'm', `delete from objects where id = $1 returning id`, [obj2Id], (r) => r.rows.length === 1)

console.log('role sync')
await db.query(`update auth.users set raw_app_meta_data = '{"role":"manager"}' where id = $1`, [ids.e2])
const r2 = await db.query(`select role from profiles where id = $1`, [ids.e2])
if (r2.rows[0].role !== 'manager') { failed++; console.log('  FAIL role sync') } else console.log('  ok    смена роли в app_metadata синхронизируется')

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED')
process.exit(failed ? 1 : 0)
