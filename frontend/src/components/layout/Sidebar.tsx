import { NavLink, Link } from 'react-router'
import { FileText, ListChecks, MessageSquareText, Route, Wallet, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Logo, LogoMark } from '@/components/brand/Logo'
import { Avatar } from '@/components/ui/primitives'
import { useAuth, useCase } from '@/store/context'
import { cn, initials } from '@/lib/format'

const navItems = [
  { to: '/app', label: 'Assistant', icon: MessageSquareText, end: true },
  { to: '/app/journey', label: 'My journey', icon: Route },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/finances', label: 'Finances', icon: Wallet },
  { to: '/app/todo', label: 'To-do list', icon: ListChecks },
] as const

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean
  onToggle?: () => void
  onNavigate?: () => void
  mobile?: boolean
}) {
  const { user } = useAuth()
  const { tasks, documents } = useCase()
  const openTasks = tasks.filter((t) => !t.done).length
  const docsToFix = documents.filter((d) => d.status !== 'ready').length
  const counts: Record<string, number> = { '/app/todo': openTasks, '/app/documents': docsToFix }

  return (
    <nav
      aria-label="Main"
      className={cn(
        'flex h-full flex-col bg-forest-950 text-rose-300 transition-[width] duration-200',
        collapsed ? 'w-[68px] px-2.5' : 'w-[248px] px-4',
      )}
    >
      <div className={cn('flex h-[88px] items-center', collapsed ? 'justify-center' : 'justify-between')}>
        <Link to="/app" onClick={onNavigate} aria-label="Unbound home">
          {collapsed ? <LogoMark className="size-9" /> : <Logo />}
        </Link>
        {!collapsed && onToggle && !mobile && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="grid size-8 place-items-center rounded-lg text-rose-300/70 hover:bg-white/5 hover:text-rose-300"
          >
            <PanelLeftClose className="size-[18px]" />
          </button>
        )}
      </div>

      {collapsed && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          className="mx-auto mb-3 grid size-10 place-items-center rounded-xl text-rose-300/80 hover:bg-white/5"
        >
          <PanelLeftOpen className="size-5" />
        </button>
      )}

      <ul className="flex flex-col gap-1.5">
        {navItems.map(({ to, label, icon: Icon, ...rest }) => {
          const count = counts[to]
          return (
            <li key={to}>
              <NavLink
                to={to}
                end={'end' in rest}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-11 items-center gap-3 rounded-xl text-[15px] transition-colors',
                    collapsed ? 'justify-center' : 'px-4',
                    isActive ? 'bg-rose-100 font-semibold text-forest-950' : 'hover:bg-white/5 hover:text-rose-100',
                  )
                }
              >
                <Icon className="size-[19px] shrink-0" aria-hidden />
                {!collapsed && <span className="flex-1">{label}</span>}
                {count > 0 &&
                  (collapsed ? (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brick-600" aria-label={`${count} open`} />
                  ) : (
                    <span className="grid h-5 min-w-7 place-items-center rounded-full bg-brick-600 px-1.5 text-xs font-semibold text-white">
                      {count}
                    </span>
                  ))}
              </NavLink>
            </li>
          )
        })}
      </ul>

      {user && (
        <NavLink
          to="/app/profile"
          onClick={onNavigate}
          title={collapsed ? 'My profile' : undefined}
          className={({ isActive }) =>
            cn(
              'mt-auto mb-4 flex items-center gap-3 rounded-xl py-2.5 transition-colors',
              collapsed ? 'justify-center' : 'px-3',
              isActive ? 'bg-rose-100 text-forest-950' : 'text-white hover:bg-white/5',
            )
          }
        >
          <Avatar text={initials(user.firstName, user.lastName)} />
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs opacity-80">My profile</span>
            </span>
          )}
        </NavLink>
      )}
    </nav>
  )
}
