/** Static reference data (countries, visa costs, stages). Everything about the user comes from the API.
 *  Text is stored as translation keys (src/i18n); country names come from Intl.DisplayNames. */
import type { Key } from '@/i18n'
import type { CountryCode, JourneyStage } from './types'

export const journeyStages: JourneyStage[] = [
  { key: 'apply', label: 'stage.apply', description: 'stage.apply.desc' },
  { key: 'arrive', label: 'stage.arrive', description: 'stage.arrive.desc' },
  { key: 'stay', label: 'stage.stay', description: 'stage.stay.desc' },
  { key: 'transition', label: 'stage.transition', description: 'stage.transition.desc' },
]

export const budgetCountries: {
  code: CountryCode
  permit: Key
  living: number
}[] = [
  { code: 'HU', permit: 'permit.HU', living: 780 },
  { code: 'PL', permit: 'permit.PL', living: 860 },
  { code: 'CZ', permit: 'permit.CZ', living: 950 },
  { code: 'ES', permit: 'permit.ES', living: 1080 },
  { code: 'DE', permit: 'permit.DE', living: 1250 },
]

/** `label` takes the country name as {country}. */
export const proofOfFunds: { code: CountryCode; label: Key; required: number }[] = [
  { code: 'HU', label: 'funds.HU', required: 3600 },
  { code: 'DE', label: 'funds.DE', required: 13200 },
  { code: 'NL', label: 'funds.NL', required: 16200 },
  { code: 'ES', label: 'funds.ES', required: 7200 },
]

export interface CostItem {
  id: string
  label: Key
  unit?: number
  qty?: boolean
  official?: boolean
}

/** `label` takes the country name as {country}. */
export const visaOptions: {
  id: string
  code: CountryCode
  label: Key
  items: (CostItem & { defaultOn: boolean; defaultQty?: number })[]
}[] = [
  {
    id: 'de-opportunity',
    code: 'DE',
    label: 'visa.de-opportunity',
    items: [
      { id: 'fee', label: 'cost.fee', unit: 75, official: true, defaultOn: true },
      { id: 'translations', label: 'cost.translations', unit: 25, qty: true, defaultOn: true, defaultQty: 3 },
      { id: 'apostilles', label: 'cost.apostilles', unit: 20, qty: true, defaultOn: false, defaultQty: 2 },
      { id: 'insurance', label: 'cost.insurance', unit: 45, qty: true, defaultOn: true, defaultQty: 12 },
      { id: 'courier', label: 'cost.courier', unit: 35, defaultOn: false },
      { id: 'travel', label: 'cost.travel', unit: 40, defaultOn: true },
    ],
  },
  {
    id: 'hu-renewal',
    code: 'HU',
    label: 'visa.hu-renewal',
    items: [
      { id: 'fee', label: 'cost.renewalFee', unit: 47, official: true, defaultOn: true },
      { id: 'insurance', label: 'cost.insurance', unit: 52, qty: true, defaultOn: true, defaultQty: 12 },
      { id: 'translations', label: 'cost.translations', unit: 22, qty: true, defaultOn: false, defaultQty: 1 },
      { id: 'photo', label: 'cost.photo', unit: 8, defaultOn: true },
    ],
  },
  {
    id: 'nl-orientation',
    code: 'NL',
    label: 'visa.nl-orientation',
    items: [
      { id: 'fee', label: 'cost.fee', unit: 254, official: true, defaultOn: true },
      { id: 'apostilles', label: 'cost.apostilles', unit: 30, qty: true, defaultOn: true, defaultQty: 2 },
      { id: 'insurance', label: 'cost.insurance', unit: 130, qty: true, defaultOn: true, defaultQty: 12 },
      { id: 'travel', label: 'cost.travel', unit: 60, defaultOn: true },
    ],
  },
]

export const destinations: { code: CountryCode; cities: Key }[] = [
  { code: 'DE', cities: 'city.DE' },
  { code: 'HU', cities: 'city.HU' },
  { code: 'NL', cities: 'city.NL' },
  { code: 'AT', cities: 'city.AT' },
  { code: 'PL', cities: 'city.PL' },
  { code: 'ES', cities: 'city.ES' },
  { code: 'FR', cities: 'city.FR' },
  { code: 'IT', cities: 'city.IT' },
]

export const suggestedQuestions: Key[] = ['suggest.1', 'suggest.2', 'suggest.3', 'suggest.4']
