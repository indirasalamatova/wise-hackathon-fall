import type {
  AppNotification,
  CaseDocument,
  CountryCode,
  JourneyStage,
  Payment,
  Settings,
  Task,
  User,
} from './types'

export const demoUser: User = {
  id: 'u_aigerim',
  firstName: 'Aigerim',
  lastName: 'Nurlanovna',
  email: 'aigerim@example.com',
  memberSince: '2025-07-01',
  citizenship: 'KZ',
  passport: { last4: '4417', validUntil: '2031-03-12' },
  address: 'Budapest VIII, Hungary',
  status: 'Residence permit · study, to 31 Jan 2027',
  studies: 'BSc Business Informatics, to Jun 2029',
}

export const caseSummary = {
  permit: 'Study permit',
  permitExpires: '2027-01-31',
  country: 'HU' as CountryCode,
  countryName: 'Hungary',
  since: 'Sep 2025',
}

export const journeyStages: JourneyStage[] = [
  { key: 'apply', label: 'Apply', when: 'Mar–Jul 2025' },
  { key: 'arrive', label: 'Arrive', when: 'Sep 2025' },
  { key: 'stay', label: 'Stay', when: 'Now' },
  { key: 'transition', label: 'Transition', when: 'From Jun 2028' },
]

export const currentStageIndex = 2

export const renewalSteps = [
  { label: 'Case confirmed' },
  { label: 'Collect documents' },
  { label: 'AI document check' },
  { label: 'Submit on Enter Hungary', when: '13 Nov' },
  { label: 'Biometrics', when: '26 Nov' },
  { label: 'Decision', when: '~21 days' },
]

export const initialDocuments: CaseDocument[] = [
  {
    id: 'd_student',
    name: 'Student status certificate',
    hint: 'Issued within 30 days of submitting',
    status: 'missing',
    action: 'request',
  },
  {
    id: 'd_insurance',
    name: 'Health insurance certificate',
    hint: 'Current policy ends 30 Nov',
    status: 'needs_update',
    action: 'upload',
  },
  {
    id: 'd_fee',
    name: 'Fee payment receipt',
    hint: 'HUF 18,000 · pay when you submit',
    status: 'to_pay',
    action: 'pay',
  },
  { id: 'd_passport', name: 'Passport', hint: 'Valid until 12 Mar 2031', status: 'ready', fileName: 'passport-scan.pdf' },
  { id: 'd_bank', name: 'Bank statement', hint: 'Pulled from Wise, last 3 months', status: 'ready', fileName: 'wise-statement-sep.pdf' },
  { id: 'd_lease', name: 'Lease agreement', hint: 'Signed, with landlord ID', status: 'ready', fileName: 'lease-budapest.pdf' },
  { id: 'd_photo', name: 'Biometric photo', hint: '35 × 45 mm, taken within 6 months', status: 'ready', fileName: 'photo.jpg' },
  { id: 'd_form', name: 'Application form', hint: 'Filled from your case details', status: 'missing', action: 'upload' },
]

export const initialTasks: Task[] = [
  { id: 't1', title: 'Request student status certificate', category: 'Documents', due: '2026-10-23', done: false },
  { id: 't2', title: 'Extend health insurance to Jan 2028', category: 'Documents', due: '2026-11-06', done: false },
  { id: 't3', title: 'Pay HUF 18,000 renewal fee with Wise', category: 'Finances', due: '2026-11-13', done: false },
  { id: 't4', title: 'Submit renewal on Enter Hungary', category: 'Journey', due: '2026-11-13', done: false },
  { id: 't5', title: 'Biometrics appointment, 10:30', category: 'Appointment', due: '2026-11-26', done: false },
  { id: 't6', title: 'Upload passport scan', category: 'Documents', due: '2026-10-02', done: true },
]

export const initialNotifications: AppNotification[] = [
  { id: 'n1', kind: 'deadline', title: 'Certificate due in 7 days', body: 'Request it by Fri 23 Oct.', time: '9:00', unread: true },
  { id: 'n2', kind: 'money', title: 'Bank statement checked', body: 'Your Wise balance meets the minimum.', time: '2h ago', unread: true },
  { id: 'n3', kind: 'document', title: 'Insurance ends too early', body: 'Policy ends 30 Nov, before the new permit.', time: 'Yesterday', unread: true },
  { id: 'n4', kind: 'travel', title: 'Planning a December trip?', body: 'After 31 Jan bring your renewal receipt.', time: 'Tue', unread: false },
]

export const payments: Payment[] = [
  { id: 'p1', date: '2026-11-13', what: 'Permit renewal fee', amount: 47, status: 'upcoming' },
  { id: 'p2', date: '2026-11-06', what: 'Health insurance', amount: 620, status: 'upcoming' },
  { id: 'p3', date: '2026-09-01', what: 'Rent, September', amount: 520, status: 'paid' },
  { id: 'p4', date: '2026-07-15', what: 'Translations (3)', amount: 75, status: 'paid' },
  { id: 'p5', date: '2025-07-02', what: 'Study visa fee', amount: 110, status: 'paid' },
  { id: 'p6', date: '2025-06-20', what: 'Tuition deposit', amount: 1500, status: 'paid' },
]

export const wise = {
  available: 6240,
  balances: 'EUR + HUF balances',
}

export const budgetCountries: {
  code: CountryCode
  name: string
  permit: string
  living: number
}[] = [
  { code: 'HU', name: 'Hungary', permit: 'Job-seeking permit (9 months)', living: 780 },
  { code: 'PL', name: 'Poland', permit: 'Residence to look for work', living: 860 },
  { code: 'CZ', name: 'Czechia', permit: 'Job-seeker residence', living: 950 },
  { code: 'ES', name: 'Spain', permit: 'Job-search residence (12 mo)', living: 1080 },
  { code: 'DE', name: 'Germany', permit: 'Opportunity Card', living: 1250 },
]

export const proofOfFunds: { code: CountryCode; label: string; required: number }[] = [
  { code: 'HU', label: 'Hungary · study renewal', required: 3600 },
  { code: 'DE', label: 'Germany · Opportunity Card', required: 13200 },
  { code: 'NL', label: 'Netherlands · orientation year', required: 16200 },
  { code: 'ES', label: 'Spain · job-search residence', required: 7200 },
]

export interface CostItem {
  id: string
  label: string
  unit?: number
  qty?: boolean
  official?: boolean
}

export const visaOptions: {
  id: string
  code: CountryCode
  label: string
  items: (CostItem & { defaultOn: boolean; defaultQty?: number })[]
}[] = [
  {
    id: 'de-opportunity',
    code: 'DE',
    label: 'Germany · Opportunity Card',
    items: [
      { id: 'fee', label: 'Application fee', unit: 75, official: true, defaultOn: true },
      { id: 'translations', label: 'Certified translations', unit: 25, qty: true, defaultOn: true, defaultQty: 3 },
      { id: 'apostilles', label: 'Apostilles', unit: 20, qty: true, defaultOn: false, defaultQty: 2 },
      { id: 'insurance', label: 'Health insurance (months)', unit: 45, qty: true, defaultOn: true, defaultQty: 12 },
      { id: 'courier', label: 'Courier for originals', unit: 35, defaultOn: false },
      { id: 'travel', label: 'Travel to appointment', unit: 40, defaultOn: true },
    ],
  },
  {
    id: 'hu-renewal',
    code: 'HU',
    label: 'Hungary · study permit renewal',
    items: [
      { id: 'fee', label: 'Renewal fee (HUF 18,000)', unit: 47, official: true, defaultOn: true },
      { id: 'insurance', label: 'Health insurance (months)', unit: 52, qty: true, defaultOn: true, defaultQty: 12 },
      { id: 'translations', label: 'Certified translations', unit: 22, qty: true, defaultOn: false, defaultQty: 1 },
      { id: 'photo', label: 'Biometric photo', unit: 8, defaultOn: true },
    ],
  },
  {
    id: 'nl-orientation',
    code: 'NL',
    label: 'Netherlands · orientation year',
    items: [
      { id: 'fee', label: 'Application fee', unit: 254, official: true, defaultOn: true },
      { id: 'apostilles', label: 'Apostilles', unit: 30, qty: true, defaultOn: true, defaultQty: 2 },
      { id: 'insurance', label: 'Health insurance (months)', unit: 130, qty: true, defaultOn: true, defaultQty: 12 },
      { id: 'travel', label: 'Travel to appointment', unit: 60, defaultOn: true },
    ],
  },
]

export const destinations: { code: CountryCode; name: string; cities: string }[] = [
  { code: 'DE', name: 'Germany', cities: 'Berlin, Munich…' },
  { code: 'HU', name: 'Hungary', cities: 'Budapest, Szeged…' },
  { code: 'NL', name: 'Netherlands', cities: 'Amsterdam, Delft…' },
  { code: 'AT', name: 'Austria', cities: 'Vienna, Graz…' },
  { code: 'PL', name: 'Poland', cities: 'Warsaw, Kraków…' },
  { code: 'ES', name: 'Spain', cities: 'Madrid, Barcelona…' },
  { code: 'FR', name: 'France', cities: 'Paris, Lyon…' },
  { code: 'IT', name: 'Italy', cities: 'Milan, Bologna…' },
]

export const suggestedQuestions = [
  'What do I still need for my permit renewal?',
  'Can I travel to Turkey over Christmas?',
  'Which country fits my budget after graduation?',
  'How much money do I need for a German job-seeker visa?',
]
