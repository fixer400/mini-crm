import type { Tables, TablesInsert } from '@/shared/api'

export type ConstructionObject = Tables<'objects'>

export type ConstructionObjectListItem = Pick<
  ConstructionObject,
  'id' | 'name' | 'address' | 'created_at'
> & {
  /** Количество задач, видимых текущему пользователю (для исполнителя — только свои). */
  tasksCount: number
}

export type ObjectFormValues = TablesInsert<'objects'>
