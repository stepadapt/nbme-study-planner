import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';

const BRAND = { green: '#1D9E75', darkGreen: '#0F6E56', orange: '#D85A30' };

const S = {
  app: { fontFamily: '"Source Serif 4", Georgia, serif', minHeight: '100vh', background: 'linear-gradient(170deg, #f4fbf8 0%, #edf7f3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 20px 60px rgba(29,158,117,0.10)', border: '1px solid rgba(29,158,117,0.12)', width: '100%', maxWidth: 420 },
  sub: { fontSize: 14, color: '#6b6560', margin: '0 0 28px', fontFamily: '"DM Sans", sans-serif' },
  label: { fontSize: 12, fontWeight: 600, color: '#8a857e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6, fontFamily: '"DM Sans", sans-serif' },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0dcd6', fontSize: 15, fontFamily: '"DM Sans", sans-serif', background: '#fafffe', outline: 'none', boxSizing: 'border-box', color: '#2c2a26' },
  btn: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', background: BRAND.green, color: '#fff', marginTop: 20 },
  btnSecondary: { width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #e0dcd6', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', background: 'transparent', color: '#3a3630', marginTop: 10 },
  err: { padding: '10px 14px', borderRadius: 8, background: '#c0392b0d', border: '1px solid #c0392b20', color: '#c0392b', fontSize: 13, fontFamily: '"DM Sans", sans-serif', marginTop: 12 },
  success: { padding: '10px 14px', borderRadius: 8, background: '#1D9E750d', border: '1px solid #1D9E7530', color: '#0F6E56', fontSize: 13, fontFamily: '"DM Sans", sans-serif', marginTop: 12 },
  toggle: { textAlign: 'center', marginTop: 20, fontSize: 13, fontFamily: '"DM Sans", sans-serif', color: '#6b6560' },
  link: { color: BRAND.green, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' },
  field: { marginBottom: 16 },
  checkRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16 },
  checkLabel: { fontSize: 13, fontFamily: '"DM Sans", sans-serif', color: '#6b6560', lineHeight: 1.5, cursor: 'pointer' },
};

export default function AuthPage({ onShowTerms, initialMode = 'login', onBackToLanding }) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot'
  const [form, setForm] = useState({ email: '', password: '', name: '', agreedToTerms: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => () => setForm(f => ({ ...f, [k]: !f[k] }));

  const switchMode = (m) => { setMode(m); setError(''); setSuccess(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else if (mode === 'signup') {
        if (!form.email || !form.password) { setError('Email and password are required'); return; }
        if (!form.agreedToTerms) { setError('Please agree to the Terms of Service and Privacy Policy to continue'); return; }
        await signup(form.email, form.password, form.name, form.agreedToTerms);
      } else if (mode === 'forgot') {
        await api.auth.forgotPassword(form.email);
        setSuccess('If an account exists with that email, a reset link has been sent. Check your inbox (and spam folder).');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.app}>
      <div style={S.card}>
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a857e', fontSize: 13, fontFamily: '"DM Sans", sans-serif', padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            ← Back to home
          </button>
        )}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.svg" alt="StepAdapt" style={{ width: 200, marginBottom: 16 }} />
          <p style={S.sub}>
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'signup' && 'Create a free account'}
            {mode === 'forgot' && 'Reset your password'}
          </p>
        </div>

        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div style={S.field}>
              <label style={S.label}>Name (optional)</label>
              <input style={S.input} type="text" placeholder="Your name" value={form.name} onChange={set('name')} />
            </div>
          )}

          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
          </div>

          {mode !== 'forgot' && (
            <div style={S.field}>
              <label style={S.label}>Password</label>
              <input
                style={S.input}
                type="password"
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>
          )}

          {mode === 'signup' && (
            <div style={S.checkRow}>
              <input
                id="tos"
                type="checkbox"
                checked={form.agreedToTerms}
                onChange={toggle('agreedToTerms')}
                style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
              />
              <label htmlFor="tos" style={S.checkLabel}>
                I agree to the{' '}
                <span style={S.link} onClick={(e) => { e.preventDefault(); onShowTerms('terms'); }}>Terms of Service</span>
                {' '}and{' '}
                <span style={S.link} onClick={(e) => { e.preventDefault(); onShowTerms('privacy'); }}>Privacy Policy</span>
              </label>
            </div>
          )}

          {mode === 'login' && (
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <span
                style={{ fontSize: 12, fontFamily: '"DM Sans", sans-serif', color: '#8a857e', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => switchMode('forgot')}
              >
                Forgot password?
              </span>
            </div>
          )}

          {error && <div style={S.err}>{error}</div>}
          {success && <div style={S.success}>{success}</div>}

          <button type="submit" style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : mode === 'signup' ? 'Create account →' : 'Send reset link →'}
          </button>

          {mode === 'forgot' && (
            <button type="button" style={S.btnSecondary} onClick={() => switchMode('login')}>
              ← Back to sign in
            </button>
          )}
        </form>

        {mode !== 'forgot' && (
          <div style={S.toggle}>
            {mode === 'login' ? (
              <>Don't have an account? <span style={S.link} onClick={() => switchMode('signup')}>Sign up</span></>
            ) : (
              <>Already have an account? <span style={S.link} onClick={() => switchMode('login')}>Sign in</span></>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
