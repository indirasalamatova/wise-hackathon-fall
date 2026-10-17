import { createContext, useContext } from 'react'
import type { AppNotification, CaseDocument, DocumentCategory, Payment, PrefilledForm, ProfilePatch, Settings, Task, User, VisaPlan } from '@/lib/types'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AuthContextValue {
  /** Signed-in session. The profile behind it is loaded from the API into `user`. */
  session: { token: string } | null
  /** True after the server rejected the token (expired, account deleted, secret rotated). */
  sessionExpired: boolean
  user: User | null
  status: LoadStatus
  error: string | null
  reload: () => void
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
  deleteAccount: () => Promise<void>
  updateUser: (patch: ProfilePatch) => Promise<void>
  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export interface UploadInput {
  file: File
  title: string
  category: DocumentCategory
  expiresOn?: string
}

export interface CaseContextValue {
  status: LoadStatus
  error: string | null
  reload: () => void

  documents: CaseDocument[]
  uploadDocument: (input: UploadInput, onProgress: (pct: number) => void) => Promise<CaseDocument>
  openDocument: (doc: CaseDocument) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  reanalyzeDocument: (id: string) => Promise<void>

  plans: VisaPlan[]
  forms: PrefilledForm[]
  deleteForm: (id: string) => Promise<void>
  /** Refetch what an agent turn changed (tasks, plans, forms, profile). */
  refresh: (what: string[]) => void

  tasks: Task[]
  addTask: (title: string, due?: string) => Promise<void>
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  payments: Payment[]
  recordPayment: (title: string, amount: number) => Promise<void>

  notifications: AppNotification[]
  markAllRead: () => void
  markRead: (id: string) => void
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
