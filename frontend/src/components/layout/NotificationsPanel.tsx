import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Clock, FileText, Send, Wallet } from 'lucide-react'
import { Segmented } from '@/components/ui/primitives'
import { useCase } from '@/store/context'
import { cn } from '@/lib/format'
import type { NotificationKind } from '@/lib/types'

const kindStyle: Record<NotificationKind, { icon: typeof Clock; cls: string }> = {
  deadline: { icon: Clock, cls: 'bg-rose-100 text-brick-600' },
  money: { icon: Wallet, cls: 'bg-ok-100 text-ok-700' },
  document: { icon: FileText, cls: 'bg-rose-100 text-forest-950' },
  travel: { icon: Send, cls: 'bg-warn-100 text-warn-700' },
}

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markAllRead, markRead } = useCase()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unread = notifications.filter((n) => n.unread).length
  const list = filter === 'all' ? notifications : notifications.filter((n) => n.unread)

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="animate-pop-in absolute top-[calc(100%+10px)] right-0 z-40 w-[min(408px,calc(100vw-2rem))] overflow-hidden rounded-card border border-rose-200 bg-white shadow-[0_24px_60px_-20px_rgb(3_16_10/0.35)]"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <h2 className="text-[17px] font-semibold">Notifications</h2>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unread === 0}
          className="text-[13px] font-semibold underline underline-offset-2 disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>
      <div className="border-t border-rose-200 px-6 pt-3 pb-1">
        <Segmented
          label="Filter notifications"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread (${unread})` },
          ]}
        />
      </div>
      <ul className="max-h-[320px] overflow-y-auto px-3 py-2">
        {list.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">You’re all caught up.</li>}
        {list.map((n) => {
          const { icon: Icon, cls } = kindStyle[n.kind]
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  markRead(n.id)
                  if (n.href) {
                    navigate(n.href)
                    onClose()
                  }
                }}
                className="flex w-full items-start gap-3.5 rounded-xl px-3 py-3 text-left hover:bg-blush"
              >
                <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', cls)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {n.unread && <span className="size-2 shrink-0 rounded-full bg-brick-600" aria-label="Unread" />}
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted">{n.time}</span>
                  </span>
                  <span className="block text-[13px] text-muted">{n.body}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-rose-200 px-6 py-3.5 text-[13px] font-semibold">
        <Link to="/app/profile" onClick={onClose} className="underline underline-offset-2">
          Notification settings
        </Link>
        <button type="button" onClick={() => setFilter('all')} className="underline underline-offset-2">
          See all
        </button>
      </div>
    </div>
  )
}
