import { useState, useCallback } from 'react';

const G = '#1D9E75';
const G2 = '#0F6E56';
const O = '#D85A30';
const DARK = '#1a1814';
const MID = '#4a4540';
const LIGHT = '#8a857e';
const BG = '#f7f5f1';
const WHITE = '#ffffff';
const DANGER = '#dc2626';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── API helper ────────────────────────────────────────────────────────────
async function adminFetch(path, adminKey) {
  const res = await fetch(`${API_BASE}/api/admin${path}`, {
    headers: { 'x-admin-key': adminKey },
  });
  if (res.status === 401) throw new Error('Invalid admin key.');
  if (res.status === 503) throw new Error('Admin access is not configured on the server.');
  if (!res.ok) throw new Error(`Server error (${res.status})`);
  return res.json();
}

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = DARK }) {
  return (
    <div style={{ background: WHITE, borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: '"DM Sans", sans-serif', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: MID, marginTop: 6, fontFamily: '"DM Sans", sans-serif' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: LIGHT, marginTop: 3, fontFamily: '"DM Sans", sans-serif' }}>{sub}</div>}
    </div>
  );
}

// ── Sparkline bar chart ───────────────────────────────────────────────────
function SignupChart({ data }) {
  if (!data || data.length === 0) return <div style={{ color: LIGHT, fontSize: 13, fontFamily: '"DM Sans", sans-serif' }}>No signup data yet.</div>;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const last14 = data.slice(-14);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {last14.map((d, i) => (
        <div key={i} title={`${d.day}: ${d.count} signup${d.count !== 1 ? 's' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', background: `linear-gradient(180deg, ${G}, ${G2})`,
            borderRadius: '3px 3px 1px 1px', opacity: 0.85,
            height: `${Math.max(4, (d.count / maxCount) * 52)}px`,
            transition: 'height 0.3s ease',
          }} />
        </div>
      ))}
    </div>
  );
}

// ── User detail modal ─────────────────────────────────────────────────────
function UserDetailModal({ userId, adminKey, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useState(() => {
    adminFetch(`/users/${userId}`, adminKey)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setErr(e.message); setLoading(false); });
  });

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const avgScore = (scores) => {
    const vals = Object.values(scores || {}).filter(v => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: WHITE, borderRadius: 18, padding: 32, maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: DARK, fontFamily: '"Source Serif 4", serif' }}>User Detail</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: LIGHT, lineHeight: 1 }}>×</button>
        </div>

        {loading && <div style={{ color: LIGHT, fontFamily: '"DM Sans", sans-serif', fontSize: 14 }}>Loading…</div>}
        {err && <div style={{ color: DANGER, fontFamily: '"DM Sans", sans-serif', fontSize: 14 }}>{err}</div>}

        {data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                ['Name', data.user.name || '—'],
                ['Email', data.user.email],
                ['Signed up', fmtDate(data.user.created_at)],
                ['Verified', data.user.email_verified ? '✅ Yes' : '❌ No'],
                ['Exam', data.user.exam || '—'],
                ['Exam date', fmtDate(data.user.exam_date)],
                ['Hours/day', data.user.hours_per_day || '—'],
                ['Study window', data.user.study_start_time ? `${data.user.study_start_time} – ${data.user.study_end_time}` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: BG, borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: DARK, marginTop: 2, fontFamily: '"DM Sans", sans-serif', wordBreak: 'break-all' }}>{v}</div>
                </div>
              ))}
            </div>

            {data.assessments.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Assessments ({data.assessments.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {data.assessments.map(a => {
                    const avg = avgScore(a.scores);
                    return (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BG, borderRadius: 8, padding: '8px 12px' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: DARK, fontFamily: '"DM Sans", sans-serif' }}>{a.form_name || 'Unnamed'}</div>
                          <div style={{ fontSize: 11, color: LIGHT }}>{fmtDate(a.created_at)}</div>
                        </div>
                        {avg && <div style={{ fontSize: 13, fontWeight: 700, color: avg >= 70 ? G : avg >= 55 ? O : DANGER }}>{avg}% avg</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {data.plans.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Study Plans ({data.plans.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.plans.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: BG, borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ fontSize: 13, color: MID, fontFamily: '"DM Sans", sans-serif' }}>Plan #{p.id}</span>
                      <span style={{ fontSize: 11, color: LIGHT }}>{fmtDate(p.created_at)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── CSV export helper ─────────────────────────────────────────────────────
function exportCSV(users) {
  const headers = ['ID', 'Name', 'Email', 'Signed Up', 'Verified', 'Exam', 'Exam Date', 'Assessments', 'Plans', 'Last Assessment'];
  const rows = users.map(u => [
    u.id,
    u.name || '',
    u.email,
    u.created_at,
    u.email_verified ? 'Yes' : 'No',
    u.exam || '',
    u.exam_date || '',
    u.assessment_count,
    u.plan_count,
    u.last_assessment_at || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stepadapt-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Admin Page ───────────────────────────────────────────────────────
export default function AdminPage() {
  const [keyInput, setKeyInput] = useState('');
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('sa_admin_key') || '');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users'

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const loadData = useCallback(async (key) => {
    setLoading(true);
    setError('');
    try {
      const [statsData, usersData] = await Promise.all([
        adminFetch('/stats', key),
        adminFetch('/users', key),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setAuthed(true);
      sessionStorage.setItem('sa_admin_key', key);
    } catch (e) {
      setError(e.message);
      sessionStorage.removeItem('sa_admin_key');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setAdminKey(keyInput.trim());
    loadData(keyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sa_admin_key');
    setAuthed(false);
    setAdminKey('');
    setKeyInput('');
    setStats(null);
    setUsers([]);
  };

  // Auto-login if key was in sessionStorage
  useState(() => {
    if (adminKey) loadData(adminKey);
  });

  // Filtered + sorted users
  const filteredUsers = users
    .filter(u => {
      const q = search.toLowerCase();
      return !q || u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  // ── Login screen ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '"DM Sans", sans-serif' }}>
        <div style={{ background: WHITE, borderRadius: 20, padding: '40px 36px', boxShadow: '0 4px 40px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.08)', width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${G}, ${G2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 22, fontWeight: 800, margin: '0 auto 14px' }}>S</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif' }}>StepAdapt Admin</div>
            <div style={{ fontSize: 13, color: LIGHT, marginTop: 6 }}>Enter your admin key to continue</div>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 6 }}>Admin Key</label>
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="Enter your admin key"
                autoFocus
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0dcd6', fontSize: 14, fontFamily: '"DM Sans", sans-serif', background: '#fafffe', outline: 'none', boxSizing: 'border-box', color: DARK }}
              />
            </div>
            {error && (
              <div style={{ background: '#dc26260d', border: '1px solid #dc262620', color: DANGER, borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${G}, ${G2})`, color: WHITE, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Checking…' : 'Access Dashboard →'}
            </button>
          </form>

          <div style={{ marginTop: 20, padding: '12px 14px', background: '#f0f9f5', borderRadius: 8, border: `1px solid ${G}20` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Security note</div>
            <div style={{ fontSize: 12, color: MID, lineHeight: 1.55 }}>Your admin key is stored only for this browser session. It is cleared automatically when you close the browser.</div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '"DM Sans", sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: WHITE, borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${G}, ${G2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontWeight: 800, fontSize: 14 }}>S</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>StepAdapt</span>
          <span style={{ fontSize: 12, background: '#dc26261a', color: DANGER, borderRadius: 4, padding: '2px 7px', fontWeight: 700 }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => loadData(adminKey)} style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', color: MID, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          <button onClick={handleLogout} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#dc26261a', color: DANGER, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 28px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: WHITE, borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid rgba(0,0,0,0.08)' }}>
          {[['overview', '📊 Overview'], ['users', '👥 Users']].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding: '7px 18px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: activeTab === t ? `linear-gradient(135deg, ${G}, ${G2})` : 'transparent',
              color: activeTab === t ? WHITE : MID, transition: 'all 0.2s',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────── */}
        {activeTab === 'overview' && stats && (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
              <StatCard label="Total Users" value={stats.totals.total_users} color={G} />
              <StatCard label="Verified" value={stats.totals.verified_users} sub={`${Math.round((stats.totals.verified_users / Math.max(stats.totals.total_users, 1)) * 100)}% of total`} />
              <StatCard label="New Today" value={stats.totals.new_today} color={O} />
              <StatCard label="New This Week" value={stats.totals.new_this_week} />
              <StatCard label="New This Month" value={stats.totals.new_this_month} />
              <StatCard label="Total Assessments" value={stats.totalAssessments} />
              <StatCard label="Total Plans" value={stats.totalPlans} />
            </div>

            {/* Signup chart */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 28 }}>
              <div style={{ background: WHITE, borderRadius: 14, padding: '22px 24px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Signups — last 14 days</div>
                <SignupChart data={stats.signupsByDay} />
                <div style={{ fontSize: 11, color: LIGHT, marginTop: 8 }}>Hover bars for daily counts</div>
              </div>

              <div style={{ background: WHITE, borderRadius: 14, padding: '22px 24px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Exam Breakdown</div>
                {stats.examBreakdown.length === 0
                  ? <div style={{ fontSize: 13, color: LIGHT }}>No exam data yet.</div>
                  : stats.examBreakdown.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: DARK, minWidth: 80 }}>{e.exam}</div>
                      <div style={{ flex: 1, height: 8, background: BG, borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${G}, ${G2})`, width: `${(e.count / stats.examBreakdown[0].count) * 100}%` }} />
                      </div>
                      <div style={{ fontSize: 12, color: MID, minWidth: 24, textAlign: 'right' }}>{e.count}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* ── Users tab ────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or email…"
                style={{ flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e0dcd6', fontSize: 13, fontFamily: '"DM Sans", sans-serif', background: WHITE, outline: 'none', color: DARK }}
              />
              <button onClick={() => exportCSV(filteredUsers)} style={{ padding: '9px 18px', borderRadius: 9, border: `1.5px solid ${G}40`, background: `${G}10`, color: G2, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ↓ Export CSV ({filteredUsers.length})
              </button>
            </div>

            {/* Table */}
            <div style={{ background: WHITE, borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 80px 70px 70px 80px', gap: 0, padding: '10px 16px', background: BG, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                {[
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['created_at', 'Signed Up'],
                  ['email_verified', 'Verified'],
                  ['assessment_count', 'Scores'],
                  ['plan_count', 'Plans'],
                  [null, 'Detail'],
                ].map(([col, label]) => (
                  <div key={label}
                    onClick={col ? () => toggleSort(col) : undefined}
                    style={{ fontSize: 11, fontWeight: 700, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.07em', cursor: col ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {label}{col && <SortIcon col={col} />}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {filteredUsers.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: LIGHT, fontSize: 13 }}>No users found.</div>
              )}
              {filteredUsers.map((u, i) => (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 80px 70px 70px 80px',
                  padding: '11px 16px', borderBottom: i < filteredUsers.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  background: i % 2 === 1 ? '#fafaf9' : WHITE, alignItems: 'center',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = `${G}08`}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 1 ? '#fafaf9' : WHITE}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || <span style={{ color: LIGHT }}>—</span>}</div>
                  <div style={{ fontSize: 12, color: MID, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ fontSize: 11, color: LIGHT }}>{fmtDate(u.created_at)}</div>
                  <div style={{ fontSize: 13 }}>{u.email_verified ? '✅' : '❌'}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: u.assessment_count > 0 ? G : LIGHT }}>{u.assessment_count}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: u.plan_count > 0 ? G : LIGHT }}>{u.plan_count}</div>
                  <button onClick={() => setSelectedUserId(u.id)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${G}30`, background: `${G}0d`, color: G2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>View →</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: LIGHT, textAlign: 'right' }}>{filteredUsers.length} of {users.length} users</div>
          </>
        )}
      </div>

      {/* User detail modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          adminKey={adminKey}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
