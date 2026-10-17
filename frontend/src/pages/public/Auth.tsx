import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { GoogleLogin } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import wing from '@/assets/brand/wing-close.jpg'
import { Logo } from '@/components/brand/Logo'
import { useI18n } from '@/i18n'
import { useAuth } from '@/store/context'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function GoogleSignIn({ text }: { text: 'signin_with' | 'signup_with' }) {
  const { loginWithGoogle } = useAuth()
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!GOOGLE_CLIENT_ID) {
    const [before, after] = t('auth.notSetUp').split('{key}')
    return (
      <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
        {before}
        <code className="font-semibold">GOOGLE_CLIENT_ID</code>
        {after}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={loading ? 'pointer-events-none opacity-50' : undefined}>
        <GoogleLogin
          text={text}
          shape="pill"
          size="large"
          width="360"
          locale={language.toLowerCase()}
          onSuccess={async ({ credential }) => {
            if (!credential) return setError(t('auth.noAccount'))
            setLoading(true)
            setError(null)
            try {
              await loginWithGoogle(credential)
              navigate((location.state as { from?: string } | null)?.from ?? '/app', { replace: true })
            } catch (e) {
              setError(e instanceof Error ? e.message : t('auth.failed'))
            } finally {
              setLoading(false)
            }
          }}
          onError={() => setError(t('auth.cancelled'))}
        />
      </div>
      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {t('auth.opening')}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-rose-100 px-4 py-3 text-sm text-brick-700">
          {error}
        </p>
      )}
    </div>
  )
}

function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { session, sessionExpired } = useAuth()
  const { t } = useI18n()
  if (session) return <Navigate to="/app" replace />
  const signup = mode === 'signup'

  return (
    <div className="grid min-h-svh bg-blush lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative isolate hidden overflow-hidden bg-forest-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img src={wing} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-950/90 via-forest-950/40 to-forest-950" />
        <Link to="/" aria-label={t('common.homeAria')}>
          <Logo />
        </Link>
        <div>
          <p className="font-display max-w-[16ch] text-[44px] leading-[1.02] font-semibold tracking-tight">
            {t('landing.title1')} <span className="text-rose-300">{t('landing.title2')}</span>
          </p>
          <p className="mt-5 max-w-[40ch] text-sage-100/80">{t('auth.asideBody')}</p>
        </div>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-10">
        <Link to="/" aria-label={t('common.homeAria')} className="w-fit rounded-xl bg-forest-950 px-4 py-2.5 lg:hidden">
          <Logo />
        </Link>
        <div className="m-auto w-full max-w-[400px] py-10">
          <h1 className="font-display text-[30px] leading-tight font-semibold tracking-tight text-forest-950">
            {signup ? t('auth.signupTitle') : t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {signup ? t('auth.signupBody') : t('auth.loginBody')}
          </p>
          {sessionExpired && (
            <p role="status" className="mt-6 rounded-xl bg-warn-100 px-4 py-3 text-sm text-warn-700">
              {t('auth.expired')}
            </p>
          )}
          <div className="mt-8">
            <GoogleSignIn text={signup ? 'signup_with' : 'signin_with'} />
          </div>
          <p className="mt-8 text-sm text-muted">
            {signup ? t('auth.haveAccount') : t('auth.newHere')}{' '}
            <Link to={signup ? '/login' : '/signup'} className="font-semibold text-forest-950 underline underline-offset-2">
              {signup ? t('common.logIn') : t('auth.createFree')}
            </Link>
          </p>
          <p className="mt-10 text-xs text-muted">{t('common.notLawFirm')}</p>
        </div>
      </main>
    </div>
  )
}

export const LoginPage = () => <AuthPage mode="login" />
export const SignupPage = () => <AuthPage mode="signup" />
