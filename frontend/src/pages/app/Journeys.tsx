import { Link } from 'react-router'
import { ArrowRight, CornerDownRight, Plus } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { Badge, Card, PageHeader, Progress } from '@/components/ui/primitives'
import { statusMeta } from '@/components/case/journey-meta'
import { relativeDays, shortDate } from '@/lib/format'
import type { JourneySummary } from '@/lib/types'
import { useCase } from '@/store/context'
import { useI18n, type Key } from '@/i18n'

function JourneyCard({ j, parentTitle }: { j: JourneySummary; parentTitle?: string }) {
  const meta = statusMeta[j.status]
  const { t } = useI18n()
  const pct = j.progress.total ? (j.progress.done / j.progress.total) * 100 : 0
  return (
    <Link to={`/app/journeys/${j.id}`} className="group block">
      <Card className="h-full p-6 transition-colors group-hover:border-rose-300">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {parentTitle && (
              <p className="mb-1 flex items-center gap-1 text-xs text-muted">
                <CornerDownRight className="size-3" aria-hidden /> {t('journeys.nextLegOf', { title: parentTitle })}
              </p>
            )}
            <h2 className="truncate text-[17px] font-semibold text-forest-950">{j.title}</h2>
            <p className="mt-0.5 truncate text-[13px] text-muted">
              {j.visaType}
              {j.travelDate && ` · ${t('journeys.from', { date: shortDate(j.travelDate, { day: 'numeric', month: 'short', year: 'numeric' }) })}`}
            </p>
          </div>
          <Badge tone={meta.tone}>{t(meta.label)}</Badge>
        </div>
        <Progress value={pct} className="mt-5" label={t('journeys.progressOf', { title: j.title })} />
        <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
          <span className="text-muted">
            {t('journeys.stepsDone', { done: j.progress.done, total: j.progress.total })}
          </span>
          <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
        {j.nextStep && j.status !== 'completed' && (
          <p className="mt-3 truncate rounded-xl bg-blush px-3 py-2 text-[13px]">
            <span className="text-muted">{t('journeys.next')} </span>
            <span className="font-semibold">{j.nextStep.title}</span>
            {j.nextStep.dueDate && <span className="text-muted"> · {relativeDays(j.nextStep.dueDate)}</span>}
          </p>
        )}
      </Card>
    </Link>
  )
}

export function JourneysPage() {
  const { journeys } = useCase()
  const { t } = useI18n()
  const titles = Object.fromEntries(journeys.map((j) => [j.id, j.title]))
  const groups: [Key, JourneySummary[]][] = [
    ['journeys.underWay', journeys.filter((j) => j.status === 'planning' || j.status === 'active')],
    ['journeyStatus.completed', journeys.filter((j) => j.status === 'completed')],
    ['journeyStatus.archived', journeys.filter((j) => j.status === 'archived')],
  ]

  return (
    <>
      <PageHeader
        title={t('nav.journeys')}
        subtitle={t('journeys.subtitle')}
        aside={
          <ButtonLink to="/app?new=1" variant="accent">
            <Plus className="size-4" aria-hidden /> {t('journeys.plan')}
          </ButtonLink>
        }
      />
      {journeys.length === 0 ? (
        <Card className="grid place-items-center px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">{t('journeys.emptyTitle')}</h2>
          <p className="mt-1 max-w-md text-sm text-muted">
            {t('journeys.emptyBody')}
          </p>
          <ButtonLink to="/app?new=1" variant="accent" className="mt-6">
            {t('journeys.planFirst')}
          </ButtonLink>
        </Card>
      ) : (
        groups
          .filter(([, list]) => list.length)
          .map(([label, list]) => (
            <section key={label} className="mb-8">
              <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] text-forest-950/80 uppercase">{t(label)}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((j) => (
                  <JourneyCard key={j.id} j={j} parentTitle={j.parentId ? titles[j.parentId] : undefined} />
                ))}
              </div>
            </section>
          ))
      )}
    </>
  )
}
