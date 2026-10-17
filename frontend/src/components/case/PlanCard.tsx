import { Link } from 'react-router'
import { Check, CircleAlert, Circle } from 'lucide-react'
import { Badge, Card, CardTitle } from '@/components/ui/primitives'
import { cn, shortDate } from '@/lib/format'
import type { VisaPlan } from '@/lib/types'

const statusIcon = { satisfied: Check, problem: CircleAlert, missing: Circle } as const
const statusColor = { satisfied: 'bg-forest-950 text-white', problem: 'bg-brick-600 text-white', missing: 'bg-rose-100 text-muted' } as const

const money = (amount: string, currency: string) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount))

/** A plan built by the assistant. Every number here was computed by the backend rules. */
export function PlanCard({ plan }: { plan: VisaPlan }) {
  const done = plan.requirements.filter((r) => r.status === 'satisfied').length
  const totals = Object.entries(plan.feeTotals)
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>
            {plan.destinationName} · {plan.purpose.replace('_', ' ')}
          </CardTitle>
          <p className="mt-0.5 text-[13px] text-muted">
            {plan.visaType}
            {plan.travelDate && ` · arriving ${shortDate(plan.travelDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
            {plan.stayDays && ` for ${plan.stayDays} days`}
          </p>
        </div>
        <Badge tone={done === plan.requirements.length ? 'ok' : 'warn'}>
          {done} of {plan.requirements.length} ready
        </Badge>
      </div>

      {!plan.guidelineCurrent && (
        <p className="mt-3 rounded-xl bg-warn-100 px-3.5 py-2.5 text-xs text-warn-700">
          Information about {plan.destinationName} is being updated. This checklist is from when the plan was made.
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-2.5">
        {plan.requirements.map((r) => {
          const Icon = statusIcon[r.status]
          return (
            <li key={r.key} className="flex items-start gap-3">
              <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full', statusColor[r.status])}>
                <Icon className="size-3" strokeWidth={3} aria-label={r.status} />
              </span>
              <div className="min-w-0 text-sm">
                <p className={cn(r.status !== 'satisfied' && 'font-semibold')}>
                  {r.title}
                  {!r.mandatory && <span className="font-normal text-muted"> · optional</span>}
                </p>
                {r.status === 'satisfied' && r.matched_document && <p className="text-xs text-muted">{r.matched_document}</p>}
                {r.problems.flatMap((p) => p.problems).map((p, i) => (
                  <p key={i} className="text-xs text-brick-700">
                    {p}
                  </p>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-rose-200 pt-4">
        <div>
          <p className="text-xs text-muted">Fees</p>
          <p className="font-display text-xl font-semibold">{totals.length ? totals.map(([c, a]) => money(a, c)).join(' + ') : '—'}</p>
          {plan.feesNotFixed.length > 0 && <p className="text-xs text-muted">Plus {plan.feesNotFixed.join(', ').toLowerCase()} (amount varies)</p>}
        </div>
        <Link to="/app/todo" className="text-[13px] font-semibold underline underline-offset-2">
          See plan tasks
        </Link>
      </div>
    </Card>
  )
}
