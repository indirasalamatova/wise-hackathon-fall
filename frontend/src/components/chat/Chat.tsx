import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowRight, Check, ChevronDown, CircleAlert, History, Loader2, Plus, Square, Trash2 } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Card } from '@/components/ui/primitives'
import * as api from '@/lib/api'
import { suggestedQuestions } from '@/lib/mock-data'
import { cn, timeAgo, uid } from '@/lib/format'
import type { ChatMessage, ChatSessionInfo, ChatStep } from '@/lib/types'
import { usePersistentState } from '@/store/persist'
import { useAuth, useCase, useToast } from '@/store/context'

function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('size-[18px] shrink-0 text-brick-600', className)} aria-hidden>
      <path d="M10 1.5C10.6 6.6 13 9.2 18.5 10C13 10.8 10.6 13.4 10 18.5C9.4 13.4 7 10.8 1.5 10C7 9.2 9.4 6.6 10 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

/** Agent replies are Markdown; app links (/app/...) stay inside the app. */
const markdown: Components = {
  p: (p) => <p className="my-2 first:mt-0 last:mb-0" {...p} />,
  ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5" {...p} />,
  ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5" {...p} />,
  strong: (p) => <strong className="font-semibold text-forest-950" {...p} />,
  h1: (p) => <h3 className="mt-3 mb-1 font-semibold" {...p} />,
  h2: (p) => <h3 className="mt-3 mb-1 font-semibold" {...p} />,
  h3: (p) => <h3 className="mt-3 mb-1 font-semibold" {...p} />,
  code: (p) => <code className="rounded bg-rose-100 px-1 py-0.5 text-[13px]" {...p} />,
  table: (p) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-left text-sm" {...p} />
    </div>
  ),
  th: (p) => <th className="border-b border-rose-200 py-1.5 pr-3 font-semibold" {...p} />,
  td: (p) => <td className="border-b border-rose-200/60 py-1.5 pr-3 align-top" {...p} />,
  a: ({ href = '', children }) =>
    href.startsWith('/app') ? (
      <Link to={href} className="font-semibold text-brick-700 underline underline-offset-2">
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-brick-700 underline underline-offset-2">
        {children}
      </a>
    ),
}

function Steps({ steps }: { steps: ChatStep[] }) {
  if (!steps.length) return null
  return (
    <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="What the assistant did">
      {steps.map((s, i) => (
        <li
          key={i}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            s.state === 'error' ? 'bg-rose-100 text-brick-700' : 'bg-white text-muted',
          )}
        >
          {s.state === 'start' ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : s.state === 'error' ? (
            <CircleAlert className="size-3" aria-hidden />
          ) : (
            <Check className="size-3 text-ok-700" aria-hidden />
          )}
          {s.label}
        </li>
      ))}
    </ul>
  )
}

function History_({
  sessions,
  current,
  onPick,
  onDelete,
}: {
  sessions: ChatSessionInfo[]
  current: string | null
  onPick: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  if (!sessions.length) return null
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted hover:bg-rose-100 hover:text-forest-950"
      >
        <History className="size-4" aria-hidden /> <span className="hidden sm:inline">History</span>
        <ChevronDown className="size-3.5" aria-hidden />
      </button>
      {open && (
        <ul className="animate-pop-in absolute top-[calc(100%+6px)] right-0 z-30 max-h-80 w-72 overflow-y-auto rounded-2xl border border-rose-200 bg-white py-1.5 shadow-[0_24px_60px_-20px_rgb(3_16_10/0.35)]">
          {sessions.map((s) => (
            <li key={s.id} className="group flex items-center">
              <button
                type="button"
                onClick={() => {
                  onPick(s.id)
                  setOpen(false)
                }}
                className={cn('min-w-0 flex-1 px-4 py-2 text-left hover:bg-blush', s.id === current && 'bg-rose-100')}
              >
                <span className="block truncate text-sm font-medium">{s.title}</span>
                <span className="text-xs text-muted">{timeAgo(s.updatedAt)}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                aria-label={`Delete conversation ${s.title}`}
                className="mr-2 grid size-8 shrink-0 place-items-center rounded-full text-muted opacity-0 group-hover:opacity-100 hover:bg-rose-100 hover:text-brick-600 focus:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Chat() {
  const { user } = useAuth()
  const { refresh } = useCase()
  const { toast } = useToast()
  const [current, setCurrent] = usePersistentState<string | null>('chat-current', null)
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([])
  // Messages are tagged with the conversation they belong to, so switching shows nothing stale.
  const [loaded, setLoaded] = useState<{ for: string | null; list: ChatMessage[] }>({ for: null, list: [] })
  const loadedFor = useRef<string | null>(null)
  const show = useCallback((chatId: string, list: ChatMessage[]) => {
    loadedFor.current = chatId
    setLoaded({ for: chatId, list })
  }, [])
  const messages = useMemo(() => (loaded.for === current ? loaded.list : []), [loaded, current])
  const loading = !!current && loaded.for !== current
  const setMessages = (fn: (ms: ChatMessage[]) => ChatMessage[]) => setLoaded((l) => ({ ...l, list: fn(l.list) }))
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const abort = useRef<AbortController | null>(null)

  const loadSessions = useCallback(() => api.listChats().then(setSessions, () => {}), [])
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    // Skip when this conversation is already in memory (e.g. just created by ask()).
    if (!current || loadedFor.current === current) return
    let cancelled = false
    api.getChatMessages(current).then(
      (list) => !cancelled && show(current, list),
      // The conversation was deleted elsewhere: start fresh.
      () => !cancelled && setCurrent(null),
    )
    return () => {
      cancelled = true
    }
  }, [current, setCurrent, show])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const updateLast = (fn: (m: ChatMessage) => ChatMessage) => setMessages((ms) => ms.map((m, i) => (i === ms.length - 1 ? fn(m) : m)))

  const ask = async (q: string) => {
    const text = q.trim()
    if (!text || busy) return
    setDraft('')
    setBusy(true)
    let chatId = current
    try {
      if (!chatId) {
        chatId = (await api.createChat()).id
        show(chatId, [])
        setCurrent(chatId)
      }
      setMessages((ms) => [
        ...ms,
        { id: uid('u'), role: 'user', text, steps: [] },
        { id: uid('a'), role: 'assistant', text: '', steps: [], streaming: true },
      ])
      const controller = new AbortController()
      abort.current = controller
      await api.sendChatMessage(
        chatId,
        text,
        (e) => {
          if (e.type === 'text') updateLast((m) => ({ ...m, text: m.text + e.text }))
          else if (e.type === 'tool')
            updateLast((m) => {
              const steps = [...m.steps]
              const i = e.state === 'start' ? -1 : steps.findLastIndex((s) => s.name === e.name && s.state === 'start')
              if (i >= 0) steps[i] = { name: e.name, label: e.label, state: e.state }
              else steps.push({ name: e.name, label: e.label, state: e.state })
              return { ...m, steps }
            })
          else if (e.type === 'error') updateLast((m) => ({ ...m, error: e.message }))
          else if (e.type === 'done') refresh(e.changed)
        },
        controller.signal,
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const message = err instanceof Error ? err.message : 'The assistant didn’t answer. Try again.'
        setMessages((ms) => (ms.length && ms[ms.length - 1].role === 'assistant' ? ms : [...ms, { id: uid('a'), role: 'assistant', text: '', steps: [] }]))
        updateLast((m) => ({ ...m, error: message }))
      }
    } finally {
      updateLast((m) => ({ ...m, streaming: false }))
      abort.current = null
      setBusy(false)
      loadSessions()
    }
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
          <p className="truncate text-[13px] text-muted">Plans your visa, checks your documents, prefills forms</p>
        </div>
        <History_
          sessions={sessions}
          current={current}
          onPick={setCurrent}
          onDelete={async (id) => {
            try {
              await api.deleteChat(id)
              if (id === current) setCurrent(null)
              loadSessions()
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Conversation wasn’t deleted.', 'error')
            }
          }}
        />
        {current && (
          <button
            type="button"
            onClick={() => setCurrent(null)}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-muted hover:bg-rose-100 hover:text-forest-950 disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden /> <span className="hidden sm:inline">New</span>
          </button>
        )}
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto px-5 py-6 sm:px-9">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading conversation…
          </p>
        ) : messages.length === 0 ? (
          <div className="mx-auto max-w-[560px] py-4">
            <p className="text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">{today}</p>
            <h1 className="font-display mt-4 text-[26px] leading-tight font-semibold text-forest-950 sm:text-[28px]">
              Hi {user?.firstName}, where are you heading?
            </h1>
            <p className="mt-6 text-[15px] text-muted">
              Tell me where you want to go, your citizenship and why. I’ll check your documents, list what’s missing with the fees, and turn it into a to-do plan.
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
            {messages.map((m) =>
              m.role === 'user' ? (
                <li key={m.id} className="animate-fade-in max-w-[85%] self-end rounded-2xl rounded-br-md bg-forest-950 px-4 py-3 text-[15px] whitespace-pre-wrap text-white">
                  {m.text}
                </li>
              ) : (
                <li key={m.id} className="animate-fade-in max-w-[92%] self-start rounded-2xl rounded-bl-md border-2 border-rose-200 bg-blush px-5 py-4 text-[15px]">
                  <Steps steps={m.steps} />
                  {m.text ? (
                    <Markdown remarkPlugins={[remarkGfm]} components={markdown}>
                      {m.text}
                    </Markdown>
                  ) : (
                    m.streaming && !m.steps.some((s) => s.state === 'start') && <p className="text-[13px] text-muted italic">Thinking…</p>
                  )}
                  {m.error && (
                    <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-brick-700">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {m.error}
                    </p>
                  )}
                </li>
              ),
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
        <div className="flex items-end gap-3">
          <label htmlFor="ask" className="sr-only">
            Ask the assistant
          </label>
          <textarea
            id="ask"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                ask(draft)
              }
            }}
            placeholder="e.g. I’m Russian and want to visit Hungary in December"
            maxLength={2000}
            className="max-h-40 min-h-12 min-w-0 flex-1 resize-none rounded-2xl border border-rose-200 bg-blush px-4 py-3 text-[15px] placeholder:text-muted outline-none [field-sizing:content] focus:border-forest-950 focus-visible:outline-none"
          />
          {busy ? (
            <button
              type="button"
              onClick={() => abort.current?.abort()}
              aria-label="Stop"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest-950 text-white hover:bg-forest-700"
            >
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brick-600 text-white transition-colors hover:bg-brick-700 disabled:opacity-50"
            >
              <ArrowRight className="size-5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">Guidance only, not legal advice. Rules come from Unbound’s verified country guidelines.</p>
      </form>
    </Card>
  )
}
