import { useState, useEffect, useRef } from 'react';
import { STEP1_CATEGORIES, STEP1_SYSTEM_CATEGORIES, STEP1_DISCIPLINE_CATEGORIES, RESOURCES, HIGH_YIELD_WEIGHTS, PRACTICE_TESTS } from '../data.js';
import { generatePlan, generateFirstTimerPlan, getTopSubTopics, getQbankFilterTip, getPerformanceLevel, assignBlockTimes, findTodayInPlan, calcPlanProgress } from '../planEngine.js';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import Chat from '../components/Chat.jsx';

function ProgressBar({ value, max = 100, color = "#2980b9", height = 8 }) {
  return (
    <div style={{ width: "100%", background: "rgba(128,128,128,0.15)", borderRadius: height / 2, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color, height: "100%", borderRadius: height / 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

// ── Content Sequence Panel ────────────────────────────────────────────────
// Renders recommended study steps (Watch → Read → Practice) for content blocks.
function ContentSequencePanel({ contentSequence, compact = false }) {
  const [open, setOpen] = useState(false);
  if (!contentSequence || !contentSequence.sequence || contentSequence.sequence.length === 0) return null;

  const { gapType, sequence } = contentSequence;
  const tagColor = gapType === 'knowledge' ? '#7c3aed' : '#0369a1';
  const tagBg   = gapType === 'knowledge' ? '#7c3aed12' : '#0369a112';
  const tagLabel = gapType === 'knowledge' ? 'Knowledge gap — build the framework first' : 'Application gap — practice-first approach';

  const typeColor = (type) => ({
    video:    { bg: '#7c3aed0c', border: '#7c3aed', text: '#5b21b6' },
    read:     { bg: '#92400e0c', border: '#b45309', text: '#92400e' },
    practice: { bg: '#1d6e5610', border: '#1D9E75', text: '#1d6e56' },
    annotate: { bg: '#0369a10c', border: '#0369a1', text: '#01508a' },
  }[type] || { bg: '#6b65600c', border: '#6b6560', text: '#6b6560' });

  return (
    <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e8dcc8' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: compact ? '7px 10px' : '9px 12px', background: '#fefcf8', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: compact ? 12 : 13 }}>🗺️</span>
          <span style={{ fontSize: compact ? 11 : 12, fontWeight: 700, color: '#1a1816', fontFamily: 'Georgia, "Times New Roman", serif' }}>How to study this</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: tagBg, color: tagColor, fontFamily: 'Georgia, "Times New Roman", serif', whiteSpace: 'nowrap' }}>{gapType === 'knowledge' ? '📖 Knowledge' : '⚡ Application'}</span>
        </div>
        <span style={{ fontSize: 14, color: '#8a857e', transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{ padding: compact ? '8px 10px' : '10px 12px', background: '#fff', borderTop: '1px solid #f0ebe3', display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#8a857e', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 2 }}>{tagLabel}</div>
          {sequence.map((step, si) => {
            const c = typeColor(step.type);
            return (
              <div key={si} style={{ padding: '9px 11px', background: c.bg, borderRadius: 7, borderLeft: `3px solid ${c.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: step.instruction ? 4 : 0 }}>
                  <span style={{ fontSize: 14 }}>{step.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.text, fontFamily: 'Georgia, "Times New Roman", serif', flex: 1 }}>
                    Step {si + 1}: {step.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#8a857e', fontFamily: 'Georgia, "Times New Roman", serif', whiteSpace: 'nowrap' }}>{step.timeLabel}</span>
                </div>
                {step.instruction && (
                  <div style={{ fontSize: 12, color: '#6b6560', fontFamily: 'Georgia, "Times New Roman", serif', lineHeight: 1.5, marginBottom: step.links?.length > 0 ? 6 : 0, paddingLeft: 20 }}>
                    {step.instruction}
                  </div>
                )}
                {step.links && step.links.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 20 }}>
                    {step.links.map((link, li) => (
                      <a
                        key={li}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, fontWeight: 600, color: '#c0392b', fontFamily: 'Georgia, "Times New Roman", serif', padding: '3px 9px', borderRadius: 12, background: '#c0392b10', border: '1px solid #c0392b30', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        ▶ {link.channel}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sub-topic Progress Panel ──────────────────────────────────────────────
// Shows highest-yield sub-topics within a focus block as interactive chips.
// Student marks each as ✓ improving or ✗ still struggling to get adaptive guidance.
function SubTopicProgressPanel({ highYield, subTopicProgress = {}, onToggle, qbankFilterTip, compact = false }) {
  if (!highYield || highYield.length === 0) return null;

  const f = 'Georgia, "Times New Roman", serif';

  // Compute adaptive narrative
  const improvingTopics = highYield.filter(hy => subTopicProgress[hy.topic] === 'improving');
  const strugglingTopics = highYield.filter(hy => subTopicProgress[hy.topic] === 'struggling');
  const activeTopics = highYield.filter(hy => subTopicProgress[hy.topic] !== 'improving');

  let narrativeText = null;
  if (improvingTopics.length > 0 && activeTopics.length > 0) {
    const improvingNames = improvingTopics.map(t => t.topic.split('(')[0].trim()).join(' + ');
    const nextPriority = strugglingTopics[0] || activeTopics[0];
    const nextName = nextPriority?.topic.split('(')[0].trim();
    narrativeText = `↑ ${improvingNames} improving — shift focus to ${nextName}`;
  } else if (improvingTopics.length > 0 && activeTopics.length === 0) {
    narrativeText = '↑ All tracked sub-topics improving — run random blocks across systems to consolidate';
  }

  const chipStyle = (status) => {
    if (status === 'improving') return { bg: '#1d9e7510', border: '#1d9e75', text: '#1d6e56', icon: '✓' };
    if (status === 'struggling') return { bg: '#c0392b0d', border: '#c0392b', text: '#a93226', icon: '✗' };
    return { bg: '#fefcf8', border: '#e8dcc8', text: '#6b6560', icon: '○' };
  };

  return (
    <div style={{ marginBottom: 6, padding: compact ? '6px 8px' : '8px 10px', background: '#fefcf8', borderRadius: 8, border: '1px solid #e8dcc8' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a857e', fontFamily: f }}>
          Prioritize within this system:
        </div>
        <div style={{ fontSize: 10, color: '#b0a898', fontFamily: f }}>tap to track progress</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: narrativeText || qbankFilterTip ? 8 : 0 }}>
        {highYield.map((hy, hi) => {
          const status = subTopicProgress[hy.topic] || null;
          const c = chipStyle(status);
          const shortName = hy.topic.split('(')[0].trim();
          return (
            <button
              key={hi}
              onClick={() => onToggle && onToggle(hy.topic)}
              title={`Click to mark as: ${status === null ? 'improving' : status === 'improving' ? 'struggling' : 'reset'}`}
              style={{
                fontSize: compact ? 10 : 11, fontFamily: f, padding: '3px 9px', borderRadius: 4,
                background: c.bg, color: c.text, fontWeight: 600,
                border: `1px solid ${c.border}`, cursor: onToggle ? 'pointer' : 'default',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 10 }}>{c.icon}</span>
              {hy.yield >= 9 && <span style={{ fontSize: 9, color: '#b45309' }}>★</span>}
              {shortName}
            </button>
          );
        })}
      </div>
      {narrativeText && (
        <div style={{ fontSize: 11, color: '#1d6e56', fontFamily: f, fontWeight: 600, padding: '5px 8px', background: '#1d9e750d', borderRadius: 6, marginBottom: qbankFilterTip ? 6 : 0 }}>
          {narrativeText}
        </div>
      )}
      {qbankFilterTip && (
        <div style={{ fontSize: 11, color: '#6b6560', fontFamily: f, padding: '5px 8px', background: '#2563eb08', borderRadius: 6, borderLeft: '2px solid #2563eb50' }}>
          🔍 {qbankFilterTip}
        </div>
      )}
    </div>
  );
}

export default function StudyPlanner({ onShowTerms }) {
  const { user, logout, resendVerification } = useAuth();
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent'

  // ── Core state ────────────────────────────────────────────────────
  const [screen, setScreen] = useState("welcome");
  const [profile, setProfile] = useState({ resources: [], examDate: "", hoursPerDay: 8, studyStartTime: "07:00", studyEndTime: "17:00", takenAssessments: [], subTopicProgress: {} });
  const [latestPlanMeta, setLatestPlanMeta] = useState(null); // { id, createdAt }
  const [scores, setScores] = useState({});
  const [nbmeForm, setNbmeForm] = useState("");
  const [weakSystems, setWeakSystems] = useState([]);  // first-timer self-assessment
  const [uworldPct, setUworldPct] = useState('');       // first-timer self-assessment
  const [stickingPoints, setStickingPoints] = useState([]);
  const [plan, setPlan] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(0);
  const [animIn, setAnimIn] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // ── Reset / fresh-start state ─────────────────────────────────────
  const [resetType, setResetType] = useState(null);       // 'full' | 'keep-scores' | 'archive'
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [archivedCycles, setArchivedCycles] = useState([]);
  // Skip saveCurrentAssessment() when regenerating plan from existing scores
  const skipAssessmentSaveRef = useRef(false);

  // ── AI features state ─────────────────────────────────────────────
  const [showChat, setShowChat] = useState(false);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState('');
  const fileInputRef = useRef(null);

  // ── Class schedule state ──────────────────────────────────────────
  const [schedule, setSchedule] = useState([]); // [{dayOfWeek, startTime, endTime, label}]
  const [scheduleChanged, setScheduleChanged] = useState(false);

  // ── Export state ──────────────────────────────────────────────────
  const [exporting, setExporting] = useState('');

  // ── Persistence ───────────────────────────────────────────────────
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.profile.get().catch(() => ({ profile: null })),
      api.assessments.list().catch(() => ({ assessments: [] })),
      api.schedule.get().catch(() => ({ schedule: [] })),
      api.plans.latest().catch(() => ({ plan: null })),
      api.cycles.list().catch(() => ({ cycles: [] })),
    ]).then(([{ profile: savedProfile }, { assessments: savedAssessments }, { schedule: savedSchedule }, { plan: savedPlan }, { cycles: savedCycles }]) => {
      if (savedProfile) setProfile(p => ({ ...p, ...savedProfile }));
      if (savedAssessments.length > 0) setAssessments(savedAssessments);
      if (savedSchedule) setSchedule(savedSchedule);
      if (savedPlan) {
        setPlan(savedPlan.planData);
        setLatestPlanMeta({ id: savedPlan.id, createdAt: savedPlan.createdAt });
      }
      if (savedCycles?.length > 0) setArchivedCycles(savedCycles);
    }).finally(() => setDataLoaded(true));
  }, [user]);

  // Auto-route to dashboard once data is loaded
  useEffect(() => {
    if (!dataLoaded) return;
    if (plan) setScreen("dashboard");
    // else stay on "welcome" for new users
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save profile whenever it changes (debounced)
  const profileSaveTimer = useRef(null);
  useEffect(() => {
    if (!dataLoaded) return;
    clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(() => {
      api.profile.save(profile).catch(() => {});
    }, 1500);
  }, [profile, dataLoaded]);

  // ── Schedule helpers ──────────────────────────────────────────────
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const saveSchedule = async (newSchedule) => {
    const blocks = newSchedule.map(({ dayOfWeek, startTime, endTime, label }) => ({ dayOfWeek, startTime, endTime, label: label || '' }));
    try {
      await api.schedule.save(blocks);
    } catch { /* silent */ }
  };

  const addScheduleBlock = (dayOfWeek) => {
    const newBlock = { dayOfWeek, startTime: '08:00', endTime: '10:00', label: 'Class', tempId: Date.now() };
    const updated = [...schedule, newBlock];
    setSchedule(updated);
    setScheduleChanged(true);
    saveSchedule(updated);
  };

  const removeScheduleBlock = (idx) => {
    const updated = schedule.filter((_, i) => i !== idx);
    setSchedule(updated);
    setScheduleChanged(true);
    saveSchedule(updated);
  };

  const updateScheduleBlock = (idx, field, value) => {
    const updated = schedule.map((b, i) => i === idx ? { ...b, [field]: value } : b);
    setSchedule(updated);
    setScheduleChanged(true);
    clearTimeout(profileSaveTimer.current);
    profileSaveTimer.current = setTimeout(() => saveSchedule(updated), 1000);
  };

  // ── Practice test helpers ─────────────────────────────────────────
  const toggleTakenAssessment = (id) => {
    setProfile(p => {
      const taken = p.takenAssessments || [];
      const exists = taken.find(t => t.id === id);
      if (exists) return { ...p, takenAssessments: taken.filter(t => t.id !== id) };
      return { ...p, takenAssessments: [...taken, { id }] };
    });
  };

  const updateTakenDate = (id, date) => {
    setProfile(p => {
      const taken = p.takenAssessments || [];
      const exists = taken.find(t => t.id === id);
      if (exists) return { ...p, takenAssessments: taken.map(t => t.id === id ? { ...t, takenDate: date || undefined } : t) };
      return { ...p, takenAssessments: [...taken, { id, takenDate: date || undefined }] };
    });
  };

  // ── Sub-topic progress tracking ──────────────────────────────────
  // Cycles: null → 'improving' → 'struggling' → null
  const toggleSubTopicProgress = (topicKey) => {
    setProfile(p => {
      const current = (p.subTopicProgress || {})[topicKey];
      const next = current === undefined || current === null ? 'improving'
        : current === 'improving' ? 'struggling'
        : null;
      const updated = { ...(p.subTopicProgress || {}), [topicKey]: next };
      if (next === null) delete updated[topicKey];
      return { ...p, subTopicProgress: updated };
    });
  };

  // ── Export handlers ───────────────────────────────────────────────
  const handleExport = async (format) => {
    setExporting(format);
    try {
      const res = format === 'pdf' ? await api.export.downloadPdf() : await api.export.downloadDocx();
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Export failed'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NBME-Study-Plan.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting('');
    }
  };

  // ── Navigation ────────────────────────────────────────────────────
  const navigate = (s) => { setAnimIn(false); setTimeout(() => { setScreen(s); setAnimIn(true); }, 200); };
  const selectedExam = { categories: STEP1_CATEGORIES };
  const previousAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;

  const saveCurrentAssessment = async () => {
    const entry = {
      formName: nbmeForm || `NBME #${assessments.length + 1}`,
      scores: { ...scores },
      stickingPoints: [...stickingPoints],
    };
    try {
      const { assessment } = await api.assessments.save(entry);
      setAssessments(prev => [...prev, assessment]);
      return assessment;
    } catch {
      // Fallback to local
      const local = { id: Date.now(), ...entry, date: new Date().toLocaleDateString() };
      setAssessments(prev => [...prev, local]);
      return local;
    }
  };

  const startNewAssessment = async () => {
    await saveCurrentAssessment();
    setScores({});
    setNbmeForm("");
    setStickingPoints([]);
    navigate("scores");
  };

  // Rebuild plan from existing scores (Quick Actions "New Plan" + Option B reset)
  const startNewPlanFromScores = () => {
    setStickingPoints([]);
    if (assessments.length > 0) {
      const latest = assessments[assessments.length - 1];
      setScores({ ...latest.scores });
      setNbmeForm('');
      skipAssessmentSaveRef.current = true;
      navigate("sticking-points");
    } else {
      navigate("onboarding");
    }
  };

  // Execute the chosen reset type
  const handleReset = async () => {
    setResetLoading(true);
    try {
      if (resetType === 'full') {
        await api.reset.full();
        setAssessments([]);
        setScores({});
        setStickingPoints([]);
        setPlan(null);
        setLatestPlanMeta(null);
        setProfile(p => ({ ...p, takenAssessments: [], subTopicProgress: {} }));
        setResetType(null); setResetConfirmText(''); setResetConfirmed(false);
        navigate("welcome");
      } else if (resetType === 'keep-scores') {
        await api.reset.keepScores();
        setPlan(null);
        setLatestPlanMeta(null);
        setProfile(p => ({ ...p, subTopicProgress: {} }));
        setResetType(null); setResetConfirmText(''); setResetConfirmed(false);
        startNewPlanFromScores();
      } else if (resetType === 'archive') {
        await api.reset.archive();
        const { cycles: updatedCycles } = await api.cycles.list().catch(() => ({ cycles: [] }));
        setArchivedCycles(updatedCycles || []);
        setAssessments([]);
        setScores({});
        setStickingPoints([]);
        setPlan(null);
        setLatestPlanMeta(null);
        setProfile(p => ({ ...p, takenAssessments: [], subTopicProgress: {} }));
        setResetType(null); setResetConfirmText(''); setResetConfirmed(false);
        navigate("welcome");
      }
    } catch (err) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const getScoreDelta = (cat) => {
    if (!previousAssessment) return null;
    const prev = previousAssessment.scores[cat];
    const curr = scores[cat];
    if (prev === undefined || curr === undefined) return null;
    return curr - prev;
  };

  const getStubbornTopics = () => {
    if (!previousAssessment) return [];
    return (selectedExam?.categories || []).filter(cat => {
      const prev = previousAssessment.scores[cat] ?? 50;
      const curr = scores[cat] ?? 50;
      const wasFocused = previousAssessment.stickingPoints?.includes(cat) || prev <= 50;
      return wasFocused && (curr - prev) < 5 && curr <= 60;
    });
  };

  // ── Screenshot upload ─────────────────────────────────────────────
  const handleScreenshotUpload = async (file) => {
    if (!file) return;
    setUploadingScreenshot(true);
    setScreenshotError('');
    try {
      const result = await api.ai.parseScreenshot(file, 'step1');
      if (result.formName) setNbmeForm(result.formName);
      if (result.scores && typeof result.scores === 'object') {
        const cats = selectedExam?.categories || [];
        const matched = {};
        // Try to match parsed category names to our categories
        for (const [parsedCat, parsedScore] of Object.entries(result.scores)) {
          const exact = cats.find(c => c.toLowerCase() === parsedCat.toLowerCase());
          if (exact) { matched[exact] = Math.round(parsedScore); continue; }
          // Partial match
          const partial = cats.find(c =>
            c.toLowerCase().includes(parsedCat.toLowerCase()) ||
            parsedCat.toLowerCase().includes(c.toLowerCase().split(' ')[0])
          );
          if (partial) matched[partial] = Math.round(parsedScore);
        }
        if (Object.keys(matched).length > 0) setScores(prev => ({ ...prev, ...matched }));
        else setScreenshotError('Scores parsed but categories did not match. Please verify manually.');
      }
    } catch (err) {
      setScreenshotError(err.message || 'Could not parse screenshot. Enter scores manually.');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  // ── Plan context for chat ─────────────────────────────────────────
  const planContext = plan ? {
    profile,
    assessments,
    plan: {
      totalCalendarDays: plan.totalCalendarDays,
      totalWeeks: plan.totalWeeks,
      totalQEstimate: plan.totalQEstimate,
      nbmeDays: plan.nbmeDays,
      timelineMode: plan.timelineMode,
      priorities: plan.priorities?.slice(0, 8),
    }
  } : { profile, assessments };

  // ── Brand colors ──────────────────────────────────────────────────
  const BRAND = { green: '#1D9E75', darkGreen: '#0F6E56', orange: '#D85A30' };

  // ── Styles ────────────────────────────────────────────────────────
  const S = {
    app: { fontFamily: '"Source Serif 4", Georgia, serif', minHeight: "100vh", background: "linear-gradient(170deg, #f4fbf8 0%, #edf7f3 100%)", color: "#2c2a26" },
    wrap: { maxWidth: 640, margin: "0 auto", padding: "24px 20px 80px", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(12px)", transition: "all 0.3s ease" },
    card: { background: "#fff", borderRadius: 16, padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 12px 40px rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.10)", marginBottom: 16 },
    h1: { fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 6px", lineHeight: 1.2, color: "#1a1816" },
    h3: { fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: "#1a1816" },
    sub: { fontSize: 15, color: "#6b6560", margin: "0 0 24px", lineHeight: 1.5, fontFamily: '"DM Sans", sans-serif' },
    label: { fontSize: 13, fontWeight: 600, color: "#8a857e", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "block", fontFamily: '"DM Sans", sans-serif' },
    input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e0dcd6", fontSize: 15, fontFamily: '"DM Sans", sans-serif', background: "#fafffe", outline: "none", boxSizing: "border-box", color: "#2c2a26" },
    btn: { padding: "13px 28px", borderRadius: 10, border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: '"DM Sans", sans-serif', transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 8 },
    pri: { background: BRAND.green, color: "#fff" }, sec: { background: "transparent", color: "#1a1816", border: "1.5px solid #d5d0c9" }, ghost: { background: "transparent", color: "#6b6560", padding: "8px 16px" },
    chip: { display: "inline-flex", alignItems: "center", padding: "8px 16px", borderRadius: 20, fontSize: 14, fontFamily: '"DM Sans", sans-serif', cursor: "pointer", transition: "all 0.2s", border: "1.5px solid #e0dcd6", background: "#fff", gap: 6, userSelect: "none" },
    chipOn: { background: BRAND.green, color: "#fff", borderColor: BRAND.green },
    tag: { display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: '"DM Sans", sans-serif' },
    hr: { height: 1, background: "#ece8e2", margin: "20px 0", border: "none" },
    muted: { fontSize: 13, color: "#8a857e", fontFamily: '"DM Sans", sans-serif' },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", maxWidth: 640, margin: "0 auto" },
    dot: (a) => ({ width: a ? 24 : 8, height: 8, borderRadius: 4, background: a ? BRAND.green : "#d5d0c9", transition: "all 0.3s" }),
    f: '"DM Sans", sans-serif',
  };

  const blockColors = {
    "anki": { bg: "#27ae6010", border: "#27ae60", icon: "🧠", label: "Retention" },
    "questions-focus": { bg: "#b4530912", border: "#b45309", icon: "🔥", label: "Focus Qs" },
    "questions-random": { bg: "#2563eb0c", border: "#2563eb", icon: "🎲", label: "Random Qs" },
    "questions": { bg: "#2980b90c", border: "#2980b9", icon: "🎯", label: "Questions" },
    "content": { bg: "#8b5cf610", border: "#8b5cf6", icon: "📚", label: "Content build" },
    "content-reactive": { bg: "#8b5cf60c", border: "#8b5cf6", icon: "📚", label: "Gap review" },
    "catchup": { bg: "#6b656010", border: "#8a857e", icon: "🔄", label: "Catch-up" },
    "nbme": { bg: "#c0392b0c", border: "#c0392b", icon: "📋", label: "Practice exam" },
    "rest": { bg: "#27ae600c", border: "#27ae60", icon: "😴", label: "Rest" },
  };

  const steps = ["welcome", "onboarding", "scores", "sticking-points", "comparison", "plan"];
  const dots = (idx) => <div style={{ display: "flex", gap: 6 }}>{steps.slice(1).map((_, i) => <div key={i} style={S.dot(i === idx)} />)}</div>;

  // Email verification banner
  const VerifyBanner = () => {
    if (user?.emailVerified || verifyBannerDismissed) return null;
    const handleResend = async () => {
      setResendStatus('sending');
      try { await resendVerification(); setResendStatus('sent'); }
      catch { setResendStatus(''); }
    };
    return (
      <div style={{ background: '#fffbeb', borderBottom: '1px solid #f6c90e40', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', fontSize: 13, fontFamily: S.f, color: '#92600a' }}>
        <span>⚠️ Please verify your email address to secure your account.</span>
        {resendStatus === 'sent'
          ? <span style={{ color: '#27ae60', fontWeight: 600 }}>✅ Sent! Check your inbox.</span>
          : <button onClick={handleResend} disabled={resendStatus === 'sending'} style={{ background: 'none', border: '1px solid #f6c90e80', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 12, color: '#92600a', fontFamily: S.f }}>{resendStatus === 'sending' ? 'Sending…' : 'Resend email'}</button>
        }
        <button onClick={() => setVerifyBannerDismissed(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b8860b', fontSize: 15, padding: '0 4px', lineHeight: 1 }}>✕</button>
      </div>
    );
  };

  // Top-right user bar
  const UserBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, fontFamily: S.f, color: '#6b6560' }}>{user?.email}</span>
      <button style={{ ...S.btn, ...S.ghost, fontSize: 13, padding: '6px 12px' }} onClick={logout}>Sign out</button>
    </div>
  );

  // Logo for top bar (compact)
  const LogoMark = () => (
    <img src="/logo.png" alt="StepAdapt" style={{ height: 32 }} />
  );

  // Footer with legal links
  const Footer = () => (
    <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, fontFamily: S.f, color: '#aaa9a6', borderTop: '1px solid #e8f5f0', marginTop: 40 }}>
      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onShowTerms?.('terms')}>Terms of Service</span>
      {' · '}
      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => onShowTerms?.('privacy')}>Privacy Policy</span>
    </div>
  );

  // ─── DASHBOARD ─────────────────────────────────────────────────────
  if (screen === "dashboard") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examDate = profile.examDate ? new Date(profile.examDate) : null;
    if (examDate) examDate.setHours(0, 0, 0, 0);
    const daysUntilExam = examDate ? Math.max(0, Math.ceil((examDate - today) / 86400000)) : null;
    const urgencyColor = daysUntilExam === null ? BRAND.green : daysUntilExam <= 14 ? '#c0392b' : daysUntilExam <= 30 ? '#D85A30' : BRAND.green;
    const todayData = plan && latestPlanMeta ? findTodayInPlan(plan, latestPlanMeta.createdAt) : null;
    const todayBlocksWithTimes = todayData ? assignBlockTimes(todayData.day.blocks, profile.studyStartTime || '07:00', profile.studyEndTime || '17:00') : [];
    const progress = plan && latestPlanMeta ? calcPlanProgress(plan, latestPlanMeta.createdAt, profile.examDate) : null;
    const examPassed = daysUntilExam !== null && daysUntilExam === 0 && examDate && today >= examDate;

    // Score trend from assessments
    const selectedExamLocal = { categories: STEP1_CATEGORIES };
    const scoreTrend = assessments.map(a => {
      const cats = selectedExamLocal?.categories || Object.keys(a.scores || {});
      const vals = cats.map(c => Number(a.scores[c] || 0)).filter(v => v > 0);
      const avg = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
      const dateStr = a.created_at || a.date || '';
      return { label: a.formName || 'Assessment', avg, date: dateStr };
    });
    const scoreDelta = scoreTrend.length >= 2 ? scoreTrend[scoreTrend.length - 1].avg - scoreTrend[scoreTrend.length - 2].avg : null;
    const latestAvg = scoreTrend.length > 0 ? scoreTrend[scoreTrend.length - 1].avg : null;

    // Category heatmap from latest assessment
    const latestAssessmentForHeatmap = assessments.length > 0 ? assessments[assessments.length - 1] : null;
    const heatmapCats = selectedExamLocal?.categories || [];
    const heatColor = (s) => s <= 40 ? '#c0392b' : s <= 60 ? '#D85A30' : s <= 80 ? '#2980b9' : '#1D9E75';
    const heatBg = (s) => s <= 40 ? '#c0392b0d' : s <= 60 ? '#D85A300d' : s <= 80 ? '#2980b90d' : '#1D9E750d';

    // Block icons
    const blockIcon = (type) => {
      const icons = { anki: '🧠', 'questions-focus': '🔥', 'questions-random': '🎲', questions: '🎯', content: '📚', 'content-reactive': '📚', catchup: '🔄', nbme: '📋', rest: '😴', break: '⏸' };
      return icons[type] || '📌';
    };

    // SVG score trend chart
    const TrendChart = () => {
      if (scoreTrend.length === 0) return <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a857e', fontSize: 13, fontFamily: S.f }}>No assessments yet.</div>;
      const W = 280, H = 80, PAD = 16, LABEL_H = 18;
      const chartH = H - LABEL_H;
      if (scoreTrend.length === 1) {
        return (
          <div>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
              <circle cx={W / 2} cy={chartH / 2} r={5} fill={BRAND.green} />
              <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={10} fill="#8a857e" fontFamily="DM Sans, sans-serif">{scoreTrend[0].label}</text>
            </svg>
            <p style={{ ...S.muted, fontSize: 11, textAlign: 'center', marginTop: 4 }}>Take another assessment to see your trend</p>
          </div>
        );
      }
      const minScore = Math.max(0, Math.min(...scoreTrend.map(p => p.avg)) - 10);
      const maxScore = Math.min(100, Math.max(...scoreTrend.map(p => p.avg)) + 10);
      const scoreRange = Math.max(1, maxScore - minScore);
      const pts = scoreTrend.map((p, i) => {
        const x = PAD + (i / (scoreTrend.length - 1)) * (W - PAD * 2);
        const y = chartH - PAD / 2 - ((p.avg - minScore) / scoreRange) * (chartH - PAD);
        return { x, y, ...p };
      });
      const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
      const areaPath = `M ${pts[0].x},${chartH} ` + pts.map(p => `L ${p.x},${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x},${chartH} Z`;
      return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
          <path d={areaPath} fill={BRAND.green} fillOpacity={0.10} />
          <polyline points={polyline} fill="none" stroke={BRAND.green} strokeWidth={2} strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill={BRAND.green} />
              <text x={p.x} y={H - 2} textAnchor="middle" fontSize={9} fill="#8a857e" fontFamily="DM Sans, sans-serif">{p.label?.replace('NBME ', '')}</text>
            </g>
          ))}
        </svg>
      );
    };

    return (
      <div style={S.app}>
        <VerifyBanner />
        {/* Top bar */}
        <div style={{ ...S.topBar, borderBottom: '1px solid #e8f5f0', paddingBottom: 12 }}>
          <LogoMark />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {plan && <button style={{ ...S.btn, ...S.sec, padding: '8px 16px', fontSize: 13 }} onClick={() => navigate("plan")}>📅 Full plan</button>}
            <button style={{ ...S.btn, ...S.ghost, padding: '8px 14px', fontSize: 13, color: '#8a857e' }} onClick={() => navigate("reset")}>↺ Start fresh</button>
            <UserBar />
          </div>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 80px', opacity: animIn ? 1 : 0, transform: animIn ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.3s ease' }}>

          {/* First-timer nudge banner */}
          {plan?.firstTimer && assessments.length === 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #f6c90e60', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18 }}>🧭</span>
              <span style={{ flex: 1, fontSize: 13, fontFamily: S.f, color: '#92600a', lineHeight: 1.4 }}>
                <strong>Starter plan active.</strong> Take your diagnostic NBME (scheduled early this week), then add your scores to unlock a fully personalised plan.
              </span>
              <button style={{ ...S.btn, background: 'none', border: '1px solid #f6c90e80', color: '#92600a', padding: '6px 12px', fontSize: 12 }} onClick={() => navigate("scores")}>
                Enter scores →
              </button>
            </div>
          )}

          {/* Row 1: Exam countdown + Score improvement */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Exam countdown */}
            <div style={{ ...S.card, marginBottom: 0, textAlign: 'center', padding: '20px 16px' }}>
              {daysUntilExam !== null ? (
                <>
                  <div style={{ fontSize: 52, fontWeight: 800, color: urgencyColor, lineHeight: 1, fontFamily: S.f }}>{daysUntilExam}</div>
                  <div style={{ ...S.muted, marginTop: 4, fontSize: 13 }}>days until exam</div>
                  {daysUntilExam <= 14 && daysUntilExam > 0 && <div style={{ marginTop: 8, fontSize: 11, color: '#c0392b', fontFamily: S.f, fontWeight: 600 }}>⚡ Final push — every session counts</div>}
                  {daysUntilExam === 0 && <div style={{ marginTop: 8, fontSize: 12, color: BRAND.green, fontFamily: S.f }}>🎉 Exam day!</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                  <div style={{ ...S.muted, marginBottom: 12 }}>No exam date set</div>
                  <button style={{ ...S.btn, ...S.sec, padding: '7px 14px', fontSize: 13 }} onClick={() => navigate("onboarding")}>Set exam date →</button>
                </>
              )}
            </div>
            {/* Score improvement */}
            <div style={{ ...S.card, marginBottom: 0, textAlign: 'center', padding: '20px 16px' }}>
              {scoreDelta !== null ? (
                <>
                  <div style={{ fontSize: 52, fontWeight: 800, color: scoreDelta >= 0 ? BRAND.green : '#c0392b', lineHeight: 1, fontFamily: S.f }}>{scoreDelta > 0 ? '+' : ''}{scoreDelta}</div>
                  <div style={{ ...S.muted, marginTop: 4, fontSize: 13 }}>avg score change</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#8a857e', fontFamily: S.f }}>Latest avg: {latestAvg}%</div>
                </>
              ) : latestAvg !== null ? (
                <>
                  <div style={{ fontSize: 52, fontWeight: 800, color: BRAND.green, lineHeight: 1, fontFamily: S.f }}>{latestAvg}%</div>
                  <div style={{ ...S.muted, marginTop: 4, fontSize: 13 }}>current average</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#8a857e', fontFamily: S.f }}>Add another assessment to track changes</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
                  <div style={{ ...S.muted, marginBottom: 12 }}>No scores yet</div>
                  <button style={{ ...S.btn, ...S.sec, padding: '7px 14px', fontSize: 13 }} onClick={() => navigate("onboarding")}>Add first assessment →</button>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Today's schedule */}
          <div style={{ ...S.card, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a857e', fontFamily: S.f, marginBottom: 4 }}>Today's Schedule</div>
                {todayData ? (
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1816' }}>
                    Day {todayData.day.calendarDay}
                    {todayData.day.focusTopic && <span style={{ fontSize: 13, fontWeight: 400, color: '#6b6560', marginLeft: 8, fontFamily: S.f }}>Focus: {todayData.day.focusTopic}</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1816' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                )}
              </div>
              {todayData?.day.totalQuestions > 0 && (
                <div style={{ background: '#b4530912', color: '#b45309', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, fontFamily: S.f }}>
                  {todayData.day.totalQuestions} Qs today
                </div>
              )}
            </div>

            {examPassed ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 16, color: BRAND.green }}>Exam has passed — great work! 🎉</div>
            ) : !plan ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ ...S.muted, marginBottom: 16 }}>No study plan yet. Generate one to see your daily schedule.</div>
                <button style={{ ...S.btn, ...S.pri }} onClick={() => navigate("onboarding")}>Generate your first plan →</button>
              </div>
            ) : !todayData ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#8a857e', fontFamily: S.f, fontSize: 14 }}>
                Today is outside your current plan window. <button style={{ ...S.btn, ...S.ghost, fontSize: 13, display: 'inline', padding: '4px 8px' }} onClick={() => navigate("onboarding")}>Generate a new plan →</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {/* Exam-week / exam-eve lockdown banner */}
                {(todayData.day.dayType === 'exam-week' || todayData.day.dayType === 'exam-eve') && (
                  <div style={{ padding: '11px 14px', borderRadius: 10, background: '#7c3aed08', border: '1px solid #7c3aed25', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 2 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{todayData.day.dayType === 'exam-eve' ? '🌙' : '🔒'}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', fontFamily: S.f, marginBottom: 2 }}>
                        {todayData.day.dayType === 'exam-eve' ? 'Exam eve — light review and early rest' : 'Exam week — maintenance and confidence mode'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f }}>
                        {todayData.day.dayType === 'exam-eve'
                          ? 'Pack your bag. Light dinner. No new content. In bed by 10 PM.'
                          : 'No new content. Random blocks only. Finish all study by 3 PM.'}
                      </div>
                    </div>
                  </div>
                )}
                {todayBlocksWithTimes.map((block, i) => {
                  if (block.type === 'break') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#faf8f5', borderRadius: 8, opacity: 0.7 }}>
                        <span style={{ fontSize: 14 }}>{block.label === 'Lunch break' ? '☕' : '⏸'}</span>
                        <span style={{ flex: 1, fontSize: 13, color: '#8a857e', fontFamily: S.f }}>{block.label}</span>
                        <span style={{ fontSize: 12, color: '#aaa9a6', fontFamily: S.f }}>{block.startTime} – {block.endTime}</span>
                      </div>
                    );
                  }
                  const bc = blockColors[block.type] || blockColors['catchup'];
                  return (
                    <div key={i} style={{ padding: '12px 14px', background: bc.bg, borderRadius: 10, borderLeft: `3px solid ${bc.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: block.tasks?.length > 0 ? 8 : 0, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15 }}>{blockIcon(block.type)}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1816', fontFamily: S.f }}>{block.label}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f, flexShrink: 0 }}>{block.startTime} – {block.endTime}</span>
                      </div>
                      {block.tasks?.map((task, j) => (
                        <div key={j} style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, paddingLeft: 23, lineHeight: 1.5, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: '#2c2a26' }}>{task.resource}</span> — {task.activity}
                        </div>
                      ))}
                      {block.highYield && block.highYield.length > 0 && (
                        <SubTopicProgressPanel
                          highYield={block.highYield}
                          subTopicProgress={profile.subTopicProgress}
                          onToggle={toggleSubTopicProgress}
                          qbankFilterTip={block.qbankFilterTip}
                          compact={true}
                        />
                      )}
                      {block.contentSequence && <ContentSequencePanel contentSequence={block.contentSequence} compact={true} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Row 3: Score trend + Progress bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            {/* Score trend */}
            <div style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a857e', fontFamily: S.f, marginBottom: 12 }}>Score Trend</div>
              <TrendChart />
            </div>
            {/* Plan progress */}
            <div style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a857e', fontFamily: S.f, marginBottom: 12 }}>Plan Progress</div>
              {progress ? (
                <>
                  <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.green, fontFamily: S.f, lineHeight: 1 }}>{progress.percent}%</div>
                  <div style={{ ...S.muted, marginTop: 4, marginBottom: 12, fontSize: 12 }}>{progress.completedDays} of {progress.totalDays} days complete</div>
                  <ProgressBar value={progress.completedDays} max={Math.max(1, progress.totalDays)} color={BRAND.green} height={10} />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#8a857e', fontSize: 13, fontFamily: S.f }}>Generate a plan to track progress.</div>
              )}
            </div>
          </div>

          {/* Row 4: Category heatmap */}
          {heatmapCats.length > 0 && latestAssessmentForHeatmap && (
            <div style={{ ...S.card, marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a857e', fontFamily: S.f, marginBottom: 12 }}>Category Performance</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                {heatmapCats.map(cat => {
                  const s = latestAssessmentForHeatmap.scores[cat] ?? null;
                  if (s === null) return null;
                  return (
                    <div key={cat} style={{ padding: '10px 10px 10px 12px', borderRadius: 8, background: heatBg(s), borderLeft: `3px solid ${heatColor(s)}` }}>
                      <div style={{ fontSize: 11, fontFamily: S.f, color: '#6b6560', lineHeight: 1.3, marginBottom: 4 }}>{cat}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: heatColor(s), fontFamily: S.f, lineHeight: 1 }}>{s}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 5: Recent assessments + Quick actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Recent assessments */}
            <div style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a857e', fontFamily: S.f, marginBottom: 12 }}>Recent Assessments</div>
              {assessments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#8a857e', fontSize: 13, fontFamily: S.f }}>No assessments yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {[...assessments].reverse().slice(0, 5).map((a, i) => {
                    const cats = selectedExamLocal?.categories || Object.keys(a.scores || {});
                    const vals = cats.map(c => Number(a.scores[c] || 0)).filter(v => v > 0);
                    const avg = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
                    const dateStr = a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : (a.date || '');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(assessments.length, 5) - 1 ? '1px solid #f0ece6' : 'none' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: heatColor(avg), flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 13, fontFamily: S.f, color: '#1a1816', fontWeight: 500 }}>{a.formName}</div>
                        <div style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>{dateStr}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: heatColor(avg), fontFamily: S.f }}>{avg}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Quick actions */}
            <div style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#8a857e', fontFamily: S.f, marginBottom: 12 }}>Quick Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: '➕', label: 'Add Assessment', action: () => navigate("scores") },
                  { icon: '📋', label: 'New Plan', action: () => startNewPlanFromScores() },
                  { icon: '💬', label: 'AI Coach', action: () => setShowChat(true) },
                  { icon: '📅', label: 'Full Plan', action: () => plan ? navigate("plan") : null, disabled: !plan },
                ].map((item, i) => (
                  <button key={i} disabled={item.disabled} style={{ ...S.btn, ...S.sec, flexDirection: 'column', padding: '14px 10px', gap: 6, fontSize: 12, textAlign: 'center', justifyContent: 'center', opacity: item.disabled ? 0.4 : 1, cursor: item.disabled ? 'not-allowed' : 'pointer' }} onClick={item.action}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── RESET ─────────────────────────────────────────────────────────
  if (screen === "reset") {
    const RESET_OPTIONS = [
      {
        type: 'full',
        icon: '🗑️',
        title: 'Reset everything',
        subtitle: 'Complete fresh start',
        desc: 'Deletes all assessment history, scores, and study plans. Your account and subscription will not be affected.',
        color: '#c0392b',
      },
      {
        type: 'keep-scores',
        icon: '🔄',
        title: 'Keep scores, rebuild plan',
        subtitle: 'Recalibrate with existing data',
        desc: 'Removes your current study plan. Preserves all assessment scores and history. Takes you to sticking-points to generate a fresh plan.',
        color: '#D85A30',
      },
      {
        type: 'archive',
        icon: '📦',
        title: 'Archive and start new cycle',
        subtitle: 'New workspace, old data saved',
        desc: 'Archives your current plan and all assessments into a Previous cycles record (viewable read-only). Starts a completely fresh workspace.',
        color: '#7c3aed',
      },
    ];
    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}>
          <button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate(plan ? "dashboard" : "welcome")}>← Back</button>
          <UserBar />
        </div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Start fresh</h1>
          <p style={S.sub}>Choose how to reset your study data. Your account will not be affected.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {RESET_OPTIONS.map(opt => (
              <div
                key={opt.type}
                style={{ ...S.card, marginBottom: 0, border: `1.5px solid ${opt.color}28`, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                onClick={() => { setResetType(opt.type); navigate("reset-confirm"); }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{opt.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1816', marginBottom: 2 }}>{opt.title}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: opt.color, fontFamily: S.f, marginBottom: 6 }}>{opt.subtitle}</div>
                    <div style={{ fontSize: 13, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                  <span style={{ fontSize: 16, color: opt.color, flexShrink: 0, marginTop: 6 }}>→</span>
                </div>
              </div>
            ))}
          </div>
          {archivedCycles.length > 0 && (
            <div style={{ ...S.card, background: '#faf8f5', border: '1px solid #ece8e2', marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a857e', fontFamily: S.f, marginBottom: 10 }}>
                Previous cycles ({archivedCycles.length})
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {archivedCycles.map((cycle, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #f0ece6' }}>
                    <span style={{ fontSize: 14 }}>📦</span>
                    <div style={{ flex: 1, fontSize: 13, fontFamily: S.f, color: '#1a1816' }}>{cycle.label}</div>
                    <div style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>{cycle.assessment_count} assessment{cycle.assessment_count !== 1 ? 's' : ''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // ─── RESET CONFIRM ─────────────────────────────────────────────────
  if (screen === "reset-confirm" && resetType) {
    const isDestructive = resetType !== 'keep-scores';
    const confirmReady = isDestructive ? resetConfirmText === 'RESET' : resetConfirmed;
    const DETAILS = {
      full: {
        title: '⚠️ Reset everything',
        color: '#c0392b',
        bullets: [
          'All assessment history and NBME scores — deleted',
          'All study plans — deleted',
          'Sticking points and gap classifications — cleared',
          'Your account, email, and profile settings — preserved ✓',
        ],
        warning: 'This permanently deletes all your study data and cannot be undone.',
      },
      'keep-scores': {
        title: '🔄 Keep scores, rebuild plan',
        color: '#D85A30',
        bullets: [
          'All assessment scores and history — preserved ✓',
          'Current study plan — removed',
          'Sticking points selections — cleared (you\'ll re-select them)',
          'You\'ll be taken to the sticking points screen to generate a fresh plan',
        ],
        warning: null,
      },
      archive: {
        title: '📦 Archive and start new cycle',
        color: '#7c3aed',
        bullets: [
          'Current plan and all assessments — archived (viewable under Previous cycles)',
          'New clean workspace — created',
          'Your account, email, and profile settings — preserved ✓',
        ],
        warning: 'Archived data will appear in Previous cycles on the Start fresh screen.',
      },
    };
    const d = DETAILS[resetType];
    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}>
          <button style={{ ...S.btn, ...S.ghost }} onClick={() => { setResetConfirmText(''); setResetConfirmed(false); navigate("reset"); }}>← Back</button>
          <UserBar />
        </div>
        <div style={S.wrap}>
          <h1 style={{ ...S.h1, color: d.color }}>{d.title}</h1>
          <div style={{ ...S.card, border: `1.5px solid ${d.color}28` }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: S.f, color: '#1a1816', marginBottom: 10 }}>What will happen:</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {d.bullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, fontFamily: S.f, color: '#6b6560', lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0 }}>•</span><span>{b}</span>
                </div>
              ))}
            </div>
            {d.warning && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: `${d.color}08`, borderRadius: 8, border: `1px solid ${d.color}30`, fontSize: 13, fontWeight: 600, color: d.color, fontFamily: S.f }}>
                {isDestructive ? '⚠️ ' : 'ℹ️ '}{d.warning}
              </div>
            )}
          </div>
          {isDestructive ? (
            <div style={S.card}>
              <label style={S.label}>Type "RESET" to confirm</label>
              <input
                style={S.input}
                placeholder="RESET"
                value={resetConfirmText}
                onChange={e => setResetConfirmText(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : (
            <div style={{ ...S.card, display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }} onClick={() => setResetConfirmed(r => !r)}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${resetConfirmed ? d.color : '#d5d0c9'}`, background: resetConfirmed ? d.color : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                {resetConfirmed && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, fontFamily: S.f, color: '#1a1816', lineHeight: 1.5 }}>
                I understand my current plan will be removed and I'll re-select sticking points to generate a fresh plan using my existing scores.
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
            <button style={{ ...S.btn, ...S.sec }} onClick={() => { setResetConfirmText(''); setResetConfirmed(false); navigate("reset"); }}>Cancel</button>
            <button
              disabled={!confirmReady || resetLoading}
              style={{ ...S.btn, background: d.color, color: '#fff', opacity: confirmReady && !resetLoading ? 1 : 0.4, cursor: confirmReady && !resetLoading ? 'pointer' : 'not-allowed' }}
              onClick={handleReset}
            >
              {resetLoading ? 'Working…' : resetType === 'full' ? 'Delete all data' : resetType === 'archive' ? 'Archive and start fresh' : 'Confirm — rebuild my plan'}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── WELCOME ───────────────────────────────────────────────────────
  if (screen === "welcome") return (
    <div style={S.app}>
      <VerifyBanner />
      <div style={S.topBar}><LogoMark /><UserBar /></div>
      <div style={S.wrap}>
        <div style={{ textAlign: "center", padding: "40px 0 40px" }}>
          <img src="/logo.png" alt="StepAdapt" style={{ width: 240, marginBottom: 24 }} />
          <p style={{ ...S.sub, maxWidth: 440, margin: "0 auto 32px", fontSize: 16 }}>
            A question-driven study engine. Do questions, find gaps, fix them, repeat.
          </p>
          <div style={{ ...S.card, textAlign: "left", marginBottom: 24 }}>
            <div style={{ display: "grid", gap: 20 }}>
              {[
                { icon: "🎯", title: "Questions are the backbone", desc: "2-3 blocks of 40 questions daily, with thorough review of every single one" },
                { icon: "🔥", title: "Focus blocks attack your weakest high-yield topics", desc: "System-specific question blocks where your score can jump the most" },
                { icon: "🔄", title: "Maintenance blocks simulate test day", desc: "Random mixed questions across all systems — trains context-switching and prevents decay" },
                { icon: "📚", title: "Content review is reactive, not passive", desc: "You don't re-read chapters — you look up what you got wrong in questions" },
                { icon: "📈", title: "NBMEs every ~2 weeks recalibrate the plan", desc: "New scores restart the cycle with smarter targeting" },
                { icon: "🤖", title: "AI coaching + screenshot score parsing", desc: "Upload your NBME screenshot to auto-import scores, then ask your AI coach anything" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                  <div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, color: "#1a1816", fontFamily: S.f }}>{item.title}</div><div style={S.muted}>{item.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
          <button style={{ ...S.btn, ...S.pri, padding: "16px 48px", fontSize: 16, borderRadius: 12 }} onClick={() => navigate("onboarding")}>Get started →</button>
        </div>
      </div>
      <Footer />
    </div>
  );

  // ─── ONBOARDING ────────────────────────────────────────────────────
  if (screen === "onboarding") {
    const ok = profile.resources.length > 0 && profile.examDate;
    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate(plan ? "dashboard" : "welcome")}>← Back</button>{dots(0)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Set up your profile</h1><p style={S.sub}>Your situation shapes the plan.</p>
          <div style={S.card}>
            <label style={S.label}>Resources available</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {RESOURCES.map(r => { const on = profile.resources.includes(r.id); return (
                <div key={r.id} style={{ ...S.chip, ...(on ? S.chipOn : {}), fontSize: 13 }} onClick={() => setProfile(p => ({ ...p, resources: on ? p.resources.filter(x => x !== r.id) : [...p.resources, r.id] }))}><span>{r.icon}</span> {r.name}</div>
              ); })}
            </div>
            <hr style={S.hr} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label style={S.label}>Exam date</label><input type="date" style={S.input} value={profile.examDate} onChange={e => setProfile(p => ({ ...p, examDate: e.target.value }))} /></div>
              <div><label style={S.label}>Hours / day</label><input type="number" min={1} max={16} style={S.input} value={profile.hoursPerDay} onChange={e => setProfile(p => ({ ...p, hoursPerDay: Number(e.target.value) }))} /></div>
            </div>
            <hr style={{ ...S.hr, margin: "20px 0 16px" }} />
            <label style={S.label}>Daily study window</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 6 }}>Start time</label>
                <input type="time" style={S.input} value={profile.studyStartTime || "07:00"} onChange={e => setProfile(p => ({ ...p, studyStartTime: e.target.value }))} />
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 6 }}>End time</label>
                <input type="time" style={S.input} value={profile.studyEndTime || "17:00"} onChange={e => setProfile(p => ({ ...p, studyEndTime: e.target.value }))} />
              </div>
            </div>
            {(() => {
              const [sh, sm] = (profile.studyStartTime || "07:00").split(':').map(Number);
              const [eh, em] = (profile.studyEndTime || "17:00").split(':').map(Number);
              const hrs = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
              return hrs > 0 ? <p style={{ ...S.muted, fontSize: 12, marginTop: 4 }}>{hrs.toFixed(1)} hours available for study — blocks will be scheduled with automatic breaks.</p> : null;
            })()}
          </div>
          {profile.examDate && (() => { const d = Math.max(1, Math.round((new Date(profile.examDate) - new Date()) / 86400000)); const mode = d >= 42 ? "full dedicated" : d >= 21 ? "standard" : d >= 10 ? "compressed" : "triage"; return <p style={{ ...S.muted, textAlign: "center", marginTop: 8 }}><strong style={{ color: "#1a1816" }}>{d} days</strong> — <strong style={{ color: d < 14 ? "#c0392b" : "#1a1816" }}>{mode}</strong> plan{d < 14 ? ". Every hour counts." : "."}</p>; })()}

          {/* ── Class schedule ── */}
          <div style={{ ...S.card, marginTop: 0 }}>
            <label style={S.label}>Class schedule (optional)</label>
            <p style={{ ...S.muted, marginBottom: 12, marginTop: -4 }}>Add mandatory class blocks — the plan will work around them. Leave blank if in dedicated study.</p>
            <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              {schedule.map((block, idx) => (
                <div key={block.id || block.tempId || idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#faf8f5", borderRadius: 8, flexWrap: "wrap" }}>
                  <select
                    style={{ ...S.input, width: 80, padding: "6px 8px", fontSize: 13 }}
                    value={block.dayOfWeek}
                    onChange={e => updateScheduleBlock(idx, 'dayOfWeek', Number(e.target.value))}
                  >
                    {DAY_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <input type="time" style={{ ...S.input, width: 100, padding: "6px 8px", fontSize: 13 }} value={block.startTime} onChange={e => updateScheduleBlock(idx, 'startTime', e.target.value)} />
                  <span style={{ fontSize: 13, color: "#8a857e", fontFamily: S.f }}>to</span>
                  <input type="time" style={{ ...S.input, width: 100, padding: "6px 8px", fontSize: 13 }} value={block.endTime} onChange={e => updateScheduleBlock(idx, 'endTime', e.target.value)} />
                  <input type="text" placeholder="Label (e.g. Pathology lecture)" style={{ ...S.input, flex: 1, minWidth: 120, padding: "6px 10px", fontSize: 13 }} value={block.label} onChange={e => updateScheduleBlock(idx, 'label', e.target.value)} />
                  <button style={{ ...S.btn, ...S.ghost, padding: "4px 8px", fontSize: 13, color: "#c0392b" }} onClick={() => removeScheduleBlock(idx)}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DAY_NAMES.map((d, i) => (
                <button key={i} style={{ ...S.btn, ...S.sec, padding: "6px 12px", fontSize: 12 }} onClick={() => addScheduleBlock(i)}>
                  + {d}
                </button>
              ))}
            </div>
            {schedule.length > 0 && (
              <p style={{ ...S.muted, marginTop: 8, fontSize: 12 }}>
                {schedule.length} block{schedule.length > 1 ? 's' : ''} saved — plan will schedule questions around these times.
              </p>
            )}
          </div>

          {/* ── Practice tests already taken ── */}
          <div style={{ ...S.card, marginTop: 0 }}>
            <label style={S.label}>Practice tests already taken</label>
            <p style={{ ...S.muted, marginBottom: 16, marginTop: -4 }}>
              Select any you've already done — the plan will schedule what's left and won't repeat anything you took in the last 6 weeks.
            </p>
            {/* NBME Forms 26–33 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8a857e', fontFamily: S.f, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>NBME CBSSA Forms</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRACTICE_TESTS.filter(t => t.type === 'nbme').map(test => {
                  const entry = (profile.takenAssessments || []).find(t => t.id === test.id);
                  const isTaken = !!entry;
                  return (
                    <div key={test.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div
                        style={{ ...S.chip, ...(isTaken ? S.chipOn : {}), fontSize: 13 }}
                        onClick={() => toggleTakenAssessment(test.id)}
                      >
                        {isTaken ? '✓ ' : ''}{test.name}
                      </div>
                      {isTaken && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>When?</span>
                          <input
                            type="date"
                            style={{ ...S.input, padding: '4px 8px', fontSize: 11, width: 130 }}
                            value={entry.takenDate || ''}
                            onChange={e => updateTakenDate(test.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Special tests */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8a857e', fontFamily: S.f, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>UW Self-Assessments & Other</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRACTICE_TESTS.filter(t => t.type !== 'nbme').map(test => {
                  const entry = (profile.takenAssessments || []).find(t => t.id === test.id);
                  const isTaken = !!entry;
                  return (
                    <div key={test.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div
                        style={{ ...S.chip, ...(isTaken ? S.chipOn : {}), fontSize: 13 }}
                        onClick={() => toggleTakenAssessment(test.id)}
                      >
                        {isTaken ? '✓ ' : ''}{test.icon ? `${test.icon} ` : ''}{test.name}
                      </div>
                      {isTaken && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>When?</span>
                          <input
                            type="date"
                            style={{ ...S.input, padding: '4px 8px', fontSize: 11, width: 130 }}
                            value={entry.takenDate || ''}
                            onChange={e => updateTakenDate(test.id, e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {(profile.takenAssessments || []).length > 0 && (
              <p style={{ ...S.muted, marginTop: 10, fontSize: 12 }}>
                {(profile.takenAssessments || []).length} test{(profile.takenAssessments || []).length > 1 ? 's' : ''} marked as taken — scheduler will work around these.
              </p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}><button disabled={!ok} style={{ ...S.btn, ...S.pri, opacity: ok ? 1 : 0.4 }} onClick={() => navigate(assessments.length === 0 ? "self-assessment" : "scores")}>Continue →</button></div>
        </div>
      </div>
    );
  }

  // ─── SELF-ASSESSMENT (first-timer alternate path) ──────────────────
  if (screen === "self-assessment") {
    const uworldNum = uworldPct !== '' && !isNaN(Number(uworldPct)) ? Number(uworldPct) : null;
    const uworldFeedback = uworldNum === null ? null
      : uworldNum >= 65 ? { icon: '✅', text: 'Solid baseline — plan will maintain strengths and target gaps.', color: BRAND.green }
      : uworldNum >= 50 ? { icon: '📊', text: 'Decent start — plan will build on areas where you\'re losing points.', color: '#D85A30' }
      : { icon: '📚', text: 'Good place to start — content-heavy early blocks will fill the gaps.', color: '#2980b9' };

    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate("onboarding")}>← Back</button>{dots(1)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Before your first NBME</h1>
          <p style={S.sub}>Tell me where you're starting from — I'll build a diagnostic-first plan that gets you real data fast.</p>

          {/* Weak systems */}
          <div style={S.card}>
            <label style={S.label}>Which systems felt weakest in coursework?</label>
            <p style={{ ...S.muted, marginBottom: 14 }}>Select all that apply. These will be weighted as focus blocks in your starter plan.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STEP1_SYSTEM_CATEGORIES.map(sys => {
                const on = weakSystems.includes(sys);
                return (
                  <div key={sys} style={{ ...S.chip, ...(on ? S.chipOn : {}), fontSize: 13 }}
                    onClick={() => setWeakSystems(prev => on ? prev.filter(s => s !== sys) : [...prev, sys])}>
                    {sys}
                  </div>
                );
              })}
            </div>
            {weakSystems.length === 0 && (
              <p style={{ ...S.muted, fontSize: 12, marginTop: 12 }}>No selection = plan treats all systems equally to start.</p>
            )}
          </div>

          {/* UWorld % */}
          <div style={S.card}>
            <label style={S.label}>UWorld cumulative % (optional)</label>
            <p style={{ ...S.muted, marginBottom: 12 }}>If you've started UWorld, enter your current cumulative % correct. Leave blank if you haven't begun.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="number" min={0} max={100}
                style={{ ...S.input, maxWidth: 110 }}
                placeholder="e.g. 58"
                value={uworldPct}
                onChange={e => setUworldPct(e.target.value)}
              />
              <span style={{ ...S.muted, fontSize: 13 }}>%</span>
            </div>
            {uworldFeedback && (
              <p style={{ ...S.muted, fontSize: 13, marginTop: 10, color: uworldFeedback.color, fontWeight: 500 }}>
                {uworldFeedback.icon} {uworldFeedback.text}
              </p>
            )}
          </div>

          {/* Callout explaining the plan */}
          <div style={{ ...S.card, background: '#fefcf8', border: '1.5px solid #e8dcc8', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#b45309', fontFamily: S.f, marginBottom: 8 }}>📋 What happens next</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                { icon: '1.', text: 'You get a starter plan broadly covering all systems — weighted toward your self-reported weak areas.' },
                { icon: '2.', text: 'A diagnostic practice NBME is scheduled early in your first week (days 1–3). Take it under real test conditions.' },
                { icon: '3.', text: 'Enter your NBME scores and the app switches to a fully data-driven, personalised plan.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#b45309', fontFamily: S.f, minWidth: 20, paddingTop: 1 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, fontFamily: S.f, color: '#6b6560', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <button style={{ ...S.btn, ...S.sec, fontSize: 13 }} onClick={() => navigate("scores")}>
              I have NBME scores already →
            </button>
            <button style={{ ...S.btn, ...S.pri }} onClick={async () => {
              const generatedPlan = generateFirstTimerPlan(profile, weakSystems, uworldNum);
              setPlan(generatedPlan);
              setExpandedWeek(0);
              api.plans.save({
                planData: generatedPlan,
                profileSnapshot: { ...profile, firstTimerData: { weakSystems, uworldPct } },
                assessmentId: null,
              }).then(result => {
                if (result?.id) setLatestPlanMeta({ id: result.id, createdAt: result.createdAt || new Date().toISOString() });
              }).catch(() => {});
              navigate("plan");
            }}>
              Build my starter plan →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCORES ────────────────────────────────────────────────────────
  if (screen === "scores") {
    const cats = selectedExam?.categories || [];
    const allFilled = cats.every(c => scores[c] !== undefined && scores[c] !== "");
    const isRetake = assessments.length > 0;
    return (
      <div style={S.app}>
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate(isRetake ? "plan" : "onboarding")}>← Back</button>{dots(1)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>{isRetake ? `Assessment #${assessments.length + 1}` : "Enter NBME scores"}</h1>
          <p style={S.sub}>{isRetake ? "Enter your new scores — I'll compare them to your previous results." : "Rate each category 0–100 from your most recent report."}</p>

          {/* Screenshot upload */}
          <div style={{ ...S.card, background: "#fefcf8", border: "1.5px solid #e8dcc8", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1816", fontFamily: S.f, marginBottom: 2 }}>📸 Auto-import from screenshot or PDF</div>
                <div style={{ fontSize: 12, color: "#6b6560", fontFamily: S.f }}>Upload your NBME score report (image or PDF) and AI will fill in the scores</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {uploadingScreenshot && <span style={{ ...S.muted, fontSize: 12 }}>Parsing…</span>}
                <button
                  style={{ ...S.btn, ...S.sec, padding: "9px 16px", fontSize: 13, opacity: uploadingScreenshot ? 0.5 : 1 }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingScreenshot}
                >
                  {uploadingScreenshot ? 'Analyzing…' : 'Upload screenshot / PDF'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files[0]; if (f) handleScreenshotUpload(f); e.target.value = ''; }}
                />
              </div>
            </div>
            {screenshotError && <div style={{ marginTop: 8, fontSize: 12, color: "#c0392b", fontFamily: S.f }}>{screenshotError}</div>}
          </div>

          {isRetake && (
            <div style={{ ...S.card, background: "#fefcf8", border: "1.5px solid #e8dcc8", marginBottom: 16, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <span style={{ fontSize: 13, fontFamily: S.f, color: "#6b6560" }}>
                  Comparing against <strong style={{ color: "#1a1816" }}>{previousAssessment.formName}</strong> from {previousAssessment.date}
                  {assessments.length > 1 && ` (${assessments.length} total assessments on file)`}
                </span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Which practice test is this?</label>
            <select
              style={{ ...S.input, maxWidth: 240 }}
              value={nbmeForm}
              onChange={e => setNbmeForm(e.target.value)}
            >
              <option value="">— Select (optional) —</option>
              <optgroup label="NBME CBSSA Forms">
                {PRACTICE_TESTS.filter(t => t.type === 'nbme').map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </optgroup>
              <optgroup label="UW Self-Assessments & Other">
                {PRACTICE_TESTS.filter(t => t.type !== 'nbme').map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </optgroup>
              <option value="Other">Other / Unknown</option>
            </select>
          </div>
          {[
            { label: "Performance by System", cats: STEP1_SYSTEM_CATEGORIES },
            { label: "Performance by Discipline", cats: STEP1_DISCIPLINE_CATEGORIES },
          ].map(group => (
            <div key={group.label} style={{ ...S.card, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#b45309", fontFamily: S.f, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{group.label}</div>
              <div style={{ display: "grid", gap: 10 }}>
                {group.cats.map(cat => {
                  const val = scores[cat] ?? "";
                  const perf = val !== "" ? getPerformanceLevel(Number(val)) : null;
                  const prevScore = previousAssessment?.scores[cat];
                  const delta = val !== "" && prevScore !== undefined ? Number(val) - prevScore : null;
                  return (
                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #f0ece4" }}>
                      <div style={{ flex: 1, fontSize: 14, fontFamily: S.f, fontWeight: 500 }}>
                        {cat}
                        {prevScore !== undefined && <span style={{ fontSize: 11, color: "#8a857e", fontWeight: 400 }}> (was {prevScore}%)</span>}
                      </div>
                      <div style={{ width: 100 }}><ProgressBar value={Number(val) || 0} color={perf?.color || "#d5d0c9"} /></div>
                      <input type="number" min={0} max={100} style={{ ...S.input, width: 60, padding: "8px 8px", textAlign: "center", fontSize: 14 }} placeholder="—" value={val}
                        onChange={e => { const v = e.target.value; setScores(s => ({ ...s, [cat]: v === "" ? "" : Math.min(100, Math.max(0, Number(v))) })); }} />
                      {delta !== null && <span style={{ ...S.tag, minWidth: 42, textAlign: "center", background: delta > 5 ? "#27ae6018" : delta < -3 ? "#c0392b18" : "#6b656010", color: delta > 5 ? "#27ae60" : delta < -3 ? "#c0392b" : "#6b6560" }}>{delta > 0 ? "+" : ""}{delta}</span>}
                      {delta === null && perf && <span style={{ ...S.tag, background: perf.color + "18", color: perf.color, minWidth: 42, textAlign: "center" }}>{perf.label}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button style={{ ...S.btn, ...S.sec }} onClick={() => { const d = {}; cats.forEach(c => { d[c] = Math.floor(Math.random() * 60) + 20; }); setScores(d); }}>Demo scores</button>
            <button disabled={!allFilled} style={{ ...S.btn, ...S.pri, opacity: allFilled ? 1 : 0.4 }} onClick={() => navigate("sticking-points")}>Analyze →</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STICKING POINTS ───────────────────────────────────────────────
  if (screen === "sticking-points") {
    const cats = selectedExam?.categories || [];
    const sorted = [...cats].filter(c => (scores[c] ?? 50) <= 60).sort((a, b) => (scores[a] ?? 50) - (scores[b] ?? 50));
    const stubbornTopics = getStubbornTopics();

    const generateAndNavigate = async () => {
      const isRebuild = skipAssessmentSaveRef.current;
      skipAssessmentSaveRef.current = false;
      const generatedPlan = generatePlan(profile, scores, stickingPoints);
      setPlan(generatedPlan);
      setExpandedWeek(0);
      let savedAssessment;
      if (isRebuild) {
        savedAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;
      } else {
        savedAssessment = await saveCurrentAssessment();
      }
      api.plans.save({
        planData: generatedPlan,
        profileSnapshot: profile,
        assessmentId: savedAssessment?.id || null,
      }).then(result => {
        if (result?.id) setLatestPlanMeta({ id: result.id, createdAt: result.createdAt || new Date().toISOString() });
      }).catch(() => {});
      navigate(previousAssessment && !isRebuild ? "comparison" : "plan");
    };

    return (
      <div style={S.app}>
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate("scores")}>← Back</button>{dots(2)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Review your scores</h1>
          <p style={S.sub}>{previousAssessment ? `Compared to ${previousAssessment.formName} — flag what still trips you up.` : "Weak areas ranked by score impact — flag your genuine sticking points."}</p>

          {/* Stubborn topics warning */}
          {previousAssessment && stubbornTopics.length > 0 && (
            <div style={{ ...S.card, background: "#b4530908", border: "1.5px solid #b4530920", marginBottom: 4, padding: "14px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#b45309", fontFamily: S.f, marginBottom: 4 }}>⚠ These barely moved since last time:</div>
              <div style={{ fontSize: 13, fontFamily: S.f, color: "#6b6560" }}>{stubbornTopics.join(", ")} — consider flagging these.</div>
            </div>
          )}

          {/* Weak areas + sticking point toggle combined */}
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', fontFamily: S.f, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Tap any topic to flag it as a sticking point — it gets priority focus blocks
            </div>
            {sorted.length === 0 ? (
              <p style={S.muted}>Strong across the board — no categories below 60%.</p>
            ) : (
              <div style={{ display: "grid", gap: 4 }}>
                {sorted.map(cat => {
                  const s = scores[cat] ?? 50;
                  const yld = HIGH_YIELD_WEIGHTS[cat] || 5;
                  const delta = getScoreDelta(cat);
                  const on = stickingPoints.includes(cat);
                  const isStubborn = stubbornTopics.includes(cat);
                  const subs = getTopSubTopics(cat, 4);
                  return (
                    <div
                      key={cat}
                      onClick={() => setStickingPoints(sp => on ? sp.filter(x => x !== cat) : [...sp, cat])}
                      style={{ padding: "12px", borderRadius: 10, border: `1.5px solid ${on ? '#b45309' : isStubborn ? '#b4530960' : '#ece8e2'}`, background: on ? '#b4530908' : isStubborn ? '#b4530904' : '#faf8f5', cursor: 'pointer', marginBottom: 4 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: subs.length > 0 ? 6 : 0 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${on ? '#b45309' : '#d5d0c9'}`, background: on ? '#b45309' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                          {on && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, fontFamily: S.f, color: on ? '#b45309' : '#1a1816' }}>{cat}</span>
                          <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f, marginLeft: 8 }}>
                            {s}%{delta !== null ? ` (${delta > 0 ? '+' : ''}${delta} from prev)` : ''} · {yld >= 8 ? '⚡ High-yield' : `Weight ${yld}/10`}
                          </span>
                        </div>
                        {delta !== null && <span style={{ ...S.tag, background: delta > 5 ? "#27ae6018" : delta < -3 ? "#c0392b18" : "#6b656010", color: delta > 5 ? "#27ae60" : delta < -3 ? "#c0392b" : "#6b6560" }}>{delta > 0 ? "+" : ""}{delta}</span>}
                      </div>
                      {on && subs.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, paddingLeft: 30 }}>
                          {subs.map((sub, si) => <span key={si} style={{ fontSize: 10, fontFamily: S.f, padding: "2px 6px", borderRadius: 3, background: sub.yield >= 9 ? "#b4530915" : "#6b656010", color: sub.yield >= 9 ? "#b45309" : "#6b6560", fontWeight: 500 }}>{sub.yield >= 9 ? "★ " : ""}{sub.topic}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {stickingPoints.length > 0 && (
              <p style={{ ...S.muted, marginTop: 12, fontSize: 13 }}>
                ★ {stickingPoints.length} sticking point{stickingPoints.length > 1 ? 's' : ''} flagged — these get doubled focus block priority.
              </p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button style={{ ...S.btn, ...S.pri }} onClick={generateAndNavigate}>
              {previousAssessment ? "Compare & generate plan →" : "Generate plan →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── COMPARISON ────────────────────────────────────────────────────
  if (screen === "comparison" && previousAssessment) {
    const cats = selectedExam?.categories || [];
    const improved = cats.filter(c => { const d = getScoreDelta(c); return d !== null && d > 5; }).sort((a, b) => getScoreDelta(b) - getScoreDelta(a));
    const declined = cats.filter(c => { const d = getScoreDelta(c); return d !== null && d < -3; }).sort((a, b) => getScoreDelta(a) - getScoreDelta(b));
    const stagnant = getStubbornTopics();
    const unchanged = cats.filter(c => { const d = getScoreDelta(c); return d !== null && d >= -3 && d <= 5; });
    const avgPrev = cats.reduce((s, c) => s + (previousAssessment.scores[c] || 0), 0) / cats.length;
    const avgCurr = cats.reduce((s, c) => s + (scores[c] || 0), 0) / cats.length;
    const avgDelta = Math.round(avgCurr - avgPrev);
    return (
      <div style={S.app}>
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate("sticking-points")}>← Back</button>{dots(3)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Score comparison</h1>
          <p style={S.sub}>{previousAssessment.formName} → {nbmeForm || `NBME #${assessments.length + 1}`}</p>
          <div style={{ ...S.card, textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 42, fontWeight: 700, color: avgDelta > 0 ? "#27ae60" : avgDelta < 0 ? "#c0392b" : "#6b6560", fontFamily: S.f }}>{avgDelta > 0 ? "+" : ""}{avgDelta}</div>
            <div style={{ ...S.muted, marginTop: 2 }}>average change across all categories</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
              <div><span style={{ fontSize: 20, fontWeight: 700, color: "#1a1816" }}>{Math.round(avgPrev)}%</span><div style={S.muted}>previous avg</div></div>
              <div style={{ fontSize: 20, color: "#d5d0c9" }}>→</div>
              <div><span style={{ fontSize: 20, fontWeight: 700, color: "#1a1816" }}>{Math.round(avgCurr)}%</span><div style={S.muted}>current avg</div></div>
            </div>
          </div>
          {improved.length > 0 && <div style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span>📈</span><span style={{ fontSize: 14, fontWeight: 700, color: "#27ae60", fontFamily: S.f }}>Improved ({improved.length})</span></div>
            <div style={{ display: "grid", gap: 6 }}>{improved.map(cat => { const d = getScoreDelta(cat); const prev = previousAssessment.scores[cat]; return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#27ae6008", borderRadius: 8, borderLeft: "3px solid #27ae60" }}>
                <span style={{ flex: 1, fontSize: 14, fontFamily: S.f, fontWeight: 500, color: "#1a1816" }}>{cat}</span>
                <span style={{ fontSize: 13, fontFamily: S.f, color: "#8a857e" }}>{prev}% → {scores[cat]}%</span>
                <span style={{ ...S.tag, background: "#27ae6018", color: "#27ae60" }}>+{d}</span>
              </div>
            ); })}</div>
          </div>}
          {stagnant.length > 0 && <div style={{ ...S.card, background: "#fefcf8", border: "1.5px solid #e8dcc8", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><span>⚠️</span><span style={{ fontSize: 14, fontWeight: 700, color: "#b45309", fontFamily: S.f }}>Stubborn areas</span></div>
            <div style={{ display: "grid", gap: 6 }}>{stagnant.map(cat => { const d = getScoreDelta(cat) || 0; const prev = previousAssessment.scores[cat];
              const suggestion = scores[cat] < 50 ? "Try switching to video resources or a different content source" : "Try switching to tutor mode — work through explanations more carefully";
              return <div key={cat} style={{ padding: "10px 12px", background: "#b4530908", borderRadius: 8, borderLeft: "3px solid #b45309" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 14, fontFamily: S.f, fontWeight: 500 }}>{cat}</span>
                  <span style={{ fontSize: 13, fontFamily: S.f, color: "#8a857e" }}>{prev}% → {scores[cat]}%</span>
                  <span style={{ ...S.tag, background: "#b4530918", color: "#b45309" }}>{d >= 0 ? "+" : ""}{d}</span>
                </div>
                <div style={{ fontSize: 12, fontFamily: S.f, color: "#8a857e", fontStyle: "italic" }}>💡 {suggestion}</div>
              </div>; })}</div>
          </div>}
          {declined.length > 0 && <div style={{ ...S.card, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span>📉</span><span style={{ fontSize: 14, fontWeight: 700, color: "#c0392b", fontFamily: S.f }}>Declined ({declined.length})</span></div>
            <div style={{ display: "grid", gap: 6 }}>{declined.map(cat => { const d = getScoreDelta(cat); const prev = previousAssessment.scores[cat]; return (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#c0392b08", borderRadius: 8, borderLeft: "3px solid #c0392b" }}>
                <span style={{ flex: 1, fontSize: 14, fontFamily: S.f, fontWeight: 500 }}>{cat}</span>
                <span style={{ fontSize: 13, fontFamily: S.f, color: "#8a857e" }}>{prev}% → {scores[cat]}%</span>
                <span style={{ ...S.tag, background: "#c0392b18", color: "#c0392b" }}>{d}</span>
              </div>
            ); })}</div>
          </div>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <button style={{ ...S.btn, ...S.pri }} onClick={() => navigate("plan")}>View updated plan →</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAN ──────────────────────────────────────────────────────────
  if (screen === "plan" && plan) return (
    <div style={S.app}>
      <VerifyBanner />
      <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate("dashboard")}>← Back</button>{dots(5)}<UserBar /></div>
      <div style={S.wrap}>
        <h1 style={S.h1}>Your study plan</h1>
        <p style={S.sub}>Question-driven {plan.totalWeeks}-week plan. Focused blocks attack weaknesses, random blocks maintain everything, NBMEs recalibrate.</p>

        {plan.firstTimer && assessments.length === 0 && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #f6c90e60', borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🧭</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92600a', fontFamily: S.f, marginBottom: 4 }}>Starter plan — diagnostic NBME unlocks your full personalisation</div>
              <div style={{ fontSize: 13, color: '#92600a', fontFamily: S.f, lineHeight: 1.5 }}>
                This plan is seeded from your self-assessment. Check your schedule for an early diagnostic NBME (days 1–3). Once you take it and enter your scores, the app rebuilds your plan around real performance data.
              </div>
              <button style={{ ...S.btn, background: '#f6c90e30', color: '#92600a', border: '1px solid #f6c90e80', padding: '7px 14px', fontSize: 12, marginTop: 10 }} onClick={() => navigate("scores")}>
                Enter NBME scores now →
              </button>
            </div>
          </div>
        )}

        <div style={{ ...S.card, background: "#fefcf8", border: "1.5px solid #e8dcc8", marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: S.f, color: "#1a1816", marginBottom: 12 }}>How every day works</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { icon: "🧠", label: "Morning Anki", desc: "Spaced repetition first — locks in yesterday's learning", color: "#27ae60" },
              { icon: "🔥", label: "Focus block (40 Qs, ~2.5h)", desc: "System-specific on your weakest high-yield topic + deep thorough review", color: "#b45309" },
              { icon: "🎲", label: "Random blocks (40 Qs each, ~1.75h)", desc: "RANDOM all-systems — the real exam simulator and core of your daily prep", color: "#2563eb" },
              { icon: "📚", label: "Reactive content review", desc: "ONLY for concepts you missed in today's questions — never passive re-reading", color: "#8b5cf6" },
            ].map((item, i) => <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontFamily: S.f }}><strong style={{ color: item.color }}>{item.label}</strong><span style={{ color: "#6b6560" }}> — {item.desc}</span></span>
            </div>)}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            {[{ val: plan.totalStudyDays, l: "study days" }, { val: `~${plan.totalQEstimate}`, l: "questions" }, { val: plan.nbmeDays, l: "NBMEs" }, { val: `${profile.hoursPerDay}h`, l: "per day" }].map((s, i) => (
              <div key={i} style={{ background: "#faf8f5", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1816" }}>{s.val}</div><div style={{ ...S.muted, fontSize: 11 }}>{s.l}</div>
              </div>
            ))}
          </div>
          {plan.timelineMode === "triage" && <div style={{ marginTop: 12, padding: "10px 14px", background: "#c0392b10", borderRadius: 8 }}>
            <p style={{ fontSize: 13, color: "#c0392b", fontFamily: S.f, margin: 0, fontWeight: 600 }}>⚠ Triage mode — only highest-impact topics get focus.</p>
          </div>}
        </div>

        {/* ── Assessment Schedule ── */}
        {plan.assessmentSchedule && plan.assessmentSchedule.length > 0 && (() => {
          const planStart = latestPlanMeta?.createdAt ? new Date(latestPlanMeta.createdAt) : null;
          const labelColors = {
            'Baseline diagnostic': { bg: '#c0392b18', color: '#c0392b' },
            'Baseline': { bg: '#c0392b18', color: '#c0392b' },
            'Progress check': { bg: '#2980b918', color: '#2980b9' },
            'Midpoint learning tool': { bg: '#8b5cf618', color: '#8b5cf6' },
            'Score predictor': { bg: '#1D9E7518', color: '#1D9E75' },
            'Style calibrator': { bg: '#D85A3018', color: '#D85A30' },
            'Checkpoint': { bg: '#f59e0b18', color: '#f59e0b' },
          };
          const getLabelStyle = (label) => {
            for (const [key, style] of Object.entries(labelColors)) {
              if (label?.includes(key)) return style;
            }
            return { bg: '#1a181618', color: '#1a1816' };
          };
          return (
            <div style={{ ...S.card, marginBottom: 20 }}>
              <h3 style={{ ...S.h3, marginBottom: 4 }}>📋 Assessment Schedule</h3>
              <p style={{ ...S.muted, marginBottom: 16, fontSize: 13 }}>
                {plan.assessmentSchedule.length} practice test{plan.assessmentSchedule.length > 1 ? 's' : ''} scheduled — spaced for maximum learning and score prediction accuracy.
              </p>
              <div style={{ display: 'grid', gap: 12 }}>
                {plan.assessmentSchedule.map((a, i) => {
                  const approxDate = planStart ? new Date(planStart.getTime() + (a.day - 1) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
                  const ls = getLabelStyle(a.label);
                  return (
                    <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: '#faf8f5', border: '1px solid #ece8e2' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ ...S.tag, background: '#1a181610', color: '#1a1816' }}>Day {a.day}{approxDate ? ` · ${approxDate}` : ''}</span>
                          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: S.f, color: '#1a1816' }}>{a.test?.name || a.testId}</span>
                          {a.label && <span style={{ ...S.tag, background: ls.bg, color: ls.color }}>{a.label}</span>}
                        </div>
                        {a.reviewHours > 0 && (
                          <span style={{ ...S.muted, fontSize: 11, whiteSpace: 'nowrap' }}>+{a.reviewHours}h review</span>
                        )}
                      </div>
                      {a.reason && (
                        <p style={{ ...S.muted, fontSize: 12, margin: '0 0 6px', lineHeight: 1.5, fontStyle: 'italic' }}>💡 {a.reason}</p>
                      )}
                      {a.overpredictWarning && (
                        <div style={{ padding: '6px 10px', borderRadius: 6, background: '#f59e0b10', border: '1px solid #f59e0b30', fontSize: 12, color: '#b45309', fontFamily: S.f, lineHeight: 1.4 }}>
                          ⚠️ <strong>Note:</strong> UWSA1 tends to overpredict by 10–25 points. Use for learning direction, not score prediction.
                        </div>
                      )}
                      {a.predictorNote && (
                        <div style={{ padding: '6px 10px', borderRadius: 6, background: '#1D9E7510', border: '1px solid #1D9E7530', fontSize: 12, color: '#0F6E56', fontFamily: S.f, lineHeight: 1.4 }}>
                          🎯 <strong>Strongest predictor:</strong> UWSA2 correlates most closely with your actual Step 1 score.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div style={{ ...S.card, marginBottom: 20 }}>
          <h3 style={{ ...S.h3, marginBottom: 12 }}>Priority ranking — with highest-yield sub-topics</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {plan.priorities.slice(0, 8).map((p, i) => {
              const subs = getTopSubTopics(p.category, 5);
              return (
                <div key={i} style={{ padding: "8px 12px", borderRadius: 10, background: i < 3 ? "#b4530908" : "#faf8f5", border: i < 3 ? "1px solid #b4530920" : "1px solid #f0ece6" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: subs.length > 0 ? 6 : 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: S.f, color: i < 3 ? "#b45309" : "#1a1816", minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: S.f, color: "#1a1816", flex: 1 }}>{p.category}</span>
                    {p.flagged && <span style={{ ...S.tag, background: "#b4530918", color: "#b45309", fontSize: 10 }}>Flagged ★</span>}
                    <span style={{ fontSize: 12, fontFamily: S.f, color: "#8a857e" }}>{p.score}%</span>
                  </div>
                  {subs.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, paddingLeft: 28 }}>
                      {subs.map((sub, si) => <span key={si} style={{ fontSize: 10, fontFamily: S.f, padding: "2px 6px", borderRadius: 3, background: sub.yield >= 9 ? "#b4530912" : sub.yield >= 7 ? "#2980b90c" : "#6b656008", color: sub.yield >= 9 ? "#b45309" : sub.yield >= 7 ? "#2980b9" : "#8a857e", fontWeight: 500 }}>{sub.yield >= 9 ? "★ " : ""}{sub.topic}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {plan.weeks.map((week, wi) => (
          <div key={wi} style={{ ...S.card, padding: 0, overflow: "hidden", marginBottom: 12, ...(week.isLockdown ? { border: '1.5px solid #7c3aed30' } : {}) }}>
            <div style={{ padding: "16px 24px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: expandedWeek === wi ? (week.isLockdown ? '#f5f3ff' : "#faf8f5") : (week.isLockdown ? '#fdfcff' : "#fff") }} onClick={() => setExpandedWeek(expandedWeek === wi ? -1 : wi)}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, fontFamily: S.f, color: "#1a1816" }}>Week {week.week}</span>
                  {week.isLockdown
                    ? <span style={{ ...S.tag, background: "#7c3aed18", color: "#7c3aed", fontSize: 10 }}>🔒 Exam week</span>
                    : week.focusTopics?.slice(0, 3).map((ft, fi) => <span key={fi} style={{ ...S.tag, background: "#b4530915", color: "#b45309", fontSize: 10 }}>{ft}</span>)
                  }
                </div>
                <div style={{ fontSize: 13, color: week.isLockdown ? "#7c3aed" : "#8a857e", fontFamily: S.f, marginTop: 2 }}>{week.phase}</div>
              </div>
              <span style={{ fontSize: 18, color: "#8a857e", transform: expandedWeek === wi ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            </div>
            {expandedWeek === wi && <div style={{ padding: "0 24px 20px" }}>
              {week.isLockdown && (
                <div style={{ margin: '16px 0 4px', padding: '12px 16px', borderRadius: 10, background: '#7c3aed08', border: '1px solid #7c3aed25', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', fontFamily: S.f, marginBottom: 3 }}>Exam week — maintenance and confidence mode</div>
                    <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>No new content. Random blocks only — simulate exam pacing daily. Finish all study by 3 PM. Trust the work you've done.</div>
                  </div>
                </div>
              )}
              {week.days.map((day, di) => {
                const special = day.dayType === "nbme" || day.dayType === "rest";
                return (<div key={di} style={{ padding: "14px 0", borderTop: di > 0 ? "1px solid #f0ece6" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ ...S.tag, background: "#1a181610", color: "#1a1816" }}>Day {day.calendarDay}</span>
                    {day.dayType === "nbme" && <span style={{ ...S.tag, background: "#c0392b18", color: "#c0392b" }}>📋 NBME</span>}
                    {day.dayType === "rest" && <span style={{ ...S.tag, background: "#27ae6018", color: "#27ae60" }}>😴 Rest</span>}
                    {day.dayType === "light" && <span style={{ ...S.tag, background: "#2980b918", color: "#2980b9" }}>Light</span>}
                    {day.dayType === "exam-week" && <span style={{ ...S.tag, background: "#7c3aed18", color: "#7c3aed" }}>⚡ Exam week</span>}
                    {day.dayType === "exam-eve" && <span style={{ ...S.tag, background: "#1D9E7518", color: "#1D9E75" }}>🌙 Exam eve</span>}
                    {!special && day.dayType !== "exam-week" && day.dayType !== "exam-eve" && day.focusTopic && (() => { const rc = day.blocks.filter(b => b.type === "questions-random").length; return <span style={{ fontSize: 13, color: "#8a857e", fontFamily: S.f }}>Focus: <strong style={{ color: "#1a1816" }}>{day.focusTopic}</strong>{rc > 0 && ` · ${rc} random block${rc > 1 ? "s" : ""}`}</span>; })()}
                    {day.totalQuestions > 0 && <span style={{ ...S.tag, background: "#1a181610", color: "#1a1816", marginLeft: "auto" }}>{day.totalQuestions} Qs</span>}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {day.blocks.map((block, bi) => { const bc = blockColors[block.type] || blockColors.questions; return (
                      <div key={bi}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{bc.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: bc.border, fontFamily: S.f }}>{block.label}</span>
                        </div>
                        {block.highYield && block.highYield.length > 0 && (
                          <SubTopicProgressPanel
                            highYield={block.highYield}
                            subTopicProgress={profile.subTopicProgress}
                            onToggle={toggleSubTopicProgress}
                            qbankFilterTip={block.qbankFilterTip}
                          />
                        )}
                        <div style={{ display: "grid", gap: 3 }}>
                          {block.tasks.map((task, ti) => (
                            <div key={ti} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, fontFamily: S.f, background: bc.bg, borderLeft: `3px solid ${bc.border}` }}>
                              <span style={{ fontWeight: 600, color: "#1a1816", minWidth: 85 }}>{task.resource}</span>
                              <span style={{ color: "#6b6560", flex: 1, lineHeight: 1.4 }}>{task.activity}</span>
                              <span style={{ color: "#8a857e", fontWeight: 600, whiteSpace: "nowrap" }}>{task.hours}h</span>
                            </div>
                          ))}
                        </div>
                        {block.contentSequence && <ContentSequencePanel contentSequence={block.contentSequence} />}
                      </div>
                    ); })}
                  </div>
                </div>);
              })}
            </div>}
          </div>
        ))}

        {/* ── Export plan ── */}
        <div style={{ ...S.card, marginTop: 20, marginBottom: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, fontFamily: S.f, color: "#1a1816", marginBottom: 4 }}>📥 Export your study plan</div>
          <p style={{ ...S.muted, marginBottom: 14, fontSize: 13 }}>Download a printable copy to share with your tutor or keep offline.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              style={{ ...S.btn, ...S.sec, padding: "10px 18px", fontSize: 13, opacity: exporting === 'pdf' ? 0.5 : 1 }}
              disabled={!!exporting}
              onClick={() => handleExport('pdf')}
            >
              {exporting === 'pdf' ? 'Exporting…' : '📄 Export as PDF'}
            </button>
            <button
              style={{ ...S.btn, ...S.sec, padding: "10px 18px", fontSize: 13, opacity: exporting === 'docx' ? 0.5 : 1 }}
              disabled={!!exporting}
              onClick={() => handleExport('docx')}
            >
              {exporting === 'docx' ? 'Exporting…' : '📝 Export as Word (.docx)'}
            </button>
          </div>
        </div>

        <div style={{ ...S.card, background: "#fefcf8", border: "1.5px solid #e8dcc8", textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 20, marginBottom: 8 }}>🔄</div>
          <p style={{ fontSize: 15, fontWeight: 600, fontFamily: S.f, color: "#1a1816", margin: "0 0 4px" }}>Took another NBME?</p>
          <p style={{ ...S.muted, margin: "0 0 16px" }}>{assessments.length === 0 ? "Enter your new scores to recalibrate the plan." : `You have ${assessments.length} previous assessment${assessments.length > 1 ? "s" : ""} on file.`}</p>
          <button style={{ ...S.btn, ...S.pri }} onClick={startNewAssessment}>Enter new scores →</button>
        </div>

        {assessments.length > 0 && (
          <div style={{ ...S.card, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setShowHistory(!showHistory)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <span style={{ fontSize: 14, fontWeight: 600, fontFamily: S.f, color: "#1a1816" }}>Score history ({assessments.length} assessments)</span>
              </div>
              <span style={{ fontSize: 18, color: "#8a857e", transform: showHistory ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            </div>
            {showHistory && (
              <div style={{ marginTop: 12 }}>
                {assessments.map((a, i) => {
                  const cats = selectedExam?.categories || [];
                  const avg = Math.round(cats.reduce((s, c) => s + (a.scores[c] || 0), 0) / cats.length);
                  return (
                    <div key={a.id} style={{ padding: "10px 14px", background: "#faf8f5", borderRadius: 8, marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ ...S.tag, background: "#1a181610", color: "#1a1816" }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: "#1a1816" }}>{a.formName}</span>
                        <span style={{ fontSize: 12, fontFamily: S.f, color: "#8a857e" }}>{a.date}</span>
                        <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, fontFamily: S.f, color: "#1a1816" }}>Avg: {avg}%</span>
                      </div>
                      <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                        {cats.map(c => { const v = a.scores[c] || 0; return <div key={c} title={`${c}: ${v}%`} style={{ flex: 1, height: 4, borderRadius: 2, background: v <= 30 ? "#c0392b" : v <= 50 ? "#e67e22" : v <= 70 ? "#2980b9" : "#27ae60", opacity: 0.7 }} />; })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reset / start fresh link */}
      <div style={{ textAlign: 'center', padding: '8px 0 28px', borderTop: '1px solid #f0ece6', marginTop: 8 }}>
        <button style={{ ...S.btn, ...S.ghost, fontSize: 13, color: '#8a857e', padding: '8px 16px' }} onClick={() => navigate("reset")}>
          ↺ Start fresh / reset plan
        </button>
      </div>

      {/* Floating chat button */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed', bottom: 20, right: 20, padding: '13px 20px',
            background: '#1a1816', color: '#fff', border: 'none', borderRadius: 50,
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: S.f,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8,
            zIndex: 999,
          }}
        >
          💬 Ask your coach
        </button>
      )}

      {showChat && <Chat planContext={planContext} onClose={() => setShowChat(false)} />}
      <Footer />
    </div>
  );

  return null;
}
