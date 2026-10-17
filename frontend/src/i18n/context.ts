import { createContext, useContext } from 'react'
import type { countryName, Language, translate, translateOr } from './core'

export interface LanguageValue {
  language: Language
  locale: string
  setLanguage: (lang: Language) => void
  t: typeof translate
  tOr: typeof translateOr
  country: typeof countryName
}

export const LanguageContext = createContext<LanguageValue | null>(null)

export function useI18n() {
  const v = useContext(LanguageContext)
  if (!v) throw new Error('useI18n must be used inside LanguageProvider')
  return v
}
