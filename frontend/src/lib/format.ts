import { currentLocale, translate } from '@/i18n/core'

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const eurFormats = new Map<string, Intl.NumberFormat>()

/** Euros in the UI language: "€1,250", "1 250 €". */
export function money(n: number) {
  const locale = currentLocale()
  let f = eurFormats.get(locale)
  if (!f) eurFormats.set(locale, (f = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })))
  return f.format(n)
}

export function daysUntil(iso: string, from = new Date()) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const [y, m, d] = iso.split('-').map(Number)
  const b = new Date(y, m - 1, d)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function relativeDays(iso: string) {
  const n = daysUntil(iso)
  if (n === 0) return translate('time.today')
  if (n === 1) return translate('time.tomorrow')
  if (n > 1) return translate('time.inDays', { count: n })
  if (n === -1) return translate('time.yesterday')
  return translate('time.daysAgo', { count: -n })
}

export function shortDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(currentLocale(), opts)
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return translate('size.b', { n: bytes })
  if (bytes < 1024 * 1024) return translate('size.kb', { n: Math.round(bytes / 1024) })
  return translate('size.mb', { n: (bytes / 1024 / 1024).toLocaleString(currentLocale(), { maximumFractionDigits: 1 }) })
}

/** "9:00" today, "Yesterday", "Tue" this week, else "12 Oct". */
export function timeAgo(iso: string, now = new Date()) {
  const locale = currentLocale()
  const d = new Date(iso)
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000)
  if (mins < 1) return translate('time.justNow')
  if (mins < 60) return translate('time.minutesAgo', { count: mins })
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  const days = Math.round((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 1) return translate('time.yesterdayCap')
  if (days < 7) return d.toLocaleDateString(locale, { weekday: 'short' })
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}
