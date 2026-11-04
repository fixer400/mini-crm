import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from '@/entities/session'
import { getErrorMessage } from '@/shared/api'
import { DropdownMenuItem } from '@/shared/ui/shadcn/dropdown-menu'

/** Пункт меню «Выйти». Кэш запросов очищает AuthListener при смене пользователя. */
export function SignOutMenuItem() {
  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <DropdownMenuItem onSelect={handleSignOut}>
      <LogOut />
      Выйти
    </DropdownMenuItem>
  )
}
