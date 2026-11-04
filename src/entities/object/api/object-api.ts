import { supabase } from '@/shared/api'
import type {
  ConstructionObject,
  ConstructionObjectListItem,
  ObjectFormValues,
} from '../model/types'

// Фильтрация «исполнитель видит только свои объекты» делается RLS в базе,
// поэтому запросы одинаковы для обеих ролей.

export async function fetchObjects(): Promise<ConstructionObjectListItem[]> {
  const { data, error } = await supabase
    .from('objects')
    .select('id, name, address, created_at, tasks(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(({ tasks, ...rest }) => ({ ...rest, tasksCount: tasks[0]?.count ?? 0 }))
}

export async function fetchObject(id: string): Promise<ConstructionObject> {
  const { data, error } = await supabase.from('objects').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createObject(values: ObjectFormValues): Promise<ConstructionObject> {
  const { data, error } = await supabase.from('objects').insert(values).select('*').single()
  if (error) throw error
  return data
}

export async function updateObject(id: string, values: ObjectFormValues): Promise<ConstructionObject> {
  const { data, error } = await supabase
    .from('objects')
    .update(values)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteObject(id: string): Promise<void> {
  // select() после delete нужен, чтобы отличить «удалено» от «RLS не дал удалить» (0 строк).
  const { data, error } = await supabase.from('objects').delete().eq('id', id).select('id')
  if (error) throw error
  if (!data.length) throw new Error('Объект не найден или нет прав на удаление')
}
