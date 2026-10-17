/**
 * Unbound API client. Each function calls the FastAPI backend (see
 * backend/app/main.py) and adapts its snake_case shapes to the frontend types,
 * so pages never see backend field names. Every call is scoped to the signed-in
 * user by the bearer token http.ts attaches.
 */
import { translate } from '@/i18n/core'
import { ApiError, getBlob, request, streamEvents, upload } from './http'
import type {
  AppNotification,
  CaseDocument,
  ChatEvent,
  ChatMessage,
  ChatSessionInfo,
  ChatStep,
  DocumentAnalysis,
  DocumentCategory,
  FormField,
  PrefilledForm,
  RequirementCheck,
  VisaPlan,
  NotificationKind,
  Payment,
  ProfilePatch,
  Settings,
  StageKey,
  Task,
  TaskCategory,
  User,
} from './types'

export { ApiError }

/* ------------------------------------------------------- backend shapes */

interface ApiUser {
  id: string
  email: string
  full_name: string
  first_name: string
  picture_url: string | null
  created_at: string
  citizenship: string
  passport: string
  address: string
  residence_status: string
  studies: string
  monthly_budget_eur: number
  savings_eur: number
  journey_stage: string
  notify_push: boolean
  notify_email: boolean
  notify_sms: boolean
}

interface ApiTask {
  id: string
  title: string
  category: string
  due_date: string | null
  done: boolean
}

interface ApiDocument {
  id: string
  title: string
  category: string
  file_name: string
  content_type: string
  size_bytes: number
  expires_on: string | null
  uploaded_at: string
  analysis: {
    status: DocumentAnalysis['status']
    document_kind: string | null
    summary: string | null
    fields: DocumentAnalysis['fields']
    issues: DocumentAnalysis['issues']
    error: string | null
    analyzed_at: string | null
  } | null
}

interface ApiPlan {
  id: string
  destination_code: string
  destination_name: string
  purpose: string
  visa_type: string
  travel_date: string | null
  stay_days: number | null
  gap: { requirements: RequirementCheck[] }
  fees: { mandatory_totals: Record<string, string>; amounts_not_fixed: string[] }
  created_at: string
  guideline_status: 'current' | 'stale' | 'missing'
}

interface ApiForm {
  id: string
  plan_id: string | null
  title: string
  official_url: string | null
  fields: FormField[]
  created_at: string
}

interface ApiChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string | null
  events: ChatStep[]
}

interface ApiPayment {
  id: string
  title: string
  amount_eur: number
  status: string
  paid_on: string
}

interface ApiNotification {
  id: string
  kind: string
  title: string
  body: string
  href: string
  read: boolean
  created_at: string
}


/* -------------------------------------------------------------- adapters */

export type ServerSettings = Settings

const settingKeys: Record<keyof ServerSettings, keyof ApiUser> = {
  push: 'notify_push',
  email: 'notify_email',
  sms: 'notify_sms',
}

const profileKeys: Record<keyof ProfilePatch, keyof ApiUser> = {
  fullName: 'full_name',
  citizenship: 'citizenship',
  passport: 'passport',
  address: 'address',
  residenceStatus: 'residence_status',
  studies: 'studies',
  monthlyBudget: 'monthly_budget_eur',
  savings: 'savings_eur',
  journeyStage: 'journey_stage',
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

const toUser = (u: ApiUser): User => ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  fullName: u.full_name,
  initials: initialsOf(u.full_name) || '?',
  pictureUrl: u.picture_url ?? undefined,
  memberSince: u.created_at,
  citizenship: u.citizenship,
  passport: u.passport,
  address: u.address,
  residenceStatus: u.residence_status,
  studies: u.studies,
  monthlyBudget: u.monthly_budget_eur,
  savings: u.savings_eur,
  journeyStage: u.journey_stage as StageKey,
  settings: { push: u.notify_push, email: u.notify_email, sms: u.notify_sms },
})

const toTask = (t: ApiTask): Task => ({
  id: t.id,
  title: t.title,
  category: t.category as TaskCategory,
  due: t.due_date ?? undefined,
  done: t.done,
})

const toDocument = (d: ApiDocument): CaseDocument => ({
  id: d.id,
  title: d.title,
  category: d.category as DocumentCategory,
  fileName: d.file_name,
  contentType: d.content_type,
  size: d.size_bytes,
  expiresOn: d.expires_on ?? undefined,
  uploadedAt: d.uploaded_at,
  analysis: d.analysis
    ? {
        status: d.analysis.status,
        kind: d.analysis.document_kind ?? undefined,
        summary: d.analysis.summary ?? undefined,
        fields: d.analysis.fields ?? {},
        issues: d.analysis.issues ?? [],
        error: d.analysis.error ?? undefined,
        analyzedAt: d.analysis.analyzed_at ?? undefined,
      }
    : undefined,
})

const toPlan = (p: ApiPlan): VisaPlan => ({
  id: p.id,
  destinationCode: p.destination_code,
  destinationName: p.destination_name,
  purpose: p.purpose,
  visaType: p.visa_type,
  travelDate: p.travel_date ?? undefined,
  stayDays: p.stay_days ?? undefined,
  requirements: p.gap.requirements ?? [],
  feeTotals: p.fees.mandatory_totals ?? {},
  feesNotFixed: p.fees.amounts_not_fixed ?? [],
  createdAt: p.created_at,
  guidelineCurrent: p.guideline_status === 'current',
})

const toForm = (f: ApiForm): PrefilledForm => ({
  id: f.id,
  planId: f.plan_id ?? undefined,
  title: f.title,
  officialUrl: f.official_url ?? undefined,
  fields: f.fields,
  createdAt: f.created_at,
})

const toPayment = (p: ApiPayment): Payment => ({
  id: p.id,
  date: p.paid_on,
  what: p.title,
  amount: p.amount_eur,
  status: p.status === 'paid' ? 'paid' : 'upcoming',
})

const toNotification = (n: ApiNotification): AppNotification => ({
  id: n.id,
  kind: n.kind as NotificationKind,
  title: n.title,
  body: n.body,
  createdAt: n.created_at,
  unread: !n.read,
  href: n.href,
})

/* ------------------------------------------------------------------ auth */

/** Exchanges a Google ID token for our own access token. */
export async function loginWithGoogle(credential: string) {
  const r = await request<{ access_token: string; user: ApiUser }>('/api/auth/google', { method: 'POST', body: { credential } })
  return { token: r.access_token, user: toUser(r.user) }
}

/* --------------------------------------------------------------- profile */

export const getMe = async () => toUser(await request<ApiUser>('/api/me'))

export async function updateMe(patch: ProfilePatch & Partial<ServerSettings>) {
  const body: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) {
    const key = profileKeys[k as keyof ProfilePatch] ?? settingKeys[k as keyof ServerSettings]
    if (key) body[key] = v
  }
  return toUser(await request<ApiUser>('/api/me', { method: 'PATCH', body }))
}

export const deleteMe = () => request<null>('/api/me', { method: 'DELETE' })

/* ----------------------------------------------------------------- tasks */

export const listTasks = async () => (await request<ApiTask[]>('/api/tasks')).map(toTask)

export const createTask = async (title: string, due?: string, category: TaskCategory = 'Personal') =>
  toTask(await request<ApiTask>('/api/tasks', { method: 'POST', body: { title, category, due_date: due || null } }))

export const setTaskDone = async (id: string, done: boolean) =>
  toTask(await request<ApiTask>(`/api/tasks/${id}`, { method: 'PATCH', body: { done } }))

export const deleteTask = (id: string) => request<null>(`/api/tasks/${id}`, { method: 'DELETE' })

/* ------------------------------------------------------------- documents */

export const MAX_UPLOAD_MB = 10
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']

export const listDocuments = async () => (await request<ApiDocument[]>('/api/documents')).map(toDocument)

export async function uploadDocument(
  input: { file: File; title: string; category: DocumentCategory; expiresOn?: string },
  onProgress: (pct: number) => void,
) {
  // Checked here too, so a wrong file fails before the upload starts.
  if (!ACCEPTED.includes(input.file.type)) throw new ApiError(translate('error.fileType'))
  if (input.file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new ApiError(translate('error.fileTooBig', { mb: MAX_UPLOAD_MB }))
  const form = new FormData()
  form.append('file', input.file)
  form.append('title', input.title)
  form.append('category', input.category)
  if (input.expiresOn) form.append('expires_on', input.expiresOn)
  return toDocument(await upload<ApiDocument>('/api/documents', form, onProgress))
}

export const downloadDocument = (id: string) => getBlob(`/api/documents/${id}/file`)

export const deleteDocument = (id: string) => request<null>(`/api/documents/${id}`, { method: 'DELETE' })

/* -------------------------------------------------------------- payments */

export const listPayments = async () => (await request<ApiPayment[]>('/api/payments')).map(toPayment)

/** Simulated Wise payment: the server records it as paid. */
export const recordPayment = async (title: string, amount: number) =>
  toPayment(await request<ApiPayment>('/api/payments', { method: 'POST', body: { title, amount_eur: amount } }))

/* --------------------------------------------------------- notifications */

export const listNotifications = async () => (await request<ApiNotification[]>('/api/notifications')).map(toNotification)

export const markNotificationRead = (id: string) => request<ApiNotification>(`/api/notifications/${id}/read`, { method: 'POST' })

export const markAllNotificationsRead = () => request<null>('/api/notifications/mark-all-read', { method: 'POST' })

/* ------------------------------------------------------- analysis, plans */

export const reanalyzeDocument = async (id: string) => toDocument(await request<ApiDocument>(`/api/documents/${id}/analyze`, { method: 'POST' }))

export const listPlans = async () => (await request<ApiPlan[]>('/api/plans')).map(toPlan)

export const listForms = async () => (await request<ApiForm[]>('/api/forms')).map(toForm)

export const getForm = async (id: string) => toForm(await request<ApiForm>(`/api/forms/${id}`))

export const deleteForm = (id: string) => request<null>(`/api/forms/${id}`, { method: 'DELETE' })

/* ------------------------------------------------------------- assistant */

const toSession = (s: { id: string; title: string; updated_at: string }): ChatSessionInfo => ({ id: s.id, title: s.title, updatedAt: s.updated_at })

export const listChats = async () => (await request<{ id: string; title: string; updated_at: string }[]>('/api/chat/sessions')).map(toSession)

export const createChat = async () => toSession(await request<{ id: string; title: string; updated_at: string }>('/api/chat/sessions', { method: 'POST' }))

export const deleteChat = (id: string) => request<null>(`/api/chat/sessions/${id}`, { method: 'DELETE' })

/** Rows from the server, with consecutive assistant rows (text, tool steps, more text) merged into one reply. */
export async function getChatMessages(id: string): Promise<ChatMessage[]> {
  const rows = await request<ApiChatMessage[]>(`/api/chat/sessions/${id}/messages`)
  const out: ChatMessage[] = []
  for (const r of rows) {
    const last = out[out.length - 1]
    if (r.role === 'assistant' && last?.role === 'assistant') {
      last.text = [last.text, r.text].filter(Boolean).join('\n\n')
      last.steps.push(...r.events)
    } else {
      out.push({ id: r.id, role: r.role, text: r.text ?? '', steps: [...r.events] })
    }
  }
  return out
}

export const sendChatMessage = (id: string, message: string, onEvent: (e: ChatEvent) => void, signal?: AbortSignal) =>
  streamEvents<ChatEvent>(`/api/chat/sessions/${id}/messages`, { message }, onEvent, signal)
