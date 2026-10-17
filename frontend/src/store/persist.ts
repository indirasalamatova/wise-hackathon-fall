import { useEffect, useState } from 'react'

const PREFIX = 'unbound:'
/** Device preferences that survive logging out. */
const KEEP = new Set(['language'])

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** useState that survives reloads. Storage failures fall back to memory. */
export function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, fallback))
  useEffect(() => {
    try {
      if (value === null) localStorage.removeItem(PREFIX + key)
      else localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      /* private mode or quota: keep in memory only */
    }
  }, [key, value])
  return [value, setValue] as const
}

export function clearPersisted() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX) && !KEEP.has(k.slice(PREFIX.length)))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
