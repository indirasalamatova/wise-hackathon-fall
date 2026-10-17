import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import * as api from '@/lib/api'
import { cn, uid } from '@/lib/format'
import type { AppNotification, CaseDocument, ChatMessage, Payment, Settings, Task, User } from '@/lib/types'
import { AuthContext, CaseContext, ToastContext, useAuth, useToast, type CaseContextValue, type LoadStatus } from './context'
import { clearPersisted, usePersistentState } from './persist'

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
  const [session, setSession] = usePersistentState<{ email: string; started: number } | null>('session', null)
  const [language, setLanguage] = usePersistentState<Settings['language']>('language', 'EN')
  const email = session?.email ?? null
  const profile = useLoader<User>(session && `${session.email}#${session.started}`, () => api.getProfile(email!))
  const { setData: setUser } = profile

  const settings = useMemo<Settings>(
    () => ({ language, ...(profile.data?.settings ?? { wise: false, calendar: false, push: false, email: false, sms: false }) }),
    [language, profile.data],
  )

  const value = useMemo(
    () => ({
      session,
      user: profile.data,
      status: profile.status,
      error: profile.error,
      reload: profile.reload,
      login: async (e: string, password: string) => setSession({ ...(await api.login(e, password)), started: Date.now() }),
      signup: async (input: Parameters<typeof api.signup>[0]) => setSession({ ...(await api.signup(input)), started: Date.now() }),
      logout: () => {
        clearPersisted()
        setSession(null)
      },
      updateUser: async (patch: { fullName?: string; address?: string }) => {
        if (email) setUser(await api.updateProfile(email, patch))
      },
      setBudget: async (monthlyBudget: number) => {
        if (email) setUser(await api.updateBudget(email, monthlyBudget))
      },
      settings,
      setSetting: <K extends keyof Settings>(key: K, v: Settings[K]) => {
        if (key === 'language') return setLanguage(v as Settings['language'])
        if (!email) return
        const k = key as keyof api.ServerSettings
        const flip = (on: boolean) => setUser((u) => (u ? { ...u, settings: { ...u.settings, [k]: on } } : u))
        flip(v as boolean)
        api.updateSetting(email, k, v as boolean).catch((e) => {
          flip(!v)
          toast(errorText(e), 'error')
        })
      },
    }),
    [session, email, profile.data, profile.status, profile.error, profile.reload, settings, setSession, setLanguage, setUser, toast],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ------------------------------------------------------------------ case */

interface CaseData {
  documents: CaseDocument[]
  tasks: Task[]
  payments: Payment[]
  notifications: AppNotification[]
}

const loadCase = async (): Promise<CaseData> => {
  const [documents, tasks, payments, notifications] = await Promise.all([
    api.listDocuments(),
    api.listTasks(),
    api.listPayments(),
    api.listNotifications(),
  ])
  return { documents, tasks, payments, notifications }
}

const replaceById = <T extends { id: string }>(list: T[], item: T) => list.map((x) => (x.id === item.id ? item : x))

export function CaseProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { toast } = useToast()
  const data = useLoader<CaseData>(session && `${session.email}#${session.started}`, loadCase)
  const { setData } = data
  const [chat, setChat] = usePersistentState<ChatMessage[]>('chat', [])
  const [thinking, setThinking] = useState(false)

  /** Updates one slice of the case; ignored before the first load. */
  const patch = useCallback(
    <K extends keyof CaseData>(key: K, fn: (v: CaseData[K]) => CaseData[K]) =>
      setData((d) => (d ? { ...d, [key]: fn(d[key]) } : d)),
    [setData],
  )

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
      uploadDocument: async (doc, file, onPhase) => {
        patch('documents', (ds) => replaceById(ds, { ...doc, status: 'checking' }))
        try {
          const r = await api.uploadDocument(doc.id, file, (pct) => onPhase(pct < 100 ? 'uploading' : 'checking', pct))
          patch('documents', (ds) => replaceById(ds, r.document))
          onPhase('done', 100)
          return { status: r.document.status === 'ready' ? 'ready' : 'rejected', checks: r.checks }
        } catch (e) {
          patch('documents', (ds) => replaceById(ds, doc))
          throw e
        }
      },
      requestDocument: async (id) => {
        const updated = await api.requestDocument(id)
        patch('documents', (ds) => replaceById(ds, updated))
      },
      payDocument: async (id) => {
        const updated = await api.payDocument(id)
        patch('documents', (ds) => replaceById(ds, updated))
        // the server marks the matching payment as paid
        const payments = await api.listPayments()
        patch('payments', () => payments)
      },

      tasks: d?.tasks ?? [],
      addTask: async (title) => {
        const task = await api.createTask(title)
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
      payVisaFee: async (title, amount) => {
        const payment = await api.payVisaFee(title, amount)
        patch('payments', (ps) => [payment, ...ps])
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

      chat,
      thinking,
      ask: async (question) => {
        setChat((c) => [...c, { id: uid('m'), role: 'user', text: question }])
        setThinking(true)
        try {
          const reply = await api.askAssistant(question)
          setChat((c) => [...c, { ...reply, id: uid('m') }])
        } catch (e) {
          toast(errorText(e), 'error')
        } finally {
          setThinking(false)
        }
      },
      clearChat: () => setChat([]),
    }
  }, [data.data, data.status, data.error, data.reload, patch, optimistic, chat, setChat, thinking, toast])

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
