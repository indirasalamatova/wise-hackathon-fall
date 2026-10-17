import { useMemo, useState } from 'react'
import { NavLink } from 'react-router'
import { Flag } from '@/components/brand/Flag'
import { Badge, Card, CardTitle, PageHeader, Progress } from '@/components/ui/primitives'
import { budgetCountries, payments, proofOfFunds, wise } from '@/lib/mock-data'
import { cn, money, shortDate } from '@/lib/format'
import { usePersistentState } from '@/store/persist'

export function FinanceTabs() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative pb-3 text-[15px] font-semibold transition-colors',
      isActive ? 'text-forest-950 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brick-600' : 'text-muted hover:text-forest-950',
    )
  return (
    <nav aria-label="Finances" className="mb-6 flex gap-7 border-b border-rose-200">
      <NavLink to="/app/finances" end className={tab}>
        Overview
      </NavLink>
      <NavLink to="/app/finances/costs" className={tab}>
        Visa costs and payments
      </NavLink>
    </nav>
  )
}

function Stat({ label, value, sub, dark }: { label: string; value: string; sub: string; dark?: boolean }) {
  return (
    <Card tone={dark ? 'dark' : 'light'} className="px-5 py-4">
      <p className={cn('text-xs font-semibold tracking-[0.12em] uppercase', dark ? 'text-rose-300' : 'text-forest-950/80')}>{label}</p>
      <p className="font-display mt-4 text-[26px] leading-none font-semibold">{value}</p>
      <p className={cn('mt-2.5 text-[13px]', dark ? 'text-rose-300' : 'text-muted')}>{sub}</p>
    </Card>
  )
}

const MAX_LIVING = 1500

export function FinancesPage() {
  const [budget, setBudget] = usePersistentState('monthly-budget', 1100)
  const [selected, setSelected] = useState<string>('HU')

  const ranked = useMemo(() => [...budgetCountries].sort((a, b) => a.living - b.living), [])
  const bestFit = ranked.find((c) => c.living <= budget)
  const upcoming = payments.filter((p) => p.status === 'upcoming').sort((a, b) => a.date.localeCompare(b.date))
  const upcomingTotal = upcoming.reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <PageHeader eyebrow="Connected to Wise" title="Finances" subtitle="Where your money goes furthest, and what each visa asks you to prove." />
      <FinanceTabs />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat dark label="Available in Wise" value={money(wise.available)} sub={wise.balances} />
        <Stat label="Upcoming payments" value={money(upcomingTotal)} sub={upcoming[0] ? `Next: fee on ${shortDate(upcoming[upcoming.length - 1].date)}` : 'Nothing due'} />
        <Stat label="Monthly budget" value={money(budget)} sub="Set below" />
        <Stat label="Best fit right now" value={bestFit?.name ?? 'None yet'} sub={bestFit?.permit.replace(/\s*\(.*\)/, '') ?? 'Raise your budget'} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <CardTitle>Best country for my budget</CardTitle>
          <p className="mt-1 text-[13px] text-muted">
            Monthly budget {money(budget)} · Savings {money(wise.available)} · Stay after graduation
          </p>

          <label htmlFor="budget" className="mt-5 flex items-center justify-between text-sm font-semibold">
            Monthly budget <span className="font-display">{money(budget)}</span>
          </label>
          <input
            id="budget"
            type="range"
            min={600}
            max={1600}
            step={50}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-2 w-full accent-brick-600"
          />

          <ol className="mt-4 flex flex-col gap-2">
            {ranked.map((c, i) => {
              const fits = c.living <= budget
              const active = selected === c.code
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.code)}
                    aria-pressed={active}
                    className={cn(
                      'grid w-full grid-cols-[20px_26px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-2 bg-blush px-3 py-2.5 text-left sm:grid-cols-[20px_26px_minmax(0,1fr)_120px_auto]',
                      active ? 'border-forest-950 bg-rose-100' : 'border-transparent hover:border-rose-300',
                    )}
                  >
                    <span className="text-base font-semibold">{i + 1}</span>
                    <Flag code={c.code} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{c.name}</span>
                      <span className="block truncate text-xs text-muted">{c.permit}</span>
                    </span>
                    <span className="hidden sm:block">
                      <span className="block text-[11px] text-muted">Living €{c.living}/mo</span>
                      <Progress value={(c.living / MAX_LIVING) * 100} tone={fits ? 'dark' : 'accent'} className="mt-1 h-2" />
                    </span>
                    <Badge tone={fits ? 'ok' : 'danger'} className="min-w-[90px]">
                      {fits ? 'Fits' : `Short €${c.living - budget}/mo`}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>

        <Card className="p-6">
          <CardTitle>Proof-of-funds checker</CardTitle>
          <p className="mt-1 text-[13px] text-muted">Your Wise balance vs what each visa asks</p>
          <ul className="mt-6 flex flex-col gap-5">
            {proofOfFunds.map((p) => {
              const short = p.required - wise.available
              const covered = short <= 0
              return (
                <li key={p.code}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
                      <Flag code={p.code} />
                      <span className="truncate">{p.label}</span>
                    </span>
                    <Badge tone={covered ? 'ok' : 'danger'} className="min-w-[98px]">
                      {covered ? 'Covered' : `Short ${money(short)}`}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(100, (wise.available / p.required) * 100)}
                    tone={covered ? 'ok' : 'accent'}
                    label={`${p.label} funds covered`}
                  />
                </li>
              )
            })}
          </ul>
          <p className="mt-5 text-xs text-muted">Sample figures. Check current amounts with the official source.</p>
        </Card>
      </div>
    </>
  )
}
