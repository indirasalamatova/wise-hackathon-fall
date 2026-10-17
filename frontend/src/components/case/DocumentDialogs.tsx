import { useRef, useState } from 'react'
import { Check, CircleAlert, FileUp, Loader2, X } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { MAX_UPLOAD_MB } from '@/lib/api'
import { cn, money } from '@/lib/format'
import type { CaseDocument, CheckPhase, DocCheck } from '@/lib/types'
import { useAuth, useCase, useToast } from '@/store/context'

/* --------------------------------------------------------------- Upload */

const phases: { key: CheckPhase; label: string }[] = [
  { key: 'uploading', label: 'Uploading securely' },
  { key: 'checking', label: 'Checking names, dates and format against your case' },
]

export function UploadDialog({ doc, onClose }: { doc: CaseDocument | null; onClose: () => void }) {
  const { uploadDocument } = useCase()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [phase, setPhase] = useState<CheckPhase | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: 'ready' | 'rejected'; checks: DocCheck[]; fileName: string } | null>(null)

  const reset = () => {
    setPhase(null)
    setProgress(0)
    setError(null)
    setResult(null)
  }
  const close = () => {
    if (phase && phase !== 'done') return
    reset()
    onClose()
  }

  const run = async (file: File) => {
    if (!doc) return
    reset()
    setPhase('uploading')
    try {
      const r = await uploadDocument(doc, file, (p, n) => {
        setPhase(p)
        setProgress(n)
      })
      setResult({ ...r, fileName: file.name })
    } catch (e) {
      setPhase(null)
      setError(e instanceof Error ? e.message : 'Upload failed. Try again.')
    }
  }

  const busy = phase !== null && phase !== 'done'
  const phaseIndex = phases.findIndex((p) => p.key === phase)

  return (
    <Dialog
      open={!!doc}
      onClose={close}
      title={result ? (result.status === 'ready' ? 'Document checked' : 'One thing to fix') : `Upload ${doc?.name.toLowerCase() ?? ''}`}
      description={doc?.hint}
    >
      {!phase && !result && (
        <>
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              const f = e.dataTransfer.files[0]
              if (f) run(f)
            }}
            className={cn(
              'flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              drag ? 'border-brick-600 bg-rose-100' : 'border-rose-300 bg-blush hover:border-brick-600',
            )}
          >
            <span className="grid size-12 place-items-center rounded-xl bg-white text-brick-600">
              <FileUp className="size-6" aria-hidden />
            </span>
            <span className="font-semibold">Drop a file here or choose one</span>
            <span className="text-[13px] text-muted">PDF, JPG or PNG, up to {MAX_UPLOAD_MB} MB</span>
          </button>
          <input
            ref={input}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) run(f)
              e.target.value = ''
            }}
          />
          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
          <p className="mt-4 text-[13px] text-muted">
            Files are encrypted and stored in the EU. Tip for the demo: a file named with “old” fails the validity check.
          </p>
        </>
      )}

      {busy && (
        <ol className="flex flex-col gap-4" aria-live="polite">
          {phases.map((p, i) => {
            const done = i < phaseIndex
            const active = i === phaseIndex
            return (
              <li key={p.key} className="flex items-center gap-3.5">
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold',
                    done ? 'bg-forest-950 text-white' : active ? 'bg-brick-600 text-white' : 'bg-rose-100 text-muted',
                  )}
                >
                  {done ? <Check className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : i + 1}
                </span>
                <span className={cn('flex-1 text-[15px]', active ? 'font-semibold' : done ? '' : 'text-muted')}>
                  {p.label}
                  {active && p.key === 'uploading' && ` · ${progress}%`}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {result && (
        <>
          <p className="mb-3 truncate text-sm text-muted">{result.fileName}</p>
          <ul className="flex flex-col divide-y divide-rose-200 rounded-2xl border border-rose-200">
            {result.checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                    c.ok ? 'bg-ok-100 text-ok-700' : 'bg-rose-100 text-brick-600',
                  )}
                >
                  {c.ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{c.label}</span>
                  <span className="block text-[13px] text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end gap-2">
            {result.status === 'rejected' ? (
              <>
                <Button variant="outline" onClick={close}>
                  Do it later
                </Button>
                <Button variant="accent" onClick={reset}>
                  Upload another file
                </Button>
              </>
            ) : (
              <Button onClick={close}>Done</Button>
            )}
          </div>
        </>
      )}
    </Dialog>
  )
}

/* -------------------------------------------------------------- Request */

export function RequestDialog({ doc, onClose }: { doc: CaseDocument | null; onClose: () => void }) {
  const { requestDocument } = useCase()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!doc) return
    setLoading(true)
    setError(null)
    try {
      await requestDocument(doc.id)
      toast('Request sent to your university', 'success')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request didn’t go through. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!doc} onClose={() => !loading && onClose()} title={`Request ${doc?.name.toLowerCase() ?? ''}`} description={doc?.hint}>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2.5 rounded-2xl bg-blush px-5 py-4 text-sm">
        <dt className="text-muted">Sent to</dt>
        <dd className="font-semibold">Registrar, Corvinus University</dd>
        <dt className="text-muted">Purpose</dt>
        <dd className="font-semibold">Residence permit renewal</dd>
        <dt className="text-muted">Language</dt>
        <dd className="font-semibold">Hungarian and English</dd>
      </dl>
      <p className="mt-4 text-sm text-muted">We’ll send the request from your university email and add the certificate to your case when it arrives.</p>
      <FormError error={error} />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="accent" onClick={send} loading={loading}>
          Send request
        </Button>
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ Pay */

export function PayDialog({
  open,
  amount,
  what,
  onClose,
  onPay,
}: {
  open: boolean
  amount: number
  what: string
  onClose: () => void
  /** Performs the payment on the server. */
  onPay: () => Promise<void>
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pay = async () => {
    setLoading(true)
    setError(null)
    try {
      await onPay()
      setPaid(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The payment didn’t go through. Try again.')
    } finally {
      setLoading(false)
    }
  }
  const close = () => {
    if (loading) return
    setPaid(false)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} title={paid ? 'Payment sent' : 'Pay with Wise'} description={what}>
      {paid ? (
        <>
          <p className="text-[15px]">{money(amount)} is on its way. We added it to your payments history.</p>
          <div className="mt-6 flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-forest-950 px-5 py-5 text-white">
            <p className="text-[13px] text-rose-300">You pay</p>
            <p className="font-display mt-1 text-[34px] leading-none font-semibold">{money(amount)}</p>
            <p className="mt-3 text-[13px] text-rose-300">
              From your Wise EUR balance · {money(user?.wiseBalance ?? 0)} available
            </p>
          </div>
          <p className="mt-4 text-sm text-muted">Paid in local currency at the mid-market rate. No hidden fees.</p>
          <FormError error={error} />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={loading}>
              Cancel
            </Button>
            <Button variant="accent" onClick={pay} loading={loading}>
              Pay {money(amount)}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
    </p>
  )
}
