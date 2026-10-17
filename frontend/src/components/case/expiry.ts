import type { BadgeTone } from '@/components/ui/primitives'
import { daysUntil, shortDate } from '@/lib/format'

export const EXPIRY_WARNING_DAYS = 60

export type ExpiryState = 'expired' | 'soon' | 'valid' | 'none'

export function expiryOf(expiresOn?: string): { state: ExpiryState; label: string; tone: BadgeTone } {
  if (!expiresOn) return { state: 'none', label: 'No expiry', tone: 'neutral' }
  const days = daysUntil(expiresOn)
  if (days < 0) return { state: 'expired', label: 'Expired', tone: 'accent' }
  if (days <= EXPIRY_WARNING_DAYS) return { state: 'soon', label: days === 0 ? 'Expires today' : `Expires in ${days} days`, tone: 'warn' }
  return { state: 'valid', label: `Valid to ${shortDate(expiresOn, { day: 'numeric', month: 'short', year: 'numeric' })}`, tone: 'ok' }
}
