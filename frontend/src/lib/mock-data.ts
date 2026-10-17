/** Static reference data (countries, visa costs, stages). Everything about the user comes from the API. */
import type { CountryCode, JourneyStage } from './types'

export const journeyStages: JourneyStage[] = [
  { key: 'apply', label: 'Apply', description: 'Choosing a pathway and preparing your application.' },
  { key: 'arrive', label: 'Arrive', description: 'Registering your address and collecting your residence card.' },
  { key: 'stay', label: 'Stay', description: 'Keeping your permit valid and renewing it on time.' },
  { key: 'transition', label: 'Transition', description: 'Changing status after your studies or for a new job.' },
]

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
  'I’m a Russian citizen and want to visit Hungary as a tourist',
  'Check my documents and tell me what’s missing',
  'Which countries can you help with right now?',
  'Prefill my application form',
]
