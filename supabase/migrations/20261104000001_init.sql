-- =============================================================================
-- Мини-CRM «Объекты и задачи»: схема, права доступа (RLS), переходы статусов.
--
-- Принципы:
--   * роль пользователя хранится в profiles.role и берётся из auth.users.raw_app_meta_data,
--     которую может менять только администратор (service_role). Пользователь сам себе роль
--     поменять не может;
--   * статус задачи нельзя изменить обычным UPDATE (нет привилегии на колонку),
--     только через функцию change_task_status, которая проверяет переход и пишет историю;
--   * в историю нельзя писать/менять/удалять напрямую: привилегии отозваны, политик на запись нет.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Типы
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new',          -- Новая
  'in_progress',  -- В работе
  'review',       -- На проверке
  'accepted',     -- Принята
  'rework'        -- На доработке
);

-- -----------------------------------------------------------------------------
-- Профили пользователей
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null,
  role       public.user_role not null default 'executor',
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Пользователи CRM. Роль меняет только администратор.';

-- Профиль создаётся автоматически при создании пользователя в auth.
-- Роль берётся из app_metadata (пользователь не может её задать сам, в отличие от user_metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    case when new.raw_app_meta_data ->> 'role' = 'manager'
      then 'manager'::public.user_role
      else 'executor'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Если администратор поменял роль в app_metadata, синхронизируем профиль.
create or replace function public.handle_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'role' is distinct from old.raw_app_meta_data ->> 'role' then
    update public.profiles
       set role = case when new.raw_app_meta_data ->> 'role' = 'manager'
                    then 'manager'::public.user_role
                    else 'executor'::public.user_role
                  end
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_role_change();

-- Хелперы для политик. security definer — чтобы не было рекурсии RLS на profiles.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'manager' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- -----------------------------------------------------------------------------
-- Объекты (стройки)
-- -----------------------------------------------------------------------------
create table public.objects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 200),
  address    text not null check (char_length(btrim(address)) between 1 and 500),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Задачи
-- -----------------------------------------------------------------------------
create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  -- Объект с задачами удалить нельзя: сначала нужно удалить или перенести задачи.
  object_id   uuid not null references public.objects (id) on delete restrict,
  assignee_id uuid not null references public.profiles (id),
  status      public.task_status not null default 'new',
  author_id   uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- -----------------------------------------------------------------------------
-- История статусов
-- -----------------------------------------------------------------------------
create table public.task_status_history (
  id          bigint generated always as identity primary key,
  -- История живёт вместе с задачей: при удалении задачи постановщиком удаляется и она.
  task_id     uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,            -- null = создание задачи
  to_status   public.task_status not null,
  changed_by  uuid not null references public.profiles (id),
  changed_at  timestamptz not null default now(),
  comment     text check (comment is null or char_length(comment) <= 2000)
);

create index task_status_history_task_id_idx on public.task_status_history (task_id, changed_at);

-- -----------------------------------------------------------------------------
-- Триггеры задач
-- -----------------------------------------------------------------------------

-- Исполнителем можно назначить только пользователя с ролью «исполнитель».
create or replace function public.tasks_validate_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'Исполнителем можно назначить только пользователя с ролью «исполнитель»'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger tasks_validate_assignee
  before insert or update of assignee_id on public.tasks
  for each row execute function public.tasks_validate_assignee();

-- При создании: статус всегда «Новая», автор — текущий пользователь (подделать нельзя).
create or replace function public.tasks_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
  end if;
  new.status := 'new';
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_before_insert
  before insert on public.tasks
  for each row execute function public.tasks_before_insert();

-- Первая запись истории: «— → Новая».
create or replace function public.tasks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, 'new', new.author_id);
  return new;
end;
$$;

create trigger tasks_after_insert
  after insert on public.tasks
  for each row execute function public.tasks_after_insert();

create or replace function public.tasks_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.tasks_touch_updated_at();

-- Русские названия статусов — для понятных сообщений об ошибках.
create or replace function public.task_status_label(p_status public.task_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'new' then 'Новая'
    when 'in_progress' then 'В работе'
    when 'review' then 'На проверке'
    when 'accepted' then 'Принята'
    when 'rework' then 'На доработке'
  end;
$$;

-- -----------------------------------------------------------------------------
-- Смена статуса: единственный способ изменить tasks.status
-- -----------------------------------------------------------------------------
create or replace function public.change_task_status(
  p_task_id uuid,
  p_to_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    public.user_role;
  v_task    public.tasks;
  v_from    public.task_status;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_allowed boolean;
begin
  if v_uid is null then
    raise exception 'Требуется вход в систему' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_uid;
  if v_role is null then
    raise exception 'Профиль пользователя не найден' using errcode = '42501';
  end if;

  -- Блокируем строку, чтобы два одновременных запроса не прошли оба.
  select * into v_task from public.tasks where id = p_task_id for update;

  -- Исполнитель не должен даже узнать о существовании чужой задачи.
  if not found or (v_role = 'executor' and v_task.assignee_id <> v_uid) then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  -- Таблица разрешённых переходов (см. ТЗ, п. 2.3). Всё остальное запрещено.
  v_allowed := case
    when v_task.status = 'new'         and p_to_status = 'in_progress' then v_task.assignee_id = v_uid
    when v_task.status = 'in_progress' and p_to_status = 'review'      then v_task.assignee_id = v_uid
    when v_task.status = 'rework'      and p_to_status = 'in_progress' then v_task.assignee_id = v_uid
    when v_task.status = 'review'      and p_to_status = 'accepted'    then v_role = 'manager'
    when v_task.status = 'review'      and p_to_status = 'rework'      then v_role = 'manager'
    else false
  end;

  if not v_allowed then
    raise exception 'Переход «%» → «%» вам недоступен',
      public.task_status_label(v_task.status), public.task_status_label(p_to_status)
      using errcode = '42501';
  end if;

  if p_to_status = 'rework' and v_comment is null then
    raise exception 'При возврате на доработку комментарий обязателен'
      using errcode = 'check_violation';
  end if;

  v_from := v_task.status;

  update public.tasks set status = p_to_status where id = p_task_id
  returning * into v_task;

  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, v_from, p_to_status, v_uid, v_comment);

  return v_task;
end;
$$;

comment on function public.change_task_status is
  'Единственный способ сменить статус задачи. Проверяет роль, исполнителя и допустимость перехода, пишет историю.';

-- -----------------------------------------------------------------------------
-- Привилегии на уровне таблиц и колонок
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.objects, public.tasks, public.task_status_history
  from anon, authenticated;

grant select on public.profiles to authenticated;

grant select, delete on public.objects to authenticated;
grant insert (name, address) on public.objects to authenticated;
grant update (name, address) on public.objects to authenticated;

-- status, author_id, created_at не входят в список — их нельзя записать через API.
grant select, delete on public.tasks to authenticated;
grant insert (title, description, object_id, assignee_id) on public.tasks to authenticated;
grant update (title, description, object_id, assignee_id) on public.tasks to authenticated;

-- История — только чтение.
grant select on public.task_status_history to authenticated;

-- Функции: только для вошедших пользователей.
revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

revoke execute on function public.is_manager() from public, anon;
grant execute on function public.is_manager() to authenticated;
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

-- Триггерные функции не должны вызываться как RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_role_change() from public, anon, authenticated;
revoke execute on function public.tasks_validate_assignee() from public, anon, authenticated;
revoke execute on function public.tasks_before_insert() from public, anon, authenticated;
revoke execute on function public.tasks_after_insert() from public, anon, authenticated;
revoke execute on function public.tasks_touch_updated_at() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

-- profiles: постановщик видит всех (нужно для назначения исполнителя);
-- исполнитель видит себя и тех, с кем связан по своим задачам (авторы, участники истории).
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_manager())
    or exists (
      select 1 from public.tasks t
       where t.assignee_id = (select auth.uid())
         and t.author_id = profiles.id
    )
    or exists (
      select 1
        from public.task_status_history h
        join public.tasks t on t.id = h.task_id
       where t.assignee_id = (select auth.uid())
         and h.changed_by = profiles.id
    )
  );

-- objects: постановщик — всё; исполнитель — только объекты, где у него есть задачи.
create policy objects_select on public.objects
  for select to authenticated
  using (
    (select public.is_manager())
    or exists (
      select 1 from public.tasks t
       where t.object_id = objects.id
         and t.assignee_id = (select auth.uid())
    )
  );

create policy objects_insert on public.objects
  for insert to authenticated
  with check ((select public.is_manager()));

create policy objects_update on public.objects
  for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

create policy objects_delete on public.objects
  for delete to authenticated
  using ((select public.is_manager()));

-- tasks: постановщик — всё; исполнитель — только чтение своих задач.
-- Смена статуса исполнителем идёт через change_task_status, прямого UPDATE у него нет.
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    (select public.is_manager())
    or assignee_id = (select auth.uid())
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check ((select public.is_manager()));

create policy tasks_update on public.tasks
  for update to authenticated
  using ((select public.is_manager()))
  with check ((select public.is_manager()));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using ((select public.is_manager()));

-- history: видна тем, кто видит задачу. Политик на insert/update/delete нет намеренно.
create policy task_status_history_select on public.task_status_history
  for select to authenticated
  using (
    (select public.is_manager())
    or exists (
      select 1 from public.tasks t
       where t.id = task_status_history.task_id
         and t.assignee_id = (select auth.uid())
    )
  );
