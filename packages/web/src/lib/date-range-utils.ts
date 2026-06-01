export type DateRangePreset =
  | 'hoy'
  | 'manana'
  | 'esta-semana'
  | 'fin-de-semana'
  | 'siguiente-semana'
  | 'este-mes'
  | 'proximo-mes'

export const DATE_RANGE_PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'manana', label: 'Mañana' },
  { key: 'esta-semana', label: 'Esta semana' },
  { key: 'fin-de-semana', label: 'Fin de semana' },
  { key: 'siguiente-semana', label: 'Siguiente semana' },
  { key: 'este-mes', label: 'Este mes' },
  { key: 'proximo-mes', label: 'Próximo mes' },
]

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function resolveDateRange(preset: DateRangePreset): { from: string; to: string } {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  )
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dow = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  if (preset === 'hoy')
    return { from: toDateString(today), to: toDateString(today) }

  if (preset === 'manana') {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return { from: toDateString(d), to: toDateString(d) }
  }

  if (preset === 'esta-semana') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - ((dow + 6) % 7))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: toDateString(today), to: toDateString(sun) }
  }

  if (preset === 'fin-de-semana') {
    const daysToSat = (6 - dow + 7) % 7 || 7
    const sat = new Date(today)
    sat.setDate(today.getDate() + (dow === 6 ? 0 : daysToSat))
    const sun = new Date(sat)
    sun.setDate(sat.getDate() + 1)
    return { from: toDateString(sat), to: toDateString(sun) }
  }

  if (preset === 'siguiente-semana') {
    const daysToNextMon = ((8 - dow) % 7) || 7
    const mon = new Date(today)
    mon.setDate(today.getDate() + daysToNextMon)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: toDateString(mon), to: toDateString(sun) }
  }

  if (preset === 'este-mes') {
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { from: toDateString(today), to: toDateString(last) }
  }

  // proximo-mes
  const first = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const last = new Date(today.getFullYear(), today.getMonth() + 2, 0)
  return { from: toDateString(first), to: toDateString(last) }
}