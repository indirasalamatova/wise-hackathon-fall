import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/format'
import { useAuth } from '@/store/context'
import { LanguageMenu } from './LanguageMenu'

export function PublicHeader({ overlay = false }: { overlay?: boolean }) {
  const { session } = useAuth()
  const { t } = useI18n()
  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 w-full backdrop-blur-md transition-colors',
        overlay ? 'bg-forest-950/70 border-b border-white/10' : 'bg-forest-950'
      )}
    >
      <div className="mx-auto flex h-20 max-w-[1240px] items-center gap-6 px-4 sm:px-8">
        <Link to="/" aria-label={t('common.homeAria')}>
          <Logo />
        </Link>
        <nav className="ml-auto flex items-center gap-2 text-sm text-white sm:gap-5">
          <a href="/#features" className="hidden hover:text-rose-300 md:inline">
            {t('public.forEmployers')}
          </a>
          <LanguageMenu dark />
          {session ? (
            <ButtonLink to="/app" variant="accent" size="sm" className="h-10 px-5">
              {t('public.openCase')}
            </ButtonLink>
          ) : (
            <>
              <Link to="/login" className="px-2 font-semibold hover:text-rose-300">
                {t('common.logIn')}
              </Link>
              <ButtonLink to="/signup" variant="light" size="sm" className="h-10 px-5">
                {t('common.signUp')}
              </ButtonLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}