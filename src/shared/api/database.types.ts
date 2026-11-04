// Типы схемы БД в формате `supabase gen types typescript`.
// Соответствуют supabase/migrations. При изменении схемы — перегенерировать.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: Database['public']['Enums']['user_role']
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
      objects: {
        Row: {
          id: string
          name: string
          address: string
          created_by: string
          created_at: string
        }
        Insert: {
          name: string
          address: string
        }
        Update: {
          name?: string
          address?: string
        }
        Relationships: [
          {
            foreignKeyName: 'objects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          object_id: string
          assignee_id: string
          status: Database['public']['Enums']['task_status']
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          description?: string
          object_id: string
          assignee_id: string
        }
        Update: {
          title?: string
          description?: string
          object_id?: string
          assignee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_object_id_fkey'
            columns: ['object_id']
            isOneToOne: false
            referencedRelation: 'objects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey'
            columns: ['assignee_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      task_status_history: {
        Row: {
          id: number
          task_id: string
          from_status: Database['public']['Enums']['task_status'] | null
          to_status: Database['public']['Enums']['task_status']
          changed_by: string
          changed_at: string
          comment: string | null
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'task_status_history_task_id_fkey'
            columns: ['task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'task_status_history_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      change_task_status: {
        Args: {
          p_task_id: string
          p_to_status: Database['public']['Enums']['task_status']
          p_comment?: string | null
        }
        Returns: Database['public']['Tables']['tasks']['Row']
      }
      is_manager: { Args: Record<PropertyKey, never>; Returns: boolean }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
    }
    Enums: {
      user_role: 'manager' | 'executor'
      task_status: 'new' | 'in_progress' | 'review' | 'accepted' | 'rework'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]
