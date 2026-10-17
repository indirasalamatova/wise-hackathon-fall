import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, Copy, Download, ExternalLink, FileText, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import * as api from '@/lib/api'
import { cn, shortDate } from '@/lib/format'
import type { PrefilledForm } from '@/lib/types'
import { useCase, useToast } from '@/store/context'

// Fields the passport's machine-readable zone carries; its check digits verify them.
const MRZ_FIELDS = new Set(['surname', 'given_names', 'document_number', 'nationality', 'date_of_birth', 'expiry_date', 'sex', 'issuing_country'])

function sourceLabel(source?: string | null, edited?: boolean): string {
  if (edited || !source) return edited ? 'Edited by you' : ''
  const [kind, name] = source.split('.')
  const labels: Record<string, string> = {
    passport: MRZ_FIELDS.has(name) ? 'From your passport (machine-readable zone)' : 'From your passport',
    profile: 'From your profile',
    plan: 'From your journey',
    accommodation: 'From your accommodation document',
    enrolment: 'From your enrolment document',
    employment_contract: 'From your employment contract',
    insurance: 'From your insurance document',
  }
  return labels[kind] ?? ''
}

async function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      aria-label="Copy value"
      className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-rose-100 hover:text-forest-950"
    >
      {copied ? <Check className="size-4 text-ok-700" /> : <Copy className="size-4" />}
    </button>
  )
}

export function FormViewPage() {
  const { id = '' } = useParams()
  const { deleteForm, refresh } = useCase()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState<PrefilledForm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<'save' | 'official' | 'sheet' | null>(null)

  useEffect(() => {
    let cancelled = false
    api.getForm(id).then(
      (f) => {
        if (cancelled) return
        setForm(f)
        setDraft(Object.fromEntries(f.fields.map((x) => [x.key, x.value ?? ''])))
      },
      (e) => !cancelled && setError(e instanceof Error ? e.message : 'Form not found.'),
    )
    return () => {
      cancelled = true
    }
  }, [id])

  const changed = useMemo(
    () => (form ? Object.fromEntries(form.fields.filter((f) => (f.value ?? '') !== (draft[f.key] ?? '')).map((f) => [f.key, draft[f.key] || null])) : {}),
    [form, draft],
  )
  const dirty = Object.keys(changed).length > 0

  if (error) return <p className="text-sm text-brick-700">{error}</p>
  if (!form)
    return (
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading form…
      </p>
    )

  const missing = form.fields.filter((f) => !(draft[f.key] ?? '').trim()).length
  const save = async (): Promise<PrefilledForm> => {
    if (!dirty) return form
    setBusy('save')
    try {
      const f = await api.updateForm(form.id, changed)
      setForm(f)
      setDraft(Object.fromEntries(f.fields.map((x) => [x.key, x.value ?? ''])))
      refresh(['forms'])
      return f
    } finally {
      setBusy(null)
    }
  }
  const download = async (kind: 'official' | 'sheet') => {
    setBusy(kind)
    try {
      const f = dirty ? await save() : form // downloads always reflect what's on screen
      setBusy(kind)
      if (kind === 'official') await saveBlob(await api.downloadOfficialForm(f.id), `${f.title}.pdf`)
      else await saveBlob(await api.downloadFormDatasheet(f.id), `${f.title} - data sheet.pdf`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The download didn’t work. Try again.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <Link
        to={form.journeyId ? `/app/journeys/${form.journeyId}` : '/app/documents'}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-forest-950"
      >
        <ArrowLeft className="size-4" aria-hidden /> {form.journeyId ? 'Journey' : 'Documents'}
      </Link>
      <PageHeader
        eyebrow={`Prefilled ${shortDate(form.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}`}
        title={form.title}
        subtitle={
          missing
            ? `${form.fields.length - missing} of ${form.fields.length} fields filled from your documents. Complete the highlighted ones, then download.`
            : 'Every field is filled. Check the values against your passport, then download.'
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-2 sm:p-4">
          <ul className="divide-y divide-rose-200">
            {form.fields.map((f) => {
              const value = draft[f.key] ?? ''
              const empty = !value.trim()
              return (
                <li key={f.key} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', empty && 'bg-warn-100/60')}>
                  <label className="min-w-0 flex-1" htmlFor={`f-${f.key}`}>
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                      <span className="text-muted">{f.label}</span>
                      <span className="text-[11px] text-muted/80">{(f.key in changed && 'Edited by you') || sourceLabel(f.source, f.edited)}</span>
                    </span>
                    <input
                      id={`f-${f.key}`}
                      value={value}
                      maxLength={300}
                      placeholder={f.hint ?? 'Fill in'}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-transparent bg-transparent px-2 -mx-2 text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-warn-700 hover:border-rose-200 focus:border-forest-950 focus:bg-white focus-visible:outline-none"
                    />
                  </label>
                  {empty ? <Badge tone="warn">Missing</Badge> : <CopyButton value={value} />}
                </li>
              )
            })}
          </ul>
        </Card>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-[17px] font-semibold">Download</h2>
            <div className="mt-4 flex flex-col gap-2">
              {form.hasOfficialPdf && (
                <Button variant="accent" loading={busy === 'official'} onClick={() => download('official')}>
                  <Download className="size-4" aria-hidden /> Official form, filled in
                </Button>
              )}
              <Button variant={form.hasOfficialPdf ? 'outline' : 'accent'} loading={busy === 'sheet'} onClick={() => download('sheet')}>
                <FileText className="size-4" aria-hidden /> Data sheet
              </Button>
              {dirty && (
                <Button variant="ghost" loading={busy === 'save'} onClick={() => save().then(() => toast('Changes saved', 'success'))}>
                  Save changes
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">
              {form.hasOfficialPdf
                ? 'The official PDF has your values written in. Print it, tick any boxes left empty, sign it and bring it to your appointment.'
                : 'This application is submitted online. Use the data sheet to copy each value into the official form.'}
            </p>
            {form.officialUrl && (
              <a href={form.officialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2">
                Official source <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </Card>
          <p className="px-2 text-xs text-muted">
            Values come from your analysed documents, profile and journey. Nothing is guessed: if a value couldn’t be read, the field stays empty for you to fill.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await deleteForm(form.id)
                toast('Form deleted')
                navigate(form.journeyId ? `/app/journeys/${form.journeyId}` : '/app/documents')
              } catch (e) {
                toast(e instanceof Error ? e.message : 'Form wasn’t deleted.', 'error')
              }
            }}
            className="inline-flex items-center gap-1.5 px-2 text-[13px] text-muted underline underline-offset-2 hover:text-brick-700"
          >
            <Trash2 className="size-3.5" aria-hidden /> Delete this form
          </button>
        </aside>
      </div>
    </>
  )
}
