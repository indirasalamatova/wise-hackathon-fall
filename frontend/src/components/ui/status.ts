import type { DocStatus } from '@/lib/types'
import type { BadgeTone } from './primitives'

export const docStatusMeta: Record<DocStatus, { label: string; tone: BadgeTone }> = {
  missing: { label: 'Missing', tone: 'danger' },
  needs_update: { label: 'Needs update', tone: 'warn' },
  to_pay: { label: 'To pay', tone: 'warn' },
  requested: { label: 'Requested', tone: 'neutral' },
  checking: { label: 'Checking', tone: 'neutral' },
  ready: { label: 'Ready', tone: 'ok' },
  rejected: { label: 'Fix needed', tone: 'danger' },
}
