import { useState } from 'react';
import { api } from '../api.js';

const S = {
  app: { fontFamily: '"Source Serif 4", Georgia, serif', minHeight: '100vh', background: 'linear-gradient(170deg, #f4fbf8 0%, #edf7f3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#fff', borderRadius: 20, padding: '40px 36px', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 20px 60px rgba(29,158,117,0.10)', border: '1px solid rgba(29,158,117,0.12)', width: '100%', maxWidth: 420 },
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px', color: '#1a1816' },
  sub: { fontSize: 14, color: '#6b6560', margin: '0 0 28px', fontFamily: '"DM Sans", sans-serif' },
  label: { fontSize: 12, fontWeight: 600, color: '#8a857e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6, fontFamily: '"DM Sans", sans-serif' },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0dcd6', fontSize: 15, fontFamily: '"DM Sans", sans-serif', background: '#fafffe', outline: 'none', boxSizing: 'border-box', color: '#2c2a26' },
  btn: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', background: '#1D9E75', color: '#fff', marginTop: 20 },
  err: { padding: '10px 14px', borderRadius: 8, background: '#c0392b0d', border: '1px solid #c0392b20', color: '#c0392b', fontSize: 13, fontFamily: '"DM Sans", sans-serif', marginTop: 12 },
  success: { padding: '10px 14px', borderRadius: 8, background: '#1D9E750d', border: '1px solid #1D9E7530', color: '#0F6E56', fontSize: 13, fontFamily: '"DM Sans", sans-serif', marginTop: 12 },
  field: { marginBottom: 16 },
};

export default function ResetPassword({ token, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setSuccess('Password updated! You can now sign in with your new password.');
      setTimeout(() => onDone(), 2500);
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired — request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.app}>
      <div style={S.card}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.svg" alt="StepAdapt" style={{ width: 180, marginBottom: 16 }} />
          <h1 style={S.h1}>Set a new password</h1>
          <p style={S.sub}>Choose a strong password for your account</p>
        </div>

        <form onSubmit={submit}>
          <div style={S.field}>
            <label style={S.label}>New Password</label>
            <input style={S.input} type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Confirm Password</label>
            <input style={S.input} type="password" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>

          {error && <div style={S.err}>{error}</div>}
          {success && <div style={S.success}>{success}</div>}

          <button type="submit" style={{ ...S.btn, opacity: loading || success ? 0.6 : 1 }} disabled={loading || !!success}>
            {loading ? 'Saving…' : success ? 'Redirecting…' : 'Update password →'}
          </button>
        </form>
      </div>
    </div>
  );
}
