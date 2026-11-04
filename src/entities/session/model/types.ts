import type { Enums, Tables } from '@/shared/api'

export type UserRole = Enums<'user_role'>

/** Текущий пользователь. */
export type Viewer = Pick<Tables<'profiles'>, 'id' | 'email' | 'full_name' | 'role'>

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  manager: 'Постановщик',
  executor: 'Исполнитель',
}
