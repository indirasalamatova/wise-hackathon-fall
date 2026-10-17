import { cn } from '@/lib/format'

export type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'light'
export type Size = 'sm' | 'md' | 'lg' | 'icon'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 select-none'

const variants: Record<Variant, string> = {
  primary: 'bg-forest-950 text-white hover:bg-forest-700',
  accent: 'bg-brick-600 text-white hover:bg-brick-700',
  outline: 'border-2 border-rose-300 bg-white text-forest-950 hover:border-brick-600 hover:text-brick-700',
  ghost: 'text-forest-950 hover:bg-rose-100',
  light: 'bg-white text-forest-950 hover:bg-rose-100',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
  icon: 'size-11',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}
