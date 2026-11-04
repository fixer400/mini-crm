import { Link } from 'react-router'
import { routes } from '@/shared/config'
import { StateMessage } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'

export function NotFoundPage() {
  return (
    <StateMessage
      title="Страница не найдена"
      description="Возможно, ссылка устарела или у вас нет доступа."
      action={
        <Button asChild variant="outline">
          <Link to={routes.objects}>К объектам</Link>
        </Button>
      }
    />
  )
}
