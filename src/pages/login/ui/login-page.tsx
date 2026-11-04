import { Building2 } from 'lucide-react'
import { SignInForm } from '@/features/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card'

export function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <CardTitle className="text-xl">Объекты и задачи</CardTitle>
          <CardDescription>
            Войдите по email и паролю. Учётные записи выдаёт администратор.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </main>
  )
}
