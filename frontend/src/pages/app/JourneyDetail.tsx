import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft, CalendarPlus, Check, Circle, CircleAlert, CornerDownRight, ExternalLink, FileText, Loader2, Mail,
  MessageSquareText, Upload, Wallet,
} from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Card, CardTitle, Checkbox, Input, PageHeader, Progress } from '@/components/ui/primitives'
import { PayDialog, UploadDialog } from '@/components/case/DocumentDialogs'
import * as api from '@/lib/api'
import { cn, relativeDays, shortDate } from '@/lib/format'
import { documentCategories, type AutomationAction, type DocumentCategory, type JourneyDetail, type JourneyStatus } from '@/lib/types'
import { useCase, useToast } from '@/store/context'
import { purposeLabel, statusMeta } from '@/components/case/journey-meta'

const fmt = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount))
const totals = (t: Record<string, string>) => {
  const e = Object.entries(t)
  return e.length ? e.map(([c, a]) => fmt(a, c)).join(' + ') : '—'
}
const day = (iso?: string) => (iso ? shortDate(iso.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' }) : '')

const reqIcon = { satisfied: Check, problem: CircleAlert, missing: Circle } as const
const reqColor = { satisfied: 'bg-forest-950 text-white', problem: 'bg-brick-600 text-white', missing: 'bg-rose-100 text-muted' } as const

function Dates({ j, onSave }: { j: JourneyDetail; onSave: (p: { travel_date: string | null; stay_days: number | null }) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [travel, setTravel] = useState(j.travelDate ?? '')
  const [stay, setStay] = useState(j.stayDays ? String(j.stayDays) : '')
  const [saving, setSaving] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-semibold underline underline-offset-2">
        {j.travelDate ? 'Change dates' : 'Add travel dates'}
      </button>
      <Dialog open={open} onClose={() => !saving && setOpen(false)} title="Travel dates" description="Due dates of open steps are recalculated.">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            try {
              await onSave({ travel_date: travel || null, stay_days: stay ? Number(stay) : null })
              setOpen(false)
            } finally {
              setSaving(false)
            }
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Arrival
            <Input type="date" value={travel} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setTravel(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Length of stay (days)
            <Input type="number" min={1} max={3650} value={stay} onChange={(e) => setStay(e.target.value)} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save dates
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function JourneyDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { refresh } = useCase()
  const { toast } = useToast()
  const [j, setJ] = useState<JourneyDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [paying, setPaying] = useState<AutomationAction | null>(null)
  const [uploading, setUploading] = useState<{ category: DocumentCategory; title: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(() => api.getJourney(id).then(setJ, (e) => setError(e instanceof Error ? e.message : 'Journey not found.')), [id])
  useEffect(() => {
    load()
  }, [load])

  const act = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key)
    try {
      await fn()
      await load()
      refresh(['journeys', 'tasks', 'forms', 'payments'])
      if (done) toast(done, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That didn’t work. Try again.', 'error')
    } finally {
      setBusy(null)
    }
  }

  if (error) return <p className="text-sm text-brick-700">{error}</p>
  if (!j)
    return (
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading journey…
      </p>
    )

  const setStatus = (status: JourneyStatus, msg: string) => act(`status:${status}`, () => api.updateJourney(j.id, { status }), msg)
  const meta = statusMeta[j.status]
  const pct = j.progress.total ? (j.progress.done / j.progress.total) * 100 : 0
  const allDone = j.progress.total > 0 && j.progress.done === j.progress.total
  const f = j.finances
  const ask = (prompt?: string) => navigate(`/app?journey=${j.id}${prompt ? `&prompt=${encodeURIComponent(prompt)}` : ''}`)

  const runAction = async (a: AutomationAction) => {
    if (a.kind === 'prefill') {
      if (a.formId) return navigate(`/app/forms/${a.formId}`)
      setBusy(a.key)
      try {
        const form = await api.prefillJourneyForm(j.id, a.key)
        refresh(['forms'])
        navigate(`/app/forms/${form.id}`)
      } catch (e) {
        toast(e instanceof Error ? e.message : 'The form couldn’t be prefilled.', 'error')
        setBusy(null)
      }
    } else if (a.kind === 'pay') setPaying(a)
    else if (a.kind === 'calendar')
      act('calendar', async () => {
        const url = URL.createObjectURL(await api.journeyCalendar(j.id))
        const link = document.createElement('a')
        link.href = url
        link.download = `${j.title}.ics`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }, 'Calendar file downloaded')
    else if (a.kind === 'email') window.location.assign(`mailto:?subject=${encodeURIComponent(a.subject ?? '')}&body=${encodeURIComponent(a.body ?? '')}`)
    else if (a.kind === 'upload') {
      const category = (documentCategories as readonly string[]).includes(a.category ?? '') ? (a.category as DocumentCategory) : 'Other'
      setUploading({ category, title: a.title.replace(/^Upload: /, '') })
    }
  }
  const actionIcon = { prefill: FileText, pay: Wallet, calendar: CalendarPlus, email: Mail, upload: Upload } as const

  return (
    <>
      <Link to="/app/journeys" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-forest-950">
        <ArrowLeft className="size-4" aria-hidden /> Journeys
      </Link>
      <PageHeader
        eyebrow={`${meta.label} · ${purposeLabel(j.purpose)}`}
        title={j.title}
        subtitle={[
          j.visaType,
          j.travelDate ? `${day(j.travelDate)}${j.tripEnd ? ` – ${day(j.tripEnd)}` : ''}` : 'No travel date yet',
        ].join(' · ')}
        aside={
          <div className="flex flex-wrap gap-2">
            <Button variant="accent" onClick={() => ask()}>
              <MessageSquareText className="size-4" aria-hidden /> Ask about this journey
            </Button>
            {j.status === 'planning' && (
              <Button variant="outline" loading={busy === 'status:active'} onClick={() => setStatus('active', 'Journey started')}>
                Start journey
              </Button>
            )}
            {j.status === 'active' && (
              <Button variant="outline" loading={busy === 'status:completed'} onClick={() => setStatus('completed', 'Journey completed')}>
                Mark complete
              </Button>
            )}
            {(j.status === 'completed' || j.status === 'archived') && (
              <Button variant="outline" loading={busy === 'status:active'} onClick={() => setStatus('active', 'Journey reopened')}>
                Reopen
              </Button>
            )}
          </div>
        }
      />

      {j.parent && (
        <p className="-mt-3 mb-4 flex items-center gap-1.5 text-sm text-muted">
          <CornerDownRight className="size-4" aria-hidden /> Continues <Link to={`/app/journeys/${j.parent.id}`} className="font-semibold text-forest-950 underline underline-offset-2">{j.parent.title}</Link>
        </p>
      )}
      {j.guideline.status !== 'current' && (
        <p className="mb-4 rounded-xl bg-warn-100 px-4 py-3 text-sm text-warn-700">
          Official information about {j.destinationName} is being updated. Requirements and fees below are from{' '}
          {j.guideline.verifiedAt ? `the last check on ${day(j.guideline.verifiedAt)}` : 'an earlier version'}; check them again before you apply.
        </p>
      )}
      {allDone && j.status !== 'completed' && (
        <Card tone="dark" className="mb-4 flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-sm">Every step is done. Mark the journey complete, or continue with a next leg.</p>
          <div className="flex gap-2">
            <Button variant="accent" size="sm" onClick={() => setStatus('completed', 'Journey completed')}>
              Mark complete
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Card className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle>Pathway</CardTitle>
              <span className="flex items-center gap-3 text-sm text-muted">
                {j.progress.done} of {j.progress.total} done
                <Dates
                  j={j}
                  onSave={(p) => act('dates', () => api.updateJourney(j.id, p), 'Dates saved; due dates updated')}
                />
              </span>
            </div>
            <Progress value={pct} className="mt-4 mb-2" label="Journey progress" />
            <ol className="divide-y divide-rose-200">
              {j.steps.map((s) => (
                <li key={s.id} className="flex items-start gap-3.5 py-3">
                  <div className="pt-0.5">
                    <Checkbox
                      size="lg"
                      checked={s.done}
                      label={s.title}
                      onChange={(done) => act(`step:${s.id}`, () => api.setTaskDone(s.id, done))}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[15px] font-semibold', s.done && 'text-muted line-through')}>{s.title}</p>
                    {s.description && <p className="text-[13px] text-muted">{s.description}</p>}
                  </div>
                  {s.dueDate && !s.done && (
                    <span className="shrink-0 text-right text-xs text-muted">
                      {day(s.dueDate)}
                      <br />
                      {relativeDays(s.dueDate)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          <Card className="p-6">
            <CardTitle>Documents needed</CardTitle>
            <ul className="mt-4 flex flex-col gap-3">
              {j.requirements.map((r) => {
                const Icon = reqIcon[r.status]
                return (
                  <li key={r.key} className="flex items-start gap-3">
                    <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', reqColor[r.status])}>
                      <Icon className="size-3" strokeWidth={3} aria-label={r.status} />
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className={cn(r.status !== 'satisfied' && 'font-semibold')}>
                        {r.title}
                        {!r.mandatory && <span className="font-normal text-muted"> · optional</span>}
                      </p>
                      {r.status === 'satisfied' && r.matched_document && <p className="text-xs text-muted">On file: {r.matched_document}</p>}
                      {r.problems.flatMap((p) => p.problems).map((p, i) => (
                        <p key={i} className="text-xs text-brick-700">
                          {p}
                        </p>
                      ))}
                    </div>
                    {r.source_url && (
                      <a href={r.source_url} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-muted underline underline-offset-2 hover:text-forest-950" title="Official source">
                        Source
                      </a>
                    )}
                  </li>
                )
              })}
              {j.requirements.length === 0 && <p className="text-sm text-muted">No requirement information yet.</p>}
            </ul>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-6">
            <CardTitle>Money</CardTitle>
            <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Official fees</dt>
              <dd className="text-right font-semibold">{totals(f.fees.mandatory_totals)}</dd>
              <dt className="text-muted">Paid</dt>
              <dd className="text-right font-semibold">{totals(f.paid)}</dd>
              <dt className="text-muted">Still to pay</dt>
              <dd className="text-right font-semibold">{totals(f.remaining)}</dd>
              {f.living_budget_eur && (
                <>
                  <dt className="text-muted">Living costs ({f.stay_months} mo at your budget)</dt>
                  <dd className="text-right font-semibold">{fmt(f.living_budget_eur, 'EUR')}</dd>
                </>
              )}
            </dl>
            {Object.keys(f.fees.mandatory_totals).length === 0 && f.fees.items.some((x) => x.amount) && (
              <div className="mt-3 rounded-xl bg-blush px-3.5 py-2.5 text-xs">
                <p className="font-semibold">You pay one of these, depending on how you apply:</p>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {f.fees.items
                    .filter((x) => x.amount)
                    .map((x) => (
                      <li key={x.title} className="flex justify-between gap-3">
                        <span className="text-muted">{x.note?.replace(/^For /, '') || x.title}</span>
                        <span className="shrink-0 font-semibold">{fmt(x.amount!, x.currency)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {f.fees.amounts_not_fixed.length > 0 && (
              <p className="mt-2 text-xs text-muted">Plus {f.fees.amounts_not_fixed.join(', ').toLowerCase()} (amount varies)</p>
            )}
            {f.proof_of_funds && (
              <p className={cn('mt-3 rounded-xl px-3.5 py-2.5 text-xs', f.proof_of_funds.covered ? 'bg-ok-100 text-ok-700' : 'bg-warn-100 text-warn-700')}>
                {f.proof_of_funds.requirement}: {fmt(f.proof_of_funds.required, f.proof_of_funds.currency)} required.{' '}
                {f.proof_of_funds.covered === null
                  ? 'Compare with your savings in that currency.'
                  : f.proof_of_funds.covered
                    ? 'Your savings cover it.'
                    : `Your savings are short by ${fmt(f.proof_of_funds.short_by ?? '0', 'EUR')}.`}
              </p>
            )}
            <Link to="/app/finances" className="mt-3 inline-block text-[13px] font-semibold underline underline-offset-2">
              Update budget and savings
            </Link>
          </Card>

          <Card className="p-6">
            <CardTitle>Unbound can do this for you</CardTitle>
            <ul className="mt-3 flex flex-col gap-1">
              {j.automation.map((a) => {
                const Icon = actionIcon[a.kind]
                return (
                  <li key={a.key}>
                    <button
                      type="button"
                      disabled={busy === a.key || (a.kind === 'pay' && a.done)}
                      onClick={() => runAction(a)}
                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm hover:bg-blush disabled:opacity-60"
                    >
                      <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg', a.done ? 'bg-ok-100 text-ok-700' : 'bg-rose-100 text-brick-600')}>
                        {busy === a.key ? <Loader2 className="size-4 animate-spin" /> : a.done ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{a.title}</span>
                        {a.kind === 'pay' && a.amount && (
                          <span className="text-xs text-muted">
                            {a.done ? 'Paid' : fmt(a.amount, a.currency ?? 'EUR')}
                            {!a.done && a.note && ` · ${a.note.replace(/^For /, '').replace(/^./, (c) => c.toLowerCase())}`}
                          </span>
                        )}
                        {a.kind === 'prefill' && a.done && <span className="text-xs text-muted">Open the prefilled form</span>}
                        {a.kind === 'email' && <span className="text-xs text-muted">Opens a drafted email</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
              {j.automation.length === 0 && <p className="text-sm text-muted">Nothing to automate yet.</p>}
            </ul>
          </Card>

          <Card className="p-6">
            <CardTitle>Conversations</CardTitle>
            <ul className="mt-3 flex flex-col gap-1">
              {j.chats.map((c) => (
                <li key={c.id}>
                  <Link to={`/app?chat=${c.id}`} className="block truncate rounded-lg px-2 py-1.5 text-sm hover:bg-blush">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => ask()} className="mt-2 text-[13px] font-semibold underline underline-offset-2">
              Start a new conversation
            </button>
          </Card>

          <Card className="p-6">
            <CardTitle>What next?</CardTitle>
            {j.continuations.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1">
                {j.continuations.map((c) => (
                  <li key={c.id}>
                    <Link to={`/app/journeys/${c.id}`} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm hover:bg-blush">
                      <CornerDownRight className="size-3.5 text-muted" aria-hidden /> {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[13px] text-muted">Moving on, extending your stay, or going somewhere new? Plan the next leg from here.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => ask(`I want to plan the next leg after “${j.title}”.`)}>
              Continue this journey
            </Button>
            <div className="mt-5 flex flex-wrap gap-4 border-t border-rose-200 pt-4 text-[13px]">
              {j.status !== 'archived' && (
                <button type="button" onClick={() => setStatus('archived', 'Journey archived')} className="text-muted underline underline-offset-2 hover:text-forest-950">
                  Archive
                </button>
              )}
              <button type="button" onClick={() => setConfirmDelete(true)} className="text-muted underline underline-offset-2 hover:text-brick-700">
                Delete
              </button>
            </div>
          </Card>

          {j.guideline.sources.length > 0 && (
            <div className="px-2 text-xs text-muted">
              <p className="font-semibold">Official sources</p>
              <ul className="mt-1 flex flex-col gap-1">
                {j.guideline.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-forest-950">
                      {s.title} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              {j.guideline.verifiedAt && <p className="mt-1">Checked {day(j.guideline.verifiedAt)}</p>}
            </div>
          )}
        </aside>
      </div>

      <PayDialog
        open={!!paying}
        amount={Number(paying?.amount ?? 0)}
        currency={paying?.currency}
        what={paying?.title ?? ''}
        onClose={() => setPaying(null)}
        onPay={async () => {
          if (!paying) return
          await api.payJourneyFee(j.id, paying.key)
          await load()
          refresh(['payments', 'journeys'])
        }}
      />
      {uploading && (
        <UploadDialog
          key={`${uploading.category}:${uploading.title}`}
          open
          defaultCategory={uploading.category}
          defaultTitle={uploading.title}
          onClose={() => {
            setUploading(null)
            load()
          }}
        />
      )}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete ${j.title}?`} description="The pathway is deleted. Conversations, forms and payments are kept.">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(false)}>
            Keep it
          </Button>
          <ButtonLink
            to="/app/journeys"
            variant="accent"
            onClick={async (e) => {
              e.preventDefault()
              try {
                await api.deleteJourney(j.id)
                refresh(['journeys', 'tasks'])
                toast('Journey deleted')
                navigate('/app/journeys')
              } catch (err) {
                toast(err instanceof Error ? err.message : 'The journey wasn’t deleted.', 'error')
              }
            }}
          >
            Delete
          </ButtonLink>
        </div>
      </Dialog>
    </>
  )
}
