import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, Copy, Download, ExternalLink, FileText, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import * as api from '@/lib/api'
import { cn, shortDate } from '@/lib/format'
import type { PrefilledForm } from '@/lib/types'
import { useCase, useToast } from '@/store/context'
import { useI18n, type Key } from '@/i18n'
import { translate } from '@/i18n/core'

// Fields the passport's machine-readable zone carries; its check digits verify them.
const MRZ_FIELDS = new Set(['surname', 'given_names', 'document_number', 'nationality', 'date_of_birth', 'expiry_date', 'sex', 'issuing_country'])

function sourceLabel(source?: string | null, edited?: boolean): string {
  if (edited || !source) return edited ? translate('form.edited') : ''
  const [kind, name] = source.split('.')
  const labels: Record<string, Key> = {
    passport: MRZ_FIELDS.has(name) ? 'form.from.passportMrz' : 'form.from.passport',
    profile: 'form.from.profile',
    plan: 'form.from.plan',
    accommodation: 'form.from.accommodation',
    enrolment: 'form.from.enrolment',
    employment_contract: 'form.from.employment_contract',
    insurance: 'form.from.insurance',
  }
  return labels[kind] ? translate(labels[kind]) : ''
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
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      aria-label={t('form.copy')}
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
  const { t } = useI18n()

  useEffect(() => {
    let cancelled = false
    api.getForm(id).then(
      (f) => {
        if (cancelled) return
        setForm(f)
        setDraft(Object.fromEntries(f.fields.map((x) => [x.key, x.value ?? ''])))
      },
      (e) => !cancelled && setError(e instanceof Error ? e.message : translate('form.notFound')),
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
        <Loader2 className="size-4 animate-spin" aria-hidden /> {t('form.loading')}
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
      else await saveBlob(await api.downloadFormDatasheet(f.id), `${f.title} - ${t('form.datasheetFile')}.pdf`)
    } catch (e) {
      toast(e instanceof Error ? e.message : t('form.downloadFailed'), 'error')
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
        <ArrowLeft className="size-4" aria-hidden /> {form.journeyId ? t('form.backJourney') : t('form.back')}
      </Link>
      <PageHeader
        eyebrow={t('form.prefilled', { date: shortDate(form.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) })}
        title={form.title}
        subtitle={
          missing
            ? t('form.partialDownload', { filled: form.fields.length - missing, total: form.fields.length })
            : t('form.completeDownload')
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
                      <span className="text-[11px] text-muted/80">{(f.key in changed && t('form.edited')) || sourceLabel(f.source, f.edited)}</span>
                    </span>
                    <input
                      id={`f-${f.key}`}
                      value={value}
                      maxLength={300}
                      placeholder={f.hint ?? t('form.fillIn')}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      className="mt-1 h-9 w-full rounded-lg border border-transparent bg-transparent px-2 -mx-2 text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-warn-700 hover:border-rose-200 focus:border-forest-950 focus:bg-white focus-visible:outline-none"
                    />
                  </label>
                  {empty ? <Badge tone="warn">{t('form.missing')}</Badge> : <CopyButton value={value} />}
                </li>
              )
            })}
          </ul>
        </Card>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-[17px] font-semibold">{t('form.download')}</h2>
            <div className="mt-4 flex flex-col gap-2">
              {form.hasOfficialPdf && (
                <Button variant="accent" loading={busy === 'official'} onClick={() => download('official')}>
                  <Download className="size-4" aria-hidden /> {t('form.officialFilled')}
                </Button>
              )}
              <Button variant={form.hasOfficialPdf ? 'outline' : 'accent'} loading={busy === 'sheet'} onClick={() => download('sheet')}>
                <FileText className="size-4" aria-hidden /> {t('form.datasheet')}
              </Button>
              {dirty && (
                <Button variant="ghost" loading={busy === 'save'} onClick={() => save().then(() => toast(t('form.saved'), 'success'))}>
                  {t('form.save')}
                </Button>
              )}
            </div>
            <p className="mt-4 text-xs text-muted">
              {form.hasOfficialPdf
                ? t('form.officialHelp')
                : t('form.onlineHelp')}
            </p>
            {form.officialUrl && (
              <a href={form.officialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2">
                {t('form.officialSource')} <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </Card>
          <p className="px-2 text-xs text-muted">
            {t('form.sourceAll')}
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await deleteForm(form.id)
                toast(t('form.deleted'))
                navigate(form.journeyId ? `/app/journeys/${form.journeyId}` : '/app/documents')
              } catch (e) {
                toast(e instanceof Error ? e.message : t('form.deleteFailed'), 'error')
              }
            }}
            className="inline-flex items-center gap-1.5 px-2 text-[13px] text-muted underline underline-offset-2 hover:text-brick-700"
          >
            <Trash2 className="size-3.5" aria-hidden /> {t('form.deleteForm')}
          </button>
        </aside>
      </div>
    </>
  )
}
