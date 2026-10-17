import { useState } from 'react'
import { BadgeCheck, ChevronDown, CircleAlert, Info, Loader2, Sparkles, TriangleAlert } from 'lucide-react'
import { cn, shortDate } from '@/lib/format'
import type { CaseDocument, DocumentIssue } from '@/lib/types'
import { useCase, useToast } from '@/store/context'

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Name',
  document_number: 'Number',
  nationality: 'Nationality',
  issuing_country: 'Issued by',
  date_of_birth: 'Date of birth',
  issue_date: 'Issued',
  expiry_date: 'Expires',
  sex: 'Sex',
  amount: 'Amount',
  currency: 'Currency',
}
const DATE_FIELDS = new Set(['date_of_birth', 'issue_date', 'expiry_date'])

const issueIcon = { error: CircleAlert, warning: TriangleAlert, info: Info } as const
const issueColor = { error: 'text-brick-700', warning: 'text-warn-700', info: 'text-muted' } as const

function Issues({ issues }: { issues: DocumentIssue[] }) {
  const order = { error: 0, warning: 1, info: 2 }
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {[...issues]
        .sort((a, b) => order[a.severity] - order[b.severity])
        .map((i, n) => {
          const Icon = issueIcon[i.severity]
          return (
            <li key={n} className={cn('flex items-start gap-1.5 text-xs', issueColor[i.severity])}>
              <Icon className="mt-px size-3.5 shrink-0" aria-hidden /> {i.message}
            </li>
          )
        })}
    </ul>
  )
}

/** What the document agent read, after the backend rules normalised and checked it. */
export function AnalysisPanel({ doc }: { doc: CaseDocument }) {
  const { reanalyzeDocument } = useCase()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const a = doc.analysis

  const start = async () => {
    setStarting(true)
    try {
      await reanalyzeDocument(doc.id)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Analysis didn’t start. Try again.', 'error')
    } finally {
      setStarting(false)
    }
  }
  const analyzeButton = (label: string) => (
    <button type="button" onClick={start} disabled={starting} className="inline-flex items-center gap-1 font-semibold text-forest-950 underline underline-offset-2 disabled:opacity-50">
      {starting ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Sparkles className="size-3" aria-hidden />} {label}
    </button>
  )

  if (!a) return <p className="mt-1 text-xs text-muted">Not analysed yet. {analyzeButton('Analyze')}</p>
  if (a.status === 'pending')
    return (
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted" role="status">
        <Loader2 className="size-3 animate-spin" aria-hidden /> Reading the document…
      </p>
    )
  if (a.status !== 'done')
    return (
      <p className="mt-1 text-xs text-brick-700">
        {a.error ?? 'Analysis failed.'} {a.status === 'failed' && analyzeButton('Try again')}
      </p>
    )

  const fields = Object.entries(a.fields).filter(([k, v]) => FIELD_LABELS[k] && v)
  const errors = a.issues.filter((i) => i.severity === 'error').length
  const warnings = a.issues.filter((i) => i.severity === 'warning').length

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex max-w-full items-center gap-1.5 text-left text-xs text-muted hover:text-forest-950">
        {a.fields.mrz_verified ? (
          <BadgeCheck className="size-3.5 shrink-0 text-ok-700" aria-label="Machine-readable zone verified" />
        ) : (
          <Sparkles className="size-3.5 shrink-0 text-brick-600" aria-hidden />
        )}
        <span className="truncate">{a.summary}</span>
        {errors > 0 && <span className="shrink-0 font-semibold text-brick-700">· {errors} problem{errors > 1 && 's'}</span>}
        {!errors && warnings > 0 && <span className="shrink-0 font-semibold text-warn-700">· {warnings} to check</span>}
        <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="animate-fade-in mt-2 rounded-xl bg-blush px-3.5 py-3">
          {fields.length > 0 && (
            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
              {fields.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{FIELD_LABELS[k]}</dt>
                  <dd className="font-semibold">{DATE_FIELDS.has(k) ? shortDate(String(v), { day: 'numeric', month: 'short', year: 'numeric' }) : String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
          {a.fields.mrz_verified && <p className="mt-2 text-xs text-ok-700">Machine-readable zone check digits verified.</p>}
          {a.issues.length > 0 && <Issues issues={a.issues} />}
          <p className="mt-2 text-xs text-muted">{analyzeButton('Analyze again')}</p>
        </div>
      )}
    </div>
  )
}
