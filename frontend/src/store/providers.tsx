import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import * as api from '@/lib/api'
import { cn, uid } from '@/lib/format'
import { setAuthToken, setUnauthorizedHandler } from '@/lib/http'
import type { AppNotification, CaseDocument, Payment, PrefilledForm, ProfilePatch, Settings, Task, User, VisaPlan } from '@/lib/types'
import { AuthContext, CaseContext, ToastContext, useAuth, useToast, type CaseContextValue, type LoadStatus } from './context'
import { clearPersisted, usePersistentState } from './persist'

const isSession = (v: unknown): v is { token: string } =>
  typeof v === 'object' && v !== null && typeof (v as { token?: unknown }).token === 'string' && (v as { token: string }).token.length > 0

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong. Try again.')

/** Loads a value whenever `key` changes; `null` key means nothing to load. */
function useLoader<T>(key: string | null, load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ for: string; data: T | null; error: string | null } | null>(null)
  const current = key === null ? null : `${key}#${attempt}`

  useEffect(() => {
    if (current === null) return
    let cancelled = false
    load()
      .then((data) => !cancelled && setResult({ for: current, data, error: null }))
      .catch((e) => !cancelled && setResult({ for: current, data: null, error: errorText(e) }))
    return () => {
      cancelled = true
    }
    // `load` is recreated each render; `current` decides when to refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const fresh = result && result.for === current ? result : null
  const status: LoadStatus = current === null ? 'idle' : !fresh ? 'loading' : fresh.error ? 'error' : 'ready'

  const setData = useCallback(
    (fn: T | null | ((d: T | null) => T | null)) =>
      setResult((r) => (r ? { ...r, data: typeof fn === 'function' ? (fn as (d: T | null) => T | null)(r.data) : fn } : r)),
    [],
  )
  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { data: fresh?.data ?? null, setData, status, error: fresh?.error ?? null, reload }
}

/* ------------------------------------------------------------------ auth */

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast()
  const [stored, setSession] = usePersistentState<unknown>('session', null)
  // Only a `{ token }` counts. Anything else (e.g. `{ email, started }` from the pre-OAuth build,
  // or a hand-edited value) would look logged in but never load, so treat it as logged out.
  const session = isSession(stored) ? stored : null
  const [sessionExpired, setSessionExpired] = useState(false)
  const [language, setLanguage] = usePersistentState<Settings['language']>('language', 'EN')

  useEffect(() => {
    if (stored !== null && !isSession(stored)) setSession(null)
  }, [stored, setSession])

  // Set during render so child effects (which run first) already send the token.
  setAuthToken(session?.token ?? null)
  const profile = useLoader<User>(session?.token ?? null, api.getMe)
  const { setData: setUser } = profile

  const logout = useCallback(() => {
    clearPersisted()
    setSession(null)
  }, [setSession])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout()
      setSessionExpired(true)
    })
  }, [logout])

  const settings = useMemo<Settings>(
    () => ({ language, ...(profile.data?.settings ?? { push: false, email: false, sms: false }) }),
    [language, profile.data],
  )

  const value = useMemo(
    () => ({
      session,
      sessionExpired,
      user: profile.data,
      status: profile.status,
      error: profile.error,
      reload: profile.reload,
      loginWithGoogle: async (credential: string) => {
        const { token } = await api.loginWithGoogle(credential)
        setSessionExpired(false)
        setSession({ token })
      },
      logout,
      deleteAccount: async () => {
        await api.deleteMe()
        logout()
      },
      updateUser: async (patch: ProfilePatch) => setUser(await api.updateMe(patch)),
      settings,
      setSetting: <K extends keyof Settings>(key: K, v: Settings[K]) => {
        if (key === 'language') return setLanguage(v as Settings['language'])
        const k = key as keyof api.ServerSettings
        const flip = (on: boolean) => setUser((u) => (u ? { ...u, settings: { ...u.settings, [k]: on } } : u))
        flip(v as boolean)
        api.updateMe({ [k]: v }).catch((e) => {
          flip(!v)
          toast(errorText(e), 'error')
        })
      },
    }),
    [session, sessionExpired, profile.data, profile.status, profile.error, profile.reload, settings, logout, setSession, setLanguage, setUser, toast],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ------------------------------------------------------------------ case */

interface CaseData {
  documents: CaseDocument[]
  tasks: Task[]
  payments: Payment[]
  notifications: AppNotification[]
  plans: VisaPlan[]
  forms: PrefilledForm[]
}

const loaders = {
  documents: api.listDocuments,
  tasks: api.listTasks,
  payments: api.listPayments,
  notifications: api.listNotifications,
  plans: api.listPlans,
  forms: api.listForms,
} satisfies { [K in keyof CaseData]: () => Promise<CaseData[K]> }

const loadCase = async (): Promise<CaseData> => {
  const [documents, tasks, payments, notifications, plans, forms] = await Promise.all([
    loaders.documents(),
    loaders.tasks(),
    loaders.payments(),
    loaders.notifications(),
    loaders.plans(),
    loaders.forms(),
  ])
  return { documents, tasks, payments, notifications, plans, forms }
}

const ANALYSIS_POLL_MS = 3000

export function CaseProvider({ children }: { children: ReactNode }) {
  const { session, reload: reloadUser } = useAuth()
  const { toast } = useToast()
  const data = useLoader<CaseData>(session?.token ?? null, loadCase)
  const { setData } = data

  /** Updates one slice of the case; ignored before the first load. */
  const patch = useCallback(
    <K extends keyof CaseData>(key: K, fn: (v: CaseData[K]) => CaseData[K]) =>
      setData((d) => (d ? { ...d, [key]: fn(d[key]) } : d)),
    [setData],
  )

  /** Refetch slices the server changed on its own (agent tools, analysis, notifications). */
  const refetch = useCallback(
    (keys: (keyof CaseData)[]) => {
      for (const k of keys) loaders[k]().then((v) => patch(k, () => v as never), () => {})
    },
    [patch],
  )
  const refreshNotifications = useCallback(() => refetch(['notifications']), [refetch])

  // Document analysis runs in the background on the server; poll while any is pending.
  const pending = data.data?.documents.some((d) => d.analysis?.status === 'pending') ?? false
  useEffect(() => {
    if (!pending) return
    const t = setInterval(() => refetch(['documents', 'notifications']), ANALYSIS_POLL_MS)
    return () => clearInterval(t)
  }, [pending, refetch])

  /** Applies a change right away, then rolls it back if the server refuses it. */
  const optimistic = useCallback(
    (apply: () => void, rollback: () => void, call: () => Promise<unknown>) => {
      apply()
      call().catch((e) => {
        rollback()
        toast(errorText(e), 'error')
      })
    },
    [toast],
  )

  const value = useMemo<CaseContextValue>(() => {
    const d = data.data
    return {
      status: data.status,
      error: data.error,
      reload: data.reload,

      documents: d?.documents ?? [],
      uploadDocument: async (input, onProgress) => {
        const doc = await api.uploadDocument(input, onProgress)
        patch('documents', (ds) => [doc, ...ds])
        refreshNotifications()
        return doc
      },
      openDocument: async (doc) => {
        // Open the tab now, while we still have the click; popup blockers allow it.
        const tab = window.open('', '_blank')
        try {
          const url = URL.createObjectURL(await api.downloadDocument(doc.id))
          if (tab) tab.location.href = url
          else {
            const a = document.createElement('a')
            a.href = url
            a.download = doc.fileName
            a.click()
          }
          setTimeout(() => URL.revokeObjectURL(url), 60_000)
        } catch (e) {
          tab?.close()
          toast(errorText(e), 'error')
        }
      },
      deleteDocument: async (id) => {
        await api.deleteDocument(id)
        patch('documents', (ds) => ds.filter((x) => x.id !== id))
      },
      reanalyzeDocument: async (id) => {
        const doc = await api.reanalyzeDocument(id)
        patch('documents', (ds) => ds.map((x) => (x.id === id ? doc : x)))
      },

      plans: d?.plans ?? [],
      forms: d?.forms ?? [],
      deleteForm: async (id) => {
        await api.deleteForm(id)
        patch('forms', (fs) => fs.filter((f) => f.id !== id))
      },
      refresh: (what) => {
        const keys = what.filter((w): w is keyof CaseData => w in loaders)
        if (keys.length) refetch([...keys, 'notifications'])
        if (what.includes('profile')) reloadUser()
      },

      tasks: d?.tasks ?? [],
      addTask: async (title, due) => {
        const task = await api.createTask(title, due)
        patch('tasks', (ts) => [task, ...ts])
      },
      toggleTask: (id) => {
        const task = d?.tasks.find((t) => t.id === id)
        if (!task) return
        const set = (done: boolean) => patch('tasks', (ts) => ts.map((t) => (t.id === id ? { ...t, done } : t)))
        optimistic(
          () => set(!task.done),
          () => set(task.done),
          () => api.setTaskDone(id, !task.done),
        )
      },
      removeTask: (id) => {
        const task = d?.tasks.find((t) => t.id === id)
        if (!task) return
        optimistic(
          () => patch('tasks', (ts) => ts.filter((t) => t.id !== id)),
          () => patch('tasks', (ts) => [task, ...ts]),
          () => api.deleteTask(id),
        )
      },

      payments: d?.payments ?? [],
      recordPayment: async (title, amount) => {
        const payment = await api.recordPayment(title, amount)
        patch('payments', (ps) => [payment, ...ps])
        refreshNotifications()
      },

      notifications: d?.notifications ?? [],
      markRead: (id) => {
        if (!d?.notifications.find((n) => n.id === id)?.unread) return
        const set = (unread: boolean) => patch('notifications', (ns) => ns.map((n) => (n.id === id ? { ...n, unread } : n)))
        optimistic(
          () => set(false),
          () => set(true),
          () => api.markNotificationRead(id),
        )
      },
      markAllRead: () => {
        const before = d?.notifications ?? []
        optimistic(
          () => patch('notifications', (ns) => ns.map((n) => ({ ...n, unread: false }))),
          () => patch('notifications', () => before),
          api.markAllNotificationsRead,
        )
      },

    }
  }, [data.data, data.status, data.error, data.reload, patch, optimistic, refetch, refreshNotifications, reloadUser, toast])

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>
}

/* ----------------------------------------------------------------- toast */

interface Toast {
  id: string
  message: string
  tone: 'default' | 'success' | 'error'
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = uid('toast')
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'animate-pop-in pointer-events-auto flex items-center gap-2.5 rounded-full py-2.5 pr-5 pl-3.5 text-sm font-medium shadow-[0_8px_30px_-8px_rgb(3_16_10/0.45)]',
              t.tone === 'error' ? 'bg-brick-600 text-white' : 'bg-forest-950 text-white',
            )}
          >
            {t.tone === 'error' ? (
              <AlertCircle className="size-4 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 className={cn('size-4 shrink-0', t.tone === 'success' ? 'text-sage-300' : 'text-rose-300')} aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
