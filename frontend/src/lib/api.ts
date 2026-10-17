/**
 * Unbound API client. Each function calls the FastAPI backend (see
 * backend/app/main.py) and adapts its snake_case shapes to the frontend types,
 * so pages never see backend field names.
 */
import { ApiError, request, upload } from './http'
import type {
  AppNotification,
  CaseDocument,
  ChatMessage,
  CountryCode,
  DocCheck,
  DocStatus,
  NotificationKind,
  Payment,
  Settings,
  Task,
  TaskCategory,
  User,
} from './types'

export { ApiError }

/* ------------------------------------------------------- backend shapes */

interface ApiProfile {
  id: string
  first_name: string
  full_name: string
  initials: string
  member_since: string
  citizenship_code: string
  citizenship_name: string
  passport_masked: string
  address: string
  status: string
  studies: string
  monthly_budget_eur: number
  wise_balance_eur: number
  connected_wise: boolean
  connected_calendar: boolean
  notify_push: boolean
  notify_email: boolean
  notify_sms: boolean
}

interface ApiTask {
  id: string
  title: string
  short_title: string | null
  category: string
  due_date: string | null
  done: boolean
}

interface ApiDocument {
  id: string
  title: string
  note: string
  status: string
  action: string | null
  file_path: string | null
}

interface ApiPayment {
  id: string
  date_str: string
  title: string
  amount_eur: number
  status: string
}

interface ApiNotification {
  id: string
  title: string
  body: string
  time_str: string
  tone: string
  icon: string
  read: boolean
  href: string
}

interface ApiChatResponse {
  role: 'assistant'
  blocks: { type: 'lead' | 'bullets' | 'text'; text?: string | null; items?: string[] | null }[]
}

/* -------------------------------------------------------------- adapters */

export type ServerSettings = Omit<Settings, 'language'>

const settingKeys: Record<keyof ServerSettings, keyof ApiProfile> = {
  wise: 'connected_wise',
  calendar: 'connected_calendar',
  push: 'notify_push',
  email: 'notify_email',
  sms: 'notify_sms',
}

function toUser(p: ApiProfile, email: string): User {
  return {
    id: p.id,
    email,
    firstName: p.first_name,
    fullName: p.full_name,
    initials: p.initials,
    memberSince: p.member_since,
    citizenship: p.citizenship_code as CountryCode,
    citizenshipName: p.citizenship_name,
    passportMasked: p.passport_masked,
    address: p.address,
    status: p.status,
    studies: p.studies,
    monthlyBudget: p.monthly_budget_eur,
    wiseBalance: p.wise_balance_eur,
    settings: {
      wise: p.connected_wise,
      calendar: p.connected_calendar,
      push: p.notify_push,
      email: p.notify_email,
      sms: p.notify_sms,
    },
  }
}

const toTask = (t: ApiTask): Task => ({
  id: t.id,
  title: t.title,
  category: t.category as TaskCategory,
  due: t.due_date ?? undefined,
  done: t.done,
})

const toDocument = (d: ApiDocument): CaseDocument => ({
  id: d.id,
  name: d.title,
  hint: d.note,
  status: d.status as DocStatus,
  action: (d.action ?? undefined) as CaseDocument['action'],
  fileName: d.file_path?.split('/').pop(),
})

const months: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
}

/** Backend stores payment dates as "13 Nov 2026". */
function isoFromDateStr(s: string): string {
  const m = /^(\d{1,2}) (\w{3}) (\d{4})$/.exec(s.trim())
  if (m && months[m[2]]) return `${m[3]}-${months[m[2]]}-${m[1].padStart(2, '0')}`
  return new Date().toISOString().slice(0, 10)
}

const toPayment = (p: ApiPayment): Payment => ({
  id: p.id,
  date: isoFromDateStr(p.date_str),
  what: p.title,
  amount: p.amount_eur,
  status: p.status === 'paid' ? 'paid' : 'upcoming',
})

const iconKinds: Record<string, NotificationKind> = {
  clock: 'deadline',
  banknote: 'money',
  file: 'document',
  send: 'travel',
}

const toNotification = (n: ApiNotification): AppNotification => ({
  id: n.id,
  kind: iconKinds[n.icon] ?? 'document',
  title: n.title,
  body: n.body,
  time: n.time_str,
  unread: !n.read,
  href: n.href,
})

function toChat(r: ApiChatResponse): Omit<ChatMessage, 'id'> {
  const lead = r.blocks.find((b) => b.type === 'lead')?.text
  const bullets = r.blocks.flatMap((b) => (b.type === 'bullets' ? (b.items ?? []) : []))
  const texts = r.blocks.filter((b) => b.type === 'text' && b.text).map((b) => b.text!)
  return {
    role: 'assistant',
    text: lead ?? texts.shift() ?? '',
    bullets: bullets.length ? bullets : undefined,
    footnote: texts.length ? texts.join(' ') : undefined,
  }
}

/* ------------------------------------------------------------------ auth */

/**
 * The backend has no auth yet: it serves one profile (user_default). Login and
 * signup validate locally and start a session for that profile. Replace with
 * POST /api/auth/... when multi-user auth lands.
 */
export async function login(email: string, password: string): Promise<{ email: string }> {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError('Enter an email like name@example.com.')
  if (password.length < 6) throw new ApiError('Password is at least 6 characters. Check it and try again.')
  return { email }
}

export async function signup(input: { firstName: string; lastName: string; email: string; password: string }) {
  if (!input.firstName.trim() || !input.lastName.trim()) throw new ApiError('Add your first and last name as they appear in your passport.')
  if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new ApiError('Enter an email like name@example.com.')
  if (input.password.length < 8) throw new ApiError('Use at least 8 characters for your password.')
  return { email: input.email }
}

/* --------------------------------------------------------------- profile */

export const getProfile = async (email: string) => toUser(await request<ApiProfile>('/api/profile'), email)

export const updateProfile = async (email: string, patch: { fullName?: string; address?: string }) =>
  toUser(
    await request<ApiProfile>('/api/profile', {
      method: 'PATCH',
      body: { full_name: patch.fullName, address: patch.address },
    }),
    email,
  )

export const updateBudget = async (email: string, monthlyBudget: number) =>
  toUser(await request<ApiProfile>('/api/profile/budget', { method: 'PATCH', body: { monthly_budget_eur: monthlyBudget } }), email)

export const updateSetting = async (email: string, key: keyof ServerSettings, value: boolean) =>
  toUser(await request<ApiProfile>('/api/profile/settings', { method: 'PATCH', body: { [settingKeys[key]]: value } }), email)

/* ----------------------------------------------------------------- tasks */

export const listTasks = async () => (await request<ApiTask[]>('/api/tasks')).map(toTask)

export const createTask = async (title: string, category: TaskCategory = 'Personal') =>
  toTask(await request<ApiTask>('/api/tasks', { method: 'POST', body: { title, category } }))

export const setTaskDone = async (id: string, done: boolean) =>
  toTask(await request<ApiTask>(`/api/tasks/${id}`, { method: 'PATCH', body: { done } }))

export const deleteTask = (id: string) => request<unknown>(`/api/tasks/${id}`, { method: 'DELETE' })

/* ------------------------------------------------------------- documents */

export const MAX_UPLOAD_MB = 10
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']

export const listDocuments = async () => (await request<ApiDocument[]>('/api/documents')).map(toDocument)

/** Asks the university for the document; it stays open for upload once it arrives. */
export const requestDocument = async (id: string) =>
  toDocument(await request<ApiDocument>(`/api/documents/${id}`, { method: 'PATCH', body: { status: 'requested', action: 'upload' } }))

export const payDocument = async (id: string) => toDocument(await request<ApiDocument>(`/api/documents/${id}/pay`, { method: 'POST' }))

/** Uploads to storage; the server runs the AI check and answers with its results. */
export async function uploadDocument(id: string, file: File, onProgress: (pct: number) => void) {
  // Checked here too, so a wrong file fails before the upload starts.
  if (!ACCEPTED.includes(file.type)) throw new ApiError('Upload a PDF, JPG or PNG file.')
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new ApiError(`This file is over ${MAX_UPLOAD_MB} MB. Compress it or upload a single page.`)
  const r = await upload<{ document: ApiDocument; checks: DocCheck[] }>(`/api/documents/${id}/upload`, file, onProgress)
  return { document: { ...toDocument(r.document), fileName: file.name, checks: r.checks }, checks: r.checks }
}

/* -------------------------------------------------------------- payments */

export const listPayments = async () => (await request<ApiPayment[]>('/api/payments')).map(toPayment)

export const payVisaFee = async (title: string, amount: number) =>
  toPayment(await request<ApiPayment>('/api/payments/pay-visa-fee', { method: 'POST', body: { title, amount_eur: amount } }))

/* --------------------------------------------------------- notifications */

export const listNotifications = async () => (await request<ApiNotification[]>('/api/notifications')).map(toNotification)

export const markNotificationRead = (id: string) => request<ApiNotification>(`/api/notifications/${id}/read`, { method: 'POST' })

export const markAllNotificationsRead = () => request<unknown>('/api/notifications/mark-all-read', { method: 'POST' })

/* ------------------------------------------------------------- assistant */

export const askAssistant = async (message: string) =>
  toChat(await request<ApiChatResponse>('/api/assistant/chat', { method: 'POST', body: { message } }))
