# Мини-CRM «Объекты и задачи»

Постановщик ставит задачи по строительным объектам, исполнители берут их в работу и отправляют на проверку. Каждая смена статуса попадает в историю.

**Стек:** React 19 + TypeScript, Vite, Tailwind v4 + shadcn/ui, TanStack Query, Zustand, React Router, Supabase (Postgres + Auth + RLS).

- [Объяснение для руководителя](docs/for-manager.md)
- [Решения и допущения](docs/decisions.md)

## Быстрый старт

### 1. Supabase

1. Создайте проект на [supabase.com](https://supabase.com) (бесплатного тарифа хватает).
2. **SQL Editor** → выполните [`supabase/migrations/20261104000001_init.sql`](supabase/migrations/20261104000001_init.sql).
   Можно и через CLI: `npx supabase link --project-ref <ref> && npx supabase db push`.
3. **Authentication → Sign In / Providers → Email**: выключите **Allow new users to sign up**. Открытая регистрация должна быть отключена.
4. **Project Settings → API**: скопируйте `Project URL`, `anon`/publishable key и `service_role` key.

### 2. Локально

```bash
npm install
cp .env.example .env.local   # заполните значения
```

`.env.local`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...          # публичный ключ, попадает во фронтенд
SUPABASE_SERVICE_ROLE_KEY=...       # только для npm run seed, во фронтенд НЕ попадает
SEED_PASSWORD=...                   # пароль тестовых пользователей
```

```bash
npm run seed              # пользователи + 3 объекта + 8 задач в разных статусах
npm run dev               # http://localhost:5173
```

### 3. Проверки

```bash
npm run test:db           # офлайн-тест миграции и RLS (Postgres в WASM, без Supabase)
npm run check:security    # атаки «в обход интерфейса» на живой проект с anon-ключом
npm run build             # проверка типов + сборка
```

### 4. Деплой (Vercel / Netlify)

Импортируйте репозиторий, добавьте переменные `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`. **`SUPABASE_SERVICE_ROLE_KEY` в хостинг не добавлять.**
Команда сборки `npm run build`, папка `dist`. Переходы по SPA-маршрутам уже настроены (`vercel.json`, `public/_redirects`).

## Тестовые пользователи (после `npm run seed`)

| Email                   | Роль        | Имя             |
| ----------------------- | ----------- | --------------- |
| `manager@example.com`   | Постановщик | Ольга Соколова  |
| `manager2@example.com`  | Постановщик | Дмитрий Орлов   |
| `executor1@example.com` | Исполнитель | Иван Петров     |
| `executor2@example.com` | Исполнитель | Алексей Смирнов |

Пароль — значение `SEED_PASSWORD`.

Новых пользователей создаёт администратор: **Authentication → Users → Add user**, затем в `app_metadata` пишет `{"role": "manager"}` или `{"role": "executor"}` (без роли пользователь становится исполнителем). Имя берётся из `user_metadata.full_name`.

## Как устроена защита

Все правила работают в базе, интерфейс только прячет недоступные кнопки.

| Что                                  | Как                                                                                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Роль пользователя                    | `profiles.role` заполняется триггером из `auth.users.raw_app_meta_data`. `app_metadata` меняет только service_role; на запись в `profiles` прав у API нет |
| Исполнитель видит только своё        | RLS `tasks`: `is_manager() or assignee_id = auth.uid()`. `objects`: только объекты, где есть его задача. История — только по видимым задачам            |
| Изменение данных                     | insert/update/delete для `objects` и `tasks` разрешены политиками только постановщику                                                                     |
| Статус нельзя изменить через UPDATE  | Права на колонки: `grant update (title, description, object_id, assignee_id)`. Колонки `status`, `author_id`, `created_at` через API не записать           |
| Переходы статусов                    | Единственный путь — RPC `change_task_status` (security definer): проверяет роль, исполнителя, допустимость перехода и комментарий, блокирует строку       |
| История нельзя подделать             | На `task_status_history` у API только `select`. Записи создают триггер (при создании задачи) и `change_task_status`                                         |
| Автор и начальный статус             | Триггер `before insert` ставит `author_id = auth.uid()` и `status = 'new'`                                                                                |
| Исполнитель — только с ролью executor | Триггер проверяет `assignee_id`                                                                                                                          |
| Секреты                              | Во фронтенде только `VITE_*` (URL и anon-ключ). `service_role` нужен только локальному `scripts/seed.ts`, `.env*` в `.gitignore`                           |

## Структура (Feature-Sliced Design)

```
src/
  app/        провайдеры (Query, сессия, тосты), роутер и guard'ы, глобальные стили
  pages/      login, objects, object-details, tasks («Мои задачи» / «Все задачи»), task-details, not-found
  widgets/    app-header, object-table, task-table (таблица + фильтр по статусу), task-history
  features/   auth, object-upsert, object-delete, task-upsert, task-delete, task-change-status
  entities/   session (zustand-стор + текущий пользователь), profile, object, task (API, query-хуки, статусы, бейдж)
  shared/
    api/      supabase-клиент, типы БД, разбор ошибок
    config/   env, маршруты
    lib/      cn, форматирование дат
    ui/shadcn/  сгенерированные компоненты shadcn (не правим вручную)
    ui/custom/  свои компоненты: PageHeader, EmptyState/ErrorState, PageLoader, ConfirmDialog, FormField
supabase/
  migrations/ схема, RLS, функции
  tests/      офлайн-тест правил доступа
scripts/      seed и проверка безопасности против живого проекта
```

Цвета задаются только CSS-переменными в [`src/app/styles/index.css`](src/app/styles/index.css): палитра shadcn и цвета статусов `--status-*`.
