import { NavLink } from 'react-router'
import { Building2, ChevronDown } from 'lucide-react'
import { SignOutMenuItem } from '@/features/auth'
import { USER_ROLE_LABEL, useViewer } from '@/entities/session'
import { routes } from '@/shared/config'
import { cn } from '@/shared/lib'
import { Button } from '@/shared/ui/shadcn/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
    isActive ? 'bg-accent text-foreground' : 'text-muted-foreground',
  )

export function AppHeader() {
  const viewer = useViewer()
  const isManager = viewer.role === 'manager'

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <NavLink to={routes.objects} className="flex items-center gap-2 font-semibold">
          <Building2 className="size-5" />
          <span className="hidden sm:inline">Объекты и задачи</span>
        </NavLink>

        <nav className="flex items-center gap-1">
          <NavLink to={routes.objects} className={navLinkClass}>
            Объекты
          </NavLink>
          <NavLink to={routes.tasks} className={navLinkClass}>
            {isManager ? 'Все задачи' : 'Мои задачи'}
          </NavLink>
        </nav>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <span className="max-w-40 truncate">{viewer.full_name}</span>
                <ChevronDown className="text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium">{viewer.full_name}</div>
                <div className="truncate text-xs text-muted-foreground">{viewer.email}</div>
                <div className="mt-1 text-xs text-muted-foreground">{USER_ROLE_LABEL[viewer.role]}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <SignOutMenuItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
