import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import * as api from '@/lib/api'
import { cn, uid } from '@/lib/format'
import { initialDocuments, initialNotifications, initialTasks } from '@/lib/mock-data'
import type { CaseDocument, ChatMessage, Settings, Task, User } from '@/lib/types'
import { AuthContext, CaseContext, ToastContext, type CaseContextValue } from './context'
import { clearPersisted, usePersistentState } from './persist'

const defaultSettings: Settings = {
  language: 'EN',
  wise: true,
  calendar: true,
  push: true,
  email: true,
  sms: false,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = usePersistentState<User | null>('user', null)

  const value = useMemo(
    () => ({
      user,
      login: async (email: string, password: string) => setUser(await api.login(email, password)),
      signup: async (input: Parameters<typeof api.signup>[0]) => setUser(await api.signup(input)),
      logout: () => {
        clearPersisted()
        setUser(null)
      },
      updateUser: (patch: Partial<User>) => setUser((u) => (u ? { ...u, ...patch } : u)),
    }),
    [user, setUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function CaseProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = usePersistentState<CaseDocument[]>('documents', initialDocuments)
  const [tasks, setTasks] = usePersistentState<Task[]>('tasks', initialTasks)
  const [notifications, setNotifications] = usePersistentState('notifications', initialNotifications)
  const [chat, setChat] = usePersistentState<ChatMessage[]>('chat', [])
  const [settings, setSettings] = usePersistentState<Settings>('settings', defaultSettings)

  const value = useMemo<CaseContextValue>(
    () => ({
      documents,
      updateDocument: (id, patch) => setDocuments((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d))),

      tasks,
      addTask: (title) =>
        setTasks((ts) => [{ id: uid('t'), title, category: 'Personal', done: false }, ...ts]),
      toggleTask: (id) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t))),
      removeTask: (id) => setTasks((ts) => ts.filter((t) => t.id !== id)),

      notifications,
      markAllRead: () => setNotifications((ns) => ns.map((n) => ({ ...n, unread: false }))),
      markRead: (id) => setNotifications((ns) => ns.map((n) => (n.id === id ? { ...n, unread: false } : n))),

      chat,
      pushChat: (m) => setChat((c) => [...c, { ...m, id: uid('m') }]),
      clearChat: () => setChat([]),

      settings,
      setSetting: (key, v) => setSettings((s) => ({ ...s, [key]: v })),

      resetDemo: () => {
        setDocuments(initialDocuments)
        setTasks(initialTasks)
        setNotifications(initialNotifications)
        setChat([])
        setSettings(defaultSettings)
      },
    }),
    [documents, tasks, notifications, chat, settings, setDocuments, setTasks, setNotifications, setChat, setSettings],
  )
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>
}

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
