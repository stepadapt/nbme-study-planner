import { useState, useEffect, useRef } from 'react';
import { STEP1_CATEGORIES, STEP1_SYSTEM_CATEGORIES, STEP1_DISCIPLINE_CATEGORIES, RESOURCES, HIGH_YIELD_WEIGHTS, PRACTICE_TESTS } from '../data.js';
import { generatePlan, generateFirstTimerPlan, getTopSubTopics, getQbankFilterTip, getPerformanceLevel, assignBlockTimes, findTodayInPlan, calcPlanProgress, formatDuration, roundToQuarterHour } from '../planEngine.js';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

function ProgressBar({ value, max = 100, color = "#2980b9", height = 8 }) {
  return (
    <div style={{ width: "100%", background: "rgba(128,128,128,0.15)", borderRadius: height / 2, height, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color, height: "100%", borderRadius: height / 2, transition: "width 0.5s ease" }} />
    </div>
  );
}

// ── Content Sequence Panel ────────────────────────────────────────────────
// Renders recommended study steps (Watch → Read → Practice) for content blocks.
// Clean numbered format: N. ACTION: Resource — Topic  ~time
//                           Focus: [2-3 concepts]
//                           Skip: [what to skip]  (optional)
function ContentSequencePanel({ contentSequence, compact = false }) {
  if (!contentSequence || !contentSequence.sequence || contentSequence.sequence.length === 0) return null;

  const { gapType, sequence } = contentSequence;
  const tagLabel = gapType === 'knowledge' ? 'Knowledge gap — build the framework first' : 'Application gap — recall-first approach';

  // Map step action/type to display color
  const actionColor = (step) => {
    const act = step.action || (step.type === 'video' ? 'WATCH' : step.type === 'read' ? 'READ' : step.type === 'practice' ? 'PRACTICE' : 'REVIEW');
    return { WATCH: '#5b21b6', READ: '#92400e', PRACTICE: '#1d6e56', REVIEW: '#01508a' }[act] || '#6b6560';
  };

  const sz = compact ? { label: 11, action: 10, body: 11, time: 10 } : { label: 13, action: 11, body: 12, time: 11 };

  return (
    <div style={{ marginTop: compact ? 8 : 10, paddingTop: compact ? 7 : 9, borderTop: '1px solid #f0ebe3' }}>
      <div style={{ fontSize: sz.body, color: '#8a857e', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: compact ? 6 : 8, fontStyle: 'italic' }}>
        📋 {tagLabel}
      </div>
      {sequence.map((step, si) => {
        const act = step.action || (step.type === 'video' ? 'WATCH' : step.type === 'read' ? 'READ' : step.type === 'practice' ? 'PRACTICE' : 'REVIEW');
        const resource = step.resource || step.label;
        const topic    = step.topic || '';
        const timeStr  = step.timeLabel || '';
        const focusStr = step.focus || '';
        const skipStr  = step.skip  || '';
        const col = actionColor(step);

        return (
          <div key={si} style={{ paddingBottom: si < sequence.length - 1 ? (compact ? 7 : 9) : 0, marginBottom: si < sequence.length - 1 ? (compact ? 7 : 9) : 0, borderBottom: si < sequence.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            {/* Step header: N. ACTION: Resource — Topic  ~time */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 3, fontFamily: 'Georgia, "Times New Roman", serif' }}>
              <span style={{ fontSize: sz.label, fontWeight: 600, color: '#888', minWidth: 16 }}>{si + 1}.</span>
              <span style={{ fontSize: sz.action, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: col }}>{act}:</span>
              <span style={{ fontSize: sz.label, fontWeight: 600, color: '#1D9E75' }}>{resource}</span>
              {topic && <><span style={{ fontSize: sz.label, color: '#ccc' }}>—</span><span style={{ fontSize: sz.label, color: '#1a1816' }}>{topic}</span></>}
              <span style={{ marginLeft: 'auto', fontSize: sz.time, color: '#999', whiteSpace: 'nowrap', paddingLeft: 6 }}>{timeStr}</span>
            </div>
            {/* Focus line */}
            {focusStr && (
              <div style={{ fontSize: sz.body, color: '#555', fontFamily: 'Georgia, "Times New Roman", serif', paddingLeft: compact ? 18 : 20, marginTop: 2, lineHeight: 1.45 }}>
                <span style={{ fontWeight: 600, color: '#888' }}>Focus:</span> {focusStr}
              </div>
            )}
            {/* Skip line */}
            {skipStr && (
              <div style={{ fontSize: compact ? 10 : sz.body, color: '#aaa', fontStyle: 'italic', fontFamily: 'Georgia, "Times New Roman", serif', paddingLeft: compact ? 18 : 20, marginTop: 1 }}>
                <span style={{ fontWeight: 600 }}>Skip:</span> {skipStr}
              </div>
            )}
            {/* YouTube search links */}
            {step.links && step.links.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: compact ? 18 : 20, marginTop: compact ? 3 : 5 }}>
                {step.links.slice(0, 2).map((link, li) => (
                  <a key={li} href={link.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: '#c0392b', fontFamily: 'Georgia, "Times New Roman", serif', padding: '2px 8px', borderRadius: 10, background: '#c0392b10', border: '1px solid #c0392b30', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    ▶ {link.channel}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sub-topic Progress Panel ──────────────────────────────────────────────


const defaultHistDraft = () => ({ formName: '', takenAt: '', totalScore: '', hasBreakdown: false, scores: {} });

// Calculates study window end time from start time + study hours.
// Students with ≥5 study hours get a 1-hour lunch break added automatically.
// Returns "HH:MM" string (24-hour, for the time input).
function calcEndTime(startTime, studyHours) {
  const [h, m] = (startTime || "07:00").split(':').map(Number);
  const lunchHrs = studyHours >= 5 ? 1 : 0;
  const endMins = h * 60 + m + (studyHours + lunchHrs) * 60;
  const endH = Math.floor(endMins / 60) % 24;
  const endM = endMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// Formats a "HH:MM" string as "H:MM AM/PM" for display.
function fmt12hDisplay(t) {
  const [h, m] = (t || "07:00").split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ampm}` : `${h12}:00 ${ampm}`;
}

// Formats a time range for block headers. Omits repeated AM/PM: "7:00 – 8:00 AM", "11:30 AM – 12:30 PM"
function formatTimeRange(start, end) {
  if (!start || !end) return null;
  const sParts = start.split(' ');
  const eParts = end.split(' ');
  if (sParts.length === 2 && eParts.length === 2 && sParts[1] === eParts[1]) {
    return `${sParts[0]} – ${end}`; // "7:00 – 8:00 AM"
  }
  return `${start} – ${end}`; // "11:30 AM – 12:30 PM"
}

// ── ICS Calendar Export ───────────────────────────────────────────────────
function combineICSDateTime(date, timeStr) {
  const [time, period] = (timeStr || '').split(' ');
  if (!time) return date;
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const dt = new Date(date);
  dt.setHours(h, m || 0, 0, 0);
  return dt;
}
function formatICSDate(d) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function formatICSDateTime(d) {
  return `${formatICSDate(d)}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;
}
function escapeICS(t) {
  return (t||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}
function getICSEventSummary(block, day) {
  const focus = day.focusTopic ? ' — ' + day.focusTopic : '';
  switch (block.type) {
    case 'anki': return '🧠 StepAdapt: Morning Retention';
    case 'content': case 'content-reactive': return `📚 StepAdapt: Content Review${focus}`;
    case 'questions-focus': return `🔥 StepAdapt: Targeted Qs${focus}`;
    case 'questions-random': return '🎲 StepAdapt: Random Questions';
    case 'end-review': return '✅ StepAdapt: End-of-Day Review';
    case 'nbme': case 'nbme-review': return `📋 StepAdapt: ${block.label || 'Assessment'}`;
    default: return `StepAdapt: ${block.label || 'Study Block'}`;
  }
}
function getICSEventDescription(block) {
  switch (block.type) {
    case 'anki': return 'Anki due cards + yesterday\'s misses. 1 hour max.';
    case 'content': case 'content-reactive': {
      const subs = (block.highYield || []).slice(0,3).map(h => h.topic).join(', ');
      return subs ? `Focus: ${subs}` : 'See StepAdapt app for details.';
    }
    case 'questions-focus': return '40 UWorld Qs, timed, test mode. Review every question after.';
    case 'questions-random': return 'Random, all systems, timed. Exam simulation.';
    case 'end-review': return 'Review wrong answers from today\'s random blocks.';
    case 'nbme': return 'Full-length, timed, test conditions. No interruptions.';
    default: return 'See StepAdapt app for details.';
  }
}
function generateICSContent(plan, planCreatedAt, studyStartTime, studyEndTime) {
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StepAdapt//Study Plan//EN',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:StepAdapt Study Plan',
  ];
  const allDays = (plan.weeks || []).flatMap(w => w.days || []);
  for (const day of allDays) {
    const dayDate = new Date(planCreatedAt);
    dayDate.setHours(0,0,0,0);
    dayDate.setDate(dayDate.getDate() + (day.calendarDay || 1) - 1);
    if (day.dayType === 'rest' || day.dayType === 'student-rest') {
      const next = new Date(dayDate); next.setDate(next.getDate()+1);
      lines.push('BEGIN:VEVENT',`DTSTART;VALUE=DATE:${formatICSDate(dayDate)}`,`DTEND;VALUE=DATE:${formatICSDate(next)}`,
        'SUMMARY:🌿 StepAdapt: Rest Day — Anki reviews only (30-45 min AM)',
        `UID:stepadapt-day${day.calendarDay}-rest@stepadapt.com`,'END:VEVENT');
      continue;
    }
    const timedBl = assignBlockTimes(day.blocks || [], studyStartTime, studyEndTime);
    timedBl.forEach((block, bi) => {
      if (block.type === 'break' || block.type === 'lunch') return;
      if (!block.startTime || !block.endTime) return;
      const startDT = combineICSDateTime(dayDate, block.startTime);
      const endDT   = combineICSDateTime(dayDate, block.endTime);
      lines.push('BEGIN:VEVENT',
        `DTSTART:${formatICSDateTime(startDT)}`,`DTEND:${formatICSDateTime(endDT)}`,
        `SUMMARY:${escapeICS(getICSEventSummary(block, day))}`,
        `DESCRIPTION:${escapeICS(getICSEventDescription(block))}`,
        `UID:stepadapt-day${day.calendarDay}-block${bi}@stepadapt.com`,
        'END:VEVENT');
    });
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function downloadICSFile(plan, planCreatedAt, studyStartTime, studyEndTime) {
  const content = generateICSContent(plan, planCreatedAt, studyStartTime, studyEndTime);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'StepAdapt-Study-Plan.ics';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function StudyPlanner({ onShowTerms }) {
  const { user, logout, resendVerification } = useAuth();
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent'

  // ── Core state ────────────────────────────────────────────────────
  const [screen, setScreen] = useState("welcome");
  const [profile, setProfile] = useState({ resources: [], examDate: "", hoursPerDay: 8, studyStartTime: "07:00", studyEndTime: calcEndTime("07:00", 8), takenAssessments: [], subTopicProgress: {}, anki_experience_level: "none", ankiDeck: "anking", rest_days: [] });
  const [showZeroRestNudge, setShowZeroRestNudge] = useState(false);
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

  // ── Plan view state ────────────────────────────────────────────────
  const [planViewMode, setPlanViewMode] = useState('day'); // 'day' | 'week' | 'full'
  const [planViewDay, setPlanViewDay] = useState(1);
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());
  const [showCalExport, setShowCalExport] = useState(false);
  const [showAssessmentSched, setShowAssessmentSched] = useState(false);
  const [showPriorityRanking, setShowPriorityRanking] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [expandedPriorityIdx, setExpandedPriorityIdx] = useState(null);
  const [expandedAssessmentIdx, setExpandedAssessmentIdx] = useState(null);
  const [starterBannerDismissed, setStarterBannerDismissed] = useState(false);

  // ── Assessment edit / delete state ────────────────────────────────
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [editScores, setEditScores] = useState({});
  const [editFormName, setEditFormName] = useState('');
  const [editTakenAt, setEditTakenAt] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [assessmentActionLoading, setAssessmentActionLoading] = useState(false);
  const [assessmentActionMsg, setAssessmentActionMsg] = useState('');

  // ── Historical import state ────────────────────────────────────────
  const [histDraft, setHistDraft] = useState(defaultHistDraft);
  const [histList, setHistList] = useState([]); // accumulated exams in import flow
  const [histSaving, setHistSaving] = useState(false);
  const [histError, setHistError] = useState('');
  const [histUploadingScreenshot, setHistUploadingScreenshot] = useState(false);
  const [histHasScores, setHistHasScores] = useState(null); // null | boolean — tracks yes/no answer in unified assessment screen

  // ── Feedback state ────────────────────────────────────────────────
  // Widget A – daily rating
  const [dailyRatingValue,      setDailyRatingValue]      = useState(null); // 1-4
  const [dailyRatingComment,    setDailyRatingComment]    = useState('');
  const [dailyRatingShowInput,  setDailyRatingShowInput]  = useState(false);
  const [dailyRatingThanks,     setDailyRatingThanks]     = useState(false);
  const [dailyRatingDone,       setDailyRatingDone]       = useState(false);
  // Widget B – general feedback modal
  const [showFeedbackModal,     setShowFeedbackModal]     = useState(false);
  const [genFbk,                setGenFbk]                = useState({ working_well: '', needs_improvement: '', other: '', nps: null });
  const [genFbkDone,            setGenFbkDone]            = useState(false);
  // Widget C – post-NBME
  const [postNbmeRating,        setPostNbmeRating]        = useState(null);
  const [postNbmeComment,       setPostNbmeComment]       = useState('');
  const [postNbmeDone,          setPostNbmeDone]          = useState(false);
  // Widget D – week 1 check-in
  const [weekCheckinVisible,    setWeekCheckinVisible]    = useState(false);
  const [weekCheckinAnswers,    setWeekCheckinAnswers]    = useState({});
  const [weekCheckinDone,       setWeekCheckinDone]       = useState(false);
  // Widget E – return check-in
  const [returnCheckinVisible,  setReturnCheckinVisible]  = useState(false);
  const [returnCheckinDone,     setReturnCheckinDone]     = useState(false);
  // Widget F – post-exam follow-up
  const [postExamFbkVisible,    setPostExamFbkVisible]    = useState(false);
  const [postExamAnswers,       setPostExamAnswers]       = useState({});
  const [postExamFbkDone,       setPostExamFbkDone]       = useState(false);

  // ── Reset / fresh-start state ─────────────────────────────────────
  const [resetType, setResetType] = useState(null);       // 'full' | 'keep-scores' | 'archive'
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [archivedCycles, setArchivedCycles] = useState([]);
  // Skip saveCurrentAssessment() when regenerating plan from existing scores
  const skipAssessmentSaveRef = useRef(false);

  // ── AI features state ─────────────────────────────────────────────
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

  // ── Feedback initialisation (runs once per session after data load) ──
  useEffect(() => {
    if (!dataLoaded || !user) return;
    const uid  = user.id;
    const today = new Date().toISOString().slice(0, 10);

    // Widget A — has user already rated today?
    if (localStorage.getItem(`sa_daily_rated_${uid}_${today}`)) setDailyRatingDone(true);

    // Widget D — week 1 check-in (show once on day 7)
    if (plan && latestPlanMeta && !localStorage.getItem(`sa_week_checkin_${uid}`)) {
      const daysSinceStart = Math.floor(
        (new Date() - new Date(latestPlanMeta.createdAt)) / 86400000
      ) + 1;
      if (daysSinceStart === 7) setWeekCheckinVisible(true);
    }

    // Widget E — return check-in (3+ days absence)
    const lastLoginKey = `sa_last_login_${uid}`;
    const lastLogin    = localStorage.getItem(lastLoginKey);
    if (lastLogin && lastLogin !== today) {
      const daysSince = Math.floor((new Date(today) - new Date(lastLogin)) / 86400000);
      if (daysSince >= 3) setReturnCheckinVisible(true);
    }
    localStorage.setItem(lastLoginKey, today);

    // Widget F — post-exam follow-up (2+ days after exam date)
    if (profile.examDate && !localStorage.getItem(`sa_post_exam_${uid}`)) {
      const examDate = new Date(profile.examDate);
      examDate.setHours(0, 0, 0, 0);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const daysAfter = Math.floor((now - examDate) / 86400000);
      if (daysAfter >= 2) setPostExamFbkVisible(true);
    }
  }, [dataLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Feedback submit helper ─────────────────────────────────────────
  const submitFeedback = (data) => {
    api.feedback.submit(data).catch(() => {}); // fire-and-forget; never block the UI
  };

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

  // ── Sub-topic progress tracking ──────────────────────────────────
  // Cycles: null → 'improving' → 'struggling' → null
  const toggleBlock = (key) => setExpandedBlocks(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });


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
    setHistHasScores(true);
    setHistList([]);
    setHistDraft(defaultHistDraft());
    setHistError('');
    navigate("history-import");
  };

  // ── Assessment edit / delete helpers ──────────────────────────────

  const regeneratePlanFromAssessments = (updatedAssessments) => {
    const sorted = [...updatedAssessments].sort((a, b) =>
      new Date(a.takenAt || a.createdAt) - new Date(b.takenAt || b.createdAt)
    );
    const last = sorted[sorted.length - 1];
    // Use breakdown scores from most recent assessment if available
    const catScores = (() => {
      if (!last) return {};
      const s = last.scores || {};
      const cats = Object.keys(s).filter(k => k !== '__total__');
      return cats.length > 0 ? Object.fromEntries(cats.map(k => [k, s[k]])) : {};
    })();
    const newScores = Object.keys(catScores).length > 0 ? catScores : scores;
    const derivedTaken = updatedAssessments.map(a => {
      const match = PRACTICE_TESTS.find(t => t.name === (a.form_name || a.formName));
      return match ? { id: match.id, takenDate: a.taken_at || a.takenAt || a.created_at } : null;
    }).filter(Boolean);
    const profileForPlan = { ...profile, takenAssessments: derivedTaken };
    const generatedPlan = updatedAssessments.length === 0
      ? generateFirstTimerPlan(profile, [], null)
      : generatePlan(profileForPlan, newScores, stickingPoints);
    setPlan(generatedPlan);
    if (Object.keys(catScores).length > 0) setScores(catScores);
    api.plans.save({ planData: generatedPlan, profileSnapshot: profile, assessmentId: null })
      .then(result => { if (result?.id) setLatestPlanMeta(prev => ({ ...prev, id: result.id })); })
      .catch(() => {});
  };

  const startEditAssessment = (a) => {
    setEditingAssessment(a);
    setEditFormName(a.formName || '');
    const dateVal = a.takenAt ? a.takenAt.slice(0, 10) : (a.createdAt ? a.createdAt.slice(0, 10) : '');
    setEditTakenAt(dateVal);
    const cats = Object.keys(a.scores || {}).filter(k => k !== '__total__');
    setEditScores(cats.length > 0 ? Object.fromEntries(cats.map(k => [k, a.scores[k]])) : { ...(a.scores || {}) });
  };

  const saveEditAssessment = async () => {
    if (!editingAssessment) return;
    setEditSaving(true);
    try {
      const { assessment: updated } = await api.assessments.update(editingAssessment.id, {
        formName: editFormName,
        scores: editScores,
        stickingPoints: editingAssessment.stickingPoints || [],
        takenAt: editTakenAt || null,
      });
      const newAssessments = assessments.map(a => a.id === updated.id ? updated : a);
      setAssessments(newAssessments);
      regeneratePlanFromAssessments(newAssessments);
      setEditingAssessment(null);
      setAssessmentActionMsg('Assessment updated — your plan has been recalculated with the corrected scores.');
      setTimeout(() => setAssessmentActionMsg(''), 5000);
    } catch (err) {
      setAssessmentActionMsg('Failed to save: ' + (err.message || 'Please try again.'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteAssessment = async (id) => {
    setAssessmentActionLoading(true);
    try {
      await api.assessments.delete(id);
      const newAssessments = assessments.filter(a => a.id !== id);
      setAssessments(newAssessments);
      regeneratePlanFromAssessments(newAssessments);
      setDeleteConfirmId(null);
      setAssessmentActionMsg('Assessment deleted — your plan has been recalculated.');
      setTimeout(() => setAssessmentActionMsg(''), 5000);
    } catch (err) {
      setAssessmentActionMsg('Failed to delete: ' + (err.message || 'Please try again.'));
    } finally {
      setAssessmentActionLoading(false);
    }
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

  // ── Historical import screenshot handler ──────────────────────────
  const handleHistScreenshotUpload = async (file) => {
    if (!file) return;
    setHistUploadingScreenshot(true);
    setHistError('');
    try {
      const result = await api.ai.parseScreenshot(file, 'step1');
      setHistDraft(prev => {
        const updated = { ...prev };
        if (result.formName) updated.formName = result.formName;
        if (result.scores && typeof result.scores === 'object' && Object.keys(result.scores).length > 0) {
          const allCats = [...STEP1_SYSTEM_CATEGORIES, ...STEP1_DISCIPLINE_CATEGORIES];
          const matched = {};
          for (const [parsedCat, parsedScore] of Object.entries(result.scores)) {
            const exact = allCats.find(c => c.toLowerCase() === parsedCat.toLowerCase());
            if (exact) { matched[exact] = Math.round(parsedScore); continue; }
            const partial = allCats.find(c =>
              c.toLowerCase().includes(parsedCat.toLowerCase()) ||
              parsedCat.toLowerCase().includes(c.toLowerCase().split(' ')[0])
            );
            if (partial) matched[partial] = Math.round(parsedScore);
          }
          if (Object.keys(matched).length > 0) {
            updated.scores = { ...prev.scores, ...matched };
            updated.hasBreakdown = true;
          }
        }
        if (result.totalScore !== null && result.totalScore !== undefined) {
          updated.totalScore = String(result.totalScore);
        }
        return updated;
      });
    } catch (err) {
      setHistError(err.message || 'Could not parse screenshot. Enter scores manually.');
    } finally {
      setHistUploadingScreenshot(false);
    }
  };

  // Chat context is now fetched server-side on every message — no planContext needed here.

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
    "questions-focus": { bg: "#b4530912", border: "#b45309", icon: "🔥", label: "Targeted Qs" },
    "questions-random": { bg: "#2563eb0c", border: "#2563eb", icon: "🎲", label: "Random Qs" },
    "questions": { bg: "#2980b90c", border: "#2980b9", icon: "🎯", label: "Questions" },
    "content": { bg: "#8b5cf610", border: "#8b5cf6", icon: "📚", label: "Content review" },
    "content-reactive": { bg: "#8b5cf60c", border: "#8b5cf6", icon: "📚", label: "Gap review" },
    "catchup": { bg: "#6b656010", border: "#8a857e", icon: "🔄", label: "Catch-up" },
    "lunch": { bg: "#fefce80c", border: "#d97706", icon: "☕", label: "Lunch" },
    "end-review": { bg: "#0369a10c", border: "#0369a1", icon: "✅", label: "End review" },
    "nbme": { bg: "#c0392b0c", border: "#c0392b", icon: "📋", label: "Practice exam" },
    "rest": { bg: "#27ae600c", border: "#27ae60", icon: "😴", label: "Rest" },
    "review": { bg: "#d9770608", border: "#d97706", icon: "🔍", label: "Post-exam review" },
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
      {' · '}
      <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => { setGenFbkDone(false); setGenFbk({ working_well: '', needs_improvement: '', other: '', nps: null }); setShowFeedbackModal(true); }}>Feedback</span>
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

    // Plan-day → calendar date helpers (dashboard scope)
    const getPlanDayDate = (dayNum) => {
      if (!latestPlanMeta?.createdAt) return null;
      const d = new Date(latestPlanMeta.createdAt); d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + dayNum - 1); return d;
    };
    const fmtDayDate = (d) => d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';

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
      const icons = { anki: '🧠', 'questions-focus': '🔥', 'questions-random': '🎲', questions: '🎯', content: '📚', 'content-reactive': '📚', catchup: '🔄', lunch: '☕', 'end-review': '✅', nbme: '📋', rest: '😴', break: '⏸' };
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
                <strong>Starter plan active.</strong> Take your diagnostic NBME (scheduled early this week), then add your scores to unlock a fully personalized plan.
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

          {/* Widget F — Post-exam follow-up */}
          {postExamFbkVisible && !postExamFbkDone && (
            <div style={{ ...S.card, marginBottom: 14, background: '#f0fdf4', border: '1.5px solid #1D9E7530' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1816', fontFamily: S.f, marginBottom: 14 }}>🎓 How did Step 1 go?</div>
              {[
                { key: 'feeling', label: 'How did you feel walking out?', opts: [['felt_prepared','Felt prepared'],['it_was_ok','It was OK'],['felt_unprepared','Felt unprepared']] },
                { key: 'passed',  label: 'Did you pass?',                opts: [['yes','Yes! 🎉'],['waiting','Waiting for results'],['no','No'],['prefer_not','Prefer not to say']] },
                { key: 'recommend', label: 'Would you recommend StepAdapt?', opts: [['definitely','Definitely'],['maybe','Maybe'],['no','No']] },
              ].map(({ key, label, opts }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {opts.map(([val, lbl]) => (
                      <button key={val} onClick={() => setPostExamAnswers(p => ({ ...p, [key]: val }))}
                        style={{ padding: '6px 13px', borderRadius: 20, border: `1.5px solid ${postExamAnswers[key] === val ? BRAND.green : '#e0dcd6'}`, background: postExamAnswers[key] === val ? `${BRAND.green}15` : '#fff', fontSize: 12, fontFamily: S.f, color: postExamAnswers[key] === val ? BRAND.green : '#4a4540', cursor: 'pointer', fontWeight: postExamAnswers[key] === val ? 700 : 400 }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, marginBottom: 6 }}>One thing we should improve? (optional)</div>
                <input value={postExamAnswers.improvement || ''} onChange={e => setPostExamAnswers(p => ({ ...p, improvement: e.target.value }))}
                  placeholder="Tell us…" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e0dcd6', fontSize: 13, fontFamily: S.f, background: '#fff', outline: 'none', boxSizing: 'border-box', color: '#1a1816' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  submitFeedback({ feedback_type: 'post_exam', responses: postExamAnswers });
                  localStorage.setItem(`sa_post_exam_${user?.id}`, '1');
                  setPostExamFbkDone(true); setPostExamFbkVisible(false);
                }} style={{ ...S.btn, ...S.pri, padding: '8px 20px', fontSize: 13 }}>Submit</button>
                <button onClick={() => { localStorage.setItem(`sa_post_exam_${user?.id}`, '1'); setPostExamFbkVisible(false); }}
                  style={{ ...S.btn, ...S.ghost, padding: '8px 14px', fontSize: 13, color: '#8a857e' }}>Dismiss</button>
              </div>
            </div>
          )}

          {/* Widget E — Return check-in */}
          {returnCheckinVisible && !returnCheckinDone && (
            <div style={{ ...S.card, marginBottom: 14, background: '#fffbeb', border: '1.5px solid #f6c90e50' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92600a', fontFamily: S.f, marginBottom: 10 }}>👋 Welcome back! What happened?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {[['took_a_break','Took a break'],['plan_not_working','Plan wasn\'t working'],['life','Life got in the way'],['studying_without_app','Studying without the app']].map(([val, lbl]) => (
                  <button key={val} onClick={() => {
                    submitFeedback({ feedback_type: 'return_checkin', responses: { reason: val } });
                    setReturnCheckinDone(true); setReturnCheckinVisible(false);
                  }} style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid #f6c90e80', background: '#fff', fontSize: 12, fontFamily: S.f, color: '#92600a', cursor: 'pointer' }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Widget D — Week 1 check-in */}
          {weekCheckinVisible && !weekCheckinDone && (
            <div style={{ ...S.card, marginBottom: 14, background: '#f8faff', border: '1.5px solid #2980b930' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1816', fontFamily: S.f, marginBottom: 14 }}>📋 Week 1 check-in</div>
              {[
                { key: 'schedule_realistic', label: 'Is the daily schedule realistic?', opts: [['yes','Yes'],['too_much','Too much'],['too_little','Too little'],['timing_off','Timing doesn\'t fit my schedule']] },
                { key: 'resources_helpful',  label: 'Are the resource recommendations helpful?', opts: [['very_helpful','Very helpful'],['somewhat','Somewhat'],['not_relevant','Not relevant to me']] },
              ].map(({ key, label, opts }) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, marginBottom: 6 }}>{label}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {opts.map(([val, lbl]) => (
                      <button key={val} onClick={() => setWeekCheckinAnswers(p => ({ ...p, [key]: val }))}
                        style={{ padding: '6px 12px', borderRadius: 16, border: `1.5px solid ${weekCheckinAnswers[key] === val ? '#2980b9' : '#e0dcd6'}`, background: weekCheckinAnswers[key] === val ? '#2980b915' : '#fff', fontSize: 12, fontFamily: S.f, color: weekCheckinAnswers[key] === val ? '#2980b9' : '#4a4540', cursor: 'pointer', fontWeight: weekCheckinAnswers[key] === val ? 700 : 400 }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => {
                  submitFeedback({ feedback_type: 'week_checkin', responses: weekCheckinAnswers });
                  localStorage.setItem(`sa_week_checkin_${user?.id}`, '1');
                  setWeekCheckinDone(true); setWeekCheckinVisible(false);
                }} style={{ ...S.btn, ...S.pri, padding: '8px 18px', fontSize: 13 }}>Submit</button>
                <button onClick={() => { localStorage.setItem(`sa_week_checkin_${user?.id}`, '1'); setWeekCheckinVisible(false); }}
                  style={{ ...S.btn, ...S.ghost, padding: '8px 12px', fontSize: 13, color: '#8a857e' }}>Dismiss</button>
              </div>
            </div>
          )}

          {/* Row 2: Today's schedule */}
          <div style={{ ...S.card, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8a857e', fontFamily: S.f, marginBottom: 4 }}>Today's Schedule</div>
                {todayData ? (
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1816' }}>
                    Day {todayData.day.calendarDay}
                    {fmtDayDate(getPlanDayDate(todayData.day.calendarDay)) && <span style={{ fontSize: 13, fontWeight: 500, color: '#8a857e', marginLeft: 6, fontFamily: S.f }}>{fmtDayDate(getPlanDayDate(todayData.day.calendarDay))}</span>}
                    {todayData.day.focusTopic && <span style={{ fontSize: 13, fontWeight: 400, color: '#6b6560', marginLeft: 8, fontFamily: S.f }}>Focus: {todayData.day.focusTopic}</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1816' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                )}
              </div>
              {todayData?.day.dayType === 'student-rest' && (
                <div style={{ background: '#27ae6012', color: '#166534', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, fontFamily: S.f }}>
                  🌿 Rest day
                </div>
              )}
              {todayData?.day.totalQuestions > 0 && todayData?.day.dayType !== 'student-rest' && (
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
            ) : todayData.day.dayType === 'student-rest' ? (
              <div style={{ padding: '4px 0' }}>
                <div style={{ padding: '14px 16px', background: '#27ae6008', borderRadius: 10, border: '1px solid #27ae6025', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>🌿</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', fontFamily: S.f }}>Rest day</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#2c2a26', fontFamily: S.f, lineHeight: 1.5, marginBottom: 8 }}>
                    {todayData.day.blocks?.[0]?.label} — then you're done for the day.
                  </div>
                  <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5, fontStyle: 'italic' }}>
                    You've been working hard. Rest is part of the process. Your brain consolidates what you've learned during downtime — this is productive.
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {todayBlocksWithTimes.map((block, i) => {
                    const bc = blockColors[block.type] || blockColors['catchup'];
                    return (
                      <div key={i} style={{ padding: '12px 14px', background: bc.bg, borderRadius: 10, borderLeft: `3px solid ${bc.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: block.tasks?.length > 0 ? 8 : 0 }}>
                          <span style={{ fontSize: 15 }}>{blockIcon(block.type)}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1816', fontFamily: S.f }}>{block.label}</span>
                          <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f, marginLeft: 'auto' }}>{block.startTime} – {block.endTime}</span>
                        </div>
                        {block.tasks?.map((task, j) => (
                          <div key={j} style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, paddingLeft: 23, lineHeight: 1.5, marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, color: '#2c2a26' }}>{task.resource}</span> — {task.activity}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
              <div style={{ display: 'grid', gap: 8 }}>
                {/* Exam-week / exam-eve lockdown banner */}
                {todayData.day.dayType === 'review' && (
                  <div style={{ padding: '11px 14px', borderRadius: 10, background: '#d9770608', border: '1px solid #d9770625', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 2 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#d97706', fontFamily: S.f, marginBottom: 2 }}>
                        Post-exam review day — {todayData.day.triageFor || 'yesterday\'s exam'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f }}>
                        Full study day. Morning: deep wrong-answer review. Afternoon: 80 targeted + random questions. This is your highest-leverage study day of the week.
                      </div>
                    </div>
                  </div>
                )}
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
                  if (block.type === 'break' || block.type === 'lunch') {
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#faf8f5', borderRadius: 8, opacity: 0.7 }}>
                        <span style={{ fontSize: 14 }}>{block.type === 'lunch' || block.label === 'Lunch break' ? '☕' : '⏸'}</span>
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

                      {block.contentSequence && <ContentSequencePanel contentSequence={block.contentSequence} compact={true} />}
                    </div>
                  );
                })}
              </div>
              {/* Widget A — daily rating */}
              {!dailyRatingDone && todayData.day.dayType !== 'rest' && todayData.day.dayType !== 'student-rest' && todayData.day.dayType !== 'nbme' && (
                <div style={{ borderTop: '1px solid #f0ece6', paddingTop: 12, marginTop: 4 }}>
                  {dailyRatingThanks ? (
                    <div style={{ fontSize: 13, color: BRAND.green, fontFamily: S.f, textAlign: 'center', padding: '4px 0' }}>Thanks for the feedback! 🙏</div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f, fontWeight: 600 }}>How was today's plan?</span>
                        {[['😟', 1], ['😐', 2], ['🙂', 3], ['🤩', 4]].map(([emoji, val]) => (
                          <button key={val} onClick={() => {
                            setDailyRatingValue(val);
                            if (val >= 3) {
                              submitFeedback({ feedback_type: 'daily_rating', rating: val, plan_day: todayData?.day?.calendarDay, focus_system: todayData?.day?.focusTopic });
                              localStorage.setItem(`sa_daily_rated_${user?.id}_${new Date().toISOString().slice(0,10)}`, '1');
                              setDailyRatingThanks(true);
                              setTimeout(() => { setDailyRatingDone(true); setDailyRatingThanks(false); }, 2000);
                            } else {
                              setDailyRatingShowInput(true);
                            }
                          }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '2px 4px', lineHeight: 1, borderRadius: 6, transition: 'transform 0.1s', transform: dailyRatingValue === val ? 'scale(1.3)' : 'scale(1)' }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {dailyRatingShowInput && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                          <input
                            value={dailyRatingComment}
                            onChange={e => setDailyRatingComment(e.target.value)}
                            placeholder="What felt off? (optional)"
                            style={{ flex: 1, fontSize: 12, padding: '7px 10px', borderRadius: 8, border: '1px solid #e0dcd6', fontFamily: S.f, background: '#fafaf8', outline: 'none', color: '#1a1816' }}
                          />
                          <button onClick={() => {
                            submitFeedback({ feedback_type: 'daily_rating', rating: dailyRatingValue, responses: { comment: dailyRatingComment }, plan_day: todayData?.day?.calendarDay, focus_system: todayData?.day?.focusTopic });
                            localStorage.setItem(`sa_daily_rated_${user?.id}_${new Date().toISOString().slice(0,10)}`, '1');
                            setDailyRatingThanks(true);
                            setTimeout(() => { setDailyRatingDone(true); setDailyRatingThanks(false); }, 2000);
                          }} style={{ ...S.btn, ...S.pri, padding: '7px 14px', fontSize: 12, flexShrink: 0 }}>Send</button>
                          <button onClick={() => {
                            submitFeedback({ feedback_type: 'daily_rating', rating: dailyRatingValue, plan_day: todayData?.day?.calendarDay, focus_system: todayData?.day?.focusTopic });
                            localStorage.setItem(`sa_daily_rated_${user?.id}_${new Date().toISOString().slice(0,10)}`, '1');
                            setDailyRatingDone(true);
                          }} style={{ ...S.btn, ...S.ghost, padding: '7px 10px', fontSize: 12, color: '#aaa9a6', flexShrink: 0 }}>Skip</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              </>
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
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < Math.min(assessments.length, 5) - 1 ? '1px solid #f0ece6' : 'none' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: heatColor(avg), flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 13, fontFamily: S.f, color: '#1a1816', fontWeight: 500 }}>{a.formName}</div>
                        <div style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>{dateStr}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: heatColor(avg), fontFamily: S.f, minWidth: 34, textAlign: 'right' }}>{avg}%</div>
                        <button onClick={() => startEditAssessment(a)} title="Edit" style={{ padding: '3px 6px', fontSize: 12, background: 'none', border: '1px solid #e0dbd4', borderRadius: 6, cursor: 'pointer', color: '#6b6560', lineHeight: 1, flexShrink: 0 }}>✏️</button>
                        <button onClick={() => setDeleteConfirmId(a.id)} title="Delete" style={{ padding: '3px 6px', fontSize: 12, background: 'none', border: '1px solid #f8e8e8', borderRadius: 6, cursor: 'pointer', color: '#c0392b', lineHeight: 1, flexShrink: 0 }}>🗑️</button>
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
                  { icon: '🕰️', label: 'Past Exam', action: () => { setHistDraft(defaultHistDraft()); setHistError(''); navigate("past-exam"); } },
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

        {/* ── Assessment action toast ── */}
        {assessmentActionMsg && (
          <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1816', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 13, fontFamily: S.f, zIndex: 2000, boxShadow: '0 4px 20px #0000002a', maxWidth: 460, textAlign: 'center', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
            {assessmentActionMsg}
          </div>
        )}

        {/* ── Delete confirmation dialog ── */}
        {deleteConfirmId !== null && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000055', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 8px 40px #00000020', fontFamily: S.f }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>🗑️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1816', marginBottom: 8 }}>Delete this assessment?</div>
              <div style={{ fontSize: 13, color: '#6b6560', lineHeight: 1.5, marginBottom: 22 }}>This will permanently remove the assessment and immediately recalculate your study plan. This action cannot be undone.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirmId(null)} disabled={assessmentActionLoading} style={{ ...S.btn, ...S.ghost, flex: 1 }}>Cancel</button>
                <button onClick={() => handleDeleteAssessment(deleteConfirmId)} disabled={assessmentActionLoading}
                  style={{ ...S.btn, flex: 1, background: '#c0392b', color: '#fff', border: 'none', opacity: assessmentActionLoading ? 0.6 : 1 }}>
                  {assessmentActionLoading ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit assessment modal ── */}
        {editingAssessment && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000055', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 500, width: '100%', boxShadow: '0 8px 40px #00000020', fontFamily: S.f, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1816', marginBottom: 20 }}>✏️ Edit Assessment</div>
              <div style={{ display: 'grid', gap: 16 }}>
                {/* Form name */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a857e', display: 'block', marginBottom: 6 }}>Form Name</label>
                  <input value={editFormName} onChange={e => setEditFormName(e.target.value)} placeholder="e.g. NBME 26"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0dbd4', fontSize: 13, fontFamily: S.f, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                {/* Date taken */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a857e', display: 'block', marginBottom: 6 }}>Date Taken</label>
                  <input type="date" value={editTakenAt} onChange={e => setEditTakenAt(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e0dbd4', fontSize: 13, fontFamily: S.f, boxSizing: 'border-box', outline: 'none' }} />
                </div>
                {/* Scores */}
                {Object.keys(editScores).length > 0 && (
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a857e', display: 'block', marginBottom: 8 }}>Scores (%)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {Object.keys(editScores).map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#faf8f5', borderRadius: 8 }}>
                          <span style={{ fontSize: 11, color: '#6b6560', flex: 1, lineHeight: 1.3 }}>{cat}</span>
                          <input type="number" min="0" max="100" value={editScores[cat] ?? ''}
                            onChange={e => setEditScores(prev => ({ ...prev, [cat]: Number(e.target.value) }))}
                            style={{ width: 54, padding: '4px 6px', borderRadius: 6, border: '1.5px solid #e0dbd4', fontSize: 13, fontFamily: S.f, textAlign: 'right', outline: 'none' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setEditingAssessment(null)} disabled={editSaving} style={{ ...S.btn, ...S.ghost, flex: 1 }}>Cancel</button>
                <button onClick={saveEditAssessment} disabled={editSaving}
                  style={{ ...S.btn, ...S.pri, flex: 1, opacity: editSaving ? 0.6 : 1 }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                { icon: "📸", title: "Automatic score import", desc: "Upload a screenshot of your NBME score report and scores are extracted automatically." },
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: profile.resources.includes('anking') ? 16 : 24 }}>
              {RESOURCES.map(r => { const on = profile.resources.includes(r.id); return (
                <div key={r.id} style={{ ...S.chip, ...(on ? S.chipOn : {}), fontSize: 13 }} onClick={() => setProfile(p => {
                  const removing = on;
                  return {
                    ...p,
                    resources: removing ? p.resources.filter(x => x !== r.id) : [...p.resources, r.id],
                    ...(r.id === 'anking' && removing ? { anki_experience_level: 'none', ankiDeck: 'anking' } : {}),
                  };
                })}><span>{r.icon}</span> {r.name}</div>
              ); })}
            </div>
            {profile.resources.includes('anking') && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f0f9f5', borderRadius: 10, border: '1px solid #1D9E7530' }}>
                <label style={{ ...S.label, marginBottom: 10, color: '#1d6e56' }}>🃏 How long have you been using Anki?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { value: 'none',         label: "I've never used Anki before" },
                    { value: 'beginner',     label: "I just started (less than 1 month)" },
                    { value: 'intermediate', label: "I've been using it for 1–6 months" },
                    { value: 'veteran',      label: "I've been using it for 6+ months (mature deck)" },
                  ].map(opt => {
                    const selected = (profile.anki_experience_level || 'none') === opt.value;
                    return (
                      <div key={opt.value} onClick={() => setProfile(p => ({ ...p, anki_experience_level: opt.value }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${selected ? BRAND.green : '#e0dcd6'}`, background: selected ? '#1D9E7508' : '#fff', transition: 'all 0.15s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? BRAND.green : '#d5d0c9'}`, background: selected ? BRAND.green : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <span style={{ fontSize: 13, fontFamily: S.f, color: '#1a1816' }}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {profile.resources.includes('anking') && (
              <div style={{ marginBottom: 16, padding: '14px 16px', background: '#f0f9f5', borderRadius: 10, border: '1px solid #1D9E7530' }}>
                <label style={{ ...S.label, marginBottom: 10, color: '#1d6e56' }}>🃏 Which Anki deck do you use?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {[
                    { value: 'anking',  label: 'AnKing Step 1 Overhaul', desc: 'Recommended — comprehensive, 30,000+ cards, tagged to Pathoma / Sketchy / First Aid' },
                    { value: 'mehlman', label: 'Mehlman Medical',         desc: 'Focused — ~1,000–2,000 high-yield cards, best for rapid review or late starters' },
                    { value: 'other',   label: 'Other / Custom deck',     desc: 'Your own deck or a different pre-made deck' },
                  ].map(opt => {
                    const selected = (profile.ankiDeck || 'anking') === opt.value;
                    return (
                      <div key={opt.value} onClick={() => setProfile(p => ({ ...p, ankiDeck: opt.value }))}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${selected ? BRAND.green : '#e0dcd6'}`, background: selected ? '#1D9E7508' : '#fff', transition: 'all 0.15s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? BRAND.green : '#d5d0c9'}`, background: selected ? BRAND.green : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                        </div>
                        <div>
                          <span style={{ fontSize: 13, fontFamily: S.f, color: '#1a1816', fontWeight: selected ? 600 : 400 }}>{opt.label}</span>
                          <div style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f, marginTop: 2 }}>{opt.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <hr style={S.hr} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div><label style={S.label}>Exam date</label><input type="date" style={S.input} value={profile.examDate} onChange={e => setProfile(p => ({ ...p, examDate: e.target.value }))} /></div>
              <div><label style={S.label}>Hours / day</label><input type="number" min={1} max={16} style={S.input} value={profile.hoursPerDay} onChange={e => { const hrs = Math.min(16, Math.max(1, Number(e.target.value))); setProfile(p => ({ ...p, hoursPerDay: hrs, studyEndTime: calcEndTime(p.studyStartTime || "07:00", hrs) })); }} /></div>
            </div>
            <hr style={{ ...S.hr, margin: "20px 0 16px" }} />
            <label style={S.label}>Daily study window</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 6 }}>Start time</label>
                <input type="time" style={S.input} value={profile.studyStartTime || "07:00"}
                  onChange={e => setProfile(p => ({ ...p, studyStartTime: e.target.value, studyEndTime: calcEndTime(e.target.value, p.hoursPerDay || 8) }))} />
              </div>
              <div>
                <label style={{ ...S.muted, display: "block", marginBottom: 6 }}>
                  End time <span style={{ fontSize: 10, color: '#b0a99e', fontStyle: 'italic' }}>(auto)</span>
                </label>
                <input type="time" style={{ ...S.input, background: '#f5f3f0', color: '#8a857e', cursor: 'default' }}
                  value={profile.studyEndTime || calcEndTime(profile.studyStartTime || "07:00", profile.hoursPerDay || 8)}
                  readOnly tabIndex={-1}
                  title="Calculated from start time + hours/day — adjust Hours/Day or Start Time to change this" />
              </div>
            </div>
            {(() => {
              const hrs = profile.hoursPerDay || 8;
              const startT = profile.studyStartTime || "07:00";
              const endT = profile.studyEndTime || calcEndTime(startT, hrs);
              const lunchHrs = hrs >= 5 ? 1 : 0;
              const totalHrs = hrs + lunchHrs;
              const longDay = hrs >= 12;
              return (
                <p style={{ ...S.muted, fontSize: 12, marginTop: 4 }}>
                  {hrs} hr of study{lunchHrs ? ` + ${lunchHrs} hr lunch` : ''} = {totalHrs} hr window ({fmt12hDisplay(startT)} – {fmt12hDisplay(endT)})
                  {longDay && <span style={{ color: '#c0392b', marginLeft: 6 }}>That's a long day — schedule at least one rest day per week.</span>}
                </p>
              );
            })()}
          </div>
          {profile.examDate && (() => { const d = Math.max(1, Math.round((new Date(profile.examDate) - new Date()) / 86400000)); const mode = d >= 42 ? "full dedicated" : d >= 21 ? "standard" : d >= 10 ? "compressed" : "triage"; return <p style={{ ...S.muted, textAlign: "center", marginTop: 8 }}><strong style={{ color: "#1a1816" }}>{d} days</strong> — <strong style={{ color: d < 14 ? "#c0392b" : "#1a1816" }}>{mode}</strong> plan{d < 14 ? ". Every hour counts." : "."}</p>; })()}

          {/* ── Rest days ── */}
          <div style={{ ...S.card, marginTop: 0 }}>
            <label style={S.label}>Rest days</label>
            <p style={{ ...S.muted, marginBottom: 12, marginTop: -4, lineHeight: 1.5 }}>
              Which days do you want off each week? We strongly recommend at least one rest day — burnout is real and your brain needs recovery time to consolidate what you've learned.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: (profile.rest_days || []).length >= 3 ? 10 : 0 }}>
              {DAY_FULL.map((day, i) => {
                const selected = (profile.rest_days || []).includes(i);
                return (
                  <div key={i}
                    style={{ ...S.chip, ...(selected ? S.chipOn : {}), fontSize: 13 }}
                    onClick={() => setProfile(p => {
                      const current = p.rest_days || [];
                      return { ...p, rest_days: selected ? current.filter(d => d !== i) : [...current, i] };
                    })}>
                    {selected ? '✓ ' : ''}{day.slice(0, 3)}
                  </div>
                );
              })}
            </div>
            {(profile.rest_days || []).length >= 3 && (() => {
              const restCount = (profile.rest_days || []).length;
              const studyDaysPerWeek = 7 - restCount;
              const daysLeft = profile.examDate ? Math.max(1, Math.round((new Date(profile.examDate) - new Date()) / 86400000)) : 0;
              return (
                <div style={{ padding: '10px 12px', background: '#e67e220d', borderRadius: 8, border: '1px solid #e67e2240', fontSize: 12, color: '#92600a', fontFamily: S.f, lineHeight: 1.5, marginTop: 10 }}>
                  ⚠️ That's {restCount} rest days per week, which leaves only {studyDaysPerWeek} study days. With {daysLeft} days until your exam, this may not be enough time to cover all your weak areas. Consider reducing to 1–2 rest days.
                </div>
              );
            })()}
          </div>

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

          {showZeroRestNudge && (
            <div style={{ padding: '14px 18px', background: '#fffbeb', borderRadius: 10, border: '1px solid #f6c90e60', marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#92600a', fontFamily: S.f, marginBottom: 6 }}>Are you sure? No rest days selected.</div>
              <p style={{ ...S.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.5, color: '#92600a' }}>
                Students who take at least one rest day per week consistently perform better on exam day. Burnout during dedicated is the #1 reason students underperform. We strongly recommend at least one day off.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={{ ...S.btn, ...S.sec, fontSize: 13 }} onClick={() => setShowZeroRestNudge(false)}>← Add a rest day</button>
                <button style={{ ...S.btn, ...S.ghost, fontSize: 13, color: '#8a857e' }} onClick={() => { setShowZeroRestNudge(false); navigate(assessments.length === 0 ? "history-import" : "scores"); }}>Continue without rest days</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button disabled={!ok} style={{ ...S.btn, ...S.pri, opacity: ok ? 1 : 0.4 }} onClick={() => {
              if (!showZeroRestNudge && (profile.rest_days || []).length === 0) {
                setShowZeroRestNudge(true);
              } else {
                setShowZeroRestNudge(false);
                navigate(assessments.length === 0 ? "history-import" : "scores");
              }
            }}>Continue →</button>
          </div>
        </div>
      </div>
    );
  }

  // ─── HISTORY CHECK ─────────────────────────────────────────────────
  if (screen === "history-check") {
    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate("onboarding")}>← Back</button>{dots(1)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Before we build your plan</h1>
          <p style={S.sub}>Have you already taken any NBME practice exams? Import your history so the plan uses real data from day one — not a blank slate.</p>
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <button
              style={{ ...S.card, marginBottom: 0, border: '2px solid #1D9E7530', cursor: 'pointer', textAlign: 'left', background: '#f0f9f5', width: '100%' }}
              onClick={() => { setHistList([]); setHistDraft(defaultHistDraft()); setHistError(''); navigate("history-import"); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1816', marginBottom: 4 }}>Yes — import my past NBMEs</div>
                  <div style={{ fontSize: 13, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>You've taken exams before today. Add them so your plan knows your trajectory, sticky weaknesses, and current baseline.</div>
                </div>
                <span style={{ fontSize: 20, color: '#1D9E75', flexShrink: 0 }}>→</span>
              </div>
            </button>
            <button
              style={{ ...S.card, marginBottom: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onClick={() => navigate("self-assessment")}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>🆕</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1816', marginBottom: 4 }}>No — I'm starting fresh</div>
                  <div style={{ fontSize: 13, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>You haven't taken an NBME yet. We'll build a diagnostic-first plan to get you real data fast.</div>
                </div>
                <span style={{ fontSize: 20, color: '#8a857e', flexShrink: 0 }}>→</span>
              </div>
            </button>
          </div>
          <p style={{ ...S.muted, fontSize: 12, textAlign: 'center' }}>You can always add past exams later from the dashboard.</p>
        </div>
      </div>
    );
  }

  // ─── HISTORY IMPORT ─────────────────────────────────────────────────
  if (screen === "history-import") {
    const canAddExam = histDraft.formName.trim().length > 0 && histDraft.takenAt.trim().length > 0;

    const addExamToList = () => {
      if (!canAddExam) return;
      setHistList(prev => [...prev, { ...histDraft }]);
      setHistDraft(defaultHistDraft());
      setHistError('');
    };

    const removeFromList = (idx) => setHistList(prev => prev.filter((_, i) => i !== idx));

    const saveAllAndContinue = async () => {
      if (histList.length === 0) { navigate(plan ? "dashboard" : "self-assessment"); return; }
      setHistSaving(true);
      setHistError('');
      try {
        const saved = [];
        for (const exam of histList) {
          const examScores = exam.hasBreakdown && Object.keys(exam.scores).filter(k => exam.scores[k] !== undefined).length > 0
            ? Object.fromEntries(Object.entries(exam.scores).filter(([, v]) => v !== undefined))
            : exam.totalScore ? { '__total__': Number(exam.totalScore) } : {};
          if (Object.keys(examScores).length === 0) continue;
          const { assessment } = await api.assessments.save({ formName: exam.formName, scores: examScores, stickingPoints: [], takenAt: exam.takenAt });
          saved.push(assessment);
        }
        if (saved.length > 0) {
          setAssessments(prev => {
            const combined = [...prev, ...saved];
            combined.sort((a, b) => new Date(a.takenAt || a.createdAt) - new Date(b.takenAt || b.createdAt));
            return combined;
          });
        }
        if (saved.length > 0) {
          // At least one assessment was saved — skip directly to sticking-points.
          // Never send the student back to the score entry screen after they've already imported data.
          const lastExam = histList[histList.length - 1];
          const lastScores = lastExam.hasBreakdown ? Object.fromEntries(Object.entries(lastExam.scores).filter(([, v]) => v !== undefined)) : {};
          if (Object.keys(lastScores).length > 0) {
            setScores(lastScores);
            setNbmeForm(lastExam.formName || '');
          }
          skipAssessmentSaveRef.current = true;
          navigate("sticking-points");
        } else {
          // No valid score data found in the list — go to self-assessment or dashboard
          navigate(plan ? "dashboard" : "self-assessment");
        }
      } catch (err) {
        setHistError(err.message || 'Failed to save assessments. Please try again.');
      } finally {
        setHistSaving(false);
      }
    };

    const ScoreBreakdownForm = () => (
      <div>
        {[{ label: "Performance by System", cats: STEP1_SYSTEM_CATEGORIES }, { label: "Performance by Discipline", cats: STEP1_DISCIPLINE_CATEGORIES }].map(group => (
          <div key={group.label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', fontFamily: S.f, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{group.label}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {group.cats.map(cat => (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 13, fontFamily: S.f, color: '#1a1816' }}>{cat}</span>
                  <input
                    type="number" min={0} max={100}
                    style={{ ...S.input, width: 72, padding: '7px 8px', textAlign: 'center', fontSize: 13 }}
                    placeholder="—"
                    value={histDraft.scores[cat] ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      setHistDraft(d => ({ ...d, scores: { ...d.scores, [cat]: v === '' ? undefined : Math.min(100, Math.max(0, Number(v))) } }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );

    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => navigate(plan ? "dashboard" : "onboarding")}>← Back</button>{dots(1)}<UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Your assessment history</h1>
          <p style={S.sub}>Add any NBME exams you've already taken. The plan uses your real scores to focus on what actually needs work.</p>

          {/* ── Yes / No gate (only shown first time, before any exams added) ── */}
          {histHasScores === null && histList.length === 0 && (
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              <button
                style={{ ...S.card, marginBottom: 0, border: '2px solid #1D9E7530', cursor: 'pointer', textAlign: 'left', background: '#f0f9f5', width: '100%' }}
                onClick={() => setHistHasScores(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>📋</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1816', marginBottom: 4 }}>Yes — I have past NBME scores</div>
                    <div style={{ fontSize: 13, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>Add them so your plan knows your trajectory, sticky weaknesses, and current baseline.</div>
                  </div>
                  <span style={{ fontSize: 20, color: '#1D9E75', flexShrink: 0 }}>→</span>
                </div>
              </button>
              <button
                style={{ ...S.card, marginBottom: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => navigate("self-assessment")}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 32, flexShrink: 0 }}>🆕</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1816', marginBottom: 4 }}>No — I'm starting fresh</div>
                    <div style={{ fontSize: 13, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>Haven't taken an NBME yet. We'll build a diagnostic-first plan to get you real data fast.</div>
                  </div>
                  <span style={{ fontSize: 20, color: '#8a857e', flexShrink: 0 }}>→</span>
                </div>
              </button>
              <p style={{ ...S.muted, fontSize: 12, textAlign: 'center' }}>You can always add past exams later from the dashboard.</p>
            </div>
          )}

          {histList.length > 0 && (
            <div style={S.card}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#1D9E75', fontFamily: S.f, marginBottom: 10 }}>
                {histList.length} exam{histList.length > 1 ? 's' : ''} added
              </div>
              {histList.map((exam, idx) => {
                const validScores = exam.hasBreakdown ? Object.values(exam.scores).filter(v => v !== undefined) : [];
                const displayScore = validScores.length > 0
                  ? Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)
                  : exam.totalScore ? Number(exam.totalScore) : null;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#faf8f5', borderRadius: 10, marginBottom: 6, borderLeft: '3px solid #1D9E75' }}>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a1816', fontFamily: S.f }}>{exam.formName}</span>
                    <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>{exam.takenAt}</span>
                    {displayScore !== null && <span style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75', fontFamily: S.f }}>{displayScore}%</span>}
                    {exam.hasBreakdown && <span style={{ ...S.tag, background: '#1D9E7515', color: '#1D9E75' }}>Breakdown</span>}
                    <button onClick={() => removeFromList(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {(histHasScores === true || histList.length > 0) && <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1816', fontFamily: S.f, marginBottom: 14 }}>
              {histList.length === 0 ? 'Add your oldest exam first' : 'Add another exam'}
            </div>

            {/* Screenshot upload */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f8fcfa', borderRadius: 10, border: '1.5px dashed #1D9E7540' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1D9E75', fontFamily: S.f, marginBottom: 8 }}>Auto-fill from screenshot</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} id="hist-screenshot-input"
                  onChange={e => { const file = e.target.files?.[0]; if (file) handleHistScreenshotUpload(file); e.target.value = ''; }} />
                <label htmlFor="hist-screenshot-input" style={{ ...S.btn, ...S.sec, padding: '9px 14px', fontSize: 13, cursor: histUploadingScreenshot ? 'not-allowed' : 'pointer', opacity: histUploadingScreenshot ? 0.5 : 1 }}>
                  {histUploadingScreenshot ? '⏳ Parsing…' : '📷 Upload score report'}
                </label>
                <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>or fill in manually</span>
              </div>
              {histError && <div style={{ marginTop: 8, fontSize: 12, color: '#c0392b', fontFamily: S.f }}>{histError}</div>}
              <div style={{ marginTop: 8, fontSize: 12, color: '#8a857e', fontFamily: S.f }}>🔒 Your data stays private. Score reports are processed securely and never sold or shared. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onShowTerms?.('privacy')}>See our privacy policy.</span></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={S.label}>Form name</label>
                <select style={S.input} value={histDraft.formName} onChange={e => setHistDraft(d => ({ ...d, formName: e.target.value }))}>
                  <option value="">— Select —</option>
                  <optgroup label="NBME CBSSA Forms">{PRACTICE_TESTS.filter(t => t.type === 'nbme').map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</optgroup>
                  <optgroup label="UW Self-Assessments & Other">{PRACTICE_TESTS.filter(t => t.type !== 'nbme').map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</optgroup>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Date taken</label>
                <input type="date" style={S.input} value={histDraft.takenAt} max={new Date().toISOString().split('T')[0]} onChange={e => setHistDraft(d => ({ ...d, takenAt: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Total score % <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input type="number" min={0} max={100} style={{ ...S.input, maxWidth: 130 }} placeholder="e.g. 64" value={histDraft.totalScore} onChange={e => setHistDraft(d => ({ ...d, totalScore: e.target.value }))} />
            </div>

            <div style={{ marginBottom: histDraft.hasBreakdown ? 14 : 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={histDraft.hasBreakdown} onChange={e => setHistDraft(d => ({ ...d, hasBreakdown: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1D9E75' }} />
                <span style={{ fontSize: 14, fontFamily: S.f, color: '#1a1816', fontWeight: 500 }}>I have system/discipline breakdown scores</span>
              </label>
              <p style={{ ...S.muted, fontSize: 12, marginTop: 5, marginLeft: 26 }}>Breakdown gives the plan much more precision. If you have your score report, check this.</p>
            </div>

            {histDraft.hasBreakdown && <ScoreBreakdownForm />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button disabled={!canAddExam || histUploadingScreenshot} style={{ ...S.btn, ...S.pri, opacity: (!canAddExam || histUploadingScreenshot) ? 0.4 : 1 }} onClick={addExamToList}>
                ＋ Add to list
              </button>
            </div>
          </div>}

          {histError && !histUploadingScreenshot && histSaving && (
            <div style={{ padding: '10px 14px', background: '#c0392b08', borderRadius: 8, borderLeft: '3px solid #c0392b', fontSize: 13, color: '#c0392b', fontFamily: S.f, marginBottom: 12 }}>
              {histError}
            </div>
          )}

          {(histHasScores === true || histList.length > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 12 }}>
              <p style={{ ...S.muted, fontSize: 13, flex: 1 }}>
                {histList.length === 0 ? 'Fill in the form above and tap "Add to list" first.' : `${histList.length} exam${histList.length > 1 ? 's' : ''} ready. Tap Done to import and continue.`}
              </p>
              <button
                disabled={histSaving}
                style={{ ...S.btn, ...S.pri, opacity: histSaving ? 0.4 : 1, flexShrink: 0 }}
                onClick={saveAllAndContinue}
              >
                {histSaving ? 'Saving…' : histList.length === 0 ? 'Skip →' : 'Done →'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PAST EXAM (standalone post-onboarding) ─────────────────────────
  if (screen === "past-exam") {
    const canSavePastExam = histDraft.formName.trim().length > 0 && histDraft.takenAt.trim().length > 0;

    const savePastExam = async () => {
      if (!canSavePastExam) return;
      setHistSaving(true);
      setHistError('');
      try {
        const examScores = histDraft.hasBreakdown && Object.keys(histDraft.scores).filter(k => histDraft.scores[k] !== undefined).length > 0
          ? Object.fromEntries(Object.entries(histDraft.scores).filter(([, v]) => v !== undefined))
          : histDraft.totalScore ? { '__total__': Number(histDraft.totalScore) } : null;

        if (!examScores || Object.keys(examScores).length === 0) {
          setHistError('Please enter at least a total score or at least one breakdown score.');
          setHistSaving(false);
          return;
        }
        const { assessment } = await api.assessments.save({ formName: histDraft.formName, scores: examScores, stickingPoints: [], takenAt: histDraft.takenAt });
        setAssessments(prev => {
          const combined = [...prev, assessment];
          combined.sort((a, b) => new Date(a.takenAt || a.createdAt) - new Date(b.takenAt || b.createdAt));
          return combined;
        });
        setHistDraft(defaultHistDraft());
        setHistError('');
        navigate("dashboard");
      } catch (err) {
        setHistError(err.message || 'Failed to save. Please try again.');
      } finally {
        setHistSaving(false);
      }
    };

    return (
      <div style={S.app}>
        <VerifyBanner />
        <div style={S.topBar}><button style={{ ...S.btn, ...S.ghost }} onClick={() => { setHistDraft(defaultHistDraft()); setHistError(''); navigate("dashboard"); }}>← Back</button><UserBar /></div>
        <div style={S.wrap}>
          <h1 style={S.h1}>Add a past exam</h1>
          <p style={S.sub}>Import a historical NBME score. It'll show up in your score history so your plan has your full score trajectory.</p>

          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1D9E75', fontFamily: S.f, marginBottom: 8 }}>Auto-fill from screenshot</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} id="past-screenshot-input"
                onChange={e => { const file = e.target.files?.[0]; if (file) handleHistScreenshotUpload(file); e.target.value = ''; }} />
              <label htmlFor="past-screenshot-input" style={{ ...S.btn, ...S.sec, padding: '9px 14px', fontSize: 13, cursor: histUploadingScreenshot ? 'not-allowed' : 'pointer', opacity: histUploadingScreenshot ? 0.5 : 1 }}>
                {histUploadingScreenshot ? '⏳ Parsing…' : '📷 Upload score report'}
              </label>
              <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>or fill in manually</span>
            </div>
            {histError && !histSaving && <div style={{ marginTop: 8, fontSize: 12, color: '#c0392b', fontFamily: S.f }}>{histError}</div>}
            <div style={{ marginTop: 8, fontSize: 12, color: '#8a857e', fontFamily: S.f }}>🔒 Your data stays private. Score reports are processed securely and never sold or shared. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onShowTerms?.('privacy')}>See our privacy policy.</span></div>
          </div>

          <div style={S.card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={S.label}>Form name</label>
                <select style={S.input} value={histDraft.formName} onChange={e => setHistDraft(d => ({ ...d, formName: e.target.value }))}>
                  <option value="">— Select —</option>
                  <optgroup label="NBME CBSSA Forms">{PRACTICE_TESTS.filter(t => t.type === 'nbme').map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</optgroup>
                  <optgroup label="UW Self-Assessments & Other">{PRACTICE_TESTS.filter(t => t.type !== 'nbme').map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</optgroup>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Date taken</label>
                <input type="date" style={S.input} value={histDraft.takenAt} max={new Date().toISOString().split('T')[0]} onChange={e => setHistDraft(d => ({ ...d, takenAt: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Total score % <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input type="number" min={0} max={100} style={{ ...S.input, maxWidth: 130 }} placeholder="e.g. 64" value={histDraft.totalScore} onChange={e => setHistDraft(d => ({ ...d, totalScore: e.target.value }))} />
            </div>

            <div style={{ marginBottom: histDraft.hasBreakdown ? 14 : 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={histDraft.hasBreakdown} onChange={e => setHistDraft(d => ({ ...d, hasBreakdown: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1D9E75' }} />
                <span style={{ fontSize: 14, fontFamily: S.f, color: '#1a1816', fontWeight: 500 }}>I have system/discipline breakdown scores</span>
              </label>
            </div>

            {histDraft.hasBreakdown && (
              <div>
                {[{ label: "Performance by System", cats: STEP1_SYSTEM_CATEGORIES }, { label: "Performance by Discipline", cats: STEP1_DISCIPLINE_CATEGORIES }].map(group => (
                  <div key={group.label} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', fontFamily: S.f, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{group.label}</div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {group.cats.map(cat => (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ flex: 1, fontSize: 13, fontFamily: S.f, color: '#1a1816' }}>{cat}</span>
                          <input
                            type="number" min={0} max={100}
                            style={{ ...S.input, width: 72, padding: '7px 8px', textAlign: 'center', fontSize: 13 }}
                            placeholder="—"
                            value={histDraft.scores[cat] ?? ''}
                            onChange={e => {
                              const v = e.target.value;
                              setHistDraft(d => ({ ...d, scores: { ...d.scores, [cat]: v === '' ? undefined : Math.min(100, Math.max(0, Number(v))) } }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {histError && histSaving && <div style={{ marginTop: 10, padding: '10px 14px', background: '#c0392b08', borderRadius: 8, borderLeft: '3px solid #c0392b', fontSize: 13, color: '#c0392b', fontFamily: S.f }}>{histError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button disabled={!canSavePastExam || histSaving} style={{ ...S.btn, ...S.pri, opacity: (!canSavePastExam || histSaving) ? 0.4 : 1 }} onClick={savePastExam}>
                {histSaving ? 'Saving…' : 'Save past exam →'}
              </button>
            </div>
          </div>
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
                { icon: '3.', text: 'Enter your NBME scores and the app switches to a fully data-driven, personalized plan.' },
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
                <div style={{ fontSize: 12, color: "#6b6560", fontFamily: S.f }}>Upload your score report — scores are extracted automatically. You confirm everything before it's saved.</div>
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
            <div style={{ marginTop: 10, fontSize: 12, color: '#8a857e', fontFamily: S.f }}>🔒 Your data stays private. Score reports are processed securely and never sold or shared. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => onShowTerms?.('privacy')}>See our privacy policy.</span></div>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <button style={{ ...S.btn, ...S.sec }} onClick={() => { const d = {}; cats.forEach(c => { d[c] = Math.floor(Math.random() * 60) + 20; }); setScores(d); }}>Demo scores</button>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {assessments.length > 0 && (
                <button style={{ ...S.btn, ...S.ghost, fontSize: 13 }} onClick={() => { skipAssessmentSaveRef.current = true; navigate("sticking-points"); }}>
                  Skip — use imported scores →
                </button>
              )}
              <button disabled={!allFilled} style={{ ...S.btn, ...S.pri, opacity: allFilled ? 1 : 0.4 }} onClick={() => navigate("sticking-points")}>Analyze →</button>
            </div>
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
      const derivedTaken = assessments.map(a => {
        const match = PRACTICE_TESTS.find(t => t.name === (a.form_name || a.formName));
        return match ? { id: match.id, takenDate: a.taken_at || a.takenAt || a.created_at } : null;
      }).filter(Boolean);
      const profileForPlan = { ...profile, takenAssessments: derivedTaken };
      const generatedPlan = generatePlan(profileForPlan, scores, stickingPoints);
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
      setPostNbmeDone(false); setPostNbmeRating(null); setPostNbmeComment('');
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

          {/* Widget C — post-NBME feedback */}
          {!postNbmeDone && (
            <div style={{ ...S.card, marginTop: 12, background: '#fafaf9', border: '1px solid #e8e4de' }}>
              <div style={{ fontSize: 13, color: '#6b6560', fontFamily: S.f, marginBottom: 10 }}>Did the study plan help you improve?</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['Yes', 3], ['Somewhat', 2], ['Not really', 1]].map(([lbl, val]) => (
                  <button key={val} onClick={() => {
                    setPostNbmeRating(val);
                    if (val > 1) {
                      submitFeedback({ feedback_type: 'post_nbme', rating: val });
                      setPostNbmeDone(true);
                    }
                  }} style={{ padding: '7px 16px', borderRadius: 20, border: `1.5px solid ${postNbmeRating === val ? BRAND.green : '#e0dcd6'}`, background: postNbmeRating === val ? `${BRAND.green}15` : '#fff', fontSize: 13, fontFamily: S.f, color: postNbmeRating === val ? BRAND.green : '#4a4540', cursor: 'pointer', fontWeight: postNbmeRating === val ? 700 : 400 }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {postNbmeRating === 1 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input value={postNbmeComment} onChange={e => setPostNbmeComment(e.target.value)}
                    placeholder="What would have helped more? (optional)"
                    style={{ flex: 1, fontSize: 12, padding: '7px 10px', borderRadius: 8, border: '1px solid #e0dcd6', fontFamily: S.f, background: '#fff', outline: 'none', color: '#1a1816' }} />
                  <button onClick={() => {
                    submitFeedback({ feedback_type: 'post_nbme', rating: 1, responses: { comment: postNbmeComment } });
                    setPostNbmeDone(true);
                  }} style={{ ...S.btn, ...S.pri, padding: '7px 14px', fontSize: 12, flexShrink: 0 }}>Send</button>
                  <button onClick={() => { submitFeedback({ feedback_type: 'post_nbme', rating: 1 }); setPostNbmeDone(true); }}
                    style={{ ...S.btn, ...S.ghost, padding: '7px 10px', fontSize: 12, color: '#aaa9a6', flexShrink: 0 }}>Skip</button>
                </div>
              )}
            </div>
          )}
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

        {/* Compact dismissible starter banner — only shown when no scores entered yet */}
        {plan.firstTimer && assessments.length === 0 && !starterBannerDismissed && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #f6c90e60', borderRadius: 10, padding: '9px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>🧭</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92600a', fontFamily: S.f, flex: 1 }}>
              Starter plan — diagnostic NBME unlocks your full personalization
              {' · '}
              <button style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: '#92600a', fontFamily: S.f, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => navigate("scores")}>
                Enter scores →
              </button>
            </span>
            <button style={{ background: 'none', border: 'none', fontSize: 18, color: '#b8950a', cursor: 'pointer', padding: '0 2px', lineHeight: 1, opacity: 0.7 }} onClick={() => setStarterBannerDismissed(true)}>×</button>
          </div>
        )}

        {/* ── View toggle + Day / Week / Full rendering (PRIMARY section — top of page) ── */}
        {(() => {
          const allDays = plan.weeks.flatMap(w => w.days).sort((a, b) => a.calendarDay - b.calendarDay);

          // ── Plan-day → calendar date helpers (plan view scope) ──────────────
          const planViewStart = latestPlanMeta?.createdAt ? (() => { const d = new Date(latestPlanMeta.createdAt); d.setHours(0,0,0,0); return d; })() : null;
          const getPlanDayDate = (dayNum) => {
            if (!planViewStart) return null;
            const d = new Date(planViewStart); d.setDate(d.getDate() + dayNum - 1); return d;
          };
          const fmtPlanDate = (d) => d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
          const todayFlat = new Date(); todayFlat.setHours(0,0,0,0);
          const isToday = (d) => d && d.getTime() === todayFlat.getTime();

          // ── Calendar weeks (Sun–Sat grouping for display) ──────────────────
          const calendarWeeks = (() => {
            if (!planViewStart) {
              return plan.weeks.map(w => ({ ...w, weekNum: w.week, dateRange: null, startDate: null }));
            }
            const weekMap = new Map();
            for (const day of allDays) {
              const d = getPlanDayDate(day.calendarDay);
              if (!d) continue;
              const sunday = new Date(d); sunday.setDate(d.getDate() - d.getDay());
              const key = sunday.toISOString().slice(0, 10);
              if (!weekMap.has(key)) {
                const saturday = new Date(sunday); saturday.setDate(sunday.getDate() + 6);
                const matchPW = plan.weeks.find(w => w.days.some(dd => dd.calendarDay === day.calendarDay));
                weekMap.set(key, {
                  weekNum: weekMap.size + 1,
                  startDate: new Date(sunday), endDate: saturday,
                  phase: matchPW?.phase || '',
                  isLockdown: matchPW?.isLockdown || false,
                  focusTopics: matchPW?.focusTopics || [],
                  dateRange: `${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                  days: [],
                });
              }
              weekMap.get(key).days.push(day);
            }
            return Array.from(weekMap.values());
          })();

          /* Render a single block row — collapsed by default, expand on click */
          const renderBlockRow = (block, bi, day) => {
            const key = `${day.calendarDay}-${bi}`;
            const isOpen = expandedBlocks.has(key);

            // Lunch / break → thin muted divider line
            if (block.type === 'lunch') {
              return (
                <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0', color: '#b45309', fontSize: 12, fontFamily: S.f }}>
                  <div style={{ flex: 1, height: 1, background: '#e8dcc8' }} />
                  <span style={{ whiteSpace: 'nowrap', opacity: 0.8 }}>☕ {block.label || 'Lunch break'} · {block.startTime && block.endTime ? formatTimeRange(block.startTime, block.endTime) : formatDuration(block.tasks?.[0]?.hours || 0)}</span>
                  <div style={{ flex: 1, height: 1, background: '#e8dcc8' }} />
                </div>
              );
            }

            const bc = blockColors[block.type] || blockColors.questions;
            const totalHours = block.tasks?.reduce((s, t) => s + (t.hours || 0), 0) || 0;
            const qMatch = block.tasks?.map(t => t.activity || '').join(' ').match(/(\d+)\s*(Qs|questions)/i);
            const qCount = qMatch ? qMatch[1] : null;

            // Anki block → always one-liner, no collapse needed
            if (block.type === 'anki') {
              return (
                <div key={bi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: bc.bg, borderLeft: `3px solid ${bc.border}` }}>
                  <span style={{ fontSize: 13 }}>🧠</span>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: '#166534', flex: 1 }}>Morning Anki — due cards + yesterday's misses</span>
                  <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>{block.startTime && block.endTime ? formatTimeRange(block.startTime, block.endTime) : formatDuration(totalHours)}</span>
                  <button onClick={() => navigate('anki')} style={{ fontSize: 11, color: '#27ae60', fontFamily: S.f, padding: '2px 8px', borderRadius: 10, background: '#27ae6015', border: '1px solid #27ae6030', cursor: 'pointer', whiteSpace: 'nowrap' }}>Setup guide →</button>
                </div>
              );
            }

            const header = (
              <div onClick={() => toggleBlock(key)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: isOpen ? bc.bg : '#faf8f5', borderLeft: `3px solid ${bc.border}`, borderRadius: isOpen ? '8px 8px 0 0' : 8, border: `1px solid ${isOpen ? bc.border + '30' : '#ece8e2'}` }}>
                <span style={{ fontSize: 13 }}>{bc.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: bc.border, fontFamily: S.f, flex: 1 }}>{block.label}</span>
                {qCount && <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>{qCount} Qs ·&nbsp;</span>}
                <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>{block.startTime && block.endTime ? formatTimeRange(block.startTime, block.endTime) : formatDuration(totalHours)}</span>
                <span style={{ fontSize: 10, color: '#bbb', marginLeft: 6 }}>{isOpen ? '▲' : '▶'}</span>
              </div>
            );

            if (!isOpen) return <div key={bi}>{header}</div>;

            return (
              <div key={bi} style={{ borderRadius: 8, overflow: 'hidden' }}>
                {header}
                <div style={{ background: bc.bg, borderLeft: `3px solid ${bc.border}`, border: `1px solid ${bc.border}30`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px' }}>
                  <div style={{ display: 'grid', gap: 2 }}>
                    {block.tasks.map((task, ti) => (
                      <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', fontSize: 13, fontFamily: S.f, borderBottom: ti < block.tasks.length - 1 ? '1px solid #00000008' : 'none' }}>
                        <span style={{ fontWeight: 600, color: '#1a1816', minWidth: 85, flexShrink: 0 }}>{task.resource}</span>
                        <span style={{ color: '#6b6560', flex: 1, lineHeight: 1.4 }}>{task.activity}</span>
                        <span style={{ color: '#8a857e', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatDuration(task.hours)}</span>
                      </div>
                    ))}
                  </div>
                  {block.contentSequence && <ContentSequencePanel contentSequence={block.contentSequence} />}
                </div>
              </div>
            );
          };

          /* Render a full day's content (shared across day + full views) */
          const renderDayContent = (day) => {
            const special = day.dayType === 'nbme' || day.dayType === 'rest' || day.dayType === 'student-rest';

            // Assign actual start/end times to every block from the student's configured start time
            const endFallback = calcEndTime(profile.studyStartTime || '07:00', profile.hoursPerDay || 8);
            const timedBlocks = assignBlockTimes(
              day.blocks || [],
              profile.studyStartTime || '07:00',
              profile.studyEndTime || endFallback
            );

            // Deduplicate sub-topics across all blocks → show once at top of day
            const seenTopics = new Set();
            const allHighYield = timedBlocks.flatMap(b =>
              (b.highYield || []).filter(hy => { if (seenTopics.has(hy.topic)) return false; seenTopics.add(hy.topic); return true; })
            );
            const dayQbankTip = timedBlocks.find(b => b.qbankFilterTip)?.qbankFilterTip;

            // Group consecutive questions-random blocks into a single collapsible card
            const processedBlocks = [];
            let pi = 0;
            while (pi < timedBlocks.length) {
              const b = timedBlocks[pi];
              if (b.type === 'questions-random') {
                const grp = [b];
                while (pi + 1 < timedBlocks.length && timedBlocks[pi + 1].type === 'questions-random') { pi++; grp.push(timedBlocks[pi]); }
                processedBlocks.push({ _isRandomGroup: true, blocks: grp, _pi: pi });
              } else {
                processedBlocks.push(b);
              }
              pi++;
            }

            return (
              <>
                {/* Day header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ ...S.tag, background: '#1a181610', color: '#1a1816' }}>
                    Day {day.calendarDay}{fmtPlanDate(getPlanDayDate(day.calendarDay)) ? ` · ${fmtPlanDate(getPlanDayDate(day.calendarDay))}` : ''}
                  </span>
                  {isToday(getPlanDayDate(day.calendarDay)) && <span style={{ ...S.tag, background: '#1D9E7518', color: '#1D9E75', fontWeight: 700 }}>TODAY</span>}
                  {day.dayType === 'nbme' && <span style={{ ...S.tag, background: '#c0392b18', color: '#c0392b' }}>📋 NBME</span>}
                  {day.dayType === 'rest' && <span style={{ ...S.tag, background: '#27ae6018', color: '#27ae60' }}>😴 Rest</span>}
                  {day.dayType === 'student-rest' && <span style={{ ...S.tag, background: '#27ae6018', color: '#27ae60' }}>🌿 Rest day</span>}
                  {day.dayType === 'light' && <span style={{ ...S.tag, background: '#2980b918', color: '#2980b9' }}>Light</span>}
                  {day.dayType === 'exam-week' && <span style={{ ...S.tag, background: '#7c3aed18', color: '#7c3aed' }}>⚡ Exam week</span>}
                  {day.dayType === 'exam-eve' && <span style={{ ...S.tag, background: '#1D9E7518', color: '#1D9E75' }}>🌙 Exam eve</span>}
                  {!special && day.dayType !== 'exam-week' && day.dayType !== 'exam-eve' && day.focusTopic && (
                    <span style={{ fontSize: 13, color: '#8a857e', fontFamily: S.f }}>Focus: <strong style={{ color: '#1a1816' }}>{day.focusTopic}</strong></span>
                  )}
                  {day.totalQuestions > 0 && <span style={{ ...S.tag, background: '#1a181610', color: '#1a1816', marginLeft: 'auto' }}>{day.totalQuestions} Qs</span>}
                </div>


                {/* Blocks (collapsed by default) */}
                <div style={{ display: 'grid', gap: 5 }}>
                  {processedBlocks.map((item, bi) => {
                    // Grouped random blocks
                    if (item._isRandomGroup) {
                      const grp = item.blocks;
                      const gKey = `${day.calendarDay}-rg-${bi}`;
                      const isOpen = expandedBlocks.has(gKey);
                      const bc = blockColors['questions-random'];
                      const totalHours = grp.reduce((s, b) => s + b.tasks.reduce((ss, t) => ss + (t.hours || 0), 0), 0);
                      const totalQs = grp.reduce((s, b) => {
                        const m = b.tasks.map(t => t.activity || '').join(' ').match(/(\d+)\s*(Qs|questions)/i);
                        return s + (m ? parseInt(m[1]) : 0);
                      }, 0);
                      return (
                        <div key={bi} style={{ borderRadius: 8, overflow: 'hidden' }}>
                          <div onClick={() => toggleBlock(gKey)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: isOpen ? bc.bg : '#faf8f5', borderLeft: `3px solid ${bc.border}`, borderRadius: isOpen ? '8px 8px 0 0' : 8, border: `1px solid ${isOpen ? bc.border + '30' : '#ece8e2'}` }}>
                            <span style={{ fontSize: 13 }}>🎲</span>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: bc.border, fontFamily: S.f, flex: 1 }}>
                              Random Questions{grp.length > 1 ? ` · ${grp.length} blocks` : ''}
                            </span>
                            {totalQs > 0 && <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>{totalQs} Qs ·&nbsp;</span>}
                            <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>{grp[0]?.startTime && grp[grp.length-1]?.endTime ? formatTimeRange(grp[0].startTime, grp[grp.length-1].endTime) : formatDuration(totalHours)}</span>
                            <span style={{ fontSize: 10, color: '#bbb', marginLeft: 6 }}>{isOpen ? '▲' : '▶'}</span>
                          </div>
                          {isOpen && (
                            <div style={{ background: bc.bg, borderLeft: `3px solid ${bc.border}`, border: `1px solid ${bc.border}30`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px' }}>
                              {grp.map((b, gi) => (
                                <div key={gi} style={{ marginBottom: gi < grp.length - 1 ? 10 : 0 }}>
                                  {grp.length > 1 && <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: bc.border, fontFamily: S.f, marginBottom: 4 }}>Block {gi + 1}</div>}
                                  {b.tasks.map((task, ti) => (
                                    <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', fontSize: 13, fontFamily: S.f }}>
                                      <span style={{ fontWeight: 600, color: '#1a1816', minWidth: 85, flexShrink: 0 }}>{task.resource}</span>
                                      <span style={{ color: '#6b6560', flex: 1 }}>{task.activity}</span>
                                      <span style={{ color: '#8a857e', fontWeight: 600 }}>{formatDuration(task.hours)}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return renderBlockRow(item, bi, day);
                  })}
                </div>
              </>
            );
          };

          return (
            <>
              {/* ── View mode toggle ── */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f5f2ed', borderRadius: 10, padding: 4 }}>
                {[['day', '📅 Day'], ['week', '📆 Week'], ['full', '📋 Full']].map(([mode, lbl]) => (
                  <button key={mode} onClick={() => setPlanViewMode(mode)}
                    style={{ flex: 1, padding: '8px 0', fontSize: 13, fontFamily: S.f, border: planViewMode === mode ? '1px solid #e8dcc8' : '1px solid transparent', borderRadius: 8, cursor: 'pointer', background: planViewMode === mode ? '#fff' : 'transparent', color: planViewMode === mode ? '#1a1816' : '#8a857e', fontWeight: planViewMode === mode ? 700 : 400, boxShadow: planViewMode === mode ? '0 1px 3px #0000000d' : 'none' }}>
                    {lbl}
                  </button>
                ))}
              </div>

              {/* ── DAY VIEW: one day at a time with ← → nav ── */}
              {planViewMode === 'day' && (() => {
                const dayIdx = allDays.findIndex(d => d.calendarDay === planViewDay);
                const idx = dayIdx >= 0 ? dayIdx : 0;
                const day = allDays[idx];
                const prevDay = allDays[idx - 1];
                const nextDay = allDays[idx + 1];
                const week = plan.weeks.find(w => w.days.some(d => d.calendarDay === day?.calendarDay));
                if (!day) return null;
                return (
                  <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', background: week?.isLockdown ? '#f5f3ff' : '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ece8e2' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: S.f, color: week?.isLockdown ? '#7c3aed' : '#8a857e' }}>
                        {week?.isLockdown ? '🔒 ' : ''}Week {week?.week} · {week?.phase}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => prevDay && setPlanViewDay(prevDay.calendarDay)} disabled={!prevDay}
                          style={{ ...S.btn, ...S.ghost, padding: '4px 10px', fontSize: 12, opacity: prevDay ? 1 : 0.3 }}>← Prev</button>
                        <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f, textAlign: 'center' }}>
                          Day {day.calendarDay}{fmtPlanDate(getPlanDayDate(day.calendarDay)) ? ` · ${fmtPlanDate(getPlanDayDate(day.calendarDay))}` : ''} / {allDays.length}
                        </span>
                        <button onClick={() => nextDay && setPlanViewDay(nextDay.calendarDay)} disabled={!nextDay}
                          style={{ ...S.btn, ...S.ghost, padding: '4px 10px', fontSize: 12, opacity: nextDay ? 1 : 0.3 }}>Next →</button>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>{renderDayContent(day)}</div>
                  </div>
                );
              })()}

              {/* ── WEEK VIEW: compact 7-day summaries, click to jump to day ── */}
              {planViewMode === 'week' && (
                <div style={{ display: 'grid', gap: 12 }}>
                  {calendarWeeks.map((week, wi) => (
                    <div key={wi} style={{ ...S.card, padding: 0, overflow: 'hidden', ...(week.isLockdown ? { border: '1.5px solid #7c3aed30' } : {}) }}>
                      <div style={{ padding: '12px 18px', background: week.isLockdown ? '#f5f3ff' : '#faf8f5', borderBottom: '1px solid #ece8e2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: S.f, color: '#1a1816' }}>Week {week.weekNum}</span>
                          {week.dateRange && <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>{week.dateRange}</span>}
                          {week.isLockdown
                            ? <span style={{ ...S.tag, background: '#7c3aed18', color: '#7c3aed', fontSize: 10 }}>🔒 Exam week</span>
                            : week.focusTopics?.slice(0, 3).map((ft, fi) => <span key={fi} style={{ ...S.tag, background: '#b4530915', color: '#b45309', fontSize: 10 }}>{ft}</span>)}
                        </div>
                        <div style={{ fontSize: 12, color: week.isLockdown ? '#7c3aed' : '#8a857e', fontFamily: S.f, marginTop: 2 }}>{week.phase}</div>
                      </div>
                      {week.days.map((day, di) => {
                        const rowColor = day.dayType === 'nbme' ? '#c0392b' : (day.dayType === 'rest' || day.dayType === 'student-rest') ? '#27ae60' : day.dayType === 'review' ? '#d97706' : day.dayType === 'exam-week' ? '#7c3aed' : '#1a1816';
                        const dayDate = getPlanDayDate(day.calendarDay);
                        const isTodayDay = isToday(dayDate);
                        return (
                          <div key={di}
                            onClick={() => { setPlanViewDay(day.calendarDay); setPlanViewMode('day'); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: di > 0 ? '1px solid #f0ece6' : 'none', cursor: 'pointer', background: isTodayDay ? '#f0faf5' : '#fff' }}>
                            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 54 }}>
                              <div style={{ ...S.tag, background: isTodayDay ? '#1D9E7520' : '#1a181608', color: isTodayDay ? '#1D9E75' : '#6b6560', fontWeight: isTodayDay ? 700 : 400 }}>Day {day.calendarDay}</div>
                              {dayDate && <div style={{ fontSize: 10, color: '#aaa', fontFamily: S.f, marginTop: 2 }}>{dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: rowColor }}>
                                  {day.dayType === 'nbme' ? '📋 Practice Exam' : day.dayType === 'rest' ? '😴 Rest day' : day.dayType === 'student-rest' ? '🌿 Rest day' : day.dayType === 'review' ? `🔍 Review: ${day.triageFor || 'post-exam'}` : day.dayType === 'exam-week' ? '⚡ Exam week' : day.dayType === 'exam-eve' ? '🌙 Exam eve' : day.focusTopic || 'Study day'}
                                </div>
                                {isTodayDay && <span style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', background: '#1D9E7518', padding: '1px 6px', borderRadius: 6, fontFamily: S.f }}>TODAY</span>}
                              </div>
                              {day.dayType === 'student-rest' && <div style={{ fontSize: 11, color: '#27ae60', fontFamily: S.f, marginTop: 1 }}>0 Qs — rest day · 30–45 min light activity</div>}
                              {day.dayType === 'review' && <div style={{ fontSize: 11, color: '#d97706', fontFamily: S.f, marginTop: 1 }}>{day.totalQuestions} Qs · deep review + reinforcement</div>}
                              {day.totalQuestions > 0 && day.dayType !== 'student-rest' && day.dayType !== 'review' && <div style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f, marginTop: 1 }}>{day.totalQuestions} Qs · {(day.blocks || []).filter(b => b.type !== 'lunch').length} blocks</div>}
                            </div>
                            <span style={{ fontSize: 14, color: '#d0ccc6' }}>›</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* ── FULL VIEW: all weeks expanded with collapsible blocks ── */}
              {planViewMode === 'full' && calendarWeeks.map((week, wi) => (
                <div key={wi} style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 12, ...(week.isLockdown ? { border: '1.5px solid #7c3aed30' } : {}) }}>
                  <div style={{ padding: '16px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: expandedWeek === wi ? (week.isLockdown ? '#f5f3ff' : '#faf8f5') : (week.isLockdown ? '#fdfcff' : '#fff') }} onClick={() => setExpandedWeek(expandedWeek === wi ? -1 : wi)}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, fontFamily: S.f, color: '#1a1816' }}>Week {week.weekNum}</span>
                        {week.dateRange && <span style={{ fontSize: 12, color: '#8a857e', fontFamily: S.f }}>{week.dateRange}</span>}
                        {week.isLockdown
                          ? <span style={{ ...S.tag, background: '#7c3aed18', color: '#7c3aed', fontSize: 10 }}>🔒 Exam week</span>
                          : week.focusTopics?.slice(0, 3).map((ft, fi) => <span key={fi} style={{ ...S.tag, background: '#b4530915', color: '#b45309', fontSize: 10 }}>{ft}</span>)}
                      </div>
                      <div style={{ fontSize: 13, color: week.isLockdown ? '#7c3aed' : '#8a857e', fontFamily: S.f, marginTop: 2 }}>{week.phase}</div>
                    </div>
                    <span style={{ fontSize: 18, color: '#8a857e', transform: expandedWeek === wi ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▾</span>
                  </div>
                  {expandedWeek === wi && (
                    <div style={{ padding: '0 24px 20px' }}>
                      {week.isLockdown && (
                        <div style={{ margin: '16px 0 4px', padding: '12px 16px', borderRadius: 10, background: '#7c3aed08', border: '1px solid #7c3aed25', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', fontFamily: S.f, marginBottom: 3 }}>Exam week — maintenance and confidence mode</div>
                            <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>No new content. Random blocks only — simulate exam pacing daily. Finish all study by 3 PM. Trust the work you've done.</div>
                          </div>
                        </div>
                      )}
                      {week.days.map((day, di) => (
                        <div key={di} style={{ padding: '14px 0', borderTop: di > 0 ? '1px solid #f0ece6' : 'none' }}>
                          {renderDayContent(day)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          );
        })()}

        {/* ── Plan stats — single thin line ── */}
        <div style={{ fontSize: 13, color: '#8a857e', fontFamily: S.f, padding: '10px 0 8px', marginBottom: 4, borderBottom: '1px solid #f0ece6' }}>
          {plan.totalStudyDays} study days · ~{(plan.totalQEstimate || 0).toLocaleString()} Qs · {plan.nbmeDays} NBMEs · {profile.hoursPerDay}h/day
          {plan.timelineMode === 'triage' && <span style={{ color: '#c0392b', fontWeight: 600 }}> · ⚠ Triage mode</span>}
        </div>

        {/* ── Assessment schedule collapsible ── */}
        {plan.assessmentSchedule?.length > 0 && (
          <div style={{ borderBottom: '1px solid #f0ece6', marginBottom: 4 }}>
            <div onClick={() => setShowAssessmentSched(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: '#4a4540' }}>📋 Assessment schedule <span style={{ fontWeight: 400, color: '#8a857e' }}>({plan.assessmentSchedule?.length} scheduled)</span></span>
              <span style={{ fontSize: 12, color: '#8a857e', display: 'inline-block', transform: showAssessmentSched ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▾</span>
            </div>
            {showAssessmentSched && (() => {
              const psDate = latestPlanMeta?.createdAt ? (() => { const d = new Date(latestPlanMeta.createdAt); d.setHours(0,0,0,0); return d; })() : null;
              return (
                <div style={{ paddingBottom: 10 }}>
                  {plan.assessmentSchedule.map((a, i) => {
                    const dayDate = psDate ? new Date(psDate.getTime() + (a.day - 1) * 86400000) : null;
                    const dateStr = dayDate ? dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Day ${a.day}`;
                    const isExpanded = expandedAssessmentIdx === i;
                    return (
                      <div key={i}
                        style={{ padding: '7px 0 7px 12px', borderLeft: '2.5px solid #c0392b30', marginBottom: 4, cursor: a.reason ? 'pointer' : 'default' }}
                        onClick={() => a.reason && setExpandedAssessmentIdx(isExpanded ? null : i)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#c0392b', fontFamily: S.f, minWidth: 48 }}>Day {a.day}</span>
                          <span style={{ fontSize: 12, fontFamily: S.f, color: '#1a1816', fontWeight: 600, flex: 1 }}>{a.test?.name || 'Practice Assessment'}</span>
                          <span style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>{dateStr}</span>
                          <span style={{ ...S.tag, background: '#c0392b12', color: '#c0392b', fontSize: 10 }}>{a.label || 'NBME'}</span>
                        </div>
                        {isExpanded && a.reason && (
                          <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, marginTop: 4, lineHeight: 1.5 }}>{a.reason}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Priority ranking collapsible ── */}
        {plan.priorities?.length > 0 && (
          <div style={{ borderBottom: '1px solid #f0ece6', marginBottom: 4 }}>
            <div onClick={() => setShowPriorityRanking(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', cursor: 'pointer', userSelect: 'none' }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: '#4a4540' }}>🎯 Priority ranking <span style={{ fontWeight: 400, color: '#8a857e' }}>({plan.priorities?.length} systems ranked)</span></span>
              <span style={{ fontSize: 12, color: '#8a857e', display: 'inline-block', transform: showPriorityRanking ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▾</span>
            </div>
            {showPriorityRanking && (
              <div style={{ paddingBottom: 10 }}>
                {plan.priorities.slice(0, 12).map((p, i) => {
                  const isExpanded = expandedPriorityIdx === i;
                  const subs = getTopSubTopics(p.category, 4);
                  const gapColor = p.gapType === 'critical' ? '#c0392b' : p.gapType === 'moderate' ? '#D85A30' : BRAND.green;
                  return (
                    <div key={i}
                      style={{ padding: '6px 0 6px 12px', borderLeft: `2.5px solid ${gapColor}40`, marginBottom: 3, cursor: 'pointer' }}
                      onClick={() => setExpandedPriorityIdx(isExpanded ? null : i)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8a857e', fontFamily: S.f, minWidth: 20 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13, fontFamily: S.f, color: '#1a1816', flex: 1 }}>{p.category}</span>
                        {p.gapType && <span style={{ ...S.tag, background: `${gapColor}12`, color: gapColor, fontSize: 10 }}>{p.gapType}</span>}
                        <span style={{ fontSize: 11, color: '#aaa9a6' }}>{isExpanded ? '▾' : '▸'}</span>
                      </div>
                      {isExpanded && subs.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6, paddingRight: 8 }}>
                          {subs.map(s => (
                            <span key={s.topic} style={{ ...S.tag, background: `${gapColor}10`, color: gapColor, fontSize: 10 }}>{s.topic}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── How every day works collapsible ── */}
        <div style={{ borderBottom: '1px solid #f0ece6', marginBottom: 12 }}>
          <div onClick={() => setShowHowItWorks(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', cursor: 'pointer', userSelect: 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: '#4a4540' }}>📖 How every day works</span>
            <span style={{ fontSize: 12, color: '#8a857e', display: 'inline-block', transform: showHowItWorks ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>▾</span>
          </div>
          {showHowItWorks && (
            <div style={{ paddingBottom: 10 }}>
              {[
                { icon: '🧠', title: 'Morning retention (Anki)', desc: 'Start each day with your Anki deck to lock in what you learned yesterday.' },
                { icon: '🔥', title: 'Focus block — targeted questions', desc: 'Drill your weakest topic with UWorld in tutor mode. Read every explanation carefully.' },
                { icon: '🎲', title: 'Random block — breadth maintenance', desc: 'Random UW questions across all systems. Prevents atrophy in your stronger areas.' },
                { icon: '📚', title: 'Content review is reactive', desc: "You don't re-read chapters. You look up exactly what you got wrong in questions." },
                { icon: '✅', title: 'End-of-day review', desc: "Go back through every wrong answer from today's blocks. That's your content session." },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderTop: i > 0 ? '1px solid #f5f2ee' : 'none' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: S.f, color: '#1a1816', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#6b6560', fontFamily: S.f, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
            <button
              style={{ ...S.btn, ...S.sec, padding: "10px 18px", fontSize: 13 }}
              onClick={() => setShowCalExport(v => !v)}
            >
              📅 Add to Calendar
            </button>
          </div>
          {showCalExport && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#f5f3f0', borderRadius: 8, border: '1px solid #e0d9cf' }}>
              <p style={{ ...S.muted, fontSize: 12, marginBottom: 10 }}>
                Download a calendar file with all study blocks — correct dates, times, and titles.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <button
                  style={{ ...S.btn, ...S.sec, padding: "8px 14px", fontSize: 12 }}
                  onClick={() => downloadICSFile(plan, latestPlanMeta?.createdAt, profile.studyStartTime || '07:00', profile.studyEndTime || calcEndTime(profile.studyStartTime || '07:00', profile.hoursPerDay || 8))}
                >
                  🍎 Apple Calendar / Outlook (.ics)
                </button>
                <button
                  style={{ ...S.btn, ...S.sec, padding: "8px 14px", fontSize: 12 }}
                  onClick={() => downloadICSFile(plan, latestPlanMeta?.createdAt, profile.studyStartTime || '07:00', profile.studyEndTime || calcEndTime(profile.studyStartTime || '07:00', profile.hoursPerDay || 8))}
                >
                  📅 Google Calendar (.ics)
                </button>
              </div>
              <p style={{ ...S.muted, fontSize: 11, color: '#aaa', marginBottom: 0 }}>
                Google Calendar: after downloading, go to calendar.google.com → Settings → Import &amp; Export → Import.
              </p>
            </div>
          )}
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

      {/* Widget B — General feedback modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowFeedbackModal(false)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: '28px 28px 24px', maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1816', fontFamily: S.f }}>Share your feedback</div>
              <button onClick={() => setShowFeedbackModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa9a6', lineHeight: 1 }}>×</button>
            </div>

            {genFbkDone ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🙏</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: BRAND.green, fontFamily: S.f }}>Thank you for the feedback!</div>
                <div style={{ fontSize: 13, color: '#8a857e', fontFamily: S.f, marginTop: 6 }}>It genuinely helps us improve StepAdapt.</div>
                <button onClick={() => setShowFeedbackModal(false)} style={{ ...S.btn, ...S.pri, marginTop: 18, padding: '9px 24px' }}>Close</button>
              </div>
            ) : (
              <>
                {[
                  { key: 'working_well',       label: "What's working well?",     placeholder: "The daily structure is really clear…" },
                  { key: 'needs_improvement',  label: "What needs improvement?",  placeholder: "The content review videos aren't specific enough…" },
                  { key: 'other',              label: "Anything else?",           placeholder: "…" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6560', fontFamily: S.f, display: 'block', marginBottom: 5 }}>{label}</label>
                    <textarea value={genFbk[key]} onChange={e => setGenFbk(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder} rows={2}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e0dcd6', fontSize: 13, fontFamily: S.f, resize: 'vertical', background: '#fafaf8', outline: 'none', color: '#1a1816', boxSizing: 'border-box' }} />
                  </div>
                ))}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6560', fontFamily: S.f, marginBottom: 8 }}>How likely are you to recommend StepAdapt to a classmate?</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setGenFbk(p => ({ ...p, nps: n }))}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${genFbk.nps === n ? BRAND.green : '#e0dcd6'}`, background: genFbk.nps === n ? `${BRAND.green}18` : '#fff', fontSize: 13, fontWeight: genFbk.nps === n ? 700 : 500, color: genFbk.nps === n ? BRAND.green : '#4a4540', cursor: 'pointer' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={() => {
                  const { nps, working_well, needs_improvement, other } = genFbk;
                  submitFeedback({ feedback_type: 'general', rating: nps, responses: { working_well, needs_improvement, other } });
                  setGenFbkDone(true);
                }} style={{ ...S.btn, ...S.pri, width: '100%', padding: '11px', justifyContent: 'center', fontSize: 14 }}>Submit</button>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );

  return null;
}
