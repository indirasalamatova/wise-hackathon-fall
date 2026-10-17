import { Link, useSearchParams } from 'react-router'
import { Chat } from '@/components/chat/Chat'
import { Badge, Card, CardTitle, DateTile } from '@/components/ui/primitives'
import { expiryOf } from '@/components/case/expiry'
import { daysUntil, relativeDays, shortDate } from '@/lib/format'
import { useCase } from '@/store/context'

export function AssistantPage() {
  const [params] = useSearchParams()
  const { tasks, documents } = useCase()
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
    ? { title: `Renew your ${renew.title.toLowerCase()}`, body: `${expiryOf(renew.expiresOn).label}. Upload the new one when you have it.`, to: '/app/documents', cta: 'Open documents' }
    : nextTask
      ? { title: nextTask.title, body: `Due ${shortDate(nextTask.due!, { weekday: 'short', day: 'numeric', month: 'short' })}, ${relativeDays(nextTask.due!)}.`, to: '/app/todo', cta: 'Open to-do list' }
      : documents.length === 0
        ? { title: 'Upload your first document', body: 'Start with your passport or residence permit, and add its expiry date.', to: '/app/documents', cta: 'Upload document' }
        : { title: 'Plan your next step', body: 'Add a task with a due date and it shows up here.', to: '/app/todo', cta: 'Add a task' }

  return (
    // Increased right column width (e.g., 320px / 340px) to make the panel wider
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <Chat journeyId={params.get('journey') ?? undefined} openChatId={params.get('chat') ?? undefined} initialPrompt={params.get('prompt') ?? undefined} fresh={params.has('new')} key={params.get('new') ? `new-${params.get('new')}` : 'chat'} />

      {/* Added w-full so the aside container spans the full width of its grid column */}
      <aside className="flex w-full flex-col gap-4">
        <Card tone="dark" className="w-full p-6">
          <Badge tone="accent" className="h-[22px] text-[11px]">
            Next step
          </Badge>
          <h2 className="mt-3 text-lg leading-snug font-semibold">{next.title}</h2>
          <p className="mt-4 text-[13px] text-rose-300">{next.body}</p>
          <Link to={next.to} className="mt-5 inline-flex h-9 items-center rounded-full bg-brick-600 px-6 text-[13px] font-semibold hover:bg-brick-700">
            {next.cta}
          </Link>
        </Card>

        <Card className="w-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Coming up</CardTitle>
            <Link to="/app/todo" className="text-[13px] font-semibold underline underline-offset-2">
              All tasks
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">No deadlines ahead. Add a task to plan your next step.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {upcoming.map((t) => (
                <li key={t.id} className="flex items-center gap-3.5">
                  <DateTile iso={t.due!} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-muted">
                      {t.category} · {relativeDays(t.due!)}
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