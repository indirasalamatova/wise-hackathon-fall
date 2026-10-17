import { createContext, useContext } from 'react'
import type { AppNotification, CaseDocument, ChatMessage, CheckPhase, DocCheck, Payment, Settings, Task, User } from '@/lib/types'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AuthContextValue {
  /** Logged-in session. The profile behind it is loaded from the API into `user`. */
  session: { email: string; started: number } | null
  user: User | null
  status: LoadStatus
  error: string | null
  reload: () => void
  login: (email: string, password: string) => Promise<void>
  signup: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>
  logout: () => void
  updateUser: (patch: { fullName?: string; address?: string }) => Promise<void>
  setBudget: (monthlyBudget: number) => Promise<void>
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export interface CaseContextValue {
  status: LoadStatus
  error: string | null
  reload: () => void

  documents: CaseDocument[]
  uploadDocument: (
    doc: CaseDocument,
    file: File,
    onPhase: (phase: CheckPhase, progress: number) => void,
  ) => Promise<{ status: 'ready' | 'rejected'; checks: DocCheck[] }>
  requestDocument: (id: string) => Promise<void>
  payDocument: (id: string) => Promise<void>

  tasks: Task[]
  addTask: (title: string) => Promise<void>
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  payments: Payment[]
  payVisaFee: (title: string, amount: number) => Promise<void>

  notifications: AppNotification[]
  markAllRead: () => void
  markRead: (id: string) => void

  chat: ChatMessage[]
  ask: (question: string) => Promise<void>
  thinking: boolean
  clearChat: () => void
}

export interface ToastValue {
  toast: (message: string, tone?: 'default' | 'success' | 'error') => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
export const CaseContext = createContext<CaseContextValue | null>(null)
export const ToastContext = createContext<ToastValue | null>(null)

function useRequired<T>(ctx: React.Context<T | null>, name: string): T {
  const v = useContext(ctx)
  if (!v) throw new Error(`${name} must be used inside its provider`)
  return v
}

export const useAuth = () => useRequired(AuthContext, 'useAuth')
export const useCase = () => useRequired(CaseContext, 'useCase')
export const useToast = () => useRequired(ToastContext, 'useToast')
