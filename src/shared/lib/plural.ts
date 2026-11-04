const rules = new Intl.PluralRules('ru-RU')

/** Склонение по числу: plural(3, ['задача', 'задачи', 'задач']) → «задачи». */
export function plural(count: number, [one, few, many]: [string, string, string]) {
  const form = rules.select(count)
  return form === 'one' ? one : form === 'few' ? few : many
}
