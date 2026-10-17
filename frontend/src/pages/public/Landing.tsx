import { Lock, Map, ShieldCheck, Users, UserCheck, Wallet, Building2, FileSearch, Server } from 'lucide-react'
import heroWing from '@/assets/brand/hero-wing.jpg'
import { Logo } from '@/components/brand/Logo'
import { Badge } from '@/components/ui/primitives'
import { ButtonLink } from '@/components/ui/Button'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { useI18n, type Key } from '@/i18n'
import { cn } from '@/lib/format'
import { OptionsWizard } from './OptionsWizard'

const steps: { title: Key; body: Key }[] = [
  { title: 'landing.step1.title', body: 'landing.step1.body' },
  { title: 'landing.step2.title', body: 'landing.step2.body' },
  { title: 'landing.step3.title', body: 'landing.step3.body' },
  { title: 'landing.step4.title', body: 'landing.step4.body' },
]

const lifecycle: Key[] = ['stage.apply', 'stage.arrive', 'stage.stay', 'stage.transition', 'landing.nextChapter']

const trust: { icon: typeof Lock; title: Key; body: Key }[] = [
  { icon: Lock, title: 'landing.trust.encrypted.title', body: 'landing.trust.encrypted.body' },
  { icon: UserCheck, title: 'landing.trust.approve.title', body: 'landing.trust.approve.body' },
  { icon: Users, title: 'landing.trust.advisers.title', body: 'landing.trust.advisers.body' },
  { icon: Server, title: 'landing.trust.eu.title', body: 'landing.trust.eu.body' },
]

const footer: [Key, Key[]][] = [
  ['landing.footer.product', ['landing.howItWorks', 'landing.checkOptions', 'landing.footer.travelMap', 'landing.footer.pricing', 'public.forEmployers']],
  ['landing.footer.resources', ['landing.footer.help', 'landing.footer.guides', 'landing.footer.calculator', 'landing.footer.blog']],
  ['landing.footer.company', ['landing.footer.about', 'landing.footer.careers', 'landing.footer.partners', 'landing.footer.contact']],
  ['landing.footer.legal', ['landing.footer.privacy', 'landing.footer.terms', 'landing.footer.cookies', 'landing.footer.accessibility']],
]

function Hero() {
  const { t } = useI18n()
  return (
    <section className="relative isolate overflow-hidden bg-forest-950 text-white">
      <img src={heroWing} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_65%]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-950/95 via-forest-950/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-forest-950 to-transparent" />
      <PublicHeader overlay />

      <div className="mx-auto flex min-h-[min(820px,100svh)] max-w-[1240px] flex-col justify-center px-4 pt-28 pb-16 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-rose-300 uppercase">{t('landing.eyebrow')}</p>
        <h1 className="font-display mt-6 text-[clamp(44px,8.4vw,112px)] leading-[0.95] font-semibold tracking-[-0.03em]">
          {t('landing.title1')}
          <br />
          <span className="text-rose-300">{t('landing.title2')}</span>
        </h1>
        <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-sage-100/90">
          {t('landing.lead')}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink to="/#try" variant="accent" size="lg">
            {t('landing.checkOptions')}
          </ButtonLink>
          <ButtonLink to="/#how" variant="ghost" size="lg" className="border-2 border-white/30 text-white hover:bg-white/10">
            {t('landing.howItWorks')}
          </ButtonLink>
        </div>
        <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm text-sage-100/80">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-rose-300" aria-hidden /> {t('landing.freeToStart')}
          </li>
          <li className="flex items-center gap-2">
            <Lock className="size-4 text-rose-300" aria-hidden /> {t('landing.encrypted')}
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="size-4 text-rose-300" aria-hidden /> {t('landing.wiseFees')}
          </li>
        </ul>
      </div>
    </section>
  )
}

function Why() {
  const { t } = useI18n()
  return (
    <section id="how" className="bg-blush py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">{t('landing.why.eyebrow')}</p>
        <h2 className="font-display mt-5 max-w-[22ch] text-[clamp(30px,4vw,48px)] leading-[1.08] font-semibold tracking-tight text-forest-950">
          {t('landing.why.title')}
        </h2>
        <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-muted">
          {t('landing.why.body')}
        </p>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-card border border-rose-200 bg-rose-200 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-white p-7">
              <span className="font-display text-[40px] leading-none font-semibold text-rose-300">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-6 text-lg font-semibold text-forest-950">{t(s.title)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{t(s.body)}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
          <p className="font-display flex flex-wrap items-center gap-x-4 gap-y-2 text-lg font-medium text-forest-950/50 sm:text-xl">
            {lifecycle.map((l, i) => (
              <span key={l} className="flex items-center gap-4">
                <span className={cn(l === 'stage.stay' && 'rounded-full bg-forest-950 px-4 py-1 text-rose-300')}>{t(l)}</span>
                {i < lifecycle.length - 1 && <span aria-hidden>·</span>}
              </span>
            ))}
          </p>
          <ButtonLink to="/#try" variant="primary" size="lg">
            {t('landing.tryNow')}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

function TryIt() {
  const { t } = useI18n()
  return (
    <section id="try" className="bg-forest-900 py-24 text-white">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-rose-300 uppercase">{t('landing.try.eyebrow')}</p>
          <h2 className="font-display mt-5 text-[clamp(30px,4vw,48px)] leading-[1.08] font-semibold tracking-tight">
            {t('landing.try.title')}
          </h2>
          <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-sage-100/80">
            {t('landing.try.body')}
          </p>
        </div>
        <OptionsWizard />
      </div>
    </section>
  )
}

function Features() {
  const { t } = useI18n()
  return (
    <section id="features" className="bg-sage-100 py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">{t('landing.features.eyebrow')}</p>
        <h2 className="font-display mt-5 max-w-[20ch] text-[clamp(30px,4vw,48px)] leading-[1.08] font-semibold tracking-tight text-forest-950">
          {t('landing.features.title')}
        </h2>

        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <article className="rounded-card bg-forest-950 p-7 text-white lg:row-span-2">
            <Badge tone="accent">{t('landing.badge.new')}</Badge>
            <FileSearch className="mt-6 size-7 text-rose-300" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold">{t('landing.f.docCheck.title')}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-rose-300">
              {t('landing.f.docCheck.body')}
            </p>
            <ul className="mt-8 flex flex-col gap-2.5">
              {(
                [
                  ['landing.f.docCheck.passport', 'landing.f.docCheck.passportOk', 'ok'],
                  ['landing.f.docCheck.bank', 'landing.f.docCheck.bankOk', 'ok'],
                  ['landing.f.docCheck.insurance', 'landing.f.docCheck.insuranceBad', 'danger'],
                ] as const
              ).map(([n, s, tone]) => (
                <li key={n} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3">
                  <span className="text-sm font-semibold">{t(n)}</span>
                  <Badge tone={tone}>{t(s)}</Badge>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-card bg-white p-7">
            <Badge tone="accent">{t('landing.badge.new')}</Badge>
            <Wallet className="mt-6 size-7 text-brick-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">{t('landing.f.wise.title')}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              {t('landing.f.wise.body')}
            </p>
          </article>

          <article className="rounded-card bg-white p-7">
            <Badge tone="accent">{t('landing.badge.new')}</Badge>
            <Map className="mt-6 size-7 text-brick-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">{t('landing.f.map.title')}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t('landing.f.map.body')}</p>
          </article>

          <article className="rounded-card border-2 border-dashed border-sage-300 p-7">
            <Badge tone="neutral" className="bg-sage-200">
              {t('landing.badge.soon')}
            </Badge>
            <Users className="mt-6 size-7 text-forest-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">{t('landing.f.family.title')}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t('landing.f.family.body')}</p>
          </article>

          <article className="rounded-card border-2 border-dashed border-sage-300 p-7">
            <Badge tone="neutral" className="bg-sage-200">
              {t('landing.badge.soon')}
            </Badge>
            <Building2 className="mt-6 size-7 text-forest-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">{t('landing.f.employers.title')}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t('landing.f.employers.body')}</p>
          </article>
        </div>

        <ul className="mt-14 grid gap-6 border-t border-sage-300 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <Icon className="mt-0.5 size-5 shrink-0 text-brick-600" aria-hidden />
              <div>
                <p className="font-semibold text-forest-950">{t(title)}</p>
                <p className="text-sm text-muted">{t(body)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Closing() {
  const { t } = useI18n()
  return (
    <footer className="bg-forest-950 text-white">
      <div className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-8">
        <div className="flex flex-col items-start gap-8 border-b border-white/10 pb-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display max-w-[18ch] text-[clamp(32px,4.4vw,56px)] leading-[1.05] font-semibold tracking-tight">
              {t('landing.closing.title')}
            </h2>
            <p className="mt-5 text-[17px] text-sage-100/80">{t('landing.closing.body')}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/signup" variant="accent" size="lg">
              {t('landing.closing.create')}
            </ButtonLink>
            <ButtonLink to="/#try" variant="ghost" size="lg" className="border-2 border-white/30 text-white hover:bg-white/10">
              {t('landing.checkOptions')}
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[30ch] text-sm text-sage-100/70">
              {t('landing.footer.tagline')}
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 flex max-w-xs overflow-hidden rounded-full border border-white/20 focus-within:border-rose-300"
            >
              <label htmlFor="news" className="sr-only">
                {t('landing.footer.newsLabel')}
              </label>
              <input
                id="news"
                type="email"
                placeholder={t('landing.footer.newsPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-sage-100/50 outline-none focus-visible:outline-none"
              />
              <button type="submit" className="bg-rose-300 px-4 py-2.5 text-sm font-semibold text-forest-950 hover:bg-rose-100">
                {t('landing.footer.subscribe')}
              </button>
            </form>
          </div>
          {footer.map(([group, links]) => (
            <div key={group}>
              <p className="text-sm font-semibold text-rose-300">{t(group)}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-sage-100/70">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-white">
                      {t(l)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-sage-100/60 sm:flex-row sm:justify-between">
          <p>{t('landing.footer.copyright')}</p>
          <p>{t('landing.footer.disclaimer')}</p>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <>
      <Hero />
      <main>
        <Why />
        <TryIt />
        <Features />
      </main>
      <Closing />
    </>
  )
}
