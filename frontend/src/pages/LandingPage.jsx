import { useState, useEffect, useRef } from 'react';

const G = '#1D9E75';
const G2 = '#0F6E56';
const O = '#D85A30';
const DARK = '#1a1814';
const MID = '#4a4540';
const LIGHT = '#8a857e';
const BG = '#f7f5f1';
const WHITE = '#ffffff';

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

function useFadeIn(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// ── Mock Dashboard Preview ─────────────────────────────────────────────────
function DashboardPreview() {
  const bars = [42, 67, 55, 78, 61, 83, 70, 91];
  const trend = [52, 58, 54, 63, 67, 72, 76, 81];
  const W = 480, H = 80;
  const pts = trend.map((v, i) => `${(i / (trend.length - 1)) * W},${H - ((v - 40) / 60) * H}`).join(' ');
  const area = `0,${H} ${pts} ${W},${H}`;

  return (
    <div style={{
      background: WHITE, borderRadius: 20, boxShadow: '0 24px 80px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.06)',
      padding: 24, width: '100%', maxWidth: 540, fontFamily: '"DM Sans", sans-serif',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${G}, ${G2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontSize: 14, fontWeight: 700 }}>S</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>StepAdapt Dashboard</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#ff5f57', '#ffbd2e', '#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Days to Exam', value: '47', color: O },
          { label: 'Avg Score', value: '76%', color: G },
          { label: 'Score Delta', value: '+14pts', color: '#2563eb' },
        ].map(c => (
          <div key={c.label} style={{ background: BG, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 10, color: LIGHT, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Score trend */}
      <div style={{ background: BG, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Score Trend</div>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 50, display: 'block' }}>
          <defs>
            <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={G} stopOpacity="0.18" />
              <stop offset="100%" stopColor={G} stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#tg)" />
          <polyline points={pts} fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {trend.map((v, i) => (
            <circle key={i} cx={(i / (trend.length - 1)) * W} cy={H - ((v - 40) / 60) * H} r="3.5" fill={WHITE} stroke={G} strokeWidth="2" />
          ))}
        </svg>
      </div>

      {/* Category heatmap mini */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[
          ['Cardio', 83, G], ['Resp', 61, '#2563eb'], ['Neuro', 44, '#dc2626'],
          ['GI', 72, '#2563eb'], ['Renal', 55, O], ['Heme', 78, G],
          ['MSK', 67, '#2563eb'], ['ID', 89, G],
        ].map(([cat, score, col]) => (
          <div key={cat} style={{ background: col + '18', borderLeft: `3px solid ${col}`, borderRadius: '0 6px 6px 0', padding: '5px 8px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: col }}>{score}%</div>
            <div style={{ fontSize: 9, color: MID, marginTop: 1 }}>{cat}</div>
          </div>
        ))}
      </div>

      {/* Today's schedule mini */}
      <div style={{ marginTop: 12, background: BG, borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: LIGHT, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Today — Day 12</div>
        {[
          { time: '7:00 AM – 9:15 AM', label: 'UWorld Questions', color: G },
          { time: '9:30 AM – 11:00 AM', label: 'First Aid Review', color: '#2563eb' },
          { time: '11:00 AM – 11:30 AM', label: '☕ Lunch break', color: LIGHT, light: true },
          { time: '11:30 AM – 1:00 PM', label: 'Pathoma Videos', color: O },
        ].map((b, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
            borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.05)' : 'none', opacity: b.light ? 0.6 : 1,
          }}>
            <div style={{ width: 3, height: 28, borderRadius: 2, background: b.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 10, color: LIGHT }}>{b.time}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: DARK }}>{b.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Feature Card ───────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay = 0, visible }) {
  return (
    <div style={{
      background: WHITE, borderRadius: 16, padding: '28px 24px', border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
    }}>
      <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: DARK, fontFamily: '"Source Serif 4", serif', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: MID, lineHeight: 1.65, fontFamily: '"DM Sans", sans-serif' }}>{desc}</div>
    </div>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────
function Step({ n, title, desc, visible, delay = 0 }) {
  return (
    <div style={{
      display: 'flex', gap: 20, alignItems: 'flex-start',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : 'translateX(-24px)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${G}, ${G2})`,
        color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, fontWeight: 700, fontFamily: '"DM Sans", sans-serif', flexShrink: 0,
        boxShadow: `0 4px 16px ${G}40`,
      }}>{n}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: DARK, fontFamily: '"Source Serif 4", serif', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: MID, lineHeight: 1.65, fontFamily: '"DM Sans", sans-serif' }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Pricing Card ──────────────────────────────────────────────────────────
function PricingCard({ tier, price, period, features, cta, highlight, onCTA }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: highlight ? `linear-gradient(160deg, ${G}, ${G2})` : WHITE,
        borderRadius: 20, padding: '36px 32px',
        border: highlight ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
        boxShadow: highlight ? `0 20px 60px ${G}40` : '0 4px 20px rgba(0,0,0,0.06)',
        transform: highlight ? 'scale(1.04)' : hovered ? 'translateY(-4px)' : 'none',
        transition: 'all 0.25s ease',
        position: 'relative', flex: 1,
      }}
    >
      {highlight && (
        <div style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: O, color: WHITE, fontSize: 11, fontWeight: 700,
          padding: '4px 14px', borderRadius: 20, fontFamily: '"DM Sans", sans-serif',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>Most Popular</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: highlight ? 'rgba(255,255,255,0.75)' : LIGHT, fontFamily: '"DM Sans", sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{tier}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: highlight ? WHITE : DARK, fontFamily: '"DM Sans", sans-serif' }}>{price}</span>
        {period && <span style={{ fontSize: 14, color: highlight ? 'rgba(255,255,255,0.6)' : LIGHT, fontFamily: '"DM Sans", sans-serif' }}>{period}</span>}
      </div>
      <div style={{ height: 1, background: highlight ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: highlight ? 'rgba(255,255,255,0.9)' : MID, fontFamily: '"DM Sans", sans-serif', lineHeight: 1.45 }}>
            <span style={{ color: highlight ? WHITE : G, fontWeight: 700, fontSize: 13, marginTop: 1, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={onCTA}
        style={{
          width: '100%', padding: '13px', borderRadius: 10, border: highlight ? 'none' : `1.5px solid ${G}`,
          background: highlight ? WHITE : 'transparent', color: highlight ? G : G,
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
          transition: 'all 0.2s ease',
        }}
      >{cta}</button>
    </div>
  );
}

// ── Testimonial ───────────────────────────────────────────────────────────
function Testimonial({ quote, name, school, score, visible, delay = 0 }) {
  return (
    <div style={{
      background: WHITE, borderRadius: 16, padding: '28px 26px', border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
    }}>
      <div style={{ fontSize: 28, color: G, fontFamily: '"Source Serif 4", serif', marginBottom: 8, lineHeight: 1 }}>"</div>
      <div style={{ fontSize: 14, color: MID, lineHeight: 1.7, fontFamily: '"DM Sans", sans-serif', marginBottom: 20 }}>{quote}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: DARK, fontFamily: '"DM Sans", sans-serif' }}>{name}</div>
          <div style={{ fontSize: 12, color: LIGHT, fontFamily: '"DM Sans", sans-serif' }}>{school}</div>
        </div>
        <div style={{ background: G + '18', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: G, fontFamily: '"DM Sans", sans-serif' }}>{score}</div>
      </div>
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted, onSignIn }) {
  const scrollY = useScrollY();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [featRef, featVis] = useFadeIn();
  const [howRef, howVis] = useFadeIn();
  const [testRef, testVis] = useFadeIn();
  const [priceRef, priceVis] = useFadeIn();
  const [ctaRef, ctaVis] = useFadeIn();
  const [heroRef, heroVis] = useFadeIn(0.01);

  const navScrolled = scrollY > 40;

  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', background: BG, color: DARK, overflowX: 'hidden' }}>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? 'rgba(247,245,241,0.95)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${G}, ${G2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontWeight: 800, fontSize: 16 }}>S</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif', letterSpacing: '-0.01em' }}>StepAdapt</span>
          </div>

          {/* Desktop links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'How It Works', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 14, fontWeight: 500, color: MID, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = MID}>{l}</a>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={onSignIn} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>Sign In</button>
            <button onClick={onGetStarted} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${G}, ${G2})`, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', boxShadow: `0 4px 14px ${G}40` }}>Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${G}12 0%, transparent 70%), linear-gradient(180deg, #f0f9f5 0%, ${BG} 100%)`,
        padding: '120px 24px 80px',
      }}>
        <div ref={heroRef} style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', width: '100%' }}>

          {/* Left — copy */}
          <div style={{ transition: 'opacity 0.8s ease, transform 0.8s ease', opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(30px)' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, background: G + '18', borderRadius: 20,
              padding: '5px 14px', marginBottom: 24, border: `1px solid ${G}30`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: G, display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: G, letterSpacing: '0.05em', textTransform: 'uppercase' }}>AI-Powered USMLE Prep</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(38px, 5vw, 58px)', fontWeight: 800, color: DARK,
              fontFamily: '"Source Serif 4", serif', lineHeight: 1.1, margin: '0 0 20px',
              letterSpacing: '-0.02em',
            }}>
              Ace Your USMLE.<br />
              <span style={{ color: G }}>Smarter,</span> Not Harder.
            </h1>

            <p style={{ fontSize: 18, color: MID, lineHeight: 1.7, margin: '0 0 36px', maxWidth: 480 }}>
              StepAdapt builds a personalized study plan directly from your NBME scores — with AI-powered insights, time-blocked daily schedules, and adaptive coaching to maximize every hour you study.
            </p>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 36 }}>
              <button onClick={onGetStarted} style={{
                padding: '15px 32px', borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, ${G}, ${G2})`, color: WHITE,
                fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
                boxShadow: `0 6px 24px ${G}50`, transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 30px ${G}50`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 6px 24px ${G}50`; }}
              >
                Start Free Today →
              </button>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ padding: '15px 28px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.12)', background: WHITE, color: DARK, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>
                See How It Works
              </button>
            </div>

            {/* Social proof strip */}
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                { n: '500+', label: 'students' },
                { n: '+14pts', label: 'avg score lift' },
                { n: 'Step 1 & 2', label: 'CK supported' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif' }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: LIGHT }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — dashboard preview */}
          <div style={{
            transition: 'opacity 1s ease 0.3s, transform 1s ease 0.3s',
            opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(40px) scale(0.97)',
            display: 'flex', justifyContent: 'center',
          }}>
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Trust band ─────────────────────────────────────────────── */}
      <div style={{ background: DARK, padding: '18px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
          {['Built for USMLE Step 1 & Step 2 CK', 'AI-powered score analysis', 'Personalized day-by-day schedule', 'No credit card to start'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: '"DM Sans", sans-serif' }}>
              <span style={{ color: G, fontWeight: 700 }}>✓</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px' }}>
        <div ref={featRef} style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Everything You Need</div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Your entire study toolkit,<br />in one place
            </h2>
            <p style={{ fontSize: 16, color: MID, maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>Stop guessing what to study. StepAdapt analyzes exactly where you stand and tells you precisely what to do next.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            <FeatureCard icon="📸" title="AI Score Parsing" desc="Upload a screenshot or PDF of your NBME score report. Our AI instantly extracts every category score — no manual entry, no mistakes." delay={0} visible={featVis} />
            <FeatureCard icon="🧠" title="Adaptive Study Plans" desc="Your plan is built around your weaknesses. High-yield categories get more time; categories you've mastered get less. It recalibrates every time." delay={100} visible={featVis} />
            <FeatureCard icon="⏰" title="Time-Blocked Schedules" desc="Set your preferred study window — 7am to 5pm, 11am to 7pm, whatever fits your life. Every block gets an exact clock time with automatic breaks." delay={200} visible={featVis} />
            <FeatureCard icon="💬" title="AI Study Coach" desc="Ask anything. Confused about a concept? Not sure which resource to use? Your AI coach has context on your scores and your plan." delay={300} visible={featVis} />
            <FeatureCard icon="📊" title="Category Heatmap" desc="See every subject — Cardio, Neuro, GI, Renal — color-coded by your performance. Red means it needs work. Green means you're dialed in." delay={400} visible={featVis} />
            <FeatureCard icon="📈" title="Score Trend Charts" desc="Track your improvement across every NBME you've taken. Watch your score climb as your study plan adapts to your progress." delay={500} visible={featVis} />
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '96px 24px', background: `linear-gradient(160deg, ${G}08 0%, transparent 60%)` }}>
        <div ref={howRef} style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Steps */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif', margin: '0 0 40px', letterSpacing: '-0.02em' }}>
              From your scores to<br />a plan in minutes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <Step n={1} title="Upload your NBME score" desc="Screenshot or PDF — our AI reads your complete score report and extracts every subject score automatically." visible={howVis} delay={0} />
              <Step n={2} title="Review your weak spots" desc="StepAdapt shows you exactly where you lost points with color-coded categories and personalized insights." visible={howVis} delay={100} />
              <Step n={3} title="Get your time-blocked plan" desc="A day-by-day, hour-by-hour study schedule built around your exam date and daily availability — with real clock times." visible={howVis} delay={200} />
              <Step n={4} title="Track, adapt, and improve" desc="Log new assessments to watch your trend. Your plan updates as you improve, so you're always working on what matters most." visible={howVis} delay={300} />
            </div>
          </div>

          {/* Visual callout */}
          <div style={{
            background: WHITE, borderRadius: 20, padding: '36px 32px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)',
            transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
            opacity: howVis ? 1 : 0, transform: howVis ? 'none' : 'translateX(30px)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Sample weekly breakdown</div>
            {[
              { day: 'Monday', focus: 'Cardio + Resp', resource: 'UWorld + Pathoma', time: '7:00 AM – 5:00 PM', pct: 90 },
              { day: 'Tuesday', focus: 'Neuro', resource: 'First Aid + Sketchy', time: '7:00 AM – 5:00 PM', pct: 85 },
              { day: 'Wednesday', focus: 'GI + Renal', resource: 'UWorld + Goljan', time: '7:00 AM – 3:00 PM', pct: 70 },
              { day: 'Thursday', focus: 'Mixed NBME', resource: 'Practice block', time: '8:00 AM – 1:00 PM', pct: 60 },
              { day: 'Friday', focus: 'Heme + MSK', resource: 'Anki + UWorld', time: '7:00 AM – 4:00 PM', pct: 80 },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: DARK, fontFamily: '"DM Sans", sans-serif' }}>{r.day}: </span>
                    <span style={{ fontSize: 13, color: MID, fontFamily: '"DM Sans", sans-serif' }}>{r.focus}</span>
                  </div>
                  <span style={{ fontSize: 11, color: LIGHT, fontFamily: '"DM Sans", sans-serif' }}>{r.time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: '#f0ede8', borderRadius: 3 }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${G}, ${G2})` }} />
                  </div>
                  <span style={{ fontSize: 11, color: LIGHT, fontFamily: '"DM Sans", sans-serif', width: 80, textAlign: 'right' }}>{r.resource}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px', background: BG }}>
        <div ref={testRef} style={{ maxWidth: 1120, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Student Results</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif', margin: 0, letterSpacing: '-0.02em' }}>
              Real students. Real results.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <Testimonial
              quote="I went from a 220 on my first NBME to a 251 on the actual Step 1. The time-blocked schedule was game-changing — I never had to wonder what to do next."
              name="Jordan M." school="Third-year, Midwest COM" score="251 on Step 1"
              visible={testVis} delay={0} />
            <Testimonial
              quote="The category heatmap showed me I was losing tons of points in Neuro. I didn't even realize it. Two weeks of focused review and my Neuro score jumped 18 points."
              name="Priya S." school="MS2, Northeast Medical School" score="+23pt improvement"
              visible={testVis} delay={100} />
            <Testimonial
              quote="I was drowning in resources and had no idea what to prioritize. StepAdapt basically built me a blueprint. The AI coach answered questions at 2am when I was panicking."
              name="Marcus T." school="Fourth-year, Southeast University" score="Step 2 CK: 262"
              visible={testVis} delay={200} />
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '96px 24px', background: `linear-gradient(160deg, ${G}08 0%, transparent 70%)` }}>
        <div ref={priceRef} style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{
            textAlign: 'center', marginBottom: 56,
            transition: 'opacity 0.7s ease, transform 0.7s ease',
            opacity: priceVis ? 1 : 0, transform: priceVis ? 'none' : 'translateY(24px)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: DARK, fontFamily: '"Source Serif 4", serif', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Simple, honest pricing
            </h2>
            <p style={{ fontSize: 16, color: MID, maxWidth: 440, margin: '0 auto', lineHeight: 1.65 }}>Start free. Upgrade when you're ready to unlock everything.</p>
          </div>

          <div style={{
            display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start',
            transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s',
            opacity: priceVis ? 1 : 0, transform: priceVis ? 'none' : 'translateY(30px)',
          }}>
            <PricingCard
              tier="Free"
              price="$0"
              features={[
                'Upload 1 NBME assessment',
                'Manual score entry',
                '1 generated study plan',
                'Basic score tracking',
                'Email support',
              ]}
              cta="Start for Free"
              highlight={false}
              onCTA={onGetStarted}
            />
            <PricingCard
              tier="Pro"
              price="$19"
              period="/ month"
              features={[
                'Unlimited NBME assessments',
                'AI score parsing (screenshot & PDF)',
                'Unlimited study plans',
                'Time-blocked daily schedules',
                'Category heatmap & score trends',
                'AI coaching chat — unlimited',
                'Export plans to PDF/calendar',
                'Priority support',
              ]}
              cta="Start 7-Day Free Trial"
              highlight={true}
              onCTA={onGetStarted}
            />
            <PricingCard
              tier="Annual Pro"
              price="$149"
              period="/ year"
              features={[
                'Everything in Pro',
                'Save $79 vs monthly',
                'Exam-day readiness report',
                'Early access to new features',
                'Priority support',
              ]}
              cta="Best Value — Save 34%"
              highlight={false}
              onCTA={onGetStarted}
            />
          </div>

          <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: LIGHT, fontFamily: '"DM Sans", sans-serif' }}>
            No credit card required to start. Cancel anytime.
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px' }}>
        <div ref={ctaRef} style={{
          maxWidth: 720, margin: '0 auto', textAlign: 'center',
          background: `linear-gradient(140deg, ${G}, ${G2})`,
          borderRadius: 24, padding: '64px 48px',
          boxShadow: `0 24px 80px ${G}50`,
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          opacity: ctaVis ? 1 : 0, transform: ctaVis ? 'none' : 'translateY(30px)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🩺</div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: WHITE, fontFamily: '"Source Serif 4", serif', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Your exam date won't wait.<br />Neither should you.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', margin: '0 0 36px', lineHeight: 1.65, maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            Join hundreds of medical students who stopped winging it and started studying with a purpose. Create your free account in 60 seconds.
          </p>
          <button onClick={onGetStarted} style={{
            padding: '16px 40px', borderRadius: 12, border: 'none',
            background: WHITE, color: G2,
            fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)', transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.15)'; }}
          >
            Create My Free Account →
          </button>
          <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Free forever plan available. No card needed.</div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.08)', padding: '40px 24px', background: BG }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: `linear-gradient(135deg, ${G}, ${G2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: WHITE, fontWeight: 800, fontSize: 14 }}>S</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: DARK, fontFamily: '"Source Serif 4", serif' }}>StepAdapt</span>
          </div>
          <div style={{ fontSize: 13, color: LIGHT }}>© {new Date().getFullYear()} StepAdapt. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Terms', 'Privacy', 'Contact'].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: LIGHT, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = G} onMouseLeave={e => e.target.style.color = LIGHT}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
