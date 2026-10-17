export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

const UNREACHABLE = 'Can’t reach the Unbound server. Check that the backend is running and try again.'

/** FastAPI sends `detail` as a string, or as a list of validation errors on 422. */
function messageFrom(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg)
  if (status === 404) return 'That item no longer exists. Refresh the page.'
  if (status >= 500) return 'The server hit an error. Try again in a moment.'
  return `Request failed (${status}).`
}

async function parse(res: Response) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return text
  }
}

export async function request<T>(
  path: string,
  { method = 'GET', body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new ApiError(UNREACHABLE)
  }
  const data = await parse(res)
  if (!res.ok) throw new ApiError(messageFrom(data, res.status), res.status)
  return data as T
}

/** Multipart upload via XHR, because fetch has no upload progress events. */
export function upload<T>(path: string, file: File, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.upload.onload = () => onProgress(100)
    xhr.onerror = () => reject(new ApiError(UNREACHABLE))
    xhr.onload = () => {
      let data: unknown = null
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null
      } catch {
        /* non-JSON error page */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T)
      else reject(new ApiError(messageFrom(data, xhr.status), xhr.status))
    }
    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}
