import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Card, CardTitle, DateTile, PageHeader, Progress } from '@/components/ui/primitives'
import { DocumentList } from '@/components/case/DocumentList'
import { PlanCard } from '@/components/case/PlanCard'
import { expiryOf } from '@/components/case/expiry'
import { useI18n } from '@/i18n'
import { journeyStages } from '@/lib/mock-data'
import { cn, relativeDays } from '@/lib/format'
import type { StageKey } from '@/lib/types'
import { useAuth, useCase, useToast } from '@/store/context'

function StageTrack({ current, onPick }: { current: number; onPick: (k: StageKey) => void }) {
  const { t } = useI18n()
  return (
    <ol className="grid grid-cols-4">
      {journeyStages.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={s.key} className="relative flex flex-col items-center text-center">
            {i < journeyStages.length - 1 && (
              <span aria-hidden className={cn('absolute top-[26px] left-1/2 h-0.5 w-full', i < current ? 'bg-forest-950' : 'bg-rose-300')} />
            )}
            <button
              type="button"
              onClick={() => onPick(s.key)}
              aria-pressed={active}
              aria-label={t('journey.stageAria', { stage: t(s.label) })}
              className={cn(
                'relative grid size-[52px] place-items-center rounded-full text-base font-semibold transition-colors',
                done && 'bg-forest-950 text-white',
                active && 'bg-brick-600 text-white ring-4 ring-rose-100',
                !done && !active && 'border-[3px] border-rose-300 bg-white text-forest-950 hover:border-brick-600',
              )}
            >
              {done ? <Check className="size-5" aria-hidden /> : i + 1}
            </button>
            <span className={cn('mt-2 text-[15px] font-semibold', active && 'text-brick-600')}>{t(s.label)}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function JourneyPage() {
  const { user, updateUser } = useAuth()
  const { documents, tasks, plans } = useCase()
  const { toast } = useToast()
  const { t, tOr } = useI18n()
  if (!user) return null

  const current = Math.max(0, journeyStages.findIndex((s) => s.key === user.journeyStage))
  const stage = journeyStages[current]
  const open = tasks.filter((x) => !x.done).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const doneCount = tasks.length - open.length
  const attention = documents.filter((d) => ['expired', 'soon'].includes(expiryOf(d.expiresOn).state)).length

  return (
    <>
      <PageHeader
        eyebrow={t('journey.eyebrow', { n: current + 1, total: journeyStages.length })}
        title={t('journey.title')}
        subtitle={t('journey.subtitle')}
      />

      <Card className="px-5 pt-7 pb-6 sm:px-6">
        <StageTrack
          current={current}
          onPick={(k) =>
            k !== user.journeyStage &&
            updateUser({ journeyStage: k }).catch((e) => toast(e instanceof Error ? e.message : t('journey.stageFailed'), 'error'))
          }
        />
        <p className="mt-7 rounded-xl bg-blush px-4 py-3 text-sm">
          <span className="font-semibold">{t(stage.label)}.</span> {t(stage.description)}
        </p>
      </Card>

      {plans.length > 0 ? (
        <div className={cn('mt-4 grid gap-4', plans.length > 1 && 'lg:grid-cols-2')}>
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      ) : (
        <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <p className="text-sm text-muted">{t('journey.noPlan')}</p>
          <Link to="/app" className="text-[13px] font-semibold underline underline-offset-2">
            {t('journey.planWithAssistant')}
          </Link>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <CardTitle>{t('journey.openTasks')}</CardTitle>
            <span className="text-sm text-muted">
              {t('journey.doneOf', { done: doneCount, total: tasks.length })}
            </span>
          </div>
          <Progress value={tasks.length ? (doneCount / tasks.length) * 100 : 0} className="mt-4 mb-4" label={t('journey.tasksDone')} />
          {open.length === 0 ? (
            <p className="text-sm text-muted">{t('journey.nothingOpen')}</p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {open.slice(0, 5).map((task) => (
                <li key={task.id} className="flex items-center gap-3.5">
                  {task.due ? <DateTile iso={task.due} /> : <span className="size-[52px] shrink-0 rounded-xl bg-rose-100" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted">
                      {tOr(`taskCategory.${task.category}`, task.category)}
                      {task.due && ` · ${relativeDays(task.due)}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link to="/app/todo" className="mt-4 inline-block text-[13px] font-semibold underline underline-offset-2">
            {t('journey.openTodo')}
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <CardTitle>{t('journey.documents')}</CardTitle>
            <span className="text-sm text-muted">
              {t('docs.onFile', { count: documents.length })}
              {attention > 0 && ` · ${t('docs.needAttention', { count: attention })}`}
            </span>
          </div>
          {documents.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{t('journey.noDocuments')}</p>
          ) : (
            <DocumentList documents={documents.slice(0, 4)} compact />
          )}
          <Link to="/app/documents" className="mt-2 inline-block text-[13px] font-semibold underline underline-offset-2">
            {documents.length ? t('journey.seeAllDocuments') : t('journey.uploadDocument')}
          </Link>
        </Card>
      </div>
    </>
  )
}
