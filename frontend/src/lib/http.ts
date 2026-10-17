import { translate } from '@/i18n/core'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

let authToken: string | null = null
let onUnauthorized: () => void = () => {}

/** Set by the auth store; every request sends it as a bearer token. */
export function setAuthToken(token: string | null) {
  authToken = token
}

/** Called when the server rejects the token (expired, account deleted). */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

const authHeaders = (): Record<string, string> => (authToken ? { Authorization: `Bearer ${authToken}` } : {})

/** FastAPI sends `detail` as a string, or as a list of validation errors on 422. */
function messageFrom(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
  if (status === 404) return translate('error.notFound')
  if (status >= 500) return translate('error.server')
  return translate('error.requestFailed', { status })
}

async function parse(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...authHeaders(), ...init.headers } })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(translate('error.unreachable'))
  }
  if (!res.ok) {
    const data = await parse(res)
    if (res.status === 401 && authToken) {
      // Drop the token first so the other in-flight requests' 401s don't log out again.
      authToken = null
      onUnauthorized()
    }
    throw new ApiError(messageFrom(data, res.status), res.status)
  }
  return res
}

export async function request<T>(
  path: string,
  { method = 'GET', body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const res = await send(path, {
    method,
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return (await parse(res)) as T
}

/**
 * POST and read a server-sent event stream (`data: {...}` lines).
 * EventSource can't POST or send a bearer token, so this reads the fetch body.
 */
export async function streamEvents<E>(path: string, body: unknown, onEvent: (e: E) => void, signal?: AbortSignal): Promise<void> {
  const res = await send(path, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
  })
  if (!res.body) throw new ApiError(translate('error.noStream'))
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let cut: number
    while ((cut = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, cut)
      buffer = buffer.slice(cut + 2)
      const data = chunk
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n')
      if (data) onEvent(JSON.parse(data) as E)
    }
  }
}

export async function getBlob(path: string): Promise<Blob> {
  return (await send(path, {})).blob()
}

/** Multipart upload via XHR, because fetch has no upload progress events. */
export function upload<T>(path: string, form: FormData, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`)
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onerror = () => reject(new ApiError(translate('error.unreachable')))
    xhr.onload = () => {
      let data: unknown = null
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data as T)
      if (xhr.status === 401 && authToken) {
        authToken = null
        onUnauthorized()
      }
      reject(new ApiError(messageFrom(data, xhr.status), xhr.status))
    }
    xhr.send(form)
  })
}
