import { forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/format'

/* ---------------------------------------------------------------- Card */

export function Card({
  tone = 'light',
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: 'light' | 'dark' }) {
  return (
    <div
      className={cn(
        'rounded-card',
        tone === 'dark' ? 'bg-forest-950 text-white' : 'border border-rose-200 bg-white',
        className,
      )}
      {...rest}
    />
  )
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-[17px] font-semibold text-forest-950', className)} {...rest} />
}

/* --------------------------------------------------------------- Badge */

export type BadgeTone = 'danger' | 'warn' | 'ok' | 'neutral' | 'dark' | 'accent'

const badgeTones: Record<BadgeTone, string> = {
  danger: 'bg-rose-100 text-brick-600',
  warn: 'bg-warn-100 text-warn-700',
  ok: 'bg-ok-100 text-ok-700',
  neutral: 'bg-rose-100 text-forest-950',
  dark: 'bg-forest-950 text-white',
  accent: 'bg-brick-600 text-white',
}

export function Badge({ tone = 'neutral', className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center justify-center rounded-full px-3 text-xs font-semibold whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
      {...rest}
    />
  )
}

/* ---------------------------------------------------------------- Input */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'h-12 w-full rounded-2xl border bg-white px-4 text-[15px] text-forest-950 placeholder:text-muted/70',
          'transition-colors outline-none focus:border-forest-950 focus-visible:outline-none',
          invalid ? 'border-brick-600' : 'border-rose-300',
          className,
        )}
        {...rest}
      />
    )
  },
)

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-forest-950">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-[13px] text-brick-600">{error}</p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------- Toggle */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full border-2 transition-colors',
        checked ? 'border-forest-950 bg-forest-950' : 'border-rose-300 bg-rose-300/70',
      )}
    >
      <span
        className={cn(
          'size-[22px] rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[25px]' : 'translate-x-[1px]',
        )}
      />
    </button>
  )
}

/* ------------------------------------------------------------ Checkbox */

export function Checkbox({
  checked,
  onChange,
  label,
  size = 'md',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  size?: 'md' | 'lg'
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'grid shrink-0 place-items-center rounded-md border-2 transition-colors',
        size === 'lg' ? 'size-6' : 'size-5',
        checked ? 'border-forest-950 bg-forest-950 text-white' : 'border-rose-300 bg-white hover:border-brick-600',
      )}
    >
      {checked && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
    </button>
  )
}

/* ------------------------------------------------------------ Progress */

export function Progress({
  value,
  tone = 'dark',
  className,
  label,
}: {
  value: number
  tone?: 'dark' | 'accent' | 'ok'
  className?: string
  label?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2.5 w-full overflow-hidden rounded-full bg-rose-100', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500',
          tone === 'accent' ? 'bg-brick-600' : tone === 'ok' ? 'bg-ok-700' : 'bg-forest-950',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ----------------------------------------------------------- Segmented */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-full border-2 px-4 text-[13px] font-semibold transition-colors',
            value === o.value
              ? 'border-forest-950 bg-forest-950 text-white'
              : 'border-rose-200 bg-white text-forest-950 hover:border-rose-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------- Avatar */

export function Avatar({ text, src, size = 'md' }: { text: string; src?: string; size?: 'md' | 'xl' }) {
  if (src)
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={cn('shrink-0 rounded-full object-cover', size === 'xl' ? 'size-[70px]' : 'size-10')}
      />
    )
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-brick-600 font-semibold text-white',
        size === 'xl' ? 'size-[70px] text-xl' : 'size-10 text-sm',
      )}
    >
      {text}
    </span>
  )
}

/* ------------------------------------------------------------ DateTile */

export function DateTile({ iso }: { iso: string }) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return (
    <span className="grid size-[52px] shrink-0 place-content-center rounded-xl bg-rose-100 text-center leading-none text-forest-950">
      <span className="text-lg font-bold">{d}</span>
      <span className="mt-1 text-[10px] font-semibold">{date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
    </span>
  )
}

/* ------------------------------------------------------- Eyebrow / Page */

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  aside,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  aside?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-tight text-forest-950 sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {aside}
    </header>
  )
}
