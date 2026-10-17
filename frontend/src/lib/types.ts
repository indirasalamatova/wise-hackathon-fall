import type { Key } from '@/i18n'

export type CountryCode =
  | 'HU' | 'DE' | 'NL' | 'AT' | 'PL' | 'ES' | 'FR' | 'IT' | 'CZ' | 'KZ' | 'GB' | 'RU'

export type StageKey = 'apply' | 'arrive' | 'stay' | 'transition'

export interface User {
  id: string
  email: string
  firstName: string
  fullName: string
  initials: string
  pictureUrl?: string
  /** ISO timestamp */
  memberSince: string
  citizenship: string
  passport: string
  address: string
  residenceStatus: string
  studies: string
  monthlyBudget: number
  savings: number
  journeyStage: StageKey
  settings: Settings
}

export type ProfilePatch = Partial<
  Pick<User, 'fullName' | 'citizenship' | 'passport' | 'address' | 'residenceStatus' | 'studies' | 'monthlyBudget' | 'savings' | 'journeyStage'>
>

export const documentCategories = ['Passport', 'Visa or permit', 'Insurance', 'Finances', 'Education', 'Housing', 'Other'] as const
export type DocumentCategory = (typeof documentCategories)[number]

export interface DocumentIssue {
  field: string
  severity: 'error' | 'warning' | 'info'
  message: string
}

export interface DocumentAnalysis {
  status: 'pending' | 'done' | 'failed' | 'skipped'
  kind?: string
  summary?: string
  /** Normalised by the backend rules: dates are ISO, numbers exact. */
  fields: Record<string, string | boolean | null>
  issues: DocumentIssue[]
  error?: string
  analyzedAt?: string
}

export interface CaseDocument {
  analysis?: DocumentAnalysis
  id: string
  title: string
  category: DocumentCategory
  fileName: string
  contentType: string
  size: number
  /** ISO date */
  expiresOn?: string
  /** ISO timestamp */
  uploadedAt: string
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
  /** ISO timestamp */
  createdAt: string
  unread: boolean
  href?: string
}

export interface Payment {
  id: string
  date: string
  what: string
  amount: number
  status: 'upcoming' | 'paid'
}

export interface ChatSessionInfo {
  id: string
  title: string
  updatedAt: string
}

export interface ChatStep {
  name: string
  label: string
  state: 'start' | 'done' | 'error'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  steps: ChatStep[]
  error?: string
  streaming?: boolean
}

export type ChatEvent =
  | { type: 'text'; text: string }
  | ({ type: 'tool' } & ChatStep)
  | { type: 'done'; changed: string[] }
  | { type: 'error'; message: string }

export interface RequirementCheck {
  key: string
  title: string
  mandatory: boolean
  status: 'satisfied' | 'problem' | 'missing'
  matched_document: string | null
  problems: { document: string; problems: string[] }[]
}

export interface VisaPlan {
  id: string
  destinationCode: string
  destinationName: string
  purpose: string
  visaType: string
  travelDate?: string
  stayDays?: number
  requirements: RequirementCheck[]
  feeTotals: Record<string, string>
  feesNotFixed: string[]
  createdAt: string
  /** False when the country's guideline went out of date: the checklist is the last known snapshot. */
  guidelineCurrent: boolean
}

export interface FormField {
  key: string
  label: string
  value: string | null
  status: 'filled' | 'missing'
  hint?: string | null
}

export interface PrefilledForm {
  id: string
  planId?: string
  title: string
  officialUrl?: string
  fields: FormField[]
  createdAt: string
}

export interface JourneyStage {
  key: StageKey
  /** Translation keys (src/i18n). */
  label: Key
  description: Key
}

/** Notification settings, saved on the server. The UI language is a device setting (see src/i18n). */
export interface Settings {
  push: boolean
  email: boolean
  sms: boolean
}
