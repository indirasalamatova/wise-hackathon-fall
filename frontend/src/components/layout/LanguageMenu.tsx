import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Flag } from '@/components/brand/Flag'
import { languages, useI18n } from '@/i18n'
import { cn } from '@/lib/format'

/** Language picker. `dark` styles the trigger for the public header. */
export function LanguageMenu({ dark = false, open: controlled, onOpenChange }: { dark?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { language, setLanguage, t } = useI18n()
  const [own, setOwn] = useState(false)
  const open = controlled ?? own
  const setOpen = onOpenChange ?? setOwn
  const wrap = useRef<HTMLDivElement>(null)
  const current = languages.find((l) => l.value === language) ?? languages[0]

  useEffect(() => {
    // The topbar closes its own panels; only handle outside clicks when we own the state.
    if (!open || controlled !== undefined) return
    const down = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOwn(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOwn(false)
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, controlled])

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('lang.label')}: ${current.label}`}
        className={cn(
          'flex items-center gap-2 text-sm font-semibold',
          dark ? 'h-10 rounded-full px-2 text-white hover:text-rose-300' : 'h-[42px] rounded-xl border border-rose-300 bg-white px-3',
        )}
      >
        <Flag code={current.flag} className={dark ? 'h-3.5 w-5' : undefined} />
        <span className={dark ? undefined : 'hidden sm:inline'}>{current.value}</span>
        <ChevronDown className={cn('size-3.5', !dark && 'hidden sm:block')} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t('lang.label')}
          className="animate-pop-in absolute top-[calc(100%+8px)] right-0 z-40 w-44 overflow-hidden rounded-2xl border border-rose-200 bg-white py-1.5 text-forest-950 shadow-[0_24px_60px_-20px_rgb(3_16_10/0.35)]"
        >
          {languages.map((l) => (
            <li key={l.value}>
              <button
                type="button"
                role="option"
                aria-selected={l.value === language}
                lang={l.value.toLowerCase()}
                onClick={() => {
                  setLanguage(l.value)
                  setOpen(false)
                }}
                className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-sm hover:bg-blush', l.value === language && 'font-semibold')}
              >
                <Flag code={l.flag} /> <span className="flex-1 text-left">{l.label}</span>
                {l.value === language && <Check className="size-4 text-brick-600" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
