import { Link } from 'react-router'
import { MapPin } from 'lucide-react'
import type { ConstructionObjectListItem } from '@/entities/object'
import { routes } from '@/shared/config'
import { plural } from '@/shared/lib'

/** Мобильное представление списка объектов. */
export function ObjectCardList({ objects }: { objects: ConstructionObjectListItem[] }) {
  return (
    <ul className="grid gap-2">
      {objects.map((o) => (
        <li key={o.id}>
          <Link
            to={routes.object(o.id)}
            className="block rounded-lg border bg-card p-4 transition-colors active:bg-accent"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium break-words">{o.name}</span>
              <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                {o.tasksCount} {plural(o.tasksCount, ['задача', 'задачи', 'задач'])}
              </span>
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>{o.address}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
