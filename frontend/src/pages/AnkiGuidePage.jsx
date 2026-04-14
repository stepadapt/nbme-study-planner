import { useState, useEffect, useRef } from 'react';

const G = '#1D9E75';
const G2 = '#0F6E56';
const O = '#D85A30';
const DARK = '#1a1814';
const MID = '#4a4540';
const LIGHT = '#8a857e';
const BG = '#f7f5f1';
const WHITE = '#ffffff';

function useFadeIn(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const h = () => setY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return y;
}

// ── Section wrapper with fade-in ────────────────────────────────────────────
function Section({ id, children, style = {} }) {
  const [ref, vis] = useFadeIn();
  return (
    <section id={id} ref={ref} style={{
      maxWidth: 760, margin: '0 auto', padding: '72px 24px',
      transition: 'opacity 0.7s ease, transform 0.7s ease',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(28px)',
      ...style,
    }}>
      {children}
    </section>
  );
}

// ── Section heading ─────────────────────────────────────────────────────────
function H2({ children, accent }) {
  return (
    <h2 style={{
      fontFamily: '"Source Serif 4", serif', fontSize: 'clamp(24px, 4vw, 32px)',
      fontWeight: 700, color: DARK, margin: '0 0 8px', lineHeight: 1.2,
    }}>
      {accent && <span style={{ color: G }}>{accent} </span>}
      {children}
    </h2>
  );
}

function Lead({ children }) {
  return (
    <p style={{ fontSize: 16, color: MID, lineHeight: 1.75, margin: '0 0 40px', fontFamily: '"DM Sans", sans-serif' }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '0 24px' }} />;
}

// ── Callout card ────────────────────────────────────────────────────────────
function Callout({ icon, title, children, color = G }) {
  return (
    <div style={{
      background: color + '10', border: `1px solid ${color}30`,
      borderRadius: 14, padding: '20px 24px', marginBottom: 24,
      display: 'flex', gap: 16, alignItems: 'flex-start',
      fontFamily: '"DM Sans", sans-serif',
    }}>
      <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div>
        {title && <div style={{ fontWeight: 700, color: DARK, marginBottom: 4, fontSize: 15 }}>{title}</div>}
        <div style={{ fontSize: 14, color: MID, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Numbered step ────────────────────────────────────────────────────────────
function NumberedStep({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start', fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: `linear-gradient(135deg, ${G}, ${G2})`,
        color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, flexShrink: 0, boxShadow: `0 4px 12px ${G}35`,
      }}>{n}</div>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontWeight: 700, color: DARK, fontSize: 15, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: MID, lineHeight: 1.7 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Bullet list ──────────────────────────────────────────────────────────────
function BulletList({ items, color = G }) {
  return (
    <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', fontFamily: '"DM Sans", sans-serif' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ color, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
          <span style={{ fontSize: 14, color: MID, lineHeight: 1.65 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Deck comparison card ─────────────────────────────────────────────────────
function DeckCard({ name, best, pros, cons, recommended }) {
  return (
    <div style={{
      background: WHITE, borderRadius: 14, padding: '22px 24px',
      border: recommended ? `2px solid ${G}` : '1.5px solid rgba(0,0,0,0.08)',
      boxShadow: recommended ? `0 8px 32px ${G}20` : '0 2px 12px rgba(0,0,0,0.05)',
      position: 'relative', fontFamily: '"DM Sans", sans-serif',
    }}>
      {recommended && (
        <div style={{
          position: 'absolute', top: -11, left: 20,
          background: `linear-gradient(135deg, ${G}, ${G2})`,
          color: WHITE, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
          padding: '3px 12px', borderRadius: 20, textTransform: 'uppercase',
        }}>Recommended</div>
      )}
      <div style={{ fontWeight: 700, fontSize: 17, color: DARK, marginBottom: 4, fontFamily: '"Source Serif 4", serif' }}>{name}</div>
      <div style={{ fontSize: 12, color: G, fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{best}</div>
      <div style={{ fontSize: 13, color: MID, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, color: G }}>Pros: </span>{pros}
      </div>
      <div style={{ fontSize: 13, color: MID }}>
        <span style={{ fontWeight: 600, color: O }}>Cons: </span>{cons}
      </div>
    </div>
  );
}

// ── Code-block style schedule ────────────────────────────────────────────────
function ScheduleBlock({ time, label, detail, accent = DARK }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16,
      padding: '12px 0', borderBottom: '1px solid rgba(0,0,0,0.06)',
      fontFamily: '"DM Sans", sans-serif',
    }}>
      <div style={{ width: 3, background: accent, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0 }} />
      <div style={{ minWidth: 140, fontSize: 13, fontWeight: 600, color: LIGHT, fontVariantNumeric: 'tabular-nums' }}>{time}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{label}</div>
        {detail && <div style={{ fontSize: 13, color: MID, marginTop: 2, lineHeight: 1.5 }}>{detail}</div>}
      </div>
    </div>
  );
}

// ── Accordion FAQ item ───────────────────────────────────────────────────────
function FaqItem({ q, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12, marginBottom: 10,
      overflow: 'hidden', background: WHITE, fontFamily: '"DM Sans", sans-serif',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '18px 22px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: DARK, lineHeight: 1.4 }}>{q}</span>
        <span style={{
          flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
          background: open ? G : BG, color: open ? WHITE : MID,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, transition: 'all 0.2s', lineHeight: 1,
        }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{
          padding: '0 22px 18px', fontSize: 14, color: MID, lineHeight: 1.75,
          borderTop: '1px solid rgba(0,0,0,0.05)',
          paddingTop: 14,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Quick-nav pill ───────────────────────────────────────────────────────────
function QuickNav({ items }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
      margin: '32px 0 8px', padding: '0 24px',
    }}>
      {items.map(({ label, href }) => (
        <a key={href} href={href} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 18px', borderRadius: 24,
          border: `1.5px solid ${G}40`, background: G + '10',
          color: G2, fontSize: 13, fontWeight: 600,
          textDecoration: 'none', fontFamily: '"DM Sans", sans-serif',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = G + '22'; e.currentTarget.style.borderColor = G; }}
          onMouseLeave={e => { e.currentTarget.style.background = G + '10'; e.currentTarget.style.borderColor = G + '40'; }}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────────
function Table({ headers, rows }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontFamily: '"DM Sans", sans-serif', fontSize: 14,
      }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} style={{
                padding: '10px 16px', background: DARK, color: WHITE,
                textAlign: 'left', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? WHITE : BG }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '10px 16px', color: j === 0 ? DARK : MID,
                  fontWeight: j === 0 ? 600 : 400,
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Search suggestion chip ───────────────────────────────────────────────────
function SearchSuggestion({ query }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: '#1e1e1e', color: '#e8e8e8',
      borderRadius: 8, padding: '7px 14px', margin: '4px 6px 4px 0',
      fontSize: 13, fontFamily: 'ui-monospace, "SF Mono", monospace',
    }}>
      <span style={{ color: '#ff6b6b', flexShrink: 0 }}>▶</span>
      <span>Search YouTube: <em style={{ color: '#6bcb77' }}>"{query}"</em></span>
    </div>
  );
}

// ── Level badge ──────────────────────────────────────────────────────────────
function LevelBadge({ level, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: color + '15', border: `1.5px solid ${color}40`,
      borderRadius: 20, padding: '4px 14px', marginBottom: 16,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: '"DM Sans", sans-serif' }}>{level}</span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AnkiGuidePage({ onGetStarted, onSignIn }) {
  const scrollY = useScrollY();
  const navScrolled = scrollY > 40;

  return (
    <div style={{ fontFamily: '"DM Sans", sans-serif', background: BG, color: DARK, overflowX: 'hidden' }}>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? 'rgba(247,245,241,0.95)' : 'transparent',
        backdropFilter: navScrolled ? 'blur(12px)' : 'none',
        borderBottom: navScrolled ? '1px solid rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.3s ease', padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="StepAdapt" style={{ height: 42 }} />
          </a>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {onSignIn && (
              <button onClick={onSignIn} style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid rgba(0,0,0,0.12)', background: 'transparent', color: DARK, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif' }}>Sign In</button>
            )}
            {onGetStarted && (
              <button onClick={onGetStarted} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${G}, ${G2})`, color: WHITE, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif', boxShadow: `0 4px 14px ${G}40` }}>Get Started Free</button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${G}12 0%, transparent 70%), linear-gradient(180deg, #f0f9f5 0%, ${BG} 100%)`,
        padding: '140px 24px 60px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, background: G + '18',
            borderRadius: 20, padding: '5px 14px', marginBottom: 24, border: `1px solid ${G}30`,
          }}>
            <span style={{ fontSize: 14 }}>🃏</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: G, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Spaced Repetition Guide</span>
          </div>

          <h1 style={{
            fontFamily: '"Source Serif 4", serif', fontSize: 'clamp(34px, 5vw, 52px)',
            fontWeight: 800, color: DARK, lineHeight: 1.1, margin: '0 0 20px', letterSpacing: '-0.02em',
          }}>
            The Complete Anki Guide<br />
            <span style={{ color: G }}>for USMLE Step 1</span>
          </h1>

          <p style={{ fontSize: 18, color: MID, lineHeight: 1.7, margin: '0 0 12px', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
            Everything you need to know about using Anki effectively — from first install through exam week. Written for real pre-clinicals, not YouTube gurus.
          </p>

          <p style={{ fontSize: 13, color: LIGHT, fontStyle: 'italic', margin: '0 0 40px' }}>
            Updated April 2026 · ~12 min read
          </p>

          {/* Quick-nav */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: LIGHT, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jump to your level</p>
          </div>
        </div>

        <QuickNav items={[
          { label: '🧠 Why Anki Works', href: '#why-anki' },
          { label: '📦 Which Deck?', href: '#which-deck' },
          { label: '🌱 Never Used Anki', href: '#beginners' },
          { label: '📈 Growing Queue (1–6 mo)', href: '#intermediate' },
          { label: '⚡ Veteran Strategy', href: '#veteran' },
          { label: '📅 Daily Integration', href: '#schedule' },
          { label: '❓ FAQ', href: '#faq' },
        ]} />
      </div>

      <Divider />

      {/* ── Section 1: Why Anki Works ──────────────────────────────────── */}
      <Section id="why-anki">
        <H2 accent="Why">Anki Actually Works</H2>
        <Lead>
          Most students treat Anki like a fancy flashcard app. It isn't. It's a scheduling algorithm that exploits two of the most well-validated findings in cognitive science: spaced repetition and active recall. Understanding why it works will change how you use it.
        </Lead>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { icon: '📉', title: 'The Forgetting Curve', body: 'Within 24 hours you forget ~70% of what you read. Within a week, nearly all of it. Spaced repetition forces review at the exact moment before the memory fades — drilling the information deeper each time.' },
            { icon: '🔁', title: 'Active Recall', body: 'Generating an answer from memory is 2–4× more effective than re-reading. Every Anki card forces retrieval, which strengthens the neural pathway far more than passive study.' },
            { icon: '⏰', title: 'Compounding Retention', body: 'A card reviewed 5 times across 6 months takes under 5 minutes total. Without spaced repetition, you\'d spend hours re-learning the same material before the exam.' },
          ].map(c => (
            <div key={c.title} style={{ background: WHITE, borderRadius: 14, padding: '22px 20px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: DARK, fontFamily: '"Source Serif 4", serif', marginBottom: 8 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: MID, lineHeight: 1.65 }}>{c.body}</div>
            </div>
          ))}
        </div>

        <Callout icon="⚠️" title="The caveat no one tells you" color={O}>
          Anki only works if it's paired with actual understanding. Blindly clicking "Good" on cards you half-recognize without truly recalling the answer is worse than not reviewing at all — you create false confidence. If you can't reconstruct the concept in your own words, rate it Hard or Again.
        </Callout>
      </Section>

      <Divider />

      {/* ── Section 2: Which Deck ──────────────────────────────────────── */}
      <Section id="which-deck">
        <H2 accent="Which">Deck Should You Use?</H2>
        <Lead>
          There are three major pre-made decks used for Step 1. Don't make your own cards — you'll waste 40% of your study time on card creation instead of learning. Pick one and stick with it.
        </Lead>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <DeckCard
            name="AnKing Overhaul"
            best="Best for most students"
            pros="Most comprehensive, community-maintained, tagged by First Aid + Pathoma + Sketchy + UWorld, massive community support"
            cons="Overwhelming at first (50,000+ cards), requires tag filtering to manage scope"
            recommended
          />
          <DeckCard
            name="Pepper Decks"
            best="Best for visual learners"
            pros="Integrated with Sketchy images, excellent for micro/pharm mnemonics, smaller and more focused"
            cons="Less comprehensive for non-Sketchy content, not tagged for UWorld"
          />
          <DeckCard
            name="Mehlman Medical"
            best="Best for rapid review or late starters"
            pros="Small enough to complete entirely during dedicated (~1,000–2,000 cards), focused on the most frequently tested facts, pairs well with Mehlman's free HY PDFs"
            cons="Less comprehensive than AnKing — some Step 1 topics won't have cards. Not tagged to Pathoma/Sketchy. If a concept is missing, flag it in First Aid instead of making your own card."
          />
        </div>

        <Callout icon="💡" title="Our recommendation" color={G}>
          Use <strong>AnKing Overhaul</strong>. Filter by tags to only unsuspend cards as you cover topics — don't try to work through all 50,000 cards linearly. Start with First Aid chapter tags and add Pathoma/Sketchy tags as you go through those resources. StepAdapt will remind you which tags to unsuspend each day.
        </Callout>

        <p style={{ fontSize: 14, color: MID, lineHeight: 1.7 }}>
          <strong style={{ color: DARK }}>Don't mix decks.</strong> Using AnKing + Pepper creates duplicate cards and confusion about what you've already reviewed. Pick one and trust it.
        </p>
      </Section>

      <Divider />

      {/* ── Section 3: Beginners ───────────────────────────────────────── */}
      <Section id="beginners">
        <LevelBadge level="Never used Anki" color={G} />
        <H2>First-Time Setup Guide</H2>
        <Lead>
          From zero to a working Anki setup in about 30 minutes. Do this once and you'll never have to think about it again.
        </Lead>

        <NumberedStep n={1} title="Download Anki (Desktop First)">
          Go to <strong>apps.ankiweb.net</strong> and download the desktop app for Mac or Windows. The mobile app is useful for reviews on the go, but deck management must be done on desktop. Create a free AnkiWeb account so your reviews sync between devices.
        </NumberedStep>

        <NumberedStep n={2} title="Download the AnKing Overhaul Deck">
          Search for "AnKing Overhaul v12" on the AnkiWeb shared decks page, or download directly from AnKing's website (ankingmed.com). Import it into your desktop Anki. This will take several minutes — the deck is large.
        </NumberedStep>

        <NumberedStep n={3} title="Install the AnKing Add-ons">
          Open Anki → Tools → Add-ons → Get Add-ons. Install these two:
          <ul style={{ marginTop: 10, paddingLeft: 20, fontSize: 14, color: MID, lineHeight: 1.8 }}>
            <li><strong>FSRS4Anki</strong> (code: 759844601) — a smarter scheduling algorithm that outperforms the default</li>
            <li><strong>AnKing Note Types</strong> — required for card formatting to display correctly</li>
          </ul>
          After installing, restart Anki.
        </NumberedStep>

        <NumberedStep n={4} title="Configure Your Daily New Card Limit">
          Go to the AnKing deck → Options. Set new cards per day to <strong>50–75</strong> if you have 3+ months. If you have 6–8 weeks, start at 100–150. Reviews will be around 3–4× your new card count per day once the deck is established. Don't go higher than you can sustainably maintain.
        </NumberedStep>

        <NumberedStep n={5} title="Unsuspend by Tag — Don't Touch the Rest">
          All AnKing cards start suspended (greyed out). Only unsuspend cards for topics you've studied. In the Anki browser: search for a tag (e.g., <code style={{ background: '#f0ede8', padding: '1px 6px', borderRadius: 4, fontSize: 13 }}>#AK_Step1_v12::Cardiology</code>), select all, then Edit → Unsuspend. StepAdapt's plan will tell you which topics to cover each day — unsuspend the matching tags that evening.
        </NumberedStep>

        <Callout icon="🎬" title="Recommended videos for setup">
          <SearchSuggestion query="AnKing how to use Anki for Step 1 2024" />
          <SearchSuggestion query="FSRS4Anki setup tutorial medical school" />
        </Callout>
      </Section>

      <Divider />

      {/* ── Section 4: Intermediate ────────────────────────────────────── */}
      <Section id="intermediate">
        <LevelBadge level="1–6 months in" color="#2563eb" />
        <H2>Managing Your Growing Queue</H2>
        <Lead>
          The first wave of review overload usually hits around week 3–4. This is normal and fixable. The strategies below will keep your daily workload sustainable through dedicated study.
        </Lead>

        <BulletList items={[
          'Complete all due reviews before touching new cards. Reviews compound — skipping a day doubles the next day\'s backlog.',
          'If your review count exceeds 300/day, pause new cards until your backlog clears. Set new cards to 0 temporarily.',
          'Use the "Bury siblings" option so different card types for the same note don\'t appear on the same day.',
          'During dedicated study (8–10 weeks out), suspend low-yield tags (e.g., obscure anatomy) to focus on tested material.',
        ]} />

        <div style={{ fontWeight: 700, color: DARK, marginBottom: 16, fontSize: 15, fontFamily: '"DM Sans", sans-serif' }}>Suggested new card rates by timeline:</div>
        <Table
          headers={['Timeline to Exam', 'New Cards / Day', 'Expected Daily Reviews', 'Notes']}
          rows={[
            ['6+ months', '50–75', '150–250', 'Sustainable pace, build the habit'],
            ['3–6 months', '75–100', '250–350', 'Increase if reviews are manageable'],
            ['8–12 weeks (dedicated)', '100–150', '350–500', 'All resources active, high intensity'],
            ['4–8 weeks', '50', '400–600', 'Slow new cards, clear backlog'],
            ['Final 2 weeks', '0', 'Due reviews only', 'No new cards — master what you know'],
          ]}
        />

        <Callout icon="⚡" title="The 30-minute rule" color={G}>
          If your daily Anki session exceeds 90 minutes, you're either adding too many new cards or have a backlog. Cap reviews at 90 min, then stop. Spending 3 hours/day on Anki leaves no time for active learning and creates diminishing returns. USMLE questions come first.
        </Callout>

        <div style={{ fontWeight: 700, color: DARK, marginBottom: 12, fontSize: 15, fontFamily: '"DM Sans", sans-serif' }}>Using FSRS effectively:</div>
        <p style={{ fontSize: 14, color: MID, lineHeight: 1.7, marginBottom: 0 }}>
          FSRS replaces Anki's default SM-2 algorithm with a more accurate memory model. After installing it, run "Optimize FSRS Parameters" every 2–3 weeks to tune the algorithm to your memory profile. Set the target retention to <strong>0.85</strong> (85%) — higher than this creates excessive review load without meaningfully improving retention.
        </p>
      </Section>

      <Divider />

      {/* ── Section 5: Veteran ────────────────────────────────────────── */}
      <Section id="veteran">
        <LevelBadge level="6+ months — veteran" color={O} />
        <H2>Veteran Strategy</H2>
        <Lead>
          You've built the habit and the deck is established. Now it's about precision — protecting your review streak through dedicated study, preventing burnout, and timing your final push correctly.
        </Lead>

        {[
          {
            title: 'Audit your leech cards monthly',
            body: 'Leech cards are ones you keep failing. Anki marks them with a tag. Review your leech list monthly: if you\'ve failed a card 8+ times, the card is probably poorly written or testing the wrong level of detail. Suspend it and replace it with a tagged First Aid annotation instead.',
          },
          {
            title: 'Use custom study for weak systems',
            body: 'During dedicated study, use Anki\'s Custom Study → Study by card state/tag to drill a specific organ system. Filter for cards due + recent failures in Cardiology or Renal before your NBME to identify gaps.',
          },
          {
            title: 'Unsuspend strategically, not emotionally',
            body: 'Don\'t unsuspend every card you see in an AnKing video or Reddit thread. Only unsuspend cards directly relevant to your identified weak areas from NBME performance data. More cards ≠ higher score.',
          },
          {
            title: 'Stop new cards at T-minus 2 weeks',
            body: 'With 2 weeks to go, set new cards to 0 and let the algorithm bring everything due. Your job is consolidation, not expansion. New cards introduced this late won\'t have enough review cycles to stick.',
          },
          {
            title: 'Exam week: reviews only, <45 minutes',
            body: 'The night before your exam, do any cards due that day but cap at 30–45 minutes. Do not push for zero due — that level of cramming backfires. Sleep is more valuable than clearing 20 extra cards.',
          },
        ].map((item, i) => (
          <div key={i} style={{
            background: WHITE, borderRadius: 12, padding: '18px 22px', marginBottom: 12,
            border: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 16, alignItems: 'flex-start',
            fontFamily: '"DM Sans", sans-serif',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: O + '18', color: O, fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>{i + 1}</div>
            <div>
              <div style={{ fontWeight: 700, color: DARK, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: MID, lineHeight: 1.65 }}>{item.body}</div>
            </div>
          </div>
        ))}
      </Section>

      <Divider />

      {/* ── Section 6: Schedule Integration ───────────────────────────── */}
      <Section id="schedule">
        <H2 accent="StepAdapt">Daily Schedule Integration</H2>
        <Lead>
          How a full study day looks when Anki is woven into your schedule. Times are illustrative — your actual window is set in StepAdapt based on your preferred study hours.
        </Lead>

        <div style={{
          background: '#1a1a1a', borderRadius: 16, padding: '24px 28px',
          marginBottom: 32, fontFamily: 'ui-monospace, "SF Mono", monospace',
        }}>
          <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.08em', marginBottom: 20, textTransform: 'uppercase' }}>// Sample 10-hour study day</div>
          <ScheduleBlock time="7:00 – 8:15 AM" label="Anki Reviews" detail="Clear all due cards. Reviews only — no new cards until daily new card session." accent="#1D9E75" />
          <ScheduleBlock time="8:30 – 10:30 AM" label="UWorld Block" detail="2-hour timed block, tutor mode off. Flag difficult questions." accent="#2563eb" />
          <ScheduleBlock time="10:30 – 11:30 AM" label="UWorld Debrief" detail="Review every wrong answer + flagged. Search AnKing deck by keyword for misses — unsuspend, don't create." accent="#2563eb" />
          <ScheduleBlock time="11:30 AM – 12:00 PM" label="☕ Lunch" detail="Step away from the screen." accent={LIGHT} />
          <ScheduleBlock time="12:00 – 2:00 PM" label="Content Review" detail="First Aid chapter + Pathoma/Sketchy for today's topic." accent={O} />
          <ScheduleBlock time="2:00 – 2:15 PM" label="New Anki Cards" detail="Unsuspend today's topic tag. Add ~50–75 new cards. Batch this — do it once, not throughout the day." accent="#1D9E75" />
          <ScheduleBlock time="2:30 – 4:30 PM" label="Second UWorld Block" detail="Or Amboss if alternating. Focus on today's topic system." accent="#2563eb" />
          <ScheduleBlock time="4:30 – 5:00 PM" label="End-of-Day Review" detail="Skim First Aid annotations. Review any leech cards from today's session." accent={MID} />
        </div>

        <Callout icon="📌" title="Key rule: Anki first, not last">
          Do your reviews at the start of your study day, not the end. End-of-day reviews are the first thing to get skipped when you're tired. Morning reviews also benefit from sleep-consolidation of the prior day's learning.
        </Callout>

        <p style={{ fontSize: 14, color: MID, lineHeight: 1.7 }}>
          StepAdapt builds this block structure automatically based on your study window and available hours. When you select AnKing in your resource list, the morning retention block is tailored to your experience level — setup guide on day one for beginners, optimized review prompts for intermediate and veteran users.
        </p>
      </Section>

      <Divider />

      {/* ── Section 7: FAQ ────────────────────────────────────────────── */}
      <Section id="faq">
        <H2>Frequently Asked Questions</H2>
        <Lead>Answers to the questions that come up in every Anki thread.</Lead>

        <FaqItem q="Should I make my own cards or use a pre-made deck?">
          Use a pre-made deck (AnKing). Making your own cards takes 3–5 minutes per card and shifts your focus from learning to production. The time you spend making a card is time you're not spending doing UWorld questions, which have a higher ROI for Step 1. The only exception: personalized mnemonics that genuinely wouldn't exist in any deck. Write those as notes in First Aid instead.
        </FaqItem>

        <FaqItem q="I missed 3 days and have 600 reviews. What do I do?">
          Don't panic. Set a daily target of 150–200 reviews and work through the backlog over 3–5 days. Do not add new cards until the backlog is cleared. Pause your new card count to 0 for this week. If the backlog is truly unmanageable ({'>'}1,000), use the "Forget" option on the oldest cards to reset them — you'll relearn them, but it's better than abandoning the deck.
        </FaqItem>

        <FaqItem q="How do I know which AnKing tags to unsuspend?">
          Match AnKing tags to your First Aid chapter. The tag structure mirrors First Aid's organization: <code style={{ background: '#f0ede8', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>#AK_Step1_v12::Cardiology::Pathology</code>. After reading a First Aid section, search for the corresponding tag in the Anki browser, select all cards, and unsuspend. StepAdapt's daily plan lists the topic focus for each day — unsuspend those tags the same evening.
        </FaqItem>

        <FaqItem q="Is Anki actually worth it for Step 1, or is it overhyped?">
          It's worth it if you're more than 8 weeks from your exam and have the discipline to review daily. If you're 4–6 weeks out and haven't started, the upfront time investment of building a mature deck may not pay off before exam day — stick to First Aid active recall and UWorld incorrects at that stage. Anki's ROI is highest over 3–6+ months.
        </FaqItem>

        <FaqItem q="My retention rate is only 70%. Is that bad?">
          The default target is 90%, but 70–80% is common during high-new-card-volume periods. Don't obsess over this number. What matters more: are you actually recalling the answer before flipping the card? If you're honest about your ratings, a 75% retention rate means 75% of tested material is sticking — that's useful. If you're clicking "Good" on half-remembered cards, the number is meaningless.
        </FaqItem>

        <FaqItem q="Should I use AnkiMobile (iOS/Android)?">
          Yes, but only for reviews — not for deck management or unsuspending cards. Mobile reviews are great during commutes or lunch breaks. Sync via AnkiWeb (free). Note: AnkiMobile for iOS costs ~$25; the Android app (AnkiDroid) is free.
        </FaqItem>

        <FaqItem q="FSRS vs the default SM-2 — is it actually better?">
          FSRS consistently outperforms SM-2 in research comparisons. It uses a more sophisticated memory model and adapts to your individual retention pattern over time. The improvement is more pronounced the longer you use it. If you're starting fresh, set up FSRS from day one (it's a 2-minute configuration). If you've been using SM-2 for months, switching is still worthwhile — it will recalibrate within 1–2 weeks.
        </FaqItem>

        <FaqItem q="Is the Mehlman deck enough by itself for Step 1?">
          It depends on your situation. If you're starting Anki late in dedicated (less than 4 weeks out), Mehlman is likely the better choice — you can realistically get through the entire deck, which you cannot do with AnKing in that timeframe. The deck covers the most frequently tested concepts and pairs well with UWorld for exposure to everything else.
          <br /><br />
          If you have 6+ weeks and want comprehensive coverage, AnKing is more thorough. Mehlman is a rifle — it hits the highest-yield targets precisely. AnKing is a shotgun — it covers everything but takes much more time to get through.
          <br /><br />
          Either way, Anki is a <strong>retention tool, not a learning tool</strong>. UWorld questions are what actually teach you the material and prepare you for exam-day question patterns.
        </FaqItem>

        <FaqItem q="Can I use Anki as my only resource?">
          No. Anki reinforces what you've already learned — it doesn't teach concepts from scratch. Students who try to learn physiology from flashcard clozes miss the mechanisms and clinical reasoning that Step 1 actually tests. Use First Aid + Pathoma/Sketchy/Boards & Beyond to build understanding, then use Anki to lock in the details. UWorld questions teach you how to apply the knowledge. All three roles are distinct.
        </FaqItem>
      </Section>

      <Divider />

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 24px 100px',
        background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${G}15 0%, transparent 70%)`,
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 20 }}>🎯</div>
          <h2 style={{
            fontFamily: '"Source Serif 4", serif', fontSize: 'clamp(24px, 4vw, 34px)',
            fontWeight: 700, color: DARK, margin: '0 0 16px',
          }}>
            Build a plan around your Anki data
          </h2>
          <p style={{ fontSize: 16, color: MID, lineHeight: 1.7, margin: '0 0 36px' }}>
            StepAdapt reads your NBME scores and builds a daily schedule that tells you exactly which AnKing tags to unsuspend, how many UWorld questions to do per system, and which topics to hit first — all calibrated to your exam date.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {onGetStarted && (
              <button onClick={onGetStarted} style={{
                padding: '14px 32px', borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, ${G}, ${G2})`, color: WHITE,
                fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: '"DM Sans", sans-serif',
                boxShadow: `0 6px 20px ${G}45`,
              }}>Start Free — No Card Required</button>
            )}
            <a href="/" style={{
              padding: '14px 28px', borderRadius: 12, border: `1.5px solid rgba(0,0,0,0.15)`,
              background: WHITE, color: DARK, fontSize: 15, fontWeight: 600,
              textDecoration: 'none', fontFamily: '"DM Sans", sans-serif',
              display: 'inline-flex', alignItems: 'center',
            }}>← Back to Home</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 24px 48px', fontSize: 12, color: LIGHT, fontFamily: '"DM Sans", sans-serif', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        © 2026 StepAdapt · <a href="/anki" style={{ color: LIGHT }}>Anki Guide</a> · Content is for informational purposes only and is not medical advice.
      </div>
    </div>
  );
}
