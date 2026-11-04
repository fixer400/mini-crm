import { Link } from 'react-router'
import { TaskStatusBadge, type TaskWithRelations } from '@/entities/task'
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

type TaskTableProps = {
  tasks: TaskWithRelations[]
  /** Скрыть колонку «Объект» (например, в карточке объекта) */
  hideObject?: boolean
  /** Скрыть колонку «Исполнитель» (например, в «Моих задачах») */
  hideAssignee?: boolean
}

export function TaskTable({ tasks, hideObject, hideAssignee }: TaskTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Задача</TableHead>
            {!hideObject && <TableHead>Объект</TableHead>}
            {!hideAssignee && <TableHead>Исполнитель</TableHead>}
            <TableHead>Статус</TableHead>
            <TableHead className="text-right">Создана</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="max-w-80 whitespace-normal">
                <Link to={routes.task(task.id)} className="font-medium hover:underline">
                  {task.title}
                </Link>
              </TableCell>
              {!hideObject && (
                <TableCell className="whitespace-normal text-muted-foreground">
                  {task.object ? (
                    <Link to={routes.object(task.object.id)} className="hover:underline">
                      {task.object.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </TableCell>
              )}
              {!hideAssignee && <TableCell>{task.assignee?.full_name ?? '—'}</TableCell>}
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatDate(task.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
