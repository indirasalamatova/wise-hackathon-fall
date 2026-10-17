export type CountryCode =
  | 'HU' | 'DE' | 'NL' | 'AT' | 'PL' | 'ES' | 'FR' | 'IT' | 'CZ' | 'KZ' | 'GB'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  memberSince: string
  citizenship: CountryCode
  passport: { last4: string; validUntil: string }
  address: string
  status: string
  studies: string
}

export type DocStatus = 'missing' | 'needs_update' | 'to_pay' | 'checking' | 'ready' | 'rejected'
export type DocAction = 'request' | 'upload' | 'pay'

export interface DocCheck {
  label: string
  ok: boolean
  detail: string
}

export interface CaseDocument {
  id: string
  name: string
  hint: string
  status: DocStatus
  action?: DocAction
  fileName?: string
  uploadedAt?: string
  checks?: DocCheck[]
}

export type TaskCategory = 'Documents' | 'Finances' | 'Journey' | 'Appointment' | 'Personal'

export interface Task {
  id: string
  title: string
  category: TaskCategory
  due?: string
  done: boolean
}

export type NotificationKind = 'deadline' | 'money' | 'document' | 'travel'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  time: string
  unread: boolean
}

export interface Payment {
  id: string
  date: string
  what: string
  amount: number
  status: 'upcoming' | 'paid'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  bullets?: string[]
  footnote?: string
}

export interface JourneyStage {
  key: 'apply' | 'arrive' | 'stay' | 'transition'
  label: string
  when: string
}

export interface Settings {
  language: 'EN' | 'HU' | 'RU'
  wise: boolean
  calendar: boolean
  push: boolean
  email: boolean
  sms: boolean
}
