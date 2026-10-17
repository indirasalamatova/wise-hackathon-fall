import { useId } from 'react'
import type { CountryCode } from '@/lib/types'
import { cn } from '@/lib/format'

/** Simplified SVG flags. Emoji flags don't render on Windows. */
const stripes: Partial<Record<CountryCode, { dir: 'h' | 'v'; colors: string[] }>> = {
  HU: { dir: 'h', colors: ['#CE2939', '#FFFFFF', '#477050'] },
  DE: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },
  NL: { dir: 'h', colors: ['#AE1C28', '#FFFFFF', '#21468B'] },
  AT: { dir: 'h', colors: ['#C8102E', '#FFFFFF', '#C8102E'] },
  PL: { dir: 'h', colors: ['#FFFFFF', '#DC143C'] },
  RU: { dir: 'h', colors: ['#FFFFFF', '#0039A6', '#D52B1E'] },
  FR: { dir: 'v', colors: ['#002395', '#FFFFFF', '#ED2939'] },
  IT: { dir: 'v', colors: ['#009246', '#FFFFFF', '#CE2B37'] },
}

/** Union Jack with the red saltire offset (counterchanged), as on the real flag. */
function UnionJack({ className }: { className: string }) {
  // useId output can contain characters that break url(#…) references.
  const id = `uj${useId().replace(/[^\w-]/g, '')}`
  return (
    // 2:1 flag in a ~3:2 box: crop the ends rather than squash it.
    <svg viewBox="0 0 60 30" className={className} aria-hidden preserveAspectRatio="xMidYMid slice">
      <clipPath id={`${id}s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}

export function Flag({ code, className }: { code: CountryCode; className?: string }) {
  const cls = cn('h-[18px] w-[26px] shrink-0 rounded-[3px] ring-1 ring-black/10', className)
  const s = stripes[code]
  if (s) {
    const n = s.colors.length
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="xMidYMid slice">
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
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="xMidYMid slice">
        <rect width="30" height="20" fill="#AA151B" />
        <rect y="5" width="30" height="10" fill="#F1BF00" />
      </svg>
    )
  if (code === 'CZ')
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="xMidYMid slice">
        <rect width="30" height="10" fill="#FFFFFF" />
        <rect y="10" width="30" height="10" fill="#D7141A" />
        <path d="M0 0L15 10L0 20Z" fill="#11457E" />
      </svg>
    )
  if (code === 'KZ')
    return (
      <svg viewBox="0 0 30 20" className={cls} aria-hidden preserveAspectRatio="xMidYMid slice">
        <rect width="30" height="20" fill="#00AFCA" />
        <circle cx="15" cy="9" r="3.6" fill="#FEC50C" />
        <path d="M10 14.5Q15 12 20 14.5" stroke="#FEC50C" strokeWidth="1" fill="none" />
      </svg>
    )
  return <UnionJack className={cls} />
}
