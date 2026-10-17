import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Badge, Card, CardTitle, PageHeader, Progress } from '@/components/ui/primitives'
import { DocumentList } from '@/components/case/DocumentList'
import { caseSummary, currentStageIndex, journeyStages, renewalSteps } from '@/lib/mock-data'
import { cn, shortDate } from '@/lib/format'
import { useCase } from '@/store/context'

function StageTrack({ stayProgress }: { stayProgress: number }) {
  return (
    <ol className="grid grid-cols-4">
      {journeyStages.map((s, i) => {
        const done = i < currentStageIndex
        const current = i === currentStageIndex
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i < journeyStages.length - 1 && (
              <span
                aria-hidden
                className={cn('absolute top-[26px] left-1/2 h-0.5 w-full', i < currentStageIndex ? 'bg-forest-950' : 'bg-rose-300')}
              />
            )}
            <span
              className={cn(
                'relative grid size-[52px] place-items-center rounded-full text-base font-semibold',
                done && 'bg-forest-950 text-white',
                current && 'bg-brick-600 text-white ring-4 ring-rose-100',
                !done && !current && 'border-[3px] border-rose-300 bg-white text-forest-950',
              )}
            >
              {done ? <Check className="size-5" aria-label="Done" /> : i + 1}
            </span>
            <span className={cn('mt-2 text-[15px] font-semibold', current && 'text-brick-600')}>{s.label}</span>
            <span className="text-xs text-muted">{current ? `${s.when} · ${stayProgress}%` : s.when}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function JourneyPage() {
  const { documents } = useCase()
  const ready = documents.filter((d) => d.status === 'ready').length
  const allReady = ready === documents.length
  // collect docs is step 2; once all are in, the AI check is step 3
  const currentStep = allReady ? 3 : 1
  const stayProgress = Math.round(22 + (ready / documents.length) * 18)
  const sorted = [...documents].sort((a, b) => Number(a.status === 'ready') - Number(b.status === 'ready'))

  return (
    <>
      <PageHeader
        eyebrow={`Stage ${currentStageIndex + 1} of ${journeyStages.length}`}
        title="My journey"
        subtitle="From your first application to your next chapter."
        aside={
          <Badge className="h-8 px-5 text-[13px]">
            {caseSummary.countryName} · since {caseSummary.since}
          </Badge>
        }
      />

      <Card className="px-5 pt-7 pb-6 sm:px-6">
        <StageTrack stayProgress={stayProgress} />
        <p className="mt-7 rounded-xl bg-blush px-4 py-3 text-sm">
          <span className="font-semibold">Stay.</span> Renewing your residence permit for study purposes. Current card valid until{' '}
          {shortDate(caseSummary.permitExpires, { day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
        <Card className="p-6">
          <CardTitle className="mb-4">Renewal steps</CardTitle>
          <ol className="flex flex-col gap-3">
            {renewalSteps.map((s, i) => {
              const done = i < currentStep
              const current = i === currentStep
              const label = i === 1 ? `${s.label} · ${ready} of ${documents.length}` : s.when ? `${s.label} · ${s.when}` : s.label
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                      done ? 'bg-forest-950 text-white' : current ? 'bg-brick-600 text-white' : 'bg-rose-100 text-muted',
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Done" /> : i + 1}
                  </span>
                  <span className={cn('text-sm', current && 'font-semibold text-brick-600')}>{label}</span>
                </li>
              )
            })}
          </ol>
        </Card>

        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <CardTitle>Documents</CardTitle>
            <span className="text-sm text-muted">
              {ready} of {documents.length} ready
            </span>
          </div>
          <Progress value={(ready / documents.length) * 100} className="mt-4 mb-2" label="Documents ready" />
          <DocumentList documents={sorted.slice(0, 4)} />
          <Link to="/app/documents" className="mt-2 inline-block text-[13px] font-semibold underline underline-offset-2">
            See all documents
          </Link>
        </Card>
      </div>
    </>
  )
}
