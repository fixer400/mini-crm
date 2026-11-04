import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { signIn } from '@/entities/session'
import { getErrorMessage } from '@/shared/api'
import { FormField, Spinner } from '@/shared/ui/custom'
import { Button } from '@/shared/ui/shadcn/button'
import { Input } from '@/shared/ui/shadcn/input'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => signIn(email.trim(), password),
    // Переход на нужную страницу сделает гостевой guard после смены сессии.
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      <FormField label="Email" htmlFor="email" required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </FormField>
      <FormField label="Пароль" htmlFor="password" required>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </FormField>

      {mutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {getErrorMessage(mutation.error)}
        </p>
      )}

      <Button type="submit" disabled={mutation.isPending || !email || !password}>
        {mutation.isPending && <Spinner />}
        Войти
      </Button>
    </form>
  )
}
