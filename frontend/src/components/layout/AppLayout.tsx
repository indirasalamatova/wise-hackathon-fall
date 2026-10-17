import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/store/context'
import { usePersistentState } from '@/store/persist'
import { cn } from '@/lib/format'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = usePersistentState('sidebar-collapsed', false)
  const [drawer, setDrawer] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : ''
  }, [drawer])

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return (
    <div className="flex min-h-svh bg-blush">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* desktop */}
      <div className="sticky top-0 hidden h-svh shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* mobile drawer */}
      <div className={cn('fixed inset-0 z-50 lg:hidden', drawer ? 'visible' : 'invisible')} aria-hidden={!drawer}>
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={drawer ? 0 : -1}
          onClick={() => setDrawer(false)}
          className={cn('absolute inset-0 bg-forest-950/50 transition-opacity', drawer ? 'opacity-100' : 'opacity-0')}
        />
        <div className={cn('absolute inset-y-0 left-0 transition-transform duration-200', drawer ? 'translate-x-0' : '-translate-x-full')}>
          <Sidebar collapsed={false} mobile onNavigate={() => setDrawer(false)} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawer(true)} />
        <main id="main" className="w-full flex-1 px-4 py-6 sm:px-7 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
