import type { BadgeTone } from '@/components/ui/primitives'
import type { JourneyStatus } from '@/lib/types'

export const statusMeta: Record<JourneyStatus, { label: string; tone: BadgeTone }> = {
  planning: { label: 'Planning', tone: 'neutral' },
  active: { label: 'In progress', tone: 'warn' },
  completed: { label: 'Completed', tone: 'ok' },
  archived: { label: 'Archived', tone: 'neutral' },
}

export const purposeLabel = (p: string) => p.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())
