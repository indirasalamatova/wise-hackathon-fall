import { en } from './en'
import { hu } from './hu'
import { ru } from './ru'

export type Language = 'EN' | 'HU' | 'RU'

/** A plain string, or plural forms picked with Intl.PluralRules from `vars.count`. */
export type Entry = string | (Partial<Record<Intl.LDMLPluralRule, string>> & { other: string })
export type Key = keyof typeof en
export type Dict = Record<Key, Entry>
export type Vars = Record<string, string | number>

export const languages: { value: Language; label: string; locale: string; flag: 'GB' | 'HU' | 'RU' }[] = [
  { value: 'EN', label: 'English', locale: 'en-GB', flag: 'GB' },
  { value: 'HU', label: 'Magyar', locale: 'hu-HU', flag: 'HU' },
  { value: 'RU', label: 'Русский', locale: 'ru-RU', flag: 'RU' },
]

const dicts: Record<Language, Dict> = { EN: en, HU: hu, RU: ru }

let current: Language = 'EN'

/** Set by LanguageProvider during render, so plain helpers (format.ts, http.ts) follow the UI language. */
export function setCurrentLanguage(lang: Language) {
  current = lang
}

export const currentLanguage = () => current
export const currentLocale = () => languages.find((l) => l.value === current)!.locale

const plurals = new Map<string, Intl.PluralRules>()
function pluralRules(locale: string) {
  let r = plurals.get(locale)
  if (!r) plurals.set(locale, (r = new Intl.PluralRules(locale)))
  return r
}

export function isKey(key: string): key is Key {
  return key in en
}

/** Translates `key` into the current language, falling back to English. */
export function translate(key: Key, vars?: Vars): string {
  const entry = dicts[current][key] ?? en[key]
  let text: string
  if (typeof entry === 'string') text = entry
  else {
    const form = pluralRules(currentLocale()).select(Number(vars?.count ?? 0))
    text = entry[form] ?? entry.other
  }
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : text
}

/** Translates a key built from server data (a category, a purpose); unknown values are shown as they are. */
export function translateOr(key: string, fallback: string, vars?: Vars): string {
  return isKey(key) ? translate(key, vars) : fallback
}

/** "Germany", "Németország", "Германия". */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames([currentLocale()], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export function detectLanguage(): Language {
  const nav = typeof navigator === 'undefined' ? '' : navigator.language.toLowerCase()
  if (nav.startsWith('hu')) return 'HU'
  if (nav.startsWith('ru')) return 'RU'
  return 'EN'
}
