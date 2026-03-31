import { STEP1_CATEGORIES, HIGH_YIELD_WEIGHTS, RESOURCE_MAP, RESOURCES, SUB_TOPICS, PRACTICE_TESTS } from './data.js';

// ── Time-block helpers ────────────────────────────────────────────────

function parseMinutes(t) {
  // "07:00" → 420
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmt12(mins) {
  // 570 → "9:30 AM"
  const h24 = Math.floor(mins / 60) % 24;
  const mm = mins % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

export function assignBlockTimes(blocks, startTime = '07:00', endTime = '17:00') {
  const windowStart = parseMinutes(startTime);
  const windowEnd = parseMinutes(endTime);
  const windowMins = Math.max(1, windowEnd - windowStart);
  const midpoint = windowStart + Math.floor(windowMins / 2);

  // Total study minutes from block tasks
  const totalStudyMins = blocks.reduce((sum, b) => {
    return sum + b.tasks.reduce((s, t) => s + Math.round(t.hours * 60), 0);
  }, 0);

  const BREAK_INTERVAL = 120; // 15-min break every 2h of study
  const LUNCH_DURATION = 30;
  const SHORT_BREAK = 15;

  // Estimate total time including breaks
  const numShortBreaks = Math.max(0, Math.floor(totalStudyMins / BREAK_INTERVAL));
  // lunch replaces one break if window spans midpoint
  const needsLunch = windowMins >= 240;
  const estimatedTotal = totalStudyMins + numShortBreaks * SHORT_BREAK + (needsLunch ? LUNCH_DURATION : 0);

  // Scale blocks to fit window if they overflow
  const scale = estimatedTotal > windowMins ? (windowMins - (numShortBreaks * SHORT_BREAK + (needsLunch ? LUNCH_DURATION : 0))) / Math.max(1, totalStudyMins) : 1;

  let cursor = windowStart;
  let studyAccum = 0; // track study mins since last break
  let lunchInserted = false;
  const result = [];

  for (const block of blocks) {
    const blockMins = Math.round(block.tasks.reduce((s, t) => s + t.hours * 60, 0) * scale);

    // Check if we should insert lunch at midpoint before this block
    if (needsLunch && !lunchInserted && cursor + blockMins > midpoint) {
      const lunchStart = cursor;
      const lunchEnd = cursor + LUNCH_DURATION;
      result.push({ type: 'break', label: 'Lunch break', startTime: fmt12(lunchStart), endTime: fmt12(lunchEnd), durationMinutes: LUNCH_DURATION });
      cursor = lunchEnd;
      lunchInserted = true;
      studyAccum = 0;
    }

    // Check if we need a short break (every 2h of study)
    if (studyAccum >= BREAK_INTERVAL) {
      const brStart = cursor;
      const brEnd = cursor + SHORT_BREAK;
      result.push({ type: 'break', label: 'Short break', startTime: fmt12(brStart), endTime: fmt12(brEnd), durationMinutes: SHORT_BREAK });
      cursor = brEnd;
      studyAccum = 0;
    }

    const blockStart = cursor;
    const blockEnd = cursor + blockMins;
    result.push({ ...block, startTime: fmt12(blockStart), endTime: fmt12(blockEnd), durationMinutes: blockMins });
    cursor = blockEnd;
    studyAccum += blockMins;
  }

  return result;
}

export function findTodayInPlan(plan, planCreatedAt) {
  if (!plan || !planCreatedAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const created = new Date(planCreatedAt);
  created.setHours(0, 0, 0, 0);
  const dayOffset = Math.floor((today - created) / 86400000) + 1;

  for (const week of (plan.weeks || [])) {
    for (const day of (week.days || [])) {
      if (day.calendarDay === dayOffset) {
        return { day, week };
      }
    }
  }
  return null;
}

export function calcPlanProgress(plan, planCreatedAt, examDate) {
  if (!plan || !planCreatedAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const created = new Date(planCreatedAt);
  created.setHours(0, 0, 0, 0);
  const daysPassed = Math.floor((today - created) / 86400000);

  const totalDays = plan.totalCalendarDays || 0;
  const completedDays = Math.max(0, Math.min(daysPassed, totalDays));
  const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return { completedDays, totalDays, percent };
}

export function getTopSubTopics(category, count = 5) {
  const subs = SUB_TOPICS[category];
  if (!subs) return [];
  return [...subs].sort((a, b) => b.yield - a.yield).slice(0, count);
}

// ── Practice test scheduler ───────────────────────────────────────────
// Builds the optimal assessment sequence based on dedicated period length.
// takenAssessments = [{ id, takenDate? }] — tests done in this study period
// hasExistingScores = true if the student already has NBME data in the app

export function scheduleAssessments(profile, totalCalendarDays, hasExistingScores = false) {
  const takenList = profile.takenAssessments || [];
  const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
  const now = new Date();

  // "Recently taken" = no date given (assume recent) OR within last 6 weeks
  const recentlyTaken = new Set(
    takenList
      .filter(t => !t.takenDate || (now - new Date(t.takenDate)) < SIX_WEEKS_MS)
      .map(t => t.id)
  );
  const everTaken = new Set(takenList.map(t => t.id));

  // canUse: not taken within 6 weeks (may reuse older forms if taken >6 weeks ago)
  const canUse = (id) => !recentlyTaken.has(id);

  const BLACKOUT = 2; // last N days: no full-length exams
  const lastDay = totalCalendarDays - BLACKOUT;
  if (lastDay < 3) return [];

  // ── NBME form pools by role ─────────────────────────────────────────
  // Baseline: prefer older forms (26-28) — diagnostic, score doesn't need to be high
  // Midpoint: mid-range (29-31) — more predictive at this stage
  // Late/final: newest forms (32-33) — closest to current exam difficulty
  const nbmeByTier = {
    baseline: PRACTICE_TESTS.filter(t => t.type === 'nbme' && t.number <= 28 && canUse(t.id)).sort((a, b) => a.number - b.number),
    mid:      PRACTICE_TESTS.filter(t => t.type === 'nbme' && t.number >= 29 && t.number <= 31 && canUse(t.id)).sort((a, b) => a.number - b.number),
    late:     PRACTICE_TESTS.filter(t => t.type === 'nbme' && t.number >= 32 && canUse(t.id)).sort((a, b) => b.number - a.number),
    any:      PRACTICE_TESTS.filter(t => t.type === 'nbme' && canUse(t.id)).sort((a, b) => a.number - b.number),
  };

  const uwsa1 = canUse('uwsa1') ? PRACTICE_TESTS.find(t => t.id === 'uwsa1') : null;
  const uwsa2 = canUse('uwsa2') ? PRACTICE_TESTS.find(t => t.id === 'uwsa2') : null;
  // Prefer 2024 Free 120 over old; fall back if needed
  const free120 = (canUse('free120new') ? PRACTICE_TESTS.find(t => t.id === 'free120new') : null)
                || (canUse('free120old') ? PRACTICE_TESTS.find(t => t.id === 'free120old') : null);
  const amboss  = canUse('amboss') ? PRACTICE_TESTS.find(t => t.id === 'amboss') : null;

  const hasBaseline = hasExistingScores || everTaken.size > 0;

  // ── Slot management ──────────────────────────────────────────────────
  const result = [];
  const claimed = new Set(); // exam day + triage day+1
  const usedForms = new Set();

  const claimDay = (day) => { claimed.add(day); claimed.add(day + 1); };

  const isFree = (day, buf = 2) => {
    if (day < 1 || day > lastDay) return false;
    for (let d = day - buf; d <= day + buf; d++) if (claimed.has(d)) return false;
    return true;
  };

  const findFree = (preferred, buf = 2) => {
    const p = Math.max(1, Math.min(preferred, lastDay));
    if (isFree(p, buf)) return p;
    for (let delta = 1; delta <= 8; delta++) {
      if (p + delta <= lastDay && isFree(p + delta, buf)) return p + delta;
      if (p - delta >= 1    && isFree(p - delta, buf)) return p - delta;
    }
    return null;
  };

  const place = (day, test, label, reason, reviewHours, flags = {}) => {
    result.push({ day, test, label, reason, reviewHours, ...flags });
    claimDay(day);
    if (test.type === 'nbme') usedForms.add(test.id);
  };

  // Pick next unused NBME from a prioritised pool list
  const pickNbme = (...pools) => {
    for (const pool of pools) {
      const t = pool.find(t => !usedForms.has(t.id));
      if (t) return t;
    }
    return null;
  };

  // ── Tier-based scheduling ─────────────────────────────────────────────
  const tier = totalCalendarDays >= 56 ? '8w'
    : totalCalendarDays >= 35 ? '5w'
    : totalCalendarDays >= 21 ? '3w'
    : '2w';

  // ── Special fixed-position tests (placed first to anchor the timeline) ──

  // UWSA2: 7-10 days before exam (not for 2-week tier)
  let uwsa2Day = null;
  if (uwsa2 && tier !== '2w' && lastDay >= 8) {
    const target = tier === '3w'
      ? totalCalendarDays - 8   // tighter window for 3-4 weeks
      : totalCalendarDays - 8;  // 7-10 days: target 8
    uwsa2Day = findFree(Math.max(1, target), 2);
    if (uwsa2Day) {
      place(uwsa2Day, uwsa2, 'Score predictor',
        'UWSA 2 is the strongest single predictor of your actual Step 1 score. Students typically land within 3–5 points of this number. Take it under full exam conditions — 280 questions, timed, no interruptions. The score you see here is approximately where you\'ll score on exam day.',
        2.5, { predictorNote: true });
    }
  }

  // Free 120: 3-5 days before exam
  let free120Day = null;
  if (free120 && lastDay >= 3) {
    const target = tier === '2w' ? totalCalendarDays - 4 : totalCalendarDays - 4;
    free120Day = findFree(Math.max(1, target), 1);
    if (free120Day) {
      place(free120Day, free120, 'Style calibrator',
        `The ${free120.name} is free official USMLE content — the closest format match to the real exam. This close to exam day, focus on timing and composure rather than score. Review every wrong answer to catch any final blind spots, but don\'t cram new content.`,
        1.5);
    }
  }

  // UWSA1: midpoint (skip for 3-week and 2-week tiers)
  let uwsa1Day = null;
  if (uwsa1 && (tier === '8w' || tier === '5w')) {
    const target = Math.floor(totalCalendarDays / 2);
    uwsa1Day = findFree(target, 3);
    if (uwsa1Day) {
      place(uwsa1Day, uwsa1, 'Midpoint learning tool',
        'UWSA 1 at the halfway point shows how far you\'ve come — and where you still need work. Critical caveat: UWSA 1 consistently overpredicts by 10–25 points. A score of 245 here often translates to 220–235 on exam day. Don\'t get complacent if the number looks high. Use this to identify which systems are still dragging your score down.',
        2.0, { overpredictWarning: 'This exam typically overpredicts by 10–25 points. Use it for learning, not as your score prediction.' });
    }
  }

  // ── Baseline check (day 1-3) ────────────────────────────────────────
  if (!hasBaseline) {
    const baseNbme = pickNbme(nbmeByTier.baseline, nbmeByTier.any);
    if (baseNbme) {
      const baseDay = findFree(tier === '3w' ? Math.min(2, lastDay - 10) : 2, 1);
      if (baseDay) {
        place(baseDay, baseNbme, 'Baseline diagnostic',
          `Your first NBME before dedicated study truly kicks in. Most students feel underprepared at this stage — that's expected and irrelevant. The score right now doesn't define where you'll land. What matters is which systems are dragging you down. That breakdown becomes the blueprint for everything that follows.`,
          2.0);
      }
    }
  }

  // ── AMBOSS substitute: midpoint for 2-week tier or when UWSA1 unavailable ──
  if (!uwsa1 && amboss && tier !== '3w' && tier !== '2w') {
    const target = Math.floor(totalCalendarDays / 2);
    const ambossDay = findFree(target, 3);
    if (ambossDay) {
      place(ambossDay, amboss, 'Midpoint check (AMBOSS)',
        'AMBOSS SA runs harder than the real exam intentionally — students typically score 5–15 points lower than their actual Step 1 result. Use it as a high-fidelity stress test to find remaining gaps. If you can answer AMBOSS questions cleanly, you\'re in excellent shape.',
        2.0);
    }
  }

  if (tier === '2w' && !free120 && amboss) {
    const ambossDay = findFree(Math.floor(totalCalendarDays / 2), 2);
    if (ambossDay) {
      place(ambossDay, amboss, 'Midpoint check (AMBOSS)',
        'With limited time, AMBOSS SA serves as your midpoint stress-test. It runs harder than the real exam — use it to find gaps, not predict your score.',
        2.0);
    }
  }

  // ── Progress checks: fill intervals with NBME forms ──────────────────
  const interval = tier === '8w' ? 12   // 10-14 days
    : tier === '5w' ? 11                 // 10-12 days
    : tier === '3w' ? 11                 // ~11 days (just 1 midpoint check)
    : 0;                                 // 2-week: no interval fills

  if (interval > 0) {
    const baseItem = result.find(r => r.label === 'Baseline diagnostic');
    let cursor = baseItem ? baseItem.day + interval : interval;

    // Pool order: mid-range forms for early progress, late forms for final stretch
    const progressPool = [
      ...nbmeByTier.mid.filter(t => !usedForms.has(t.id)),
      ...nbmeByTier.baseline.filter(t => !usedForms.has(t.id)),
      ...nbmeByTier.late.filter(t => !usedForms.has(t.id)),
    ];

    // Target count: 8w → up to 5-6 total, 5w → 4 total, 3w → just 1 midpoint
    const maxProgress = tier === '8w' ? 4 : tier === '5w' ? 2 : 1;
    let progressCount = 0;

    for (const nbme of progressPool) {
      if (progressCount >= maxProgress) break;
      if (cursor > lastDay - 8) break;

      const slot = findFree(cursor, 3);
      if (!slot || slot > lastDay - 8) break;

      const isNewest = nbme.number >= 32;
      place(slot, nbme, `Progress check #${progressCount + 1}`,
        isNewest
          ? `NBME ${nbme.number} is one of the newest forms — it mirrors current exam difficulty most closely. Your score here is a reliable performance signal in the final stretch.`
          : `NBME ${nbme.number} — check whether your weak areas are actually improving. The total score matters less than whether the systems that were dragging you down are now moving up.`,
        2.0);

      cursor = slot + interval;
      progressCount++;
    }
  }

  result.sort((a, b) => a.day - b.day);
  return result;
}

export function generateFirstTimerPlan(profile, weakSystems = [], uworldPct = null) {
  // Derive a baseline score from UWorld% or default to 55
  const baseline = (uworldPct != null && uworldPct !== '' && !isNaN(Number(uworldPct)))
    ? Math.max(20, Math.min(80, Number(uworldPct)))
    : 55;

  // Build synthetic scores: weak systems 20 pts below baseline, others 5 pts above
  const scores = {};
  for (const cat of STEP1_CATEGORIES) {
    const isWeak = weakSystems.includes(cat);
    scores[cat] = isWeak ? Math.max(15, baseline - 20) : Math.min(75, baseline + 5);
  }

  // Weak systems are flagged sticking points; first-timers are mostly in knowledge-gap mode
  const stickingPoints = [...weakSystems];
  const gapTypes = {};
  for (const cat of STEP1_CATEGORIES) {
    gapTypes[cat] = weakSystems.includes(cat) ? 'knowledge' : 'application';
  }

  // hasExistingScores: false → scheduleAssessments will place a baseline NBME at day 1-3
  const plan = generatePlan(profile, scores, stickingPoints, gapTypes, { hasExistingScores: false });
  return { ...plan, firstTimer: true };
}

export function getPerformanceLevel(score) {
  if (score <= 25) return { label: "Needs attention", color: "#c0392b" };
  if (score <= 50) return { label: "Below average", color: "#e67e22" };
  if (score <= 75) return { label: "Average", color: "#2980b9" };
  return { label: "Strong", color: "#27ae60" };
}

export function generatePlan(profile, scores, stickingPoints, gapTypes, options = {}) {
  const weights = HIGH_YIELD_WEIGHTS;
  const totalCalendarDays = Math.max(1, Math.round((new Date(profile.examDate) - new Date()) / 86400000));
  const hrs = profile.hoursPerDay || 8;

  let priorities = [];
  for (const cat of STEP1_CATEGORIES) {
    const score = scores[cat] ?? 50;
    const weakness = Math.max(0, 100 - score);
    const yld = weights[cat] || 5;
    const flagged = stickingPoints.includes(cat);
    const compositeScore = (weakness * 0.4) + (yld * 8 * 0.35) + (flagged ? 25 : 0);
    priorities.push({ category: cat, score, weakness, yield: yld, flagged, compositeScore, gapType: gapTypes[cat] || "application" });
  }
  priorities.sort((a, b) => b.compositeScore - a.compositeScore);

  let timelineMode, contentRampDays;
  if (totalCalendarDays >= 42) { timelineMode = "full"; contentRampDays = 5; }
  else if (totalCalendarDays >= 21) { timelineMode = "standard"; contentRampDays = 2; }
  else if (totalCalendarDays >= 10) { timelineMode = "compressed"; contentRampDays = 0; }
  else { timelineMode = "triage"; contentRampDays = 0; }

  // ── Assessment scheduler (replaces simple nbmeInterval logic) ────────
  const hasExistingScores = options.hasExistingScores ?? Object.keys(scores).length > 0;
  const assessmentSchedule = scheduleAssessments(profile, totalCalendarDays, hasExistingScores);
  const assessmentDayMap = new Map(assessmentSchedule.map(a => [a.day, a]));
  // triage days = day after each assessment (unless that day is also an assessment day)
  const triageDayMap = new Map(
    assessmentSchedule
      .filter(a => !assessmentDayMap.has(a.day + 1))
      .map(a => [a.day + 1, a])
  );

  // Build day schedule using assessment schedule as the source of truth for exam days
  let daySchedule = [];
  for (let d = 0; d < totalCalendarDays; d++) {
    const calendarDay = d + 1;
    const isLastDay = d === totalCalendarDays - 1;
    if (isLastDay) {
      daySchedule.push({ calendarDay, type: "rest" });
    } else if (assessmentDayMap.has(calendarDay)) {
      daySchedule.push({ calendarDay, type: "nbme", assessItem: assessmentDayMap.get(calendarDay) });
    } else if (triageDayMap.has(calendarDay)) {
      daySchedule.push({ calendarDay, type: "triage", prevAssessItem: triageDayMap.get(calendarDay) });
    } else if (d > 6 && (d + 1) % 7 === 0 && timelineMode !== "triage") {
      daySchedule.push({ calendarDay, type: "light" });
    } else {
      daySchedule.push({ calendarDay, type: "study" });
    }
  }

  const getRes = (cat) => {
    const pool = RESOURCE_MAP[cat] || { learning: ["firstaid"], practice: ["uworld"] };
    return { learning: pool.learning?.filter(r => profile.resources.includes(r)) || [], practice: pool.practice?.filter(r => profile.resources.includes(r)) || [] };
  };
  const rn = (id) => RESOURCES.find(r => r.id === id)?.name || id;
  const hasAnki = profile.resources.includes("anking");

  const topPriorities = priorities.filter(p => p.flagged || p.score <= 50);
  const midPriorities = priorities.filter(p => !p.flagged && p.score > 50 && p.score <= 70);

  const qBlockSize = 40;
  const ankiHrs = Math.min(1, Math.round(hrs * 0.12 * 10) / 10);

  let focusCursor = 0, maintCursor = 0, studyDayNum = 0;
  let weeks = [];
  let currentWeek = { week: 1, days: [], phase: "", focusTopics: [] };

  for (let d = 0; d < daySchedule.length; d++) {
    const sched = daySchedule[d];
    const weekNum = Math.floor(d / 7) + 1;
    if (weekNum !== currentWeek.week) {
      if (currentWeek.days.length > 0) weeks.push(currentWeek);
      currentWeek = { week: weekNum, days: [], phase: "", focusTopics: [] };
    }

    // ── Assessment day ─────────────────────────────────────────────────
    if (sched.type === "nbme") {
      const ai = sched.assessItem;
      const testName = ai?.test?.name || 'Practice Assessment';
      const reviewHrs = ai?.reviewHours || 2.0;
      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "nbme",
        assessmentLabel: ai?.label, assessmentReason: ai?.reason,
        assessmentTest: ai?.test, overpredictWarning: ai?.overpredictWarning,
        predictorNote: ai?.predictorNote,
        blocks: [{ type: "nbme", label: testName, tasks: [
          { resource: testName, activity: 'Full-length exam — timed, test-day conditions, no interruptions', hours: 4 },
          { resource: 'Self-review', activity: 'Thorough review of every wrong answer — understand the concept, annotate patterns, make cards for missed topics', hours: reviewHrs },
        ]}],
      });
      continue;
    }

    // ── Triage day (day after each assessment) ─────────────────────────
    if (sched.type === "triage") {
      const ai = sched.prevAssessItem;
      const testName = ai?.test?.name || 'assessment';
      const focusForTriage = priorities[0];
      const trRes = focusForTriage ? getRes(focusForTriage.category) : { learning: [], practice: [] };
      const trQBank = trRes.practice.length > 0 ? rn(trRes.practice[0]) : 'Question bank';
      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "triage", triageFor: testName,
        blocks: [
          { type: "anki", label: "Morning retention", tasks: [
            { resource: hasAnki ? "AnKing Deck" : "Flashcards", activity: "All due reviews — essential after an assessment day", hours: ankiHrs },
          ]},
          { type: "catchup", label: `${testName} — complete debrief`, tasks: [
            { resource: "Self-review", activity: `Work through every wrong answer from ${testName}. Don't just read the explanation — understand the underlying concept and why each wrong answer is wrong.`, hours: 2.0 },
          ]},
          { type: "questions-focus", label: `Rapid response: top revealed weakness`, tasks: [
            { resource: trQBank, activity: `40 Qs on ${focusForTriage?.category || 'your highest-yield gap'} — attack the system ${testName} exposed most`, hours: 1.0 },
            { resource: "Self-review", activity: "Review all explanations — connect today's questions to yesterday's gaps", hours: 1.0 },
          ]},
        ],
        totalQuestions: qBlockSize,
      });
      continue;
    }

    // ── Rest day ────────────────────────────────────────────────────────
    if (sched.type === "rest") {
      currentWeek.days.push({ calendarDay: sched.calendarDay, dayType: "rest", blocks: [
        { type: "rest", label: "Pre-exam rest", tasks: [
          { resource: hasAnki ? "AnKing Deck" : "Light review", activity: "Light Anki only — protect sleep and mental energy", hours: 0.5 },
        ]}
      ] });
      continue;
    }

    // ── Study / light day ───────────────────────────────────────────────
    studyDayNum++;
    const isLight = sched.type === "light";
    const isRamp = studyDayNum <= contentRampDays;
    const availHrs = isLight ? Math.round(hrs * 0.6 * 10) / 10 : hrs;

    const focusTopic = topPriorities.length > 0 ? topPriorities[focusCursor % topPriorities.length]
      : midPriorities.length > 0 ? midPriorities[focusCursor % midPriorities.length] : priorities[0];
    const secondFocus = topPriorities.length > 1 ? topPriorities[(focusCursor + 1) % topPriorities.length]
      : midPriorities.length > 0 ? midPriorities[maintCursor % midPriorities.length] : null;

    const focusCats = [focusTopic?.category, secondFocus?.category].filter(Boolean);
    const maintPool = priorities.filter(p => !focusCats.includes(p.category));
    const maint1 = maintPool[maintCursor % Math.max(1, maintPool.length)];
    const maint2 = maintPool[(maintCursor + 1) % Math.max(1, maintPool.length)];
    if (studyDayNum % 2 === 0) focusCursor++;
    maintCursor += 2;

    let blocks = [];
    const res1 = focusTopic ? getRes(focusTopic.category) : { learning: [], practice: [] };
    const primaryQBank = res1.practice.length > 0 ? rn(res1.practice[0]) : "Question bank";

    blocks.push({ type: "anki", label: "Morning retention", tasks: [
      { resource: hasAnki ? "AnKing Deck" : "Flashcards", activity: "All due reviews — do these first, every day", hours: ankiHrs }
    ] });

    if (isRamp && focusTopic) {
      const learnRes = res1.learning.length > 0 ? rn(res1.learning[0]) : "First Aid";
      const contentH = Math.round((availHrs - ankiHrs) * 0.45 * 10) / 10;
      const qH = Math.round((availHrs - ankiHrs) * 0.40 * 10) / 10;
      const revH = Math.round((availHrs - ankiHrs) * 0.15 * 10) / 10;
      const rampSubs = getTopSubTopics(focusTopic.category, 3);
      const rampHint = rampSubs.length > 0 ? ` — prioritize: ${rampSubs.slice(0, 2).map(s => s.topic.split("(")[0].trim()).join(", ")}` : "";
      blocks.push({ type: "content", label: `Content foundation: ${focusTopic.category}`, highYield: rampSubs, tasks: [
        { resource: learnRes, activity: `Core concepts — build the framework before questions${rampHint}`, hours: contentH }
      ] });
      blocks.push({ type: "questions", label: `Targeted questions: ${focusTopic.category}`, tasks: [
        { resource: primaryQBank, activity: `${qBlockSize} system-specific questions (tutor mode OK in ramp)`, hours: qH },
        { resource: "Self-review", activity: "Review every question — right AND wrong — note gaps", hours: revH },
      ] });
    } else if (isLight) {
      const qH = Math.round((availHrs - ankiHrs) * 0.6 * 10) / 10;
      const catchH = Math.round((availHrs - ankiHrs) * 0.4 * 10) / 10;
      blocks.push({ type: "questions", label: "Mixed review questions", tasks: [
        { resource: primaryQBank, activity: `${qBlockSize} random/mixed questions across all systems`, hours: qH }
      ] });
      blocks.push({ type: "catchup", label: "Catch-up + flagged review", tasks: [
        { resource: "Self-review", activity: "Revisit flagged questions from the week", hours: catchH }
      ] });
    } else {
      const hrsAfterAnki = availHrs - ankiHrs;
      const focusBlockHrs = 2.5;
      const randomBlockHrs = 1.75;
      const hrsAfterFocus = hrsAfterAnki - focusBlockHrs;
      const randomBlockCount = Math.max(0, Math.min(Math.floor(hrsAfterFocus / randomBlockHrs), 4));
      const qBudget = focusBlockHrs + (randomBlockCount * randomBlockHrs);
      const remainingHrs = Math.max(0, Math.round((hrsAfterAnki - qBudget) * 10) / 10);

      const focusSubTopics = focusTopic ? getTopSubTopics(focusTopic.category, 3) : [];
      blocks.push({ type: "questions-focus", label: `Focus block: ${focusTopic?.category || "Weak area"}`, highYield: focusSubTopics, tasks: [
        { resource: primaryQBank, activity: `${qBlockSize} Qs — ${focusTopic?.category} only (timed, test mode)`, hours: 1.0 },
        { resource: "Self-review", activity: "Thorough review of every Q — annotate wrong answers, make cards", hours: 1.5 },
      ] });

      for (let rb = 0; rb < randomBlockCount; rb++) {
        const blockLabel = randomBlockCount === 1 ? "Random block: all systems" : `Random block ${rb + 1} of ${randomBlockCount}: all systems`;
        blocks.push({ type: "questions-random", label: blockLabel, tasks: [
          { resource: primaryQBank, activity: rb === 0 ? `${qBlockSize} Qs — RANDOM, all systems, timed` : `${qBlockSize} Qs — RANDOM, all systems, timed (build stamina)`, hours: 1.0 },
          { resource: "Self-review", activity: rb === 0 ? "Focused review — every wrong Q fully, right Qs skim." : "Efficient review — wrong answers only.", hours: 0.8 },
        ] });
      }

      if (remainingHrs >= 0.5) {
        const isKG = focusTopic?.gapType === "knowledge";
        const learnRes = isKG && res1.learning.length > 0 ? rn(res1.learning[0]) : "First Aid + notes";
        const topSubs = focusTopic ? getTopSubTopics(focusTopic.category, 2).map(s => s.topic.split("(")[0].trim()) : [];
        const subHint = topSubs.length > 0 ? ` (especially ${topSubs.join(" and ")})` : "";
        blocks.push({ type: "content-reactive", label: isKG ? `Targeted review: ${focusTopic.category}` : "Missed concept review", tasks: [
          { resource: learnRes, activity: isKG ? `Review concepts missed in today's Qs${subHint}` : `Look up missed concepts from today's Qs — make Anki cards${subHint}`, hours: remainingHrs },
        ] });
      }
    }

    if (focusTopic && !currentWeek.focusTopics.includes(focusTopic.category)) currentWeek.focusTopics.push(focusTopic.category);
    currentWeek.days.push({
      calendarDay: sched.calendarDay, dayType: sched.type, focusTopic: focusTopic?.category,
      focusGapType: focusTopic?.gapType, maintainTopics: [maint1, maint2].filter(Boolean).map(t => t.category),
      blocks, totalQuestions: blocks.reduce((sum, b) => sum + (b.type.includes("questions") ? qBlockSize : 0), 0),
    });
  }
  if (currentWeek.days.length > 0) weeks.push(currentWeek);

  const totalWeeks = weeks.length;
  weeks.forEach((w, i) => {
    if (i === 0 && contentRampDays > 0) w.phase = "Foundation — build base, ramp into questions";
    else if (i < Math.ceil(totalWeeks * 0.55)) w.phase = "Build — question-heavy, attack weak + high-yield";
    else if (i < Math.ceil(totalWeeks * 0.8)) w.phase = "Strengthen — broad coverage, refine weak spots";
    else w.phase = "Sharpen — simulate test conditions, full blocks";
  });

  const totalStudyDays = daySchedule.filter(d => ["study", "light", "triage"].includes(d.type)).length;
  const totalQEstimate = totalStudyDays * (1 + Math.max(0, Math.min(Math.floor(((hrs - ankiHrs) - 2.5) / 1.75), 4))) * qBlockSize;
  const nbmeDays = assessmentSchedule.length;

  return { priorities, weeks, totalCalendarDays, totalWeeks, totalStudyDays, totalQEstimate, nbmeDays, topPriorities, midPriorities, timelineMode, contentRampDays, assessmentSchedule };
}
