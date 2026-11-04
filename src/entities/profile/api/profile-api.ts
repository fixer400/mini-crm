import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/api'
import type { ProfileShort } from '../model/types'

export const profileKeys = {
  all: ['profiles'] as const,
  executors: () => [...profileKeys.all, 'executors'] as const,
}

/** Список исполнителей. Полный список видит только постановщик (RLS). */
export async function fetchExecutors(): Promise<ProfileShort[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'executor')
    .order('full_name')
  if (error) throw error
  return data
}

export function useExecutorsQuery(enabled = true) {
  return useQuery({
    queryKey: profileKeys.executors(),
    queryFn: fetchExecutors,
    enabled,
    staleTime: 5 * 60_000,
  })
}
