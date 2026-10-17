import type { BadgeTone } from '@/components/ui/primitives'
import type { VisaStatus } from '@/lib/types'

/** Land fills: distinct in hue and lightness from each other and from the blue ocean, also for colour-blind users. */
export const statusColor: Record<VisaStatus, string> = {
  visa_free: '#3f9a63',
  visa_on_arrival: '#a58be0',
  evisa: '#e3a43b',
  visa_required: '#c4524f',
  unknown: '#5d6863',
  home: '#f7e1e1',
}

export const statusTone: Record<VisaStatus, BadgeTone> = {
  visa_free: 'ok',
  visa_on_arrival: 'neutral',
  evisa: 'warn',
  visa_required: 'danger',
  unknown: 'neutral',
  home: 'dark',
}
