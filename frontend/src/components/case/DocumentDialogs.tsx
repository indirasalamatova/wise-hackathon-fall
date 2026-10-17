import { useRef, useState } from 'react'
import { CircleAlert, FileUp } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Progress } from '@/components/ui/primitives'
import { useI18n } from '@/i18n'
import { MAX_UPLOAD_MB } from '@/lib/api'
import { cn, fileSize, money } from '@/lib/format'
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

export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { uploadDocument } = useCase()
  const { toast } = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('Passport')
  const [expiresOn, setExpiresOn] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const busy = progress !== null
  const reset = () => {
    setFile(null)
    setTitle('')
    setCategory('Passport')
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
    if (!file) return setError(t('upload.chooseFile'))
    setError(null)
    setProgress(0)
    try {
      const doc = await uploadDocument({ file, title: title.trim() || titleFromFile(file.name), category, expiresOn: expiresOn || undefined }, setProgress)
      toast(t('upload.uploaded', { title: doc.title }), 'success')
      reset()
      onClose()
    } catch (err) {
      setProgress(null)
      setError(err instanceof Error ? err.message : t('upload.failed'))
    }
  }

  return (
    <Dialog open={open} onClose={close} title={t('upload.title')} description={t('upload.description', { mb: MAX_UPLOAD_MB })}>
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
            <span className="block truncate font-semibold">{file ? file.name : t('upload.drop')}</span>
            <span className="block text-[13px] text-muted">{file ? fileSize(file.size) : t('upload.dropHint')}</span>
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

        <Field label={t('upload.name')} htmlFor="doc-title">
          <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('upload.namePlaceholder')} maxLength={120} disabled={busy} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('upload.type')} htmlFor="doc-category">
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={busy}
              className="h-12 w-full rounded-2xl border border-rose-300 bg-white px-4 text-[15px] outline-none focus:border-forest-950"
            >
              {documentCategories.map((c) => (
                <option key={c} value={c}>
                  {t(`docCategory.${c}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('upload.expires')} htmlFor="doc-expiry" hint={t('upload.expiresHint')}>
            <Input id="doc-expiry" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} disabled={busy} />
          </Field>
        </div>

        {busy && (
          <div aria-live="polite">
            <Progress value={progress} label={t('upload.progress')} />
            <p className="mt-1.5 text-[13px] text-muted">{progress < 100 ? t('upload.uploading', { pct: progress }) : t('upload.saving')}</p>
          </div>
        )}
        <FormError error={error} />

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="accent" loading={busy} disabled={!file}>
            {t('upload.submit')}
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
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()

  const pay = async () => {
    setLoading(true)
    setError(null)
    try {
      await onPay()
      setPaid(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pay.failed'))
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
    <Dialog open={open} onClose={close} title={paid ? t('pay.recorded') : t('pay.title')} description={what}>
      {paid ? (
        <>
          <p className="text-[15px]">{t('pay.inHistory', { amount: money(amount) })}</p>
          <div className="mt-6 flex justify-end">
            <Button onClick={close}>{t('common.done')}</Button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl bg-forest-950 px-5 py-5 text-white">
            <p className="text-[13px] text-rose-300">{t('pay.youPay')}</p>
            <p className="font-display mt-1 text-[34px] leading-none font-semibold">{money(amount)}</p>
          </div>
          <p className="mt-4 text-sm text-muted">{t('pay.prototype')}</p>
          <FormError error={error} />
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={close} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button variant="accent" onClick={pay} loading={loading}>
              {t('pay.submit', { amount: money(amount) })}
            </Button>
          </div>
        </>
      )}
    </Dialog>
  )
}
