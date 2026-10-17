import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router'
import { Flag } from '@/components/brand/Flag'
import { Badge, Card, CardTitle, PageHeader, Progress } from '@/components/ui/primitives'
import { useI18n } from '@/i18n'
import { budgetCountries, proofOfFunds } from '@/lib/mock-data'
import { cn, money, shortDate } from '@/lib/format'
import { useAuth, useCase, useToast } from '@/store/context'

export function FinanceTabs() {
  const { t } = useI18n()
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative pb-3 text-[15px] font-semibold transition-colors',
      isActive ? 'text-forest-950 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brick-600' : 'text-muted hover:text-forest-950',
    )
  return (
    <nav aria-label={t('finances.title')} className="mb-6 flex gap-7 border-b border-rose-200">
      <NavLink to="/app/finances" end className={tab}>
        {t('finances.overview')}
      </NavLink>
      <NavLink to="/app/finances/costs" className={tab}>
        {t('finances.costsTab')}
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

/** A profile number edited live and saved once the input settles, not on every step. */
function useSavedNumber(key: 'monthlyBudget' | 'savings') {
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const { t } = useI18n()
  const saved = user?.[key] ?? 0
  const [value, setValue] = useState(saved)

  useEffect(() => {
    if (value === saved) return
    const timer = setTimeout(() => {
      updateUser({ [key]: value }).catch((e) => {
        setValue(saved)
        toast(e instanceof Error ? e.message : t('finances.saveFailed'), 'error')
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [key, value, saved, updateUser, toast, t])

  return [value, setValue] as const
}

export function FinancesPage() {
  const { payments } = useCase()
  const [budget, setBudget] = useSavedNumber('monthlyBudget')
  const [savings, setSavings] = useSavedNumber('savings')
  const [selected, setSelected] = useState<string>('HU')
  const { t, country } = useI18n()

  const ranked = useMemo(() => [...budgetCountries].sort((a, b) => a.living - b.living), [])
  const bestFit = ranked.find((c) => c.living <= budget)
  const paid = payments.filter((p) => p.status === 'paid')
  const paidTotal = paid.reduce((s, p) => s + p.amount, 0)

  return (
    <>
      <PageHeader title={t('finances.title')} subtitle={t('finances.subtitle')} />
      <FinanceTabs />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat dark label={t('finances.savings')} value={money(savings)} sub={t('finances.savingsSub')} />
        <Stat
          label={t('finances.paid')}
          value={money(paidTotal)}
          sub={paid[0] ? t('finances.lastPaid', { what: paid[0].what, date: shortDate(paid[0].date) }) : t('finances.noPayments')}
        />
        <Stat label={t('finances.budget')} value={money(budget)} sub={t('finances.budgetSub')} />
        <Stat
          label={t('finances.bestFit')}
          value={bestFit ? country(bestFit.code) : t('finances.none')}
          sub={bestFit ? t(bestFit.permit).replace(/\s*\(.*\)/, '') : t('finances.raise')}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="p-6">
          <CardTitle>{t('finances.bestCountry')}</CardTitle>
          <p className="mt-1 text-[13px] text-muted">
            {t('finances.summary', { budget: money(budget), savings: money(savings) })}
          </p>

          <label htmlFor="budget" className="mt-5 flex items-center justify-between text-sm font-semibold">
            {t('finances.budget')} <span className="font-display">{money(budget)}</span>
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
                      <span className="block text-sm font-semibold">{country(c.code)}</span>
                      <span className="block truncate text-xs text-muted">{t(c.permit)}</span>
                    </span>
                    <span className="hidden sm:block">
                      <span className="block text-[11px] text-muted">{t('finances.living', { amount: money(c.living) })}</span>
                      <Progress value={(c.living / MAX_LIVING) * 100} tone={fits ? 'dark' : 'accent'} className="mt-1 h-2" />
                    </span>
                    <Badge tone={fits ? 'ok' : 'danger'} className="min-w-[90px]">
                      {fits ? t('finances.fits') : t('finances.shortMonthly', { amount: money(c.living - budget) })}
                    </Badge>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>

        <Card className="p-6">
          <CardTitle>{t('finances.proof')}</CardTitle>
          <p className="mt-1 text-[13px] text-muted">{t('finances.proofSub')}</p>
          <label htmlFor="savings" className="mt-5 block text-sm font-semibold">
            {t('finances.yourSavings')}
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-muted">€</span>
            <input
              id="savings"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={savings || ''}
              placeholder="0"
              onChange={(e) => setSavings(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              className="h-11 w-full rounded-2xl border border-rose-300 bg-white pr-4 pl-9 text-[15px] outline-none focus:border-forest-950"
            />
          </div>
          <ul className="mt-6 flex flex-col gap-5">
            {proofOfFunds.map((p) => {
              const short = p.required - savings
              const covered = short <= 0
              const label = t(p.label, { country: country(p.code) })
              return (
                <li key={p.code}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2.5 text-sm font-semibold">
                      <Flag code={p.code} />
                      <span className="truncate">{label}</span>
                    </span>
                    <Badge tone={covered ? 'ok' : 'danger'} className="min-w-[98px]">
                      {covered ? t('finances.covered') : t('finances.short', { amount: money(short) })}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min(100, (savings / p.required) * 100)}
                    tone={covered ? 'ok' : 'accent'}
                    label={t('finances.fundsCovered', { label })}
                  />
                </li>
              )
            })}
          </ul>
          <p className="mt-5 text-xs text-muted">{t('finances.sample')}</p>
        </Card>
      </div>
    </>
  )
}
