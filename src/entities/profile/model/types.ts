import type { Tables } from '@/shared/api'

export type ProfileShort = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'email'>
