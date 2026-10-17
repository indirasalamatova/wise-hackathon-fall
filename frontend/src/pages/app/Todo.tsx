import { useState } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardTitle, Checkbox, Input, PageHeader, Progress, Segmented } from '@/components/ui/primitives'
import { cn, daysUntil, relativeDays, shortDate } from '@/lib/format'
import { useI18n } from '@/i18n'
import type { Task } from '@/lib/types'
import { useCase, useToast } from '@/store/context'

type Filter = 'open' | 'done' | 'all'

function TaskRow({ task }: { task: Task }) {
  const { journeys } = useCase()
  const journey = task.journeyId ? journeys.find((x) => x.id === task.journeyId) : undefined
  const { toggleTask, removeTask } = useCase()
  const { toast } = useToast()
  const { t, tOr } = useI18n()
  const soon = !task.done && task.due && daysUntil(task.due) <= 7 && daysUntil(task.due) >= 0
  const overdue = !task.done && task.due && daysUntil(task.due) < 0

  return (
    <li className="animate-fade-in flex items-center gap-4 rounded-2xl border border-rose-200 bg-white px-4 py-3">
      <Checkbox
        size="lg"
        checked={task.done}
        onChange={() => {
          toggleTask(task.id)
          if (!task.done) toast(t('todo.taskDone'), 'success')
        }}
        label={task.title}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] font-semibold', task.done && 'text-muted line-through')}>{task.title}</p>
        <p className="text-xs text-muted">
          {journey ? (
            <Link to={`/app/journeys/${journey.id}`} className="font-semibold text-forest-950 underline underline-offset-2">
              {journey.title}
            </Link>
          ) : (
            tOr(`taskCategory.${task.category}`, task.category)
          )}
          {task.due && ` · ${shortDate(task.due)} · ${relativeDays(task.due)}`}
        </p>
      </div>
      {soon && <Badge tone="danger">{t('todo.soon')}</Badge>}
      {overdue && <Badge tone="accent">{t('todo.overdue')}</Badge>}
      <button
        type="button"
        onClick={() => {
          removeTask(task.id)
          toast(t('todo.taskDeleted'))
        }}
        aria-label={t('todo.deleteAria', { title: task.title })}
        className="grid size-9 shrink-0 place-items-center rounded-full text-forest-950/70 hover:bg-rose-100 hover:text-brick-600"
      >
        <Trash2 className="size-[18px]" />
      </button>
    </li>
  )
}

export function TodoPage() {
  const { tasks, addTask } = useCase()
  const { toast } = useToast()
  const { t, language } = useI18n()
  const [filter, setFilter] = useState<Filter>('open')
  const [draft, setDraft] = useState('')
  const [due, setDue] = useState('')
  const [adding, setAdding] = useState(false)
  const open = tasks.filter((x) => !x.done)
  const done = tasks.filter((x) => x.done)

  const visible = (filter === 'open' ? open : filter === 'done' ? done : tasks)
    .slice()
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const thisWeek = visible.filter((x) => x.due && daysUntil(x.due) <= 7)
  const later = visible.filter((x) => !x.due || daysUntil(x.due) > 7)

  const nextTask = open.find((x) => x.due) ?? open[0]

  return (
    <>
      <PageHeader
        eyebrow={t('todo.eyebrow', { open: open.length, done: done.length })}
        title={t('todo.title')}
        subtitle={t('todo.subtitle')}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_248px] xl:grid-cols-[minmax(0,1fr)_248px]">
        <div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!draft.trim()) return
              setAdding(true)
              try {
                await addTask(draft.trim(), due || undefined)
                setDraft('')
                setDue('')
                setFilter('open')
              } catch (err) {
                toast(err instanceof Error ? err.message : t('todo.addFailed'), 'error')
              } finally {
                setAdding(false)
              }
            }}
            className="flex flex-wrap gap-3 sm:flex-nowrap"
          >
            <label htmlFor="new-task" className="sr-only">
              {t('todo.newTask')}
            </label>
            <Input id="new-task" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('todo.placeholder')} maxLength={200} />
            <label htmlFor="new-task-due" className="sr-only">
              {t('todo.dueOptional')}
            </label>
            <Input id="new-task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-44" title={t('todo.dueOptional')} />
            <Button type="submit" size="lg" disabled={!draft.trim()} loading={adding} className="h-12 shrink-0">
              {t('todo.add')}
            </Button>
          </form>

          <div className="mt-4">
            <Segmented
              label={t('todo.filter')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'open', label: t('todo.open') },
                { value: 'done', label: t('todo.done') },
                { value: 'all', label: t('todo.all') },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              {filter === 'done' ? t('todo.noneDone') : t('todo.noneOpen')}
            </p>
          ) : (
            <>
              {thisWeek.length > 0 && (
                <section className="mt-6">
                  <h2 className="mb-2.5 text-xs font-semibold tracking-[0.2em] text-forest-950/80 uppercase">{t('todo.thisWeek')}</h2>
                  <ul className="flex flex-col gap-2.5">
                    {thisWeek.map((x) => (
                      <TaskRow key={x.id} task={x} />
                    ))}
                  </ul>
                </section>
              )}
              {later.length > 0 && (
                <section className="mt-6">
                  <h2 className="mb-2.5 text-xs font-semibold tracking-[0.2em] text-forest-950/80 uppercase">{t('todo.later')}</h2>
                  <ul className="flex flex-col gap-2.5">
                    {later.map((x) => (
                      <TaskRow key={x.id} task={x} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <Card className="h-fit p-6">
          <CardTitle>{t('todo.progress')}</CardTitle>
          <Progress value={tasks.length ? (done.length / tasks.length) * 100 : 0} className="mt-4" label={t('todo.tasksDone')} />
          <p className="mt-2 text-[13px] text-muted">
            {t('todo.doneOf', { done: done.length, total: tasks.length })}
          </p>

          <h2 className="mt-8 text-[17px] font-semibold">{t('todo.help')}</h2>
          <p className="mt-2 text-[13px] text-muted">{t('todo.helpBody')}</p>
          {nextTask && (
            <Link
              to="/app"
              className="mt-5 block rounded-2xl border-2 border-rose-300 px-4 py-2.5 text-center text-[13px] font-semibold hover:border-brick-600"
            >
              {t('todo.howDoI', { task: language === 'EN' ? nextTask.title.charAt(0).toLowerCase() + nextTask.title.slice(1) : nextTask.title })}
            </Link>
          )}
        </Card>
      </div>
    </>
  )
}
