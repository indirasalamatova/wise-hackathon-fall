import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Badge, Card, CardTitle, DateTile } from '@/components/ui/primitives'
import { Button } from '@/components/ui/Button'
import { RequestDialog } from '@/components/case/DocumentDialogs'
import { caseSummary, suggestedQuestions } from '@/lib/mock-data'
import { cn, daysUntil, relativeDays } from '@/lib/format'
import type { CaseDocument } from '@/lib/types'
import { useAuth, useCase } from '@/store/context'

function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('size-[18px] shrink-0 text-brick-600', className)} aria-hidden>
      <path d="M10 1.5C10.6 6.6 13 9.2 18.5 10C13 10.8 10.6 13.4 10 18.5C9.4 13.4 7 10.8 1.5 10C7 9.2 9.4 6.6 10 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function Chat() {
  const { user } = useAuth()
  const { chat, ask: askServer, thinking, clearChat } = useCase()
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const daysLeft = daysUntil(caseSummary.permitExpires)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [chat.length, thinking])

  const ask = async (q: string) => {
    const text = q.trim()
    if (!text || thinking) return
    setDraft('')
    await askServer(text)
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Card className="flex min-h-[560px] flex-col overflow-hidden lg:h-[calc(100svh-76px-4rem)]">
      <div className="flex items-center gap-3 border-b border-rose-200 px-5 py-4 sm:px-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest-950">
          <LogoMark className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Unbound assistant</p>
          <p className="truncate text-[13px] text-muted">Knows your case, documents and deadlines</p>
        </div>
        <span className="hidden sm:block">
          <Badge>
            {caseSummary.permit} · {daysLeft} days
          </Badge>
        </span>
        {chat.length > 0 && (
          <button
            type="button"
            onClick={clearChat}
            aria-label="Start a new chat"
            title="New chat"
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-rose-100 hover:text-forest-950"
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-5 py-6 sm:px-9">
        {chat.length === 0 ? (
          <div className="mx-auto max-w-[560px] py-4">
            <p className="text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">{today}</p>
            <h1 className="font-display mt-4 text-[26px] leading-tight font-semibold text-forest-950 sm:text-[28px]">
              Hi {user?.firstName}, what can I help you with?
            </h1>
            <p className="mt-6 text-[15px] text-muted">
              Ask about your renewal, travel, money or what happens after graduation. I already know your case.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="flex items-start gap-3 rounded-2xl border-2 border-rose-200 bg-white p-4 text-left text-sm transition-colors hover:border-brick-600"
                >
                  <Spark className="mt-0.5" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4" aria-live="polite">
            {chat.map((m) =>
              m.role === 'user' ? (
                <li key={m.id} className="animate-fade-in max-w-[85%] self-end rounded-2xl rounded-br-md bg-forest-950 px-4 py-3 text-[15px] text-white">
                  {m.text}
                </li>
              ) : (
                <li key={m.id} className="animate-fade-in max-w-[90%] self-start rounded-2xl rounded-bl-md border-2 border-rose-200 bg-blush px-5 py-4 text-[15px]">
                  <p className="font-semibold">{m.text}</p>
                  {m.bullets && (
                    <ul className="mt-1.5 list-disc pl-5">
                      {m.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {m.footnote && <p className="mt-2 text-muted">{m.footnote}</p>}
                </li>
              ),
            )}
            {thinking && (
              <li className="self-start rounded-full border border-rose-200 bg-blush px-4 py-1.5 text-[13px] text-muted italic">
                Thinking…
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(draft)
        }}
        className="border-t border-rose-200 px-5 pt-4 pb-3 sm:px-6"
      >
        <div className="flex gap-3">
          <label htmlFor="ask" className="sr-only">
            Ask the assistant
          </label>
          <input
            id="ask"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask anything about your move…"
            autoComplete="off"
            className="h-12 min-w-0 flex-1 rounded-2xl border border-rose-200 bg-blush px-4 text-[15px] placeholder:text-muted outline-none focus:border-forest-950 focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || thinking}
            aria-label="Send"
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brick-600 text-white transition-colors hover:bg-brick-700 disabled:opacity-50"
          >
            <ArrowRight className="size-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Guidance only, not legal advice.</p>
      </form>
    </Card>
  )
}

export function AssistantPage() {
  const { tasks, documents } = useCase()
  const [request, setRequest] = useState<CaseDocument | null>(null)
  const upcoming = tasks
    .filter((t) => !t.done && t.due && daysUntil(t.due) >= 0)
    .sort((a, b) => a.due!.localeCompare(b.due!))
    .slice(0, 4)
  const certificate = documents.find((d) => d.action === 'request' && d.status === 'missing')

  return (
    // Increased right column width (e.g., 320px / 340px) to make the panel wider
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
      <Chat />

      {/* Added w-full so the aside container spans the full width of its grid column */}
      <aside className="flex w-full flex-col gap-4">
        <Card tone="dark" className="w-full p-6">
          <Badge tone="accent" className="h-[22px] text-[11px]">
            Next step
          </Badge>
          {certificate ? (
            <>
              <h2 className="mt-3 text-lg leading-snug font-semibold">Request your {certificate.name.toLowerCase()}</h2>
              <p className="mt-4 text-[13px] text-rose-300">
                Must be issued within 30 days of your submission. Due Fri 23 Oct.
              </p>
              <Button variant="accent" size="sm" className="mt-5 h-9 px-6" onClick={() => setRequest(certificate)}>
                Start request
              </Button>
            </>
          ) : (
            <>
              <h2 className="mt-3 text-lg leading-snug font-semibold">Update your health insurance</h2>
              <p className="mt-4 text-[13px] text-rose-300">Your policy must cover the full new permit period, to Jan 2028.</p>
              <Link to="/app/documents" className="mt-5 inline-flex h-9 items-center rounded-full bg-brick-600 px-6 text-[13px] font-semibold hover:bg-brick-700">
                Open documents
              </Link>
            </>
          )}
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

      <RequestDialog doc={request} onClose={() => setRequest(null)} />
    </div>
  )
}