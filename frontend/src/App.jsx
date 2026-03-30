import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import StudyPlanner from './pages/StudyPlanner.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import TermsModal from './pages/TermsPage.jsx';
import { api } from './api.js';

// Admin portal — accessible via ?admin in the URL, completely separate from normal app flow
const IS_ADMIN_ROUTE = new URLSearchParams(window.location.search).has('admin');

// Parse ?action=xxx&token=xxx from URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return { action: params.get('action'), token: params.get('token') };
}

function clearUrlParams() {
  window.history.replaceState({}, '', window.location.pathname);
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
  const [showAuth, setShowAuth] = useState(false); // landing → auth transition
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'login'

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
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(170deg, #f4fbf8 0%, #edf7f3 100%)', gap: 16,
      }}>
        <img src="/logo.svg" alt="StepAdapt" style={{ width: 200 }} />
        <div style={{ fontFamily: '"DM Sans", sans-serif', fontSize: 14, color: '#8a857e' }}>Loading…</div>
      </div>
    );
  }

  // Password reset page — shown regardless of auth state
  if (urlAction === 'reset' && urlToken) {
    return (
      <>
        <ResetPassword token={urlToken} onDone={handleResetDone} />
        {termsPage && <TermsModal page={termsPage} onClose={() => setTermsPage(null)} />}
      </>
    );
  }

  return (
    <>
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
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
