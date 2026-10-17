import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Flag } from '@/components/brand/Flag'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, Checkbox, PageHeader, Segmented } from '@/components/ui/primitives'
import { PayDialog } from '@/components/case/DocumentDialogs'
import { payments as seedPayments, visaOptions } from '@/lib/mock-data'
import { cn, money, shortDate, uid } from '@/lib/format'
import type { Payment } from '@/lib/types'
import { usePersistentState } from '@/store/persist'
import { FinanceTabs } from './Finances'

type Line = { on: boolean; qty: number }

function initLines(visaId: string): Record<string, Line> {
  const v = visaOptions.find((o) => o.id === visaId)!
  return Object.fromEntries(v.items.map((i) => [i.id, { on: i.defaultOn, qty: i.defaultQty ?? 1 }]))
}

function Calculator({ onPay }: { onPay: (amount: number, what: string) => void }) {
  const [visaId, setVisaId] = useState(visaOptions[0].id)
  const [lines, setLines] = useState(() => initLines(visaOptions[0].id))
  const visa = visaOptions.find((o) => o.id === visaId)!

  const { total, official } = useMemo(() => {
    let total = 0
    let official = 0
    for (const i of visa.items) {
      const l = lines[i.id]
      if (!l?.on) continue
      const cost = (i.unit ?? 0) * (i.qty ? l.qty : 1)
      total += cost
      if (i.official) official += cost
    }
    return { total, official }
  }, [visa, lines])

  const set = (id: string, patch: Partial<Line>) => setLines((ls) => ({ ...ls, [id]: { ...ls[id], ...patch } }))

  return (
    <Card className="p-6">
      <CardTitle>Visa cost calculator</CardTitle>
      <div className="relative mt-4">
        <Flag code={visa.code} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" />
        <label htmlFor="visa" className="sr-only">
          Visa
        </label>
        <select
          id="visa"
          value={visaId}
          onChange={(e) => {
            setVisaId(e.target.value)
            setLines(initLines(e.target.value))
          }}
          className="h-12 w-full appearance-none rounded-2xl border-2 border-rose-200 bg-white pr-10 pl-14 text-[15px] outline-none focus:border-forest-950"
        >
          {visaOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2" aria-hidden />
      </div>

      <ul className="mt-4 flex flex-col">
        {visa.items.map((i) => {
          const l = lines[i.id]
          const cost = l.on ? (i.unit ?? 0) * (i.qty ? l.qty : 1) : 0
          return (
            <li key={i.id} className="grid grid-cols-[auto_minmax(0,1fr)_64px_64px] items-center gap-3 py-2">
              <Checkbox checked={l.on} onChange={(on) => set(i.id, { on })} label={i.label} />
              <span className={cn('text-sm', !l.on && 'text-muted')}>{i.label}</span>
              {i.qty ? (
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={l.qty}
                  aria-label={`${i.label} quantity`}
                  onChange={(e) => set(i.id, { qty: Math.max(1, Math.min(24, Number(e.target.value) || 1)) })}
                  className="h-9 w-full rounded-lg border-2 border-rose-200 text-center text-sm outline-none focus:border-forest-950"
                />
              ) : (
                <span />
              )}
              <span className="text-right text-sm font-semibold">{money(cost)}</span>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-forest-950 px-5 py-5 text-white">
        <div>
          <p className="text-[13px] text-rose-300">Estimated total</p>
          <p className="font-display mt-2 text-[34px] leading-none font-semibold">{money(total)}</p>
          <p className="mt-2 text-xs text-rose-300">
            Official fees {money(official)} · everything else {money(total - official)}
          </p>
        </div>
        <Button variant="accent" disabled={official === 0} onClick={() => onPay(official, `${visa.label} · official fee`)}>
          Pay fee with Wise
        </Button>
      </div>
    </Card>
  )
}

export function CostsPage() {
  const [payments, setPayments] = usePersistentState<Payment[]>('payments', seedPayments)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'paid'>('all')
  const [pay, setPay] = useState<{ amount: number; what: string } | null>(null)
  const list = payments.filter((p) => filter === 'all' || p.status === filter).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <PageHeader eyebrow="Finances" title="Visa costs and payments" subtitle="Estimate the full cost of a visa and track every payment." />
      <FinanceTabs />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Calculator onPay={(amount, what) => setPay({ amount, what })} />

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Payments history</CardTitle>
            <Segmented
              label="Filter payments"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'paid', label: 'Paid' },
              ]}
            />
          </div>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.15em] text-muted uppercase">
                <th className="py-2 font-semibold">Date</th>
                <th className="py-2 font-semibold">What</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-200 border-t border-rose-200">
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="py-3.5 pr-3 text-[13px] whitespace-nowrap text-muted">
                    {shortDate(p.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3.5 pr-3">
                    <span className="block font-semibold">{p.what}</span>
                    <span className={cn('text-xs font-semibold', p.status === 'paid' ? 'text-ok-700' : 'text-warn-700')}>
                      {p.status === 'paid' ? 'Paid' : 'Upcoming'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-semibold">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="py-8 text-center text-sm text-muted">No payments here yet.</p>}
        </Card>
      </div>

      <PayDialog
        open={!!pay}
        amount={pay?.amount ?? 0}
        what={pay?.what ?? ''}
        onClose={() => setPay(null)}
        onPaid={() =>
          pay &&
          setPayments((ps) => [
            { id: uid('p'), date: new Date().toISOString().slice(0, 10), what: pay.what, amount: pay.amount, status: 'paid' },
            ...ps,
          ])
        }
      />
    </>
  )
}
