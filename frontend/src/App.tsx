import { useEffect, type ReactNode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { buttonClass } from '@/components/ui/button-class'
import { AssistantPage } from '@/pages/app/Assistant'
import { CostsPage } from '@/pages/app/Costs'
import { DocumentsPage } from '@/pages/app/Documents'
import { FormViewPage } from '@/pages/app/FormView'
import { FinancesPage } from '@/pages/app/Finances'
import { AdminDataPage } from '@/pages/app/AdminData'
import { JourneyDetailPage } from '@/pages/app/JourneyDetail'
import { JourneysPage } from '@/pages/app/Journeys'
import { ProfilePage } from '@/pages/app/Profile'
import { TodoPage } from '@/pages/app/Todo'
import { GOOGLE_CLIENT_ID, LoginPage, SignupPage } from '@/pages/public/Auth'
import { LandingPage } from '@/pages/public/Landing'
import { AuthProvider, CaseProvider, ToastProvider } from '@/store/providers'

/** Scrolls to #hash targets and resets scroll on page change. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

function NotFound() {
  return (
    <div className="grid min-h-svh place-content-center gap-4 bg-blush px-4 text-center">
      <p className="font-display text-6xl font-semibold text-rose-300">404</p>
      <h1 className="text-xl font-semibold">This page doesn’t exist</h1>
      <Link to="/" className={buttonClass('primary', 'md', 'mx-auto')}>
        Go to the home page
      </Link>
    </div>
  )
}

/** Loads Google's sign-in script only when a client ID is configured. */
function GoogleProvider({ children }: { children: ReactNode }) {
  return GOOGLE_CLIENT_ID ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider> : children
}

export default function App() {
  return (
    <GoogleProvider>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CaseProvider>
              <ScrollManager />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<AssistantPage />} />
                  <Route path="assistant" element={<Navigate to="/app" replace />} />
                  <Route path="journeys" element={<JourneysPage />} />
                  <Route path="journeys/:id" element={<JourneyDetailPage />} />
                  <Route path="journey" element={<Navigate to="/app/journeys" replace />} />
                  <Route path="admin/data" element={<AdminDataPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="forms/:id" element={<FormViewPage />} />
                  <Route path="finances" element={<FinancesPage />} />
                  <Route path="finances/costs" element={<CostsPage />} />
                  <Route path="todo" element={<TodoPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </CaseProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </GoogleProvider>
  )
}
