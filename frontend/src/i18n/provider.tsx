import { useEffect, useMemo, type ReactNode } from 'react'
import { usePersistentState } from '@/store/persist'
import { countryName, currentLocale, detectLanguage, languages, setCurrentLanguage, translate, translateOr, type Language } from './core'
import { LanguageContext, type LanguageValue } from './context'

const isLanguage = (v: unknown): v is Language => languages.some((l) => l.value === v)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [stored, setLanguage] = usePersistentState<Language>('language', detectLanguage())
  const language = isLanguage(stored) ? stored : 'EN'
  // Set during render so helpers called by children below already use it.
  setCurrentLanguage(language)

  useEffect(() => {
    document.documentElement.lang = language.toLowerCase()
  }, [language])

  const value = useMemo<LanguageValue>(
    // New function identities per language, so memoised consumers re-render on a switch.
    () => ({
      language,
      locale: currentLocale(),
      setLanguage,
      t: (key, vars) => translate(key, vars),
      tOr: (key, fallback, vars) => translateOr(key, fallback, vars),
      country: (code) => countryName(code),
    }),
    [language, setLanguage],
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
