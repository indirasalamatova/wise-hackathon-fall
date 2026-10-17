import { cn } from '@/lib/format'

/** Four-point compass star with a needle: the Unbound mark from the deck. */
export function LogoMark({ className, tone = 'rose' }: { className?: string; tone?: 'rose' | 'light' }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden>
      <path
        d="M20 2.5C21.2 13 25.5 18 37.5 20C25.5 22 21.2 27 20 37.5C18.8 27 14.5 22 2.5 20C14.5 18 18.8 13 20 2.5Z"
        fill={tone === 'light' ? '#F7E1E1' : '#D8A9A9'}
      />
      <path d="M20.8 19.2L27 13L21.6 20.6Z" fill="#B84747" />
      <circle cx="20" cy="20" r="2" fill="#03100A" />
    </svg>
  )
}

export function Logo({ className, onDark = true }: { className?: string; onDark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <LogoMark className="size-9" />
      <span className={cn('font-display text-xl font-semibold tracking-tight', onDark ? 'text-white' : 'text-forest-950')}>
        unbound
      </span>
    </span>
  )
}
