import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import StudyPlanner from './pages/StudyPlanner.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import TermsModal from './pages/TermsPage.jsx';
import AnkiGuidePage from './pages/AnkiGuidePage.jsx';
import { api } from './api.js';

// Admin portal — accessible via ?admin in the URL, completely separate from normal app flow
const IS_ADMIN_ROUTE = new URLSearchParams(window.location.search).has('admin');

// Static guide pages — served without auth
const IS_ANKI_ROUTE = window.location.pathname === '/anki';

// Parse ?action=xxx&token=xxx from URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return { action: params.get('action'), token: params.get('token') };
}

function clearUrlParams() {
  window.history.replaceState({}, '', window.location.pathname);
}

// Shown only when an admin has impersonated a student. Lets them swap their
// own session token back in with one click.
function ImpersonationBanner() {
  const backup = typeof window !== 'undefined' ? localStorage.getItem('nbme_token_admin_backup') : null;
  if (!backup) return null;
  const exit = () => {
    localStorage.setItem('nbme_token', backup);
    localStorage.removeItem('nbme_token_admin_backup');
    window.location.href = '/';
  };
  const exitNoRestore = () => {
    localStorage.removeItem('nbme_token');
    localStorage.removeItem('nbme_token_admin_backup');
    window.location.href = '/';
  };
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      background: '#1a1814', color: '#fff', padding: '8px 16px',
      fontFamily: '"DM Sans", sans-serif', fontSize: 13, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    }}>
      <span>👁️ Viewing as student (admin session). All actions affect this account.</span>
      <button onClick={exit} style={{ background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Exit student view
      </button>
      <button onClick={exitNoRestore} title="Sign out completely" style={{ background: 'transparent', color: '#fff', border: '1px solid #fff5', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
        Sign out
      </button>
    </div>
  );
}

function VerifyBanner({ token, onVerified }) {
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.auth.verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Email verified!');
        clearUrlParams();
        onVerified();
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
        clearUrlParams();
      });
  }, [token, onVerified]);

  const bg = status === 'success' ? '#27ae600d' : status === 'error' ? '#c0392b0d' : '#f5f2ec';
  const border = status === 'success' ? '#27ae6030' : status === 'error' ? '#c0392b30' : '#e0dcd6';
  const color = status === 'success' ? '#1a7a45' : status === 'error' ? '#c0392b' : '#8a857e';

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: bg, border: `1px solid ${border}`, color, borderRadius: 10,
      padding: '10px 20px', fontSize: 14, fontFamily: '"DM Sans", sans-serif',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)', zIndex: 999, maxWidth: 480, textAlign: 'center',
    }}>
      {status === 'verifying' && '⏳ Verifying your email…'}
      {status === 'success' && `✅ ${message}`}
      {status === 'error' && `⚠️ ${message}`}
    </div>
  );
}

function AppContent() {
  const { user, loading, markEmailVerified } = useAuth();
  const [urlAction, setUrlAction] = useState(() => getUrlParams().action);
  const [urlToken, setUrlToken] = useState(() => getUrlParams().token);
  const [termsPage, setTermsPage] = useState(null); // null | 'terms' | 'privacy'
  const [showVerifyBanner, setShowVerifyBanner] = useState(false);
  // Check if we arrived from the Anki guide page CTA
  const arrivedMode = new URLSearchParams(window.location.search).has('signin') ? 'login' : 'signup';
  const arrivedFromGuide = new URLSearchParams(window.location.search).has('signup') || new URLSearchParams(window.location.search).has('signin');
  const [showAuth, setShowAuth] = useState(arrivedFromGuide); // landing → auth transition
  const [authMode, setAuthMode] = useState(arrivedMode); // 'signup' | 'login'

  // Handle email verification URL
  useEffect(() => {
    if (urlAction === 'verify' && urlToken) {
      setShowVerifyBanner(true);
    }
  }, [urlAction, urlToken]);

  const handleVerified = () => {
    markEmailVerified();
    setShowVerifyBanner(false);
    setUrlAction(null);
    setUrlToken(null);
  };

  const handleResetDone = () => {
    setUrlAction(null);
    setUrlToken(null);
    clearUrlParams();
    // Send user to login form after password reset
    setAuthMode('login');
    setShowAuth(true);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(170deg, #f4fbf8 0%, #edf7f3 100%)', gap: 16,
      }}>
        <img src="/logo.png" alt="StepAdapt" style={{ width: 200 }} />
        <div style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, color: '#8a857e' }}>Loading…</div>
      </div>
    );
  }

  // Password reset page — shown regardless of auth state.
  // Also shown with token=null so ResetPassword can display the "invalid link" error state.
  if (urlAction === 'reset') {
    return (
      <>
        <ResetPassword token={urlToken || null} onDone={handleResetDone} />
        {termsPage && <TermsModal page={termsPage} onClose={() => setTermsPage(null)} />}
      </>
    );
  }

  return (
    <>
      {user && <ImpersonationBanner />}
      {showVerifyBanner && urlToken && (
        <VerifyBanner token={urlToken} onVerified={handleVerified} />
      )}

      {user
        ? <StudyPlanner onShowTerms={setTermsPage} />
        : (showAuth
            ? <AuthPage onShowTerms={setTermsPage} initialMode={authMode} onBackToLanding={() => setShowAuth(false)} />
            : <LandingPage
                onGetStarted={() => { setAuthMode('signup'); setShowAuth(true); }}
                onSignIn={() => { setAuthMode('login'); setShowAuth(true); }}
                onShowTerms={setTermsPage}
              />
          )
      }

      {termsPage && <TermsModal page={termsPage} onClose={() => setTermsPage(null)} />}
    </>
  );
}

export default function App() {
  if (IS_ADMIN_ROUTE) return <AdminPage />;
  if (IS_ANKI_ROUTE) return (
    <AnkiGuidePage
      onGetStarted={() => { window.location.href = '/?signup=1'; }}
      onSignIn={() => { window.location.href = '/?signin=1'; }}
    />
  );
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
