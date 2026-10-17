import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { Bell, Globe2, Menu, Search } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useCase } from '@/store/context'
import { destinations } from '@/lib/mock-data'
import { cn } from '@/lib/format'
import { LanguageMenu } from './LanguageMenu'
import { NotificationsPanel } from './NotificationsPanel'

function useClickAway(ref: React.RefObject<HTMLElement | null>, onAway: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const down = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onAway()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onAway()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [ref, onAway, active])
}

function GlobalSearch() {
  const { tasks, documents } = useCase()
  const { t, country } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useClickAway(wrap, () => setOpen(false), open)

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    const hit = (s: string) => s.toLowerCase().includes(term)
    return [
      ...tasks.filter((x) => hit(x.title)).map((x) => ({ group: t('search.tasks'), label: x.title, to: '/app/todo' })),
      ...documents.filter((d) => hit(d.title) || hit(d.fileName)).map((d) => ({ group: t('search.documents'), label: d.title, to: '/app/documents' })),
      ...destinations.filter((c) => hit(country(c.code))).map((c) => ({ group: t('search.countries'), label: country(c.code), to: '/app/finances' })),
    ].slice(0, 8)
  }, [q, tasks, documents, t, country])

  const go = (to: string) => {
    navigate(to)
    setOpen(false)
    setQ('')
  }

  return (
    <div ref={wrap} className="relative w-full max-w-[432px]">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-forest-950" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && results[0] && go(results[0].to)}
        placeholder={t('search.placeholder')}
        aria-label={t('search.aria')}
        className="h-[42px] w-full rounded-xl border border-rose-300 bg-white pr-4 pl-11 text-[15px] placeholder:text-muted outline-none focus:border-forest-950 focus-visible:outline-none"
      />
      {open && q.trim() && (
        <div className="animate-pop-in absolute top-[calc(100%+8px)] z-40 w-full overflow-hidden rounded-2xl border border-rose-200 bg-white py-2 shadow-[0_24px_60px_-20px_rgb(3_16_10/0.35)]">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{t('search.empty', { q })}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(r.to)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-blush"
              >
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 text-xs text-muted">{r.group}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { notifications } = useCase()
  const { t } = useI18n()
  const [panel, setPanel] = useState<'none' | 'notifications' | 'lang'>('none')
  const right = useRef<HTMLDivElement>(null)
  useClickAway(right, () => setPanel('none'), panel !== 'none')
  const unread = notifications.filter((n) => n.unread).length

  return (
    <header className="sticky top-0 z-30 border-b border-rose-200 bg-blush/90 backdrop-blur">
      <div className="flex h-[76px] items-center gap-3 px-4 sm:px-7">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t('layout.openMenu')}
          className="grid size-[42px] shrink-0 place-items-center rounded-xl border border-rose-300 bg-white lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        <GlobalSearch />

        <div ref={right} className="relative ml-auto flex items-center gap-2.5">
          <NavLink
            to="/app/explore"
            aria-label={t('explore.title')}
            title={t('explore.title')}
            className={({ isActive }) =>
              cn('grid size-[42px] place-items-center rounded-xl border bg-white transition-colors hover:border-forest-950', isActive ? 'border-forest-950 bg-rose-100' : 'border-rose-300')
            }
          >
            <Globe2 className="size-5" aria-hidden />
          </NavLink>

          <LanguageMenu open={panel === 'lang'} onOpenChange={(o) => setPanel(o ? 'lang' : 'none')} />

          <button
            type="button"
            onClick={() => setPanel(panel === 'notifications' ? 'none' : 'notifications')}
            aria-label={t('notifications.aria', { count: unread })}
            aria-expanded={panel === 'notifications'}
            className={cn(
              'relative grid size-[42px] place-items-center rounded-xl border bg-white',
              panel === 'notifications' ? 'border-forest-950' : 'border-rose-300',
            )}
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-brick-600 text-[11px] font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
          {panel === 'notifications' && <NotificationsPanel onClose={() => setPanel('none')} />}
        </div>
      </div>
    </header>
  )
}
