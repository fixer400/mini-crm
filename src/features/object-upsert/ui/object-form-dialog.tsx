import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createObject,
  objectKeys,
  updateObject,
  type ConstructionObject,
  type ObjectFormValues,
} from '@/entities/object'
import { getErrorMessage } from '@/shared/api'
import { FormField, Spinner } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog'
import { Input } from '@/shared/ui/shadcn/input'

type ObjectFormDialogProps = {
  /** Если передан — режим редактирования */
  object?: ConstructionObject
  trigger: ReactNode
}

type Errors = Partial<Record<keyof ObjectFormValues, string>>

function validate(values: ObjectFormValues): Errors {
  const errors: Errors = {}
  if (!values.name.trim()) errors.name = 'Укажите название'
  if (!values.address.trim()) errors.address = 'Укажите адрес'
  return errors
}

export function ObjectFormDialog({ object, trigger }: ObjectFormDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{object ? 'Редактирование объекта' : 'Новый объект'}</DialogTitle>
          <DialogDescription>Объект — это строительная площадка.</DialogDescription>
        </DialogHeader>
        {/* Форма монтируется заново при каждом открытии — значения сбрасываются. */}
        {open && <ObjectForm object={object} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ObjectForm({ object, onDone }: { object?: ConstructionObject; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<ObjectFormValues>({
    name: object?.name ?? '',
    address: object?.address ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})

  const mutation = useMutation({
    mutationFn: (payload: ObjectFormValues) =>
      object ? updateObject(object.id, payload) : createObject(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: objectKeys.all })
      toast.success(object ? 'Объект сохранён' : 'Объект создан')
      onDone()
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    mutation.mutate({ name: values.name.trim(), address: values.address.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <FormField label="Название" htmlFor="object-name" error={errors.name} required>
        <Input
          id="object-name"
          value={values.name}
          maxLength={200}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          aria-invalid={Boolean(errors.name)}
          autoFocus
        />
      </FormField>
      <FormField label="Адрес" htmlFor="object-address" error={errors.address} required>
        <Input
          id="object-address"
          value={values.address}
          maxLength={500}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          aria-invalid={Boolean(errors.address)}
        />
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Отмена
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending && <Spinner />}
          {object ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogFooter>
    </form>
  )
}
