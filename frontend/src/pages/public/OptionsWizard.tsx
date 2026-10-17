import { useState } from 'react'
import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Flag } from '@/components/brand/Flag'
import { Button, ButtonLink } from '@/components/ui/Button'
import { destinations } from '@/lib/mock-data'
import { cn } from '@/lib/format'
import type { CountryCode } from '@/lib/types'

const reasons = [
  { id: 'study', label: 'Study', hint: 'Bachelor, master or exchange' },
  { id: 'work', label: 'Work', hint: 'You have a job offer' },
  { id: 'search', label: 'Look for work', hint: 'After graduating or between jobs' },
  { id: 'family', label: 'Join family', hint: 'Partner or parent already lives there' },
] as const

type Reason = (typeof reasons)[number]['id']

const pathways: Record<Reason, { permit: string; time: string; needs: string[] }> = {
  study: { permit: 'Residence permit for study', time: '4–8 weeks', needs: ['Letter of admission', 'Proof of funds for 12 months', 'Health insurance', 'Proof of accommodation'] },
  work: { permit: 'EU Blue Card or work permit', time: '6–12 weeks', needs: ['Signed work contract', 'Recognised degree', 'Salary above threshold', 'Health insurance'] },
  search: { permit: 'Job-seeker residence', time: '4–10 weeks', needs: ['Degree certificate', 'Proof of funds', 'Health insurance', 'CV and motivation letter'] },
  family: { permit: 'Family reunification permit', time: '8–16 weeks', needs: ['Marriage or birth certificate', 'Sponsor’s residence permit', 'Housing contract', 'Basic language certificate'] },
}

/** "Try it in 30 seconds" from the home deck: country → reason → likely pathway. */
export function OptionsWizard() {
  const [step, setStep] = useState(0)
  const [country, setCountry] = useState<CountryCode | null>(null)
  const [reason, setReason] = useState<Reason | null>(null)
  const dest = destinations.find((d) => d.code === country)
  const path = reason ? pathways[reason] : null

  const canContinue = (step === 0 && country) || (step === 1 && reason)

  return (
    <div className="rounded-[28px] bg-white p-5 text-forest-950 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-brick-600 uppercase">Step {step + 1} of 3</p>
        <ol className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className={cn('h-1.5 w-8 rounded-full', i <= step ? 'bg-brick-600' : 'bg-rose-100')} />
          ))}
        </ol>
      </div>

      {step === 0 && (
        <>
          <h3 className="font-display text-xl font-semibold">Where do you want to go?</h3>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {destinations.map((d) => (
              <button
                key={d.code}
                type="button"
                aria-pressed={country === d.code}
                onClick={() => setCountry(d.code)}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-2xl border-2 p-3.5 text-left transition-colors',
                  country === d.code ? 'border-forest-950 bg-rose-100' : 'border-rose-200 hover:border-rose-300',
                )}
              >
                <Flag code={d.code} />
                <span>
                  <span className="block text-sm font-semibold">{d.name}</span>
                  <span className="block text-xs text-muted">{d.cities}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h3 className="font-display text-xl font-semibold">Why are you moving to {dest?.name}?</h3>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {reasons.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={reason === r.id}
                onClick={() => setReason(r.id)}
                className={cn(
                  'rounded-2xl border-2 p-4 text-left transition-colors',
                  reason === r.id ? 'border-forest-950 bg-rose-100' : 'border-rose-200 hover:border-rose-300',
                )}
              >
                <span className="block font-semibold">{r.label}</span>
                <span className="block text-[13px] text-muted">{r.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && path && dest && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <Flag code={dest.code} className="h-6 w-9" />
            <h3 className="font-display text-xl font-semibold">{path.permit}</h3>
          </div>
          <p className="mt-2 text-[15px] text-muted">
            {dest.name} · usually takes {path.time} to decide
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {path.needs.map((n) => (
              <li key={n} className="flex items-center gap-2.5 rounded-xl bg-blush px-3.5 py-3 text-sm">
                <Check className="size-4 shrink-0 text-brick-600" strokeWidth={3} aria-hidden /> {n}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">Sample guidance for this prototype. Final requirements depend on your situation and current rules.</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            Continue
          </Button>
        ) : (
          <ButtonLink to="/signup" variant="accent">
            Save my checklist
          </ButtonLink>
        )}
      </div>
      {step === 2 && (
        <p className="mt-3 text-right text-[13px] text-muted">
          Have an account?{' '}
          <Link to="/login" className="font-semibold text-forest-950 underline underline-offset-2">
            Log in
          </Link>
        </p>
      )}
    </div>
  )
}
