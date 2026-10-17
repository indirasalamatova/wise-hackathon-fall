import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Printer, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import * as api from '@/lib/api'
import { cn, shortDate } from '@/lib/format'
import type { PrefilledForm } from '@/lib/types'
import { useCase, useToast } from '@/store/context'

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
      className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-rose-100 hover:text-forest-950 print:hidden"
    >
      {copied ? <Check className="size-4 text-ok-700" /> : <Copy className="size-4" />}
    </button>
  )
}

export function FormViewPage() {
  const { id = '' } = useParams()
  const { forms, deleteForm } = useCase()
  const { toast } = useToast()
  const navigate = useNavigate()
  const cached = forms.find((f) => f.id === id)
  const [fetched, setFetched] = useState<{ id: string; form: PrefilledForm | null; error?: string } | null>(null)

  useEffect(() => {
    if (cached) return
    let cancelled = false
    api.getForm(id).then(
      (form) => !cancelled && setFetched({ id, form }),
      (e) => !cancelled && setFetched({ id, form: null, error: e instanceof Error ? e.message : 'Form not found.' }),
    )
    return () => {
      cancelled = true
    }
  }, [id, cached])

  const form = cached ?? (fetched?.id === id ? fetched.form : null)
  if (!form)
    return fetched?.id === id && fetched.error ? (
      <p className="text-sm text-brick-700">{fetched.error}</p>
    ) : (
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading form…
      </p>
    )

  const missing = form.fields.filter((f) => f.status === 'missing').length

  return (
    <>
      <Link to="/app/documents" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-forest-950 print:hidden">
        <ArrowLeft className="size-4" aria-hidden /> Documents
      </Link>
      <PageHeader
        eyebrow={`Prefilled ${shortDate(form.createdAt.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}`}
        title={form.title}
        subtitle={missing ? `${form.fields.length - missing} of ${form.fields.length} fields filled. Complete the highlighted ones on the official form.` : 'Every field is filled. Check them against your documents before you submit.'}
        aside={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden /> Print
            </Button>
            {form.officialUrl && (
              <a href={form.officialUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-forest-950 px-5 text-sm font-semibold text-white hover:bg-forest-700">
                Official form <ExternalLink className="size-4" aria-hidden />
              </a>
            )}
          </div>
        }
      />

      <Card className="p-2 sm:p-4">
        <ul className="divide-y divide-rose-200">
          {form.fields.map((f) => (
            <li key={f.key} className={cn('flex items-center gap-3 rounded-xl px-3 py-3', f.status === 'missing' && 'bg-warn-100/60')}>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">{f.label}</p>
                {f.value ? (
                  <p className="mt-0.5 font-semibold break-words">{f.value}</p>
                ) : (
                  <p className="mt-0.5 text-sm text-warn-700">{f.hint ? `Fill in yourself: ${f.hint}` : 'Fill in yourself'}</p>
                )}
              </div>
              {f.value ? <CopyButton value={f.value} /> : <Badge tone="warn">Missing</Badge>}
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-xs text-muted">
        Values come from your profile, your analysed passport and your plan. Nothing is guessed: if we couldn’t read a value, the field stays empty.
      </p>
      <button
        type="button"
        onClick={async () => {
          try {
            await deleteForm(form.id)
            toast('Form deleted')
            navigate('/app/documents')
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Form wasn’t deleted.', 'error')
          }
        }}
        className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-muted underline underline-offset-2 hover:text-brick-700 print:hidden"
      >
        <Trash2 className="size-3.5" aria-hidden /> Delete this draft
      </button>
    </>
  )
}
