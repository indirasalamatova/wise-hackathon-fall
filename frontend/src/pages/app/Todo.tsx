import { useState } from 'react'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardTitle, Checkbox, Input, PageHeader, Progress, Segmented } from '@/components/ui/primitives'
import { cn, daysUntil, relativeDays, shortDate } from '@/lib/format'
import type { Task } from '@/lib/types'
import { useCase, useToast } from '@/store/context'

type Filter = 'open' | 'done' | 'all'

function TaskRow({ task }: { task: Task }) {
  const { toggleTask, removeTask } = useCase()
  const { toast } = useToast()
  const soon = !task.done && task.due && daysUntil(task.due) <= 7 && daysUntil(task.due) >= 0
  const overdue = !task.done && task.due && daysUntil(task.due) < 0

  return (
    <li className="animate-fade-in flex items-center gap-4 rounded-2xl border border-rose-200 bg-white px-4 py-3">
      <Checkbox
        size="lg"
        checked={task.done}
        onChange={() => {
          toggleTask(task.id)
          if (!task.done) toast('Task done', 'success')
        }}
        label={task.title}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-[15px] font-semibold', task.done && 'text-muted line-through')}>{task.title}</p>
        <p className="text-xs text-muted">
          {task.category}
          {task.due && ` · ${shortDate(task.due)} · ${relativeDays(task.due)}`}
        </p>
      </div>
      {soon && <Badge tone="danger">Soon</Badge>}
      {overdue && <Badge tone="accent">Overdue</Badge>}
      <button
        type="button"
        onClick={() => {
          removeTask(task.id)
          toast('Task deleted')
        }}
        aria-label={`Delete ${task.title}`}
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
  const [filter, setFilter] = useState<Filter>('open')
  const [draft, setDraft] = useState('')
  const [adding, setAdding] = useState(false)
  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  const visible = (filter === 'open' ? open : filter === 'done' ? done : tasks)
    .slice()
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
  const thisWeek = visible.filter((t) => t.due && daysUntil(t.due) <= 7)
  const later = visible.filter((t) => !t.due || daysUntil(t.due) > 7)

  const nextTask = open.find((t) => t.due) ?? open[0]

  return (
    <>
      <PageHeader
        eyebrow={`${open.length} open · ${done.length} done`}
        title="To-do list"
        subtitle="Tasks from your case appear here automatically. Add your own too."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_248px] xl:grid-cols-[minmax(0,1fr)_248px]">
        <div>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!draft.trim()) return
              setAdding(true)
              try {
                await addTask(draft.trim())
                setDraft('')
                setFilter('open')
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Task wasn’t added. Try again.', 'error')
              } finally {
                setAdding(false)
              }
            }}
            className="flex gap-3"
          >
            <label htmlFor="new-task" className="sr-only">
              New task
            </label>
            <Input id="new-task" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a task, e.g. Book translator" />
            <Button type="submit" size="lg" disabled={!draft.trim()} loading={adding} className="h-12 shrink-0">
              Add task
            </Button>
          </form>

          <div className="mt-4">
            <Segmented
              label="Filter tasks"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'done', label: 'Done' },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted">
              {filter === 'done' ? 'Nothing done yet. Tick a task when it’s finished.' : 'No open tasks. Add one above to plan your next step.'}
            </p>
          ) : (
            <>
              {thisWeek.length > 0 && (
                <section className="mt-6">
                  <h2 className="mb-2.5 text-xs font-semibold tracking-[0.2em] text-forest-950/80 uppercase">This week</h2>
                  <ul className="flex flex-col gap-2.5">
                    {thisWeek.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </ul>
                </section>
              )}
              {later.length > 0 && (
                <section className="mt-6">
                  <h2 className="mb-2.5 text-xs font-semibold tracking-[0.2em] text-forest-950/80 uppercase">Later</h2>
                  <ul className="flex flex-col gap-2.5">
                    {later.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>

        <Card className="h-fit p-6">
          <CardTitle>Progress</CardTitle>
          <Progress value={tasks.length ? (done.length / tasks.length) * 100 : 0} className="mt-4" label="Tasks done" />
          <p className="mt-2 text-[13px] text-muted">
            {done.length} of {tasks.length} tasks done
          </p>

          <h2 className="mt-8 text-[17px] font-semibold">Ask for help</h2>
          <p className="mt-2 text-[13px] text-muted">Not sure how to do a task? The assistant can walk you through it.</p>
          {nextTask && (
            <Link
              to="/app"
              className="mt-5 block rounded-2xl border-2 border-rose-300 px-4 py-2.5 text-center text-[13px] font-semibold hover:border-brick-600"
            >
              How do I {nextTask.title.charAt(0).toLowerCase() + nextTask.title.slice(1)}?
            </Link>
          )}
        </Card>
      </div>
    </>
  )
}
