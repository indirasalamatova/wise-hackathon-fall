export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

export const money = (n: number) => eur.format(n)

export function daysUntil(iso: string, from = new Date()) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const [y, m, d] = iso.split('-').map(Number)
  const b = new Date(y, m - 1, d)
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

export function relativeDays(iso: string) {
  const n = daysUntil(iso)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n > 1) return `in ${n} days`
  if (n === -1) return 'yesterday'
  return `${-n} days ago`
}

export function shortDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', opts)
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
