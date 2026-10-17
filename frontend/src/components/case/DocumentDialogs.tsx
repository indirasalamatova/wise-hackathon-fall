import { useRef, useState } from 'react'
import { CircleAlert, FileUp } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Progress } from '@/components/ui/primitives'
import { MAX_UPLOAD_MB } from '@/lib/api'
import { cn, fileSize } from '@/lib/format'
import { documentCategories, type DocumentCategory } from '@/lib/types'
import { useCase, useToast } from '@/store/context'

function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
    </p>
  )
}

const titleFromFile = (name: string) => {
  const t = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/* --------------------------------------------------------------- Upload */

export function UploadDialog({
  open,
  onClose,
  defaultCategory = 'Passport',
  defaultTitle = '',
}: {
  open: boolean
  onClose: () => void
  /** Preset when uploading for a specific requirement; remount (key) to change. */
  defaultCategory?: DocumentCategory
  defaultTitle?: string
}) {
  const { uploadDocument } = useCase()
  const { toast } = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState(defaultTitle)
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory)
  const [expiresOn, setExpiresOn] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const busy = progress !== null
  const reset = () => {
    setFile(null)
    setTitle(defaultTitle)
    setCategory(defaultCategory)
    setExpiresOn('')
    setProgress(null)
    setError(null)
  }
  const close = () => {
    if (busy) return
    reset()
    onClose()
  }
  const pick = (f: File) => {
    setFile(f)
    setError(null)
    if (!title) setTitle(titleFromFile(f.name))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Choose a file to upload.')
    setError(null)
    setProgress(0)
    try {
      const doc = await uploadDocument({ file, title: title.trim() || titleFromFile(file.name), category, expiresOn: expiresOn || undefined }, setProgress)
      toast(`${doc.title} uploaded`, 'success')
      reset()
      onClose()
    } catch (err) {
      setProgress(null)
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
    }
  }

  return (
    <Dialog open={open} onClose={close} title="Upload a document" description={`PDF, JPG or PNG, up to ${MAX_UPLOAD_MB} MB. Only you can open it.`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <button
          type="button"
          disabled={busy}
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
            if (f) pick(f)
          }}
          className={cn(
            'flex w-full items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-5 text-left transition-colors',
            drag ? 'border-brick-600 bg-rose-100' : 'border-rose-300 bg-blush hover:border-brick-600',
          )}
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brick-600">
            <FileUp className="size-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{file ? file.name : 'Drop a file here or choose one'}</span>
            <span className="block text-[13px] text-muted">{file ? fileSize(file.size) : 'Your passport, permit, insurance, contracts…'}</span>
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) pick(f)
            e.target.value = ''
          }}
        />

        <Field label="Name" htmlFor="doc-title">
          <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Passport" maxLength={120} disabled={busy} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="doc-category">
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={busy}
              className="h-12 w-full rounded-2xl border border-rose-300 bg-white px-4 text-[15px] outline-none focus:border-forest-950"
            >
              {documentCategories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Expires on" htmlFor="doc-expiry" hint="Optional. We’ll warn you 60 days before.">
            <Input id="doc-expiry" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} disabled={busy} />
          </Field>
        </div>

        {busy && (
          <div aria-live="polite">
            <Progress value={progress} label="Upload progress" />
            <p className="mt-1.5 text-[13px] text-muted">{progress < 100 ? `Uploading · ${progress}%` : 'Saving…'}</p>
          </div>
        )}
        <FormError error={error} />

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" loading={busy} disabled={!file}>
            Upload
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ Pay */

export function PayDialog({
  open,
  amount,
  currency = 'EUR',
  what,
  onClose,
  onPay,
}: {
  open: boolean
  amount: number
  currency?: string
  what: string
  onClose: () => void
  /** Performs the payment on the server. */
  onPay: () => Promise<void>
}) {
  const price = new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
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
    <Dialog open={open} onClose={close} title={paid ? 'Payment recorded' : 'Pay with Wise'} description={what}>
      {paid ? (
        <>
          <p className="text-[15px]">{price} is in your payments history.</p>
          <div className="mt-6 flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-forest-950 px-5 py-5 text-white">
            <p className="text-[13px] text-rose-300">You pay</p>
            <p className="font-display mt-1 text-[34px] leading-none font-semibold">{price}</p>
          </div>
          <p className="mt-4 text-sm text-muted">Prototype: this records the payment in your history. No money moves yet.</p>
          <FormError error={error} />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={loading}>
              Cancel
            </Button>
            <Button variant="accent" onClick={pay} loading={loading}>
              Pay {price}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}
