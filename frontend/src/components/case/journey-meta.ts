import type { BadgeTone } from '@/components/ui/primitives'
import { translateOr, type Key } from '@/i18n/core'
import type { JourneyStatus } from '@/lib/types'

export const statusMeta: Record<JourneyStatus, { label: Key; tone: BadgeTone }> = {
  planning: { label: 'journeyStatus.planning', tone: 'neutral' },
  active: { label: 'journeyStatus.active', tone: 'warn' },
  completed: { label: 'journeyStatus.completed', tone: 'ok' },
  archived: { label: 'journeyStatus.archived', tone: 'neutral' },
}

export const purposeLabel = (p: string) => translateOr(`explore.purpose.${p}`, p.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()))
