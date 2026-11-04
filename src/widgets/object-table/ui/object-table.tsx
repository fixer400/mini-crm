import { Link } from 'react-router'
import type { ConstructionObjectListItem } from '@/entities/object'
import { routes } from '@/shared/config'
import { formatDate } from '@/shared/lib'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table'

export function ObjectTable({ objects }: { objects: ConstructionObjectListItem[] }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Адрес</TableHead>
            <TableHead className="text-right">Задач</TableHead>
            <TableHead className="text-right">Создан</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="whitespace-normal">
                <Link to={routes.object(o.id)} className="font-medium hover:underline">
                  {o.name}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">{o.address}</TableCell>
              <TableCell className="text-right tabular-nums">{o.tasksCount}</TableCell>
              <TableCell className="text-right text-muted-foreground">{formatDate(o.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
