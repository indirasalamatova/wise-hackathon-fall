import { Link } from 'react-router'
import { Chat } from '@/components/chat/Chat'
import { Badge, Card, CardTitle, DateTile } from '@/components/ui/primitives'
import { expiryOf } from '@/components/case/expiry'
import { useI18n } from '@/i18n'
import { daysUntil, relativeDays, shortDate } from '@/lib/format'
import { useCase } from '@/store/context'

export function AssistantPage() {
  const { tasks, documents } = useCase()
  const { t, tOr, language } = useI18n()
  const upcoming = tasks
    .filter((t) => !t.done && t.due && daysUntil(t.due) >= 0)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 4)
  const renew = documents
    .filter((d) => ['expired', 'soon'].includes(expiryOf(d.expiresOn).state))
    .sort((a, b) => a.expiresOn!.localeCompare(b.expiresOn!))[0]
  const nextTask = upcoming[0]

  // The single most urgent real thing: an expiring document, the next deadline, or getting started.
  const next = renew
    ? {
        title: t('assistant.renew.title', { doc: language === 'EN' ? renew.title.toLowerCase() : renew.title }),
        body: t('assistant.renew.body', { expiry: expiryOf(renew.expiresOn).label }),
        to: '/app/documents',
        cta: t('assistant.renew.cta'),
      }
    : nextTask
      ? {
          title: nextTask.title,
          body: t('assistant.task.body', { date: shortDate(nextTask.due!, { weekday: 'short', day: 'numeric', month: 'short' }), relative: relativeDays(nextTask.due!) }),
          to: '/app/todo',
          cta: t('assistant.task.cta'),
        }
      : documents.length === 0
        ? { title: t('assistant.first.title'), body: t('assistant.first.body'), to: '/app/documents', cta: t('assistant.first.cta') }
        : { title: t('assistant.plan.title'), body: t('assistant.plan.body'), to: '/app/todo', cta: t('assistant.plan.cta') }

  return (
    // Increased right column width (e.g., 320px / 340px) to make the panel wider
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <Chat />

      {/* Added w-full so the aside container spans the full width of its grid column */}
      <aside className="flex w-full flex-col gap-4">
        <Card tone="dark" className="w-full p-6">
          <Badge tone="accent" className="h-[22px] text-[11px]">
            {t('assistant.nextStep')}
          </Badge>
          <h2 className="mt-3 text-lg leading-snug font-semibold">{next.title}</h2>
          <p className="mt-4 text-[13px] text-rose-300">{next.body}</p>
          <Link to={next.to} className="mt-5 inline-flex h-9 items-center rounded-full bg-brick-600 px-6 text-[13px] font-semibold hover:bg-brick-700">
            {next.cta}
          </Link>
        </Card>

        <Card className="w-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{t('assistant.comingUp')}</CardTitle>
            <Link to="/app/todo" className="text-[13px] font-semibold underline underline-offset-2">
              {t('assistant.allTasks')}
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">{t('assistant.noDeadlines')}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {upcoming.map((task) => (
                <li key={task.id} className="flex items-center gap-3.5">
                  <DateTile iso={task.due!} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{task.title}</p>
                    <p className="text-xs text-muted">
                      {tOr(`taskCategory.${task.category}`, task.category)} · {relativeDays(task.due!)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  )
}