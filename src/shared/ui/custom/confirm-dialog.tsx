import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/shadcn/alert-dialog'
import { Button } from '@/shared/ui/shadcn/button'
import { Spinner } from './page-loader'

type ConfirmDialogProps = {
  trigger: ReactNode
  title: ReactNode
  description?: ReactNode
  confirmText?: string
  destructive?: boolean
  /** Диалог закрывается, только если промис завершился успешно. */
  onConfirm: () => Promise<unknown>
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmText = 'Подтвердить',
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // Ошибку показывает вызывающий код (тост), диалог оставляем открытым.
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Отмена</AlertDialogCancel>
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Spinner />}
            {confirmText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
