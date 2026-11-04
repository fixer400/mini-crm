// Общие хелперы для локальных скриптов. В бандл фронтенда не попадают.
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/shared/api/database.types.ts'

config({ path: ['.env.local', '.env'], quiet: true })

export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Не задана переменная окружения ${name} (см. .env.example)`)
    process.exit(1)
  }
  return value
}

export const SUPABASE_URL = requireEnv('VITE_SUPABASE_URL')
export const ANON_KEY = requireEnv('VITE_SUPABASE_ANON_KEY')

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** Клиент от имени администратора. Только для создания пользователей в seed. */
export function adminClient() {
  return createClient<Database>(SUPABASE_URL, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), noSession)
}

/** Обычный клиент — ровно то же, что видит браузер. */
export function anonClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, noSession)
}

export async function signedInClient(email: string, password: string) {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Не удалось войти как ${email}: ${error.message}`)
  return client
}

export type SeedUser = {
  key: 'manager' | 'manager2' | 'executor1' | 'executor2'
  email: string
  fullName: string
  role: 'manager' | 'executor'
}

export const SEED_USERS: SeedUser[] = [
  { key: 'manager', email: 'manager@example.com', fullName: 'Ольга Соколова', role: 'manager' },
  { key: 'manager2', email: 'manager2@example.com', fullName: 'Дмитрий Орлов', role: 'manager' },
  { key: 'executor1', email: 'executor1@example.com', fullName: 'Иван Петров', role: 'executor' },
  { key: 'executor2', email: 'executor2@example.com', fullName: 'Алексей Смирнов', role: 'executor' },
]
