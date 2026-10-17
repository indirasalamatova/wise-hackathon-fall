import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { ExternalLink, Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardTitle, PageHeader, type BadgeTone } from '@/components/ui/primitives'
import * as api from '@/lib/api'
import { cn, timeAgo } from '@/lib/format'
import type { GuidelineEntry, PipelineRunInfo } from '@/lib/types'
import { useAuth, useToast } from '@/store/context'

const runTone: Record<PipelineRunInfo['status'], BadgeTone> = { queued: 'neutral', running: 'warn', done: 'ok', failed: 'danger' }
const resultTone: Record<string, BadgeTone> = { published: 'ok', reverified: 'ok', held: 'warn', failed: 'danger' }
const guidelineTone: Record<GuidelineEntry['status'], BadgeTone> = { current: 'ok', stale: 'warn', missing: 'danger' }

function RunCard({ run }: { run: PipelineRunInfo }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="py-3">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 text-left">
        <Badge tone={runTone[run.status]}>{run.status}</Badge>
        <span className="text-sm font-semibold">{run.trigger === 'manual' ? `Manual · ${run.requested_by ?? ''}` : 'Daily schedule'}</span>
        <span className="text-xs text-muted">{timeAgo(run.created_at)}</span>
        <span className="ml-auto flex flex-wrap gap-1">
          {run.results.map((r) => (
            <Badge key={r.target} tone={resultTone[r.status] ?? 'neutral'} className="text-[11px]">
              {r.target.replace(/^[a-z]+-/, '')}: {r.status}
            </Badge>
          ))}
        </span>
      </button>
      {open && (
        <div className="animate-fade-in mt-3 flex flex-col gap-3">
          {run.results.map((r) => (
            <div key={r.target} className="rounded-xl bg-blush px-4 py-3 text-sm">
              <p className="font-semibold">
                {r.target} · <span className={cn(r.status === 'failed' && 'text-brick-700')}>{r.status}</span>
                {r.version && <span className="font-normal text-muted"> · v{r.version}</span>}
                {r.model && <span className="font-normal text-muted"> · {r.model}</span>}
              </p>
              {r.reason && <p className="text-[13px] text-muted">{r.reason}</p>}
              {r.verified && (
                <p className="mt-1 text-[13px]">
                  Verified: {r.verified.requirements} requirements, {r.verified.fees} fees, {r.verified.steps} steps
                </p>
              )}
              {!!r.dropped?.length && (
                <details className="mt-1 text-[13px]">
                  <summary className="cursor-pointer text-muted">{r.dropped.length} item(s) dropped by verification</summary>
                  <ul className="mt-1 list-disc pl-5">
                    {r.dropped.map((d, i) => (
                      <li key={i}>
                        {d.item}: <span className="text-muted">{d.reason}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {!!r.fetch_errors?.length && (
                <ul className="mt-1 text-[13px] text-brick-700">
                  {r.fetch_errors.map((e) => (
                    <li key={e.url}>
                      {e.url}: {e.error}
                    </li>
                  ))}
                </ul>
              )}
              {r.note && <p className="mt-1 text-[13px] text-muted">{r.note}</p>}
              {!!r.discovered?.length && <p className="mt-1 text-[13px] text-muted">Found on the web: {r.discovered.join(', ')}</p>}
            </div>
          ))}
          {run.log.length > 0 && <pre className="overflow-x-auto rounded-xl bg-forest-950 p-3 text-xs text-rose-100">{run.log.join('\n')}</pre>}
        </div>
      )}
    </li>
  )
}

export function AdminDataPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<{ runs: PipelineRunInfo[]; guidelines: GuidelineEntry[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [queuing, setQueuing] = useState(false)

  const load = useCallback(() => api.getPipeline().then(setData, (e) => setError(e instanceof Error ? e.message : 'Couldn’t load the pipeline.')), [])
  const active = data?.runs.some((r) => r.status === 'queued' || r.status === 'running') ?? false

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    if (!active) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [active, load])

  if (user && !user.isAdmin) return <Navigate to="/app" replace />

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Data sources"
        subtitle="Official guidelines are fetched daily, extracted by the model, and published only if every item is proven by a quote from an official page."
        aside={
          <Button
            variant="accent"
            disabled={active}
            loading={queuing}
            onClick={async () => {
              setQueuing(true)
              try {
                await api.queuePipelineRun()
                toast('Run queued; the worker starts it within a minute', 'success')
                await load()
              } catch (e) {
                toast(e instanceof Error ? e.message : 'The run wasn’t queued.', 'error')
              } finally {
                setQueuing(false)
              }
            }}
          >
            {active ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {active ? 'Run in progress' : 'Run now'}
          </Button>
        }
      />
      {error && <p className="mb-4 text-sm text-brick-700">{error}</p>}
      {!data ? (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="p-6">
            <CardTitle>Guidelines</CardTitle>
            <ul className="mt-3 divide-y divide-rose-200">
              {data.guidelines.map((g) => (
                <li key={g.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {g.destination} · {g.purpose.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted">
                      {g.origin === '*' ? 'any citizenship' : g.origin} · {g.managed_by} · v{g.version}
                    </span>
                    <Badge tone={guidelineTone[g.status]} className="ml-auto">
                      {g.status}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-muted">
                    {g.visa_type} · {g.counts.requirements} requirements, {g.counts.fees} fees, {g.counts.steps} steps · {g.reason}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                    {g.sources.map((s) => (
                      <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted underline underline-offset-2 hover:text-forest-950">
                        {s.title || s.url} <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ))}
                  </p>
                </li>
              ))}
              {data.guidelines.length === 0 && <p className="py-4 text-sm text-muted">No guidelines yet. Run the pipeline.</p>}
            </ul>
          </Card>
          <Card className="p-6">
            <CardTitle>Recent runs</CardTitle>
            <ul className="mt-2 divide-y divide-rose-200">
              {data.runs.map((r) => (
                <RunCard key={r.id} run={r} />
              ))}
              {data.runs.length === 0 && <p className="py-4 text-sm text-muted">No runs yet.</p>}
            </ul>
          </Card>
        </div>
      )}
    </>
  )
}
