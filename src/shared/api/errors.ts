type ErrorLike = { code?: string; message?: string }

/** Превращает ошибку Supabase/PostgREST в понятное пользователю сообщение. */
export function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Неизвестная ошибка'
  const { code, message = '' } = error as ErrorLike

  switch (code) {
    case '23503':
      return 'Операция невозможна: на запись ссылаются другие данные (например, в объекте есть задачи)'
    case '42501':
      // Сообщения из наших функций уже на русском, стандартное сообщение RLS — нет.
      return /row-level security|permission denied/i.test(message)
        ? 'Недостаточно прав для этого действия'
        : message
    case 'PGRST116':
      return 'Запись не найдена или нет доступа'
    case 'invalid_credentials':
      return 'Неверный email или пароль'
  }
  if (/Invalid login credentials/i.test(message)) return 'Неверный email или пароль'
  if (/Failed to fetch/i.test(message)) return 'Нет связи с сервером'
  return message || 'Неизвестная ошибка'
}
