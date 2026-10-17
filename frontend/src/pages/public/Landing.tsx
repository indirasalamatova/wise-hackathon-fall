import { Lock, Map, ShieldCheck, Users, UserCheck, Wallet, Building2, FileSearch, Server } from 'lucide-react'
import heroWing from '@/assets/brand/hero-wing.jpg'
import { Logo } from '@/components/brand/Logo'
import { Badge } from '@/components/ui/primitives'
import { ButtonLink } from '@/components/ui/Button'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { cn } from '@/lib/format'
import { OptionsWizard } from './OptionsWizard'

const steps = [
  { title: 'Tell us your situation', body: 'Passport, destination and purpose. Only the questions that matter, in about two minutes.' },
  { title: 'Get your pathway', body: 'The right permit, a personal checklist, fees and every deadline on one timeline.' },
  { title: 'Prepare and check', body: 'Upload once. AI checks names, dates and formats before you submit anything.' },
  { title: 'Stay on track', body: 'Reminders before renewals, help when you change status, and a plan for what comes next.' },
]

const lifecycle = ['Apply', 'Arrive', 'Stay', 'Transition', 'Next chapter']

const trust = [
  { icon: Lock, title: 'Encrypted documents', body: 'Only you and offices you approve' },
  { icon: UserCheck, title: 'You approve every step', body: 'Nothing submitted without you' },
  { icon: Users, title: 'Advisers on call', body: 'Licensed help for complex cases' },
  { icon: Server, title: 'Data stored in the EU', body: 'GDPR compliant' },
]

const footer = {
  Product: ['How it works', 'Check my options', 'Travel map', 'Pricing', 'For employers'],
  Resources: ['Help centre', 'Country guides', 'Deadline calculator', 'Blog'],
  Company: ['About us', 'Careers', 'Partners', 'Contact'],
  Legal: ['Privacy', 'Terms', 'Cookies', 'Accessibility'],
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-forest-950 text-white">
      <img src={heroWing} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[60%_65%]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-forest-950/95 via-forest-950/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-forest-950 to-transparent" />
      <PublicHeader overlay />

      <div className="mx-auto flex min-h-[min(820px,100svh)] max-w-[1240px] flex-col justify-center px-4 pt-28 pb-16 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-rose-300 uppercase">For students, expats and international hires</p>
        <h1 className="font-display mt-6 text-[clamp(44px,8.4vw,112px)] leading-[0.95] font-semibold tracking-[-0.03em]">
          Move abroad.
          <br />
          <span className="text-rose-300">Stay unbound.</span>
        </h1>
        <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-sage-100/90">
          One case for your whole immigration journey, from the first application to your next chapter. We tell you exactly what to do next.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink to="/#try" variant="accent" size="lg">
            Check my options
          </ButtonLink>
          <ButtonLink to="/#how" variant="ghost" size="lg" className="border-2 border-white/30 text-white hover:bg-white/10">
            How it works
          </ButtonLink>
        </div>
        <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm text-sage-100/80">
          <li className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-rose-300" aria-hidden /> Free to start
          </li>
          <li className="flex items-center gap-2">
            <Lock className="size-4 text-rose-300" aria-hidden /> Documents encrypted end to end
          </li>
          <li className="flex items-center gap-2">
            <Wallet className="size-4 text-rose-300" aria-hidden /> Visa fees and proof of funds with Wise
          </li>
        </ul>
      </div>
    </section>
  )
}

function Why() {
  return (
    <section id="how" className="bg-blush py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">Why Unbound</p>
        <h2 className="font-display mt-5 max-w-[22ch] text-[clamp(30px,4vw,48px)] leading-[1.08] font-semibold tracking-tight text-forest-950">
          Immigration is scattered across a dozen websites. We turn it into one case.
        </h2>
        <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-muted">
          Today you are the project manager of your own move: embassy pages, university emails, deadlines and the same documents uploaded
          again and again. Unbound remembers your case, knows what is done and what is missing, and tells you the next step.
        </p>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-card border border-rose-200 bg-rose-200 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-white p-7">
              <span className="font-display text-[40px] leading-none font-semibold text-rose-300">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-6 text-lg font-semibold text-forest-950">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
          <p className="font-display flex flex-wrap items-center gap-x-4 gap-y-2 text-lg font-medium text-forest-950/50 sm:text-xl">
            {lifecycle.map((l, i) => (
              <span key={l} className="flex items-center gap-4">
                <span className={cn(l === 'Stay' && 'rounded-full bg-forest-950 px-4 py-1 text-rose-300')}>{l}</span>
                {i < lifecycle.length - 1 && <span aria-hidden>·</span>}
              </span>
            ))}
          </p>
          <ButtonLink to="/#try" variant="primary" size="lg">
            Try it now
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

function TryIt() {
  return (
    <section id="try" className="bg-forest-900 py-24 text-white">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-4 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-rose-300 uppercase">Try it in 30 seconds</p>
          <h2 className="font-display mt-5 text-[clamp(30px,4vw,48px)] leading-[1.08] font-semibold tracking-tight">
            Where does your next chapter begin?
          </h2>
          <p className="mt-6 max-w-[42ch] text-[17px] leading-relaxed text-sage-100/80">
            Pick a country and a reason. We show the likely pathway, how long it takes and what you will need. Save it to get your full
            checklist.
          </p>
        </div>
        <OptionsWizard />
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="bg-sage-100 py-24">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-brick-600 uppercase">New on Unbound</p>
        <h2 className="font-display mt-5 max-w-[20ch] text-[clamp(30px,4vw,48px)] leading-[1.08] font-semibold tracking-tight text-forest-950">
          Built for the whole journey, not just the visa.
        </h2>

        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          <article className="rounded-card bg-forest-950 p-7 text-white lg:row-span-2">
            <Badge tone="accent">New</Badge>
            <FileSearch className="mt-6 size-7 text-rose-300" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold">AI document check</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-rose-300">
              Checks names, dates, issue window and format against your case before the office does.
            </p>
            <ul className="mt-8 flex flex-col gap-2.5">
              {[
                ['Passport', 'Valid to 2031', 'ok'],
                ['Bank statement', 'Meets minimum', 'ok'],
                ['Insurance', 'Ends too early', 'danger'],
              ].map(([n, s, t]) => (
                <li key={n} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3">
                  <span className="text-sm font-semibold">{n}</span>
                  <Badge tone={t as 'ok' | 'danger'}>{s}</Badge>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-card bg-white p-7">
            <Badge tone="accent">New</Badge>
            <Wallet className="mt-6 size-7 text-brick-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">Pay fees with Wise</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Visa and permit fees in local currency, proof of funds attached with consent.
            </p>
          </article>

          <article className="rounded-card bg-white p-7">
            <Badge tone="accent">New</Badge>
            <Map className="mt-6 size-7 text-brick-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">Travel map</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Where your passport and permit let you go, even mid-renewal.</p>
          </article>

          <article className="rounded-card border-2 border-dashed border-sage-300 p-7">
            <Badge tone="neutral" className="bg-sage-200">
              Coming soon
            </Badge>
            <Users className="mt-6 size-7 text-forest-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">Family cases</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">Partner and children on one plan with linked deadlines.</p>
          </article>

          <article className="rounded-card border-2 border-dashed border-sage-300 p-7">
            <Badge tone="neutral" className="bg-sage-200">
              Coming soon
            </Badge>
            <Building2 className="mt-6 size-7 text-forest-600" aria-hidden />
            <h3 className="mt-4 text-xl font-semibold text-forest-950">Unbound for employers</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">HR sees each hire’s permit status and next compliance actions.</p>
          </article>
        </div>

        <ul className="mt-14 grid gap-6 border-t border-sage-300 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <Icon className="mt-0.5 size-5 shrink-0 text-brick-600" aria-hidden />
              <div>
                <p className="font-semibold text-forest-950">{title}</p>
                <p className="text-sm text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <footer className="bg-forest-950 text-white">
      <div className="mx-auto max-w-[1240px] px-4 pt-24 sm:px-8">
        <div className="flex flex-col items-start gap-8 border-b border-white/10 pb-20 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display max-w-[18ch] text-[clamp(32px,4.4vw,56px)] leading-[1.05] font-semibold tracking-tight">
              Your next chapter starts with one case.
            </h2>
            <p className="mt-5 text-[17px] text-sage-100/80">Create a free account, answer a few questions and get your personal plan today.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/signup" variant="accent" size="lg">
              Create free account
            </ButtonLink>
            <ButtonLink to="/#try" variant="ghost" size="lg" className="border-2 border-white/30 text-white hover:bg-white/10">
              Check my options
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-10 py-14 md:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[30ch] text-sm text-sage-100/70">
              One persistent case for your immigration journey: apply, arrive, stay, transition.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-6 flex max-w-xs overflow-hidden rounded-full border border-white/20 focus-within:border-rose-300"
            >
              <label htmlFor="news" className="sr-only">
                Email for monthly rule changes
              </label>
              <input
                id="news"
                type="email"
                placeholder="Rule changes, monthly"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-sage-100/50 outline-none focus-visible:outline-none"
              />
              <button type="submit" className="bg-rose-300 px-4 py-2.5 text-sm font-semibold text-forest-950 hover:bg-rose-100">
                Subscribe
              </button>
            </form>
          </div>
          {Object.entries(footer).map(([group, links]) => (
            <div key={group}>
              <p className="text-sm font-semibold text-rose-300">{group}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-sage-100/70">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-white">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-xs text-sage-100/60 sm:flex-row sm:justify-between">
          <p>© 2026 Unbound, Budapest</p>
          <p>Unbound is not a law firm. Information is guidance only; for legal advice, book a licensed adviser.</p>
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
