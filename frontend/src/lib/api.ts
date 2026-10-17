/**
 * Mock backend. Every call resolves after a short delay so loading states are
 * real. Swap these functions for fetch() calls when the API exists; the
 * signatures are what the UI depends on.
 */
import { demoUser } from './mock-data'
import { sleep } from './format'
import type { CaseDocument, ChatMessage, DocCheck, User } from './types'

export class ApiError extends Error {}

/* ------------------------------------------------------------------ auth */

export async function login(email: string, password: string): Promise<User> {
  await sleep(700)
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError('Enter an email like name@example.com.')
  if (password.length < 6) throw new ApiError('Password is at least 6 characters. Check it and try again.')
  if (password === 'wrongpass') throw new ApiError('Email and password don’t match. Try again or reset your password.')
  return { ...demoUser, email }
}

export async function signup(input: { firstName: string; lastName: string; email: string; password: string }): Promise<User> {
  await sleep(900)
  if (!input.firstName.trim() || !input.lastName.trim()) throw new ApiError('Add your first and last name as they appear in your passport.')
  if (!/^\S+@\S+\.\S+$/.test(input.email)) throw new ApiError('Enter an email like name@example.com.')
  if (input.password.length < 8) throw new ApiError('Use at least 8 characters for your password.')
  return {
    ...demoUser,
    id: `u_${Date.now()}`,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email,
    memberSince: new Date().toISOString().slice(0, 10),
  }
}

/* ------------------------------------------------------------- documents */

export const MAX_UPLOAD_MB = 10
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png']

export type CheckPhase = 'uploading' | 'reading' | 'checking' | 'done'

/**
 * Simulates upload + AI check. Files whose name contains "old" or "expired"
 * fail the validity check, so the rejected path can be demoed.
 */
export async function checkDocument(
  doc: CaseDocument,
  file: File,
  onPhase: (p: CheckPhase, progress: number) => void,
): Promise<{ status: 'ready' | 'rejected'; checks: DocCheck[] }> {
  if (!ACCEPTED.includes(file.type)) throw new ApiError('Upload a PDF, JPG or PNG file.')
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new ApiError(`This file is over ${MAX_UPLOAD_MB} MB. Compress it or upload a single page.`)

  for (let p = 0; p <= 100; p += 20) {
    onPhase('uploading', p)
    await sleep(120)
  }
  onPhase('reading', 100)
  await sleep(800)
  onPhase('checking', 100)
  await sleep(1100)

  const stale = /old|expired/i.test(file.name)
  const checks: DocCheck[] = [
    { label: 'Name matches passport', ok: true, detail: 'Aigerim Nurlanovna' },
    { label: `Recognised as ${doc.name.toLowerCase()}`, ok: true, detail: 'All pages present, text is sharp' },
    stale
      ? { label: 'Valid for your new permit', ok: false, detail: 'Ends before 31 Jan 2027. Upload a policy that covers the full permit period.' }
      : { label: 'Valid for your new permit', ok: true, detail: 'Covers the full permit period' },
    { label: 'Accepted format', ok: true, detail: file.type === 'application/pdf' ? 'PDF' : 'Image' },
  ]
  onPhase('done', 100)
  return { status: stale ? 'rejected' : 'ready', checks }
}

export async function requestDocument(): Promise<void> {
  await sleep(900)
}

export async function payWithWise(amount: number): Promise<{ reference: string }> {
  await sleep(1200)
  return { reference: `WISE-${Math.round(amount * 1000).toString(36).toUpperCase()}` }
}

/* ------------------------------------------------------------- assistant */

const answers: { match: RegExp; reply: Omit<ChatMessage, 'id' | 'role'> }[] = [
  {
    match: /renew|still need|permit/i,
    reply: {
      text: 'You still need 3 items:',
      bullets: [
        'Student status certificate — missing',
        'Health insurance — needs update',
        'Fee payment receipt — to pay',
      ],
      footnote: 'Next step: request the certificate by Fri 23 Oct. Submit on Enter Hungary by 13 Nov, then biometrics on 26 Nov.',
    },
  },
  {
    match: /travel|turkey|trip|christmas/i,
    reply: {
      text: 'Yes, you can travel to Turkey over Christmas. Your current card is valid until 31 Jan 2027, so you can leave and re-enter Hungary freely.',
      bullets: [
        'Kazakh passport holders enter Turkey visa-free for up to 30 days',
        'Carry your residence card and passport together',
        'If you travel after 31 Jan, bring your renewal receipt',
      ],
    },
  },
  {
    match: /budget|country|graduat/i,
    reply: {
      text: 'With €1,100 a month and €6,240 saved, Hungary fits best after graduation: a 9-month job-seeking permit and living costs around €780 a month.',
      bullets: ['Poland and Czechia also fit your budget', 'Germany is €150 a month short at your current budget'],
      footnote: 'See the full comparison in Finances.',
    },
  },
  {
    match: /german|money|job-seeker|opportunity/i,
    reply: {
      text: 'For the German Opportunity Card you need to show about €1,100 a month for 12 months, around €13,200 in total.',
      bullets: ['You have €6,240 in Wise, so you are €6,960 short', 'A blocked account or a job offer can replace part of this'],
      footnote: 'Sample figures. Check current amounts with the official source.',
    },
  },
]

export async function askAssistant(question: string): Promise<Omit<ChatMessage, 'id'>> {
  await sleep(1200 + Math.random() * 600)
  const hit = answers.find((a) => a.match.test(question))
  return {
    role: 'assistant',
    ...(hit?.reply ?? {
      text: 'I can help with your renewal, travel, money and what happens after graduation. Try asking what you still need for your permit, or which country fits your budget.',
    }),
  }
}
