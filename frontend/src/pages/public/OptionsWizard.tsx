import { useState } from 'react'
import { Link } from 'react-router'
import { Check } from 'lucide-react'
import { Flag } from '@/components/brand/Flag'
import { Button, ButtonLink } from '@/components/ui/Button'
import { useI18n, type Key } from '@/i18n'
import { destinations } from '@/lib/mock-data'
import { cn } from '@/lib/format'
import type { CountryCode } from '@/lib/types'

const reasons = ['study', 'work', 'search', 'family'] as const

type Reason = (typeof reasons)[number]

/** Keys under wizard.path.<reason>: permit, time and need1–4. */
const pathKey = (reason: Reason, part: string) => `wizard.path.${reason}.${part}` as Key

/** "Try it in 30 seconds" from the home deck: country → reason → likely pathway. */
export function OptionsWizard() {
  const [step, setStep] = useState(0)
  const [country, setCountry] = useState<CountryCode | null>(null)
  const [reason, setReason] = useState<Reason | null>(null)
  const { t, country: countryName } = useI18n()
  const dest = destinations.find((d) => d.code === country)

  const canContinue = (step === 0 && country) || (step === 1 && reason)

  return (
    <div className="rounded-[28px] bg-white p-5 text-forest-950 sm:p-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold tracking-[0.2em] text-brick-600 uppercase">{t('wizard.step', { n: step + 1 })}</p>
        <ol className="flex gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <li key={i} className={cn('h-1.5 w-8 rounded-full', i <= step ? 'bg-brick-600' : 'bg-rose-100')} />
          ))}
        </ol>
      </div>

      {step === 0 && (
        <>
          <h3 className="font-display text-xl font-semibold">{t('wizard.where')}</h3>
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
                  <span className="block text-sm font-semibold">{countryName(d.code)}</span>
                  <span className="block text-xs text-muted">{t(d.cities)}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h3 className="font-display text-xl font-semibold">{t('wizard.why', { country: dest ? countryName(dest.code) : '' })}</h3>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  'rounded-2xl border-2 p-4 text-left transition-colors',
                  reason === r ? 'border-forest-950 bg-rose-100' : 'border-rose-200 hover:border-rose-300',
                )}
              >
                <span className="block font-semibold">{t(`wizard.reason.${r}`)}</span>
                <span className="block text-[13px] text-muted">{t(`wizard.reason.${r}.hint`)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && reason && dest && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3">
            <Flag code={dest.code} className="h-6 w-9" />
            <h3 className="font-display text-xl font-semibold">{t(pathKey(reason, 'permit'))}</h3>
          </div>
          <p className="mt-2 text-[15px] text-muted">
            {t('wizard.takes', { country: countryName(dest.code), time: t(pathKey(reason, 'time')) })}
          </p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {['need1', 'need2', 'need3', 'need4'].map((n) => (
              <li key={n} className="flex items-center gap-2.5 rounded-xl bg-blush px-3.5 py-3 text-sm">
                <Check className="size-4 shrink-0 text-brick-600" strokeWidth={3} aria-hidden /> {t(pathKey(reason, n))}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">{t('wizard.sample')}</p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          {t('common.back')}
        </Button>
        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
            {t('common.continue')}
          </Button>
        ) : (
          <ButtonLink to="/signup" variant="accent">
            {t('wizard.save')}
          </ButtonLink>
        )}
      </div>
      {step === 2 && (
        <p className="mt-3 text-right text-[13px] text-muted">
          {t('wizard.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-forest-950 underline underline-offset-2">
            {t('common.logIn')}
          </Link>
        </p>
      )}
    </div>
  )
}
