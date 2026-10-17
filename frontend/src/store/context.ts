import { createContext, useContext } from 'react'
import type { AppNotification, CaseDocument, ChatMessage, Settings, Task, User } from '@/lib/types'

export interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (input: { firstName: string; lastName: string; email: string; password: string }) => Promise<void>
  logout: () => void
  updateUser: (patch: Partial<User>) => void
}

export interface CaseContextValue {
  documents: CaseDocument[]
  updateDocument: (id: string, patch: Partial<CaseDocument>) => void

  tasks: Task[]
  addTask: (title: string) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  notifications: AppNotification[]
  markAllRead: () => void
  markRead: (id: string) => void

  chat: ChatMessage[]
  pushChat: (m: Omit<ChatMessage, 'id'>) => void
  clearChat: () => void

  settings: Settings
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void

  resetDemo: () => void
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
