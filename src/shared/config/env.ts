// Во фронтенд попадают только публичные значения: URL проекта и anon (publishable) ключ.
// Права доступа обеспечиваются RLS в базе, поэтому anon-ключ не является секретом.
// service_role ключ здесь использовать нельзя.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  throw new Error('Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. См. .env.example')
}

export const env = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
} as const
