import type { BadgeTone } from '@/components/ui/primitives'
import { translate } from '@/i18n'
import { daysUntil, shortDate } from '@/lib/format'

export const EXPIRY_WARNING_DAYS = 60

export type ExpiryState = 'expired' | 'soon' | 'valid' | 'none'

export function expiryOf(expiresOn?: string): { state: ExpiryState; label: string; tone: BadgeTone } {
  if (!expiresOn) return { state: 'none', label: translate('expiry.none'), tone: 'neutral' }
  const days = daysUntil(expiresOn)
  if (days < 0) return { state: 'expired', label: translate('expiry.expired'), tone: 'accent' }
  if (days <= EXPIRY_WARNING_DAYS)
    return { state: 'soon', label: days === 0 ? translate('expiry.today') : translate('expiry.inDays', { count: days }), tone: 'warn' }
  return { state: 'valid', label: translate('expiry.validTo', { date: shortDate(expiresOn, { day: 'numeric', month: 'short', year: 'numeric' }) }), tone: 'ok' }
}
