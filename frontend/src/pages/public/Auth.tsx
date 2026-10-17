import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import wing from '@/assets/brand/wing-close.jpg'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/primitives'
import { useAuth } from '@/store/context'

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-svh bg-blush lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative isolate hidden overflow-hidden bg-forest-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img src={wing} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-950/90 via-forest-950/40 to-forest-950" />
        <Link to="/" aria-label="Unbound home">
          <Logo />
        </Link>
        <div>
          <p className="font-display max-w-[16ch] text-[44px] leading-[1.02] font-semibold tracking-tight">
            Move abroad. <span className="text-rose-300">Stay unbound.</span>
          </p>
          <p className="mt-5 max-w-[40ch] text-sage-100/80">
            Your permit, documents, deadlines and fees in one case that remembers everything.
          </p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-10">
        <Link to="/" aria-label="Unbound home" className="w-fit rounded-xl bg-forest-950 px-4 py-2.5 lg:hidden">
          <Logo />
        </Link>
        <div className="m-auto w-full max-w-[420px] py-10">
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-forest-950">{title}</h1>
          <p className="mt-2 text-[15px] text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-12" required />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-forest-950"
      >
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  )
}

function useAuthSubmit(fn: () => Promise<void>) {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await fn()
      navigate((location.state as { from?: string } | null)?.from ?? '/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }
  return { submit, loading, error }
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
      {error}
    </p>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('aigerim@example.com')
  const [password, setPassword] = useState('')
  const { submit, loading, error } = useAuthSubmit(() => login(email, password))
  if (user) return <Navigate to="/app" replace />

  return (
    <AuthShell
      title="Log in to your case"
      subtitle={
        <>
          New to Unbound?{' '}
          <Link to="/signup" className="font-semibold text-forest-950 underline underline-offset-2">
            Create a free account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint="Demo: any password with 6+ characters works.">
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <FormError error={error} />
        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Log in
        </Button>
        <button type="button" className="text-center text-sm font-semibold text-muted underline underline-offset-2 hover:text-forest-950">
          Forgot password?
        </button>
      </form>
    </AuthShell>
  )
}

export function SignupPage() {
  const { user, signup } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const { submit, loading, error } = useAuthSubmit(() => signup(form))
  if (user) return <Navigate to="/app" replace />
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  return (
    <AuthShell
      title="Create your free account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-forest-950 underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="first">
            <Input id="first" value={form.firstName} onChange={set('firstName')} autoComplete="given-name" required />
          </Field>
          <Field label="Last name" htmlFor="last">
            <Input id="last" value={form.lastName} onChange={set('lastName')} autoComplete="family-name" required />
          </Field>
        </div>
        <Field label="Email" htmlFor="su-email">
          <Input id="su-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="su-password" hint="At least 8 characters.">
          <PasswordInput id="su-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" />
        </Field>
        <FormError error={error} />
        <Button type="submit" variant="accent" size="lg" loading={loading} className="mt-1 w-full">
          Create free account
        </Button>
        <p className="text-center text-xs text-muted">
          By signing up you agree to the Terms and Privacy policy. Unbound is not a law firm.
        </p>
      </form>
    </AuthShell>
  )
}
