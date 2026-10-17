import type { CountryCode } from '@/lib/types'
import { cn } from '@/lib/format'

/** Simplified SVG flags. Emoji flags don't render on Windows. */
const stripes: Partial<Record<CountryCode, { dir: 'h' | 'v'; colors: string[] }>> = {
  HU: { dir: 'h', colors: ['#CE2939', '#FFFFFF', '#477050'] },
  DE: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },
  NL: { dir: 'h', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },
  AT: { dir: 'h', colors: ['#C8102E', '#FFFFFF', '#C8102E'] },
  PL: { dir: 'h', colors: ['#FFFFFF', '#DC143C'] },
  FR: { dir: 'v', colors: ['#002395', '#FFFFFF', '#ED2939'] },
  IT: { dir: 'v', colors: ['#009246', '#FFFFFF', '#CE2B37'] },
}

export function Flag({ code, className }: { code: CountryCode; className?: string }) {
  const cls = cn('h-[18px] w-[26px] shrink-0 rounded-[3px] ring-1 ring-black/10', className)
  const s = stripes[code]
  if (s) {
    const n = s.colors.length
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="none">
        {s.colors.map((c, i) =>
          s.dir === 'h' ? (
            <rect key={i} x="0" y={(20 / n) * i} width="30" height={20 / n} fill={c} />
          ) : (
            <rect key={i} x={(30 / n) * i} y="0" width={30 / n} height="20" fill={c} />
          ),
        )}
      </svg>
    )
  }
  if (code === 'ES')
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="none">
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    )
  if (code === 'CZ')
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="none">
        <rect width="30" height="10" fill="#FFFFFF" />
        <rect y="10" width="30" height="10" fill="#D7141A" />
        <path d="M0 0L15 10L0 20Z" fill="#11457E" />
      </svg>
    )
  if (code === 'KZ')
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="none">
        <rect width="30" height="20" fill="#00AFCA" />
        <circle cx="15" cy="9" r="3.6" fill="#FEC50C" />
        <path d="M10 14.5Q15 12 20 14.5" stroke="#FEC50C" strokeWidth="1" fill="none" />
      </svg>
    )
  // GB
  return (
    <svg viewBox="0 0 60 40" className={cls} aria-hidden preserveAspectRatio="none">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#FFF" strokeWidth="8" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0V40M0 20H60" stroke="#FFF" strokeWidth="12" />
      <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="7" />
    </svg>
  )
}
