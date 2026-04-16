import { STEP1_CATEGORIES, STEP1_DISCIPLINE_CATEGORIES, HIGH_YIELD_WEIGHTS, RESOURCE_MAP, RESOURCES, SUB_TOPICS, PRACTICE_TESTS, DISCIPLINE_ATTACK_STRATEGIES } from './data.js';
import { getContentSequence } from './contentEngine.js';

// ── Time-block helpers ────────────────────────────────────────────────

function parseMinutes(t) {
  // "07:00" → 420
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmt12(mins) {
  // Snap to nearest 15-min mark, then format as 12-hr time
  const snapped = Math.round(mins / 15) * 15;
  const h24 = Math.floor(snapped / 60) % 24;
  const mm = snapped % 60;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

// Round hours to nearest 15-minute increment (e.g. 1.1 → 1.0, 1.2 → 1.25)
export function roundToQuarterHour(hours) {
  return Math.round(hours * 4) / 4;
}

// Format a duration in hours as "X hr Y min", never as a decimal
export function formatDuration(hours) {
  hours = roundToQuarterHour(hours || 0);
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return m + ' min';
  if (m === 0) return h + ' hr';
  return h + ' hr ' + m + ' min';
}

export function assignBlockTimes(blocks, startTime = '07:00', endTime = '17:00') {
  const windowStart = parseMinutes(startTime);
  const windowEnd = parseMinutes(endTime);
  const windowMins = Math.max(1, windowEnd - windowStart);
  const midpoint = windowStart + Math.floor(windowMins / 2);

  // If blocks already contain an explicit lunch block, skip auto-insertion
  const hasExplicitLunch = blocks.some(b => b.type === 'lunch');

  // Compute study minutes — exclude fixed lunch blocks from scaling
  const totalStudyMins = blocks.reduce((sum, b) => {
    if (b.type === 'lunch') return sum;
    return sum + b.tasks.reduce((s, t) => s + Math.round(t.hours * 60), 0);
  }, 0);
  const explicitLunchMins = hasExplicitLunch
    ? (blocks.find(b => b.type === 'lunch')?.tasks.reduce((s, t) => s + Math.round(t.hours * 60), 0) || 0)
    : 0;

  const BREAK_INTERVAL = 120; // 15-min break every 2h of study
  const LUNCH_DURATION = 30;
  const SHORT_BREAK = 15;

  const numShortBreaks = Math.max(0, Math.floor(totalStudyMins / BREAK_INTERVAL));
  const needsAutoLunch = windowMins >= 240 && !hasExplicitLunch;
  const estimatedTotal = totalStudyMins + numShortBreaks * SHORT_BREAK
    + (needsAutoLunch ? LUNCH_DURATION : 0) + explicitLunchMins;

  // Scale study blocks to fit window (lunch duration excluded from scaling)
  const scale = estimatedTotal > windowMins
    ? (windowMins - numShortBreaks * SHORT_BREAK - (needsAutoLunch ? LUNCH_DURATION : 0) - explicitLunchMins)
      / Math.max(1, totalStudyMins)
    : 1;

  let cursor = windowStart;
  let studyAccum = 0;
  let lunchInserted = false;
  const result = [];

  for (const block of blocks) {
    // Explicit lunch block — fixed duration, not scaled, resets break counter
    if (block.type === 'lunch') {
      const lunchMins = Math.round(block.tasks.reduce((s, t) => s + t.hours * 60, 0) / 15) * 15;
      result.push({ ...block, startTime: fmt12(cursor), endTime: fmt12(cursor + lunchMins), durationMinutes: lunchMins });
      cursor += lunchMins;
      studyAccum = 0;
      lunchInserted = true;
      continue;
    }

    const blockMins = Math.round(Math.round(block.tasks.reduce((s, t) => s + t.hours * 60, 0) * scale) / 15) * 15;

    // Auto-insert lunch at midpoint (only when no explicit lunch block present)
    if (needsAutoLunch && !lunchInserted && cursor + blockMins > midpoint) {
      const lunchStart = cursor;
      const lunchEnd = cursor + LUNCH_DURATION;
      result.push({ type: 'break', label: 'Lunch break', startTime: fmt12(lunchStart), endTime: fmt12(lunchEnd), durationMinutes: LUNCH_DURATION });
      cursor = lunchEnd;
      lunchInserted = true;
      studyAccum = 0;
    }

    // Short break every 2h of study
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

export function getTopSubTopics(category, count = 5, subTopicProgress = {}) {
  const subs = SUB_TOPICS[category];
  if (!subs) return [];
  // Improving sub-topics are de-prioritized to the bottom — struggling/untouched stay at top
  return [...subs].sort((a, b) => {
    const aImproving = subTopicProgress[a.topic] === 'improving';
    const bImproving = subTopicProgress[b.topic] === 'improving';
    if (aImproving !== bImproving) return aImproving ? 1 : -1;
    return b.yield - a.yield;
  }).slice(0, count);
}

// ── QBank-specific filter tip ─────────────────────────────────────────────
// Generates actionable filter guidance based on which QBank the student uses
// and whether any top sub-topics cross into pharmacology territory.
const PHARM_SUB_KEYWORDS = ['pharmacol', 'drug', 'antiarrhythm', 'antihyperten', 'diuretic', 'antimicrobial', 'antibiotic', 'anticoagul', 'anticancer', 'antiepileptic'];

export function getQbankFilterTip(primaryQBank, category, topSubTopics) {
  if (!primaryQBank || primaryQBank === 'Question bank') return null;
  const qb = primaryQBank.toLowerCase();
  const isUworld = qb.includes('uworld');
  const isAmboss = qb.includes('amboss');

  const pharmSubs = (topSubTopics || []).filter(st =>
    PHARM_SUB_KEYWORDS.some(kw => st.topic.toLowerCase().includes(kw))
  );
  const hasCrossPharm = pharmSubs.length > 0 && category !== 'Pharmacology';

  if (isUworld) {
    return hasCrossPharm
      ? `UWorld filter: System → "${category}". For the drug sub-topics, also run a separate Pharmacology filter session to isolate those Qs.`
      : `UWorld filter: System → "${category}" to focus all 40 Qs on this system.`;
  }
  if (isAmboss) {
    return hasCrossPharm
      ? `Amboss filter: Subjects → "${category}". For drug sub-topics, add Pharmacology as a second subject to target those Qs.`
      : `Amboss filter: Subjects → "${category}" to focus all Qs on this system.`;
  }
  return `Filter your QBank to "${category}" if sub-filtering is available — this focuses every question on your weak system.`;
}

// ── Practice test scheduler ───────────────────────────────────────────
// Selects which NBME form to schedule next based on dedicated period length.
// Newer forms (30-33) are more representative of current Step 1 content.
// Short dedicated periods prioritize newer forms; long dedicated starts older and ends newer.
//
// availableNBMEs: filtered PRACTICE_TESTS objects (untaken, not yet placed this run)
// daysRemaining:  total calendar days in the dedicated period
// isLastSlot:     true if this is the final NBME slot in the schedule
function selectNextNBME(availableNBMEs, daysRemaining, isLastSlot) {
  const sorted = [...availableNBMEs].sort((a, b) => a.number - b.number);
  const newerForms = sorted.filter(f => f.number >= 30); // NBME 30-33: most representative
  const olderForms = sorted.filter(f => f.number < 30);  // NBME 26-29: older content

  if (daysRemaining <= 21) {
    // SHORT dedicated (≤3 weeks): only newer forms; skip older entirely unless all newer taken.
    // Final slot → highest numbered newer form available (most predictive).
    if (isLastSlot) {
      return newerForms.length > 0 ? newerForms[newerForms.length - 1]
           : olderForms.length > 0 ? olderForms[olderForms.length - 1] : null;
    }
    return newerForms.length > 0 ? newerForms[0]
         : olderForms.length > 0 ? olderForms[0] : null;

  } else if (daysRemaining <= 42) {
    // MEDIUM dedicated (3-6 weeks): newer forms first; once only 1 newer form remains,
    // switch to older forms (preserving the highest newer for the final slot).
    if (isLastSlot) return sorted[sorted.length - 1] || null;
    if (newerForms.length > 1) return newerForms[0]; // use lowest newer, save highest
    if (olderForms.length > 0) return olderForms[0]; // fill with older when few newer left
    return sorted[0] || null;

  } else {
    // LONG dedicated (6+ weeks): older forms early, newer forms late.
    // Gives the most representative data closest to exam day.
    if (isLastSlot) return sorted[sorted.length - 1] || null;
    return olderForms.length > 0 ? olderForms[0]
         : newerForms.length > 0 ? newerForms[0] : null;
  }
}

// Builds the optimal assessment sequence based on dedicated period length.
// takenAssessments = [{ id, takenDate? }] — tests done in this study period
// hasExistingScores = true if the student already has NBME data in the app
//
// SCHEDULING RULES:
// 1. Exhaust ALL 8 NBME forms (26-33) before recommending UWSA1, UWSA2, or AMBOSS.
// 2. Free 120 (2024) is MANDATORY exactly 2 days before exam — locked, non-moveable.
// 3. Final NBME = highest numbered form per selectNextNBME tier logic.
// 4. Buffer: no other assessment within 3 days of Free 120 (→ last NBME ≤ T-5).

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
  // canUse: not taken within 6 weeks (older forms may be reused)
  const canUse = (id) => !recentlyTaken.has(id);

  // ── Fixed timeline anchors ──────────────────────────────────────────
  const FREE120_DAY = totalCalendarDays - 2;       // ALWAYS exactly 2 days before exam
  const LAST_ASSESSMENT_DAY = totalCalendarDays - 5; // 3-day buffer before Free 120
  if (FREE120_DAY < 1) return []; // exam in ≤2 days — nothing can fit

  // ── NBME priority gate ─────────────────────────────────────────────
  // ALL 8 NBME forms must be exhausted before UWSA/AMBOSS are offered.
  const ALL_NBME_IDS = ['nbme26','nbme27','nbme28','nbme29','nbme30','nbme31','nbme32','nbme33'];
  const allNBMEsDone = ALL_NBME_IDS.every(id => everTaken.has(id));

  // Untaken NBMEs available for scheduling (ascending order = lowest first)
  const untakenNBMEs = ALL_NBME_IDS
    .filter(id => canUse(id))
    .map(id => PRACTICE_TESTS.find(t => t.id === id))
    .filter(Boolean); // already in ascending order — ALL_NBME_IDS is sorted 26→33

  // UWSA/AMBOSS: only unlocked once every NBME 26-33 has been taken (ever)
  const uwsa1 = (allNBMEsDone && canUse('uwsa1')) ? PRACTICE_TESTS.find(t => t.id === 'uwsa1') : null;
  const uwsa2 = (allNBMEsDone && canUse('uwsa2')) ? PRACTICE_TESTS.find(t => t.id === 'uwsa2') : null;
  const amboss = (allNBMEsDone && canUse('amboss')) ? PRACTICE_TESTS.find(t => t.id === 'amboss') : null;

  // Free 120: always placed regardless of prior history; prefer 2024 version
  const free120 = PRACTICE_TESTS.find(t => t.id === 'free120new')
               || PRACTICE_TESTS.find(t => t.id === 'free120old');
  const free120IsRetake = everTaken.has('free120new') || everTaken.has('free120old');

  const hasBaseline = hasExistingScores || everTaken.size > 0;

  // ── Slot management ────────────────────────────────────────────────
  const result = [];
  const claimed = new Set();
  const usedForms = new Set();

  // Pre-claim fixed positions. Buffer around Free 120 is enforced by the buf
  // parameter in isFree() — no need to pre-claim interior days (would break short plans).
  claimed.add(totalCalendarDays);     // exam day
  claimed.add(totalCalendarDays - 1); // pre-exam rest

  const claimDay = (day) => { claimed.add(day); claimed.add(day + 1); };

  // isFree: available for a non-Free-120 assessment (must be ≤ LAST_ASSESSMENT_DAY)
  const isFree = (day, buf = 2) => {
    if (day < 1 || day > LAST_ASSESSMENT_DAY) return false;
    for (let d = day - buf; d <= day + buf; d++) if (claimed.has(d)) return false;
    return true;
  };

  const findFree = (preferred, buf = 2) => {
    const p = Math.max(1, Math.min(preferred, LAST_ASSESSMENT_DAY));
    if (isFree(p, buf)) return p;
    for (let delta = 1; delta <= 10; delta++) {
      if (p + delta <= LAST_ASSESSMENT_DAY && isFree(p + delta, buf)) return p + delta;
      if (p - delta >= 1 && isFree(p - delta, buf)) return p - delta;
    }
    return null;
  };

  const place = (day, test, label, reason, reviewHours, flags = {}) => {
    result.push({ day, test, label, reason, reviewHours, ...flags });
    claimDay(day);
    if (test?.type === 'nbme') usedForms.add(test.id);
  };

  // Pick lowest-numbered unused NBME (for baseline + early progress checks)
  const pickLowestNbme = () => untakenNBMEs.find(t => !usedForms.has(t.id)) || null;
  // Pick highest-numbered unused NBME (for final pre-exam slot — most representative)
  const pickHighestNbme = () => [...untakenNBMEs].reverse().find(t => !usedForms.has(t.id)) || null;

  // ── Tier for spacing decisions ─────────────────────────────────────
  const tier = totalCalendarDays >= 56 ? '8w'
    : totalCalendarDays >= 35 ? '5w'
    : totalCalendarDays >= 21 ? '3w'
    : '2w';

  // ════════════════════════════════════════════════════════════════════
  // STEP 1 — Lock in Free 120 (2024) at EXACTLY T-2
  // This is mandatory regardless of all other scheduling decisions.
  // ════════════════════════════════════════════════════════════════════
  if (free120 && FREE120_DAY >= 1) {
    result.push({
      day: FREE120_DAY,
      test: free120,
      label: 'MANDATORY — Style calibrator',
      reason: free120IsRetake
        ? `You've taken the Free 120 before. We still place it exactly 2 days out — the score isn't the point. It's about locking in exam-day rhythm and confirming comfort with real USMLE question style. Take it timed, under exam conditions.`
        : `The ${free120.name} is free official USMLE content — the closest format match to the real exam. This is your final calibration before exam day. Take it timed, under exam conditions. Review every wrong answer; do not start new content.`,
      reviewHours: 1.5,
      mandatory: true,
      moveable: false,
    });
    claimed.add(FREE120_DAY);
    claimed.add(FREE120_DAY + 1);
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 2 — UWSA2 (only when ALL 8 NBMEs done) at 7-9 days before exam
  // ════════════════════════════════════════════════════════════════════
  if (uwsa2 && LAST_ASSESSMENT_DAY >= 3 && tier !== '2w') {
    const target = Math.min(LAST_ASSESSMENT_DAY, totalCalendarDays - 9);
    const uwsa2Day = findFree(Math.max(1, target), 2);
    if (uwsa2Day) {
      place(uwsa2Day, uwsa2, 'Score predictor',
        `UWSA 2 is the strongest single predictor of your actual Step 1 score. Students typically land within 3–5 points of this number. Take it under full exam conditions — 280 questions, timed, no interruptions. The score you see here is approximately where you'll score on exam day.`,
        2.5, { predictorNote: true });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 3 — UWSA1 (only when ALL 8 NBMEs done, 8w+5w tiers) near midpoint
  // ════════════════════════════════════════════════════════════════════
  if (uwsa1 && (tier === '8w' || tier === '5w') && LAST_ASSESSMENT_DAY >= 5) {
    const target = Math.floor(totalCalendarDays / 2);
    const uwsa1Day = findFree(Math.min(target, LAST_ASSESSMENT_DAY - 5), 3);
    if (uwsa1Day) {
      place(uwsa1Day, uwsa1, 'Midpoint learning tool',
        `UWSA 1 at the halfway point shows how far you've come — and where you still need work. Critical caveat: UWSA 1 consistently overpredicts by 10–25 points. A score of 245 here often translates to 220–235 on exam day. Don't get complacent if the number looks high. Use it to identify which systems are still dragging your score down.`,
        2.0, { overpredictWarning: 'This exam typically overpredicts by 10–25 points. Use it for learning direction, not score prediction.' });
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 4 — Baseline NBME (only if student has no existing scores yet)
  // Form selection is tier-aware: short dedicated uses newer forms for maximum
  // relevance; longer dedicated can start with older forms.
  // ════════════════════════════════════════════════════════════════════
  if (!hasBaseline && untakenNBMEs.length > 0 && LAST_ASSESSMENT_DAY >= 1) {
    const baseNbme = selectNextNBME(untakenNBMEs, totalCalendarDays, false);
    if (baseNbme) {
      const baseDay = findFree(Math.min(2, LAST_ASSESSMENT_DAY), 1);
      if (baseDay) {
        const baseReason = baseNbme.number >= 30
          ? `Your first NBME — a newer form chosen because it's more representative of current Step 1 content. Most students feel underprepared at this stage — that's expected. What matters is the system breakdown, which becomes the blueprint for your entire plan.`
          : `Your first NBME before dedicated study truly kicks in. Most students feel underprepared at this stage — that's expected and irrelevant. The score right now doesn't define where you'll land. What matters is which systems are dragging you down. That breakdown becomes the blueprint for everything that follows.`;
        place(baseDay, baseNbme, 'Baseline diagnostic', baseReason, 2.0);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 5 — AMBOSS substitute (only when ALL 8 NBMEs done, no UWSA1)
  // ════════════════════════════════════════════════════════════════════
  if (!uwsa1 && amboss && (tier === '8w' || tier === '5w') && LAST_ASSESSMENT_DAY >= 5) {
    const target = Math.min(Math.floor(totalCalendarDays / 2), LAST_ASSESSMENT_DAY - 5);
    const ambossDay = findFree(Math.max(1, target), 3);
    if (ambossDay) {
      place(ambossDay, amboss, 'Midpoint check (AMBOSS)',
        `AMBOSS SA runs harder than the real exam intentionally — students typically score 5–15 points lower than their actual Step 1 result. Use it as a high-fidelity stress test to find remaining gaps. If you can answer AMBOSS questions cleanly, you're in excellent shape.`,
        2.0);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // STEP 6 — Progress checks
  // Priority: untaken NBMEs (order determined by selectNextNBME tier logic)
  // Only if allNBMEsDone: then UWSA/AMBOSS, then NBME retakes
  // ════════════════════════════════════════════════════════════════════
  // Spacing scales with dedicated period length — tighter data = faster plan adaptation
  const interval = totalCalendarDays > 42 ? 7   // 6+ weeks: weekly NBMEs
    : totalCalendarDays > 28 ? 5               // 4-6 weeks: every ~5 days
    : totalCalendarDays > 14 ? 4               // 2-4 weeks: every ~4 days
    : 3;                                       // <2 weeks: minimum 3-day spacing

  if (LAST_ASSESSMENT_DAY >= interval) {
    const baseItem = result.find(r => r.label === 'Baseline diagnostic');
    let cursor = baseItem ? baseItem.day + interval : interval;

    // Cap at 8 — one per NBME 26-33; loop stops naturally when days or tests run out
    const maxProgress = 8;
    let progressCount = 0;

    while (progressCount < maxProgress) {
      if (cursor > LAST_ASSESSMENT_DAY) break;
      const slot = findFree(cursor, 3);
      if (!slot || slot > LAST_ASSESSMENT_DAY) break;

      // Determine if this is the final slot (no room for another after this)
      const nextCursor = slot + interval;
      const isLastSlot = progressCount === maxProgress - 1 || nextCursor > LAST_ASSESSMENT_DAY;

      const availableNBMEs = untakenNBMEs.filter(t => !usedForms.has(t.id));
      let testToPlace = null;
      let label = `Progress check #${progressCount + 1}`;
      let reason = '';
      const flags = {};

      if (availableNBMEs.length > 0) {
        // ── Untaken NBMEs available — always schedule them first ──
        // selectNextNBME determines form order based on dedicated period length:
        //   short (≤3w) → newer forms first; long (6w+) → older early, newer late.
        //   Final slot always gets the highest numbered untaken form.
        const nbme = selectNextNBME(availableNBMEs, totalCalendarDays, isLastSlot);
        testToPlace = nbme;
        if (nbme.number >= 32) {
          label = `Progress check — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — one of the newest forms and most representative of current Step 1 content. Your score here is a strong prediction signal for your actual exam.`;
        } else if (nbme.number >= 30) {
          label = `Progress check — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — a newer form, well-aligned with current Step 1 content. Check whether your weak areas are improving; the system breakdown matters more than the total score.`;
        } else if (isLastSlot) {
          label = `Final NBME — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — additional progress data. Use the system breakdown to confirm whether your targeted weak areas have moved.`;
        } else {
          label = `Progress check — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — progress check. The total score matters less than the direction of movement in your weak systems since your last assessment.`;
        }
      } else if (allNBMEsDone) {
        // ── All 8 NBMEs taken — now consider UWSA/AMBOSS/retakes ──
        const uwsa2Placed = result.some(r => r.test?.id === 'uwsa2');
        const uwsa1Placed = result.some(r => r.test?.id === 'uwsa1');
        const ambossPlaced = result.some(r => r.test?.id === 'amboss');

        if (canUse('uwsa2') && !uwsa2Placed) {
          testToPlace = PRACTICE_TESTS.find(t => t.id === 'uwsa2');
          label = 'Score predictor';
          reason = `UWSA 2 is the strongest single predictor of your Step 1 score. Take it under full exam conditions — timed, 280 questions, no interruptions.`;
          flags.predictorNote = true;
        } else if (canUse('uwsa1') && !uwsa1Placed) {
          testToPlace = PRACTICE_TESTS.find(t => t.id === 'uwsa1');
          label = 'Midpoint learning tool';
          reason = `UWSA 1 consistently overpredicts by 10–25 points — don't rely on it for score prediction. Use it to identify which systems still need work.`;
          flags.overpredictWarning = 'This exam typically overpredicts by 10–25 points. Use it for learning direction, not score prediction.';
        } else if (canUse('amboss') && !ambossPlaced) {
          testToPlace = PRACTICE_TESTS.find(t => t.id === 'amboss');
          label = 'Midpoint check (AMBOSS)';
          reason = `AMBOSS SA runs harder than the real exam — use it as a stress test, not a score predictor. Students typically score 5–15 points lower here than on the real thing.`;
        } else {
          // All assessments taken — retake oldest NBME (if taken >6 weeks ago)
          const retake = ALL_NBME_IDS
            .filter(id => everTaken.has(id) && canUse(id))
            .map(id => PRACTICE_TESTS.find(t => t.id === id))
            .filter(Boolean)[0];
          if (retake) {
            testToPlace = retake;
            label = 'Retake — Progress check';
            reason = `You've taken all 8 NBMEs and all supplemental assessments. Revisiting ${retake.name} — taken over 6 weeks ago, so the questions won't be fresh.`;
          }
        }
      }

      if (!testToPlace) break;
      place(slot, testToPlace, label, reason, 2.0, flags);
      cursor = slot + interval;
      progressCount++;
    }
  }

  result.sort((a, b) => a.day - b.day);
  return result;
}

// ── Study-day time allocation by hours-per-day ────────────────────────────
// Returns fixed block durations for the 5-block daily structure.
// All numbers in hours. Sums match the student's declared hours/day.
function getStudyDayParams(hrs, hasAnki) {
  const b1Hrs = hasAnki ? (hrs >= 8 ? 1.0 : 0.75) : 0.5;
  // 10+ h/day: 3 random blocks
  if (hrs >= 10) return { b1Hrs, b2Hrs: 1.5,  b3QHrs: 1.0, b3ReviewHrs: 1.5, lunchHrs: 1.0,  numRandom: 3, b5Hrs: 0.75 };
  // 9 h/day  : 2 random blocks, longer lunch
  if (hrs >= 9)  return { b1Hrs, b2Hrs: 1.25, b3QHrs: 1.0, b3ReviewHrs: 1.5, lunchHrs: 1.0,  numRandom: 2, b5Hrs: 0.75 };
  // 8 h/day  : 2 random blocks
  if (hrs >= 8)  return { b1Hrs, b2Hrs: 1.25, b3QHrs: 1.0, b3ReviewHrs: 1.5, lunchHrs: 0.75, numRandom: 2, b5Hrs: 0.5  };
  // 6–7 h/day: 1 random block
  return             { b1Hrs, b2Hrs: 1.0,  b3QHrs: 0.75, b3ReviewHrs: 1.25, lunchHrs: 0.5, numRandom: 1, b5Hrs: 0.5  };
}

// ── Deck-aware helper functions ────────────────────────────────────────────
function getDeckName(ankiDeck) {
  switch (ankiDeck) {
    case 'mehlman': return 'Mehlman Medical';
    case 'other':   return 'your Anki deck';
    default:        return 'AnKing';
  }
}
function getUnsuspendInstruction(ankiDeck) {
  switch (ankiDeck) {
    case 'mehlman':
      return 'review the relevant Mehlman card — if the concept is not in your deck, flag it in First Aid';
    case 'other':
      return 'search your Anki deck for this concept and prioritize it in reviews';
    default:
      return 'search the AnKing deck by keyword and unsuspend the relevant card';
  }
}

// ── Morning retention block builder ───────────────────────────────────────
// Returns the Block 1 "morning retention" block appropriate for the student's
// Anki experience level. Called for every standard study day.
// ankiLevel: "none" | "beginner" | "intermediate" | "veteran"
// hasAnki: whether the student selected AnKing as a resource
// hours: block duration in hours
// isFirstStudyDay: true on calendarDay == 1 (triggers setup guide for new users)
function buildMorningRetentionBlock(ankiLevel, hasAnki, hours, isFirstStudyDay, ankiDeck = 'anking') {
  // No Anki selected — use UWorld incorrects for spaced repetition
  if (!hasAnki) {
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'UWorld incorrect review', activity: 'Revisit 15–20 previously missed questions from recent blocks. Focus on questions you got wrong yesterday. Goal: retrieval practice, not re-learning. Your annotated First Aid pages are your "deck" — flip through flagged pages quickly.', hours: 0.5 },
    ]};
  }

  const deckLabel = getDeckName(ankiDeck);

  // ── Mehlman deck ────────────────────────────────────────────────────────
  if (ankiDeck === 'mehlman') {
    if (ankiLevel === 'none' || (ankiLevel === 'beginner' && isFirstStudyDay)) {
      return { type: 'anki', label: ankiLevel === 'none' ? 'Morning retention — Mehlman setup' : 'Morning retention', tasks: [
        { resource: 'Mehlman Medical', activity: 'Do all due reviews first. Then learn 20–30 new cards. The Mehlman deck is small enough to get through entirely during dedicated — aim to see all cards within your first 2–3 weeks. Focus on the Rapid Review and HY Arrows cards first — these are the most frequently tested concepts.\n\nDo NOT make your own cards. The deck already covers the highest-yield material.', hours },
      ]};
    }
    if (ankiLevel === 'beginner') {
      return { type: 'anki', label: 'Morning retention', tasks: [
        { resource: 'Mehlman Medical', activity: 'Do all due reviews first. Then learn 20–30 new cards. The Mehlman deck is small enough to get through entirely during dedicated — aim to see all cards within your first 2–3 weeks. Focus on the Rapid Review and HY Arrows cards first.\n\nDo NOT make your own cards.', hours },
      ]};
    }
    if (ankiLevel === 'intermediate') {
      return { type: 'anki', label: 'Morning retention', tasks: [
        { resource: 'Mehlman Medical', activity: 'All due reviews — 1 hour max. The Mehlman deck is lean enough that reviews should stay manageable (usually 100–300 cards daily). If you\'ve finished all new cards, use the remaining time to review your most-missed UWorld concepts in First Aid.\n\nDo NOT make your own cards.', hours },
      ]};
    }
    // veteran
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'Mehlman Medical', activity: 'All due reviews — 1 hour max. Your Mehlman deck should be mostly mature at this point with manageable daily reviews. If you finish in under 30 minutes, use the remaining time reviewing UWorld incorrects from yesterday.\n\nDo NOT make your own cards.', hours },
    ]};
  }

  // ── Other / custom deck ─────────────────────────────────────────────────
  if (ankiDeck === 'other') {
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'Anki (your deck)', activity: 'Do all due reviews — 1 hour max. Stop at 1 hour even if cards remain. Questions are more important than clearing your queue. Add new cards only if reviews are comfortably under 30 minutes.\n\nDo NOT make your own cards during dedicated.', hours },
    ]};
  }

  // ── AnKing (default) ────────────────────────────────────────────────────
  // Never used before (level "none" with hasAnki) — show setup guide on day 1
  if (ankiLevel === 'none' || (ankiLevel === 'beginner' && isFirstStudyDay)) {
    const setupGuide = ankiLevel === 'none' ? `ANKI SETUP (one-time — do this today before anything else):
1. Download Anki — free on desktop (apps.ankiweb.net), free on Android, $25 on iOS
2. Download the AnKing Step 1 deck — search "AnKingMed" on YouTube for the current install tutorial (the process changes periodically)
3. Install the deck with ALL cards SUSPENDED — this is the default; do not unsuspend anything yet
4. Watch "AnKing How to Use Anki for Step 1 Beginners" on YouTube (15 min) — essential before you start
5. Set your daily new card limit to 20–30 cards in deck settings
6. Only unsuspend cards for topics you have ALREADY studied — never unsuspend topics you haven't learned yet

KEY RULE: Do NOT make your own Anki cards. The AnKing deck covers every testable concept on Step 1. Making your own cards during dedicated is a time trap that will cost you hours. If you missed a concept, search the AnKing deck browser by keyword — the card already exists. Unsuspend it.

After setup: do your due reviews (there won't be many yet), then unsuspend 20–30 AnKing cards for today's focus system.` : null;

    return { type: 'anki', label: ankiLevel === 'none' ? 'Morning retention — AnKing setup' : 'Morning retention', tasks: [
      { resource: 'AnKing Deck', activity: setupGuide || 'Do ALL due reviews first (probably 50–150 cards at this stage). Then unsuspend and learn new cards ONLY for today\'s focus system — 20–30 new cards max. If reviews start exceeding 45 minutes, stop adding new cards until reviews come back down. Do NOT make your own cards — if you missed a concept, search the AnKing deck by keyword and unsuspend the existing card.', hours },
    ]};
  }

  if (ankiLevel === 'beginner') {
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'AnKing Deck', activity: 'Do ALL due reviews first (probably 50–150 cards at your stage). Then unsuspend and learn new cards ONLY for today\'s focus system — 20–30 new cards max. If reviews start exceeding 45 minutes, stop adding new cards until reviews come back down. Do NOT make your own cards — if you missed a concept, search the AnKing deck by keyword and unsuspend the existing card.', hours },
    ]};
  }

  if (ankiLevel === 'intermediate') {
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'AnKing Deck', activity: 'All due reviews — STRICT 1 hour timer. If you can\'t finish all reviews in 1 hour, that\'s fine — prioritise cards you\'ve been getting wrong recently. Then unsuspend 10–20 new cards for today\'s focus system only.\n\nIf daily reviews are consistently exceeding 400 cards: open the AnKing deck browser, sort by interval, and suspend cards with intervals over 60 days. Those cards are locked in long-term memory — you don\'t need daily exposure anymore. Do NOT make your own cards.', hours },
    ]};
  }

  // veteran
  return { type: 'anki', label: 'Morning retention', tasks: [
    { resource: 'AnKing Deck', activity: 'Reviews only — 1 hour MAX, hard cap. You likely have 400–800+ due cards. You will not finish them all and that is fine.\n\nPriority order:\n1. Cards tagged to your weakest systems (use AnKing tags to filter — e.g. #AK_Step1_v12::Cardiovascular)\n2. Cards you\'ve been getting wrong recently (actively decaying)\n3. Everything else in order\n\nStop at 1 hour regardless. Questions are more valuable than clearing your Anki queue. Do NOT add new cards during dedicated study. If reviews are overwhelming (800+ daily): suspend cards with intervals over 90 days and reduce your daily max reviews in settings to 400–500.', hours },
  ]};
}

// ── Day structure validator ────────────────────────────────────────────────
// Confirms the 5-block sequence is correct: content before questions, targeted before random.
// Logs a console error if ordering is wrong (acts as a sanity check, does not throw).
export function validateDayStructure(dayBlocks) {
  let contentIndex = -1, targetedQIndex = -1, randomQIndex = -1;
  dayBlocks.forEach((block, i) => {
    if (block.type === 'content' || block.type === 'content-reactive') contentIndex = i;
    if (block.type === 'questions-focus' || block.type === 'questions-targeted') targetedQIndex = i;
    if (block.type === 'questions-random') randomQIndex = Math.max(randomQIndex, i);
  });
  if (contentIndex > -1 && targetedQIndex > -1 && contentIndex > targetedQIndex) {
    console.error(`BUG: Content review (idx ${contentIndex}) placed AFTER targeted questions (idx ${targetedQIndex})`);
    return false;
  }
  if (contentIndex > -1 && randomQIndex > -1 && contentIndex > randomQIndex) {
    console.error(`BUG: Content review (idx ${contentIndex}) placed AFTER random questions (idx ${randomQIndex})`);
    return false;
  }
  if (targetedQIndex > -1 && randomQIndex > -1 && targetedQIndex > randomQIndex) {
    console.error(`BUG: Targeted questions (idx ${targetedQIndex}) placed AFTER random questions (idx ${randomQIndex})`);
    return false;
  }
  return true;
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

  const stickingPoints = [...weakSystems];
  // hasExistingScores: false → scheduleAssessments will place a baseline NBME at day 1-3
  const plan = generatePlan(profile, scores, stickingPoints, { hasExistingScores: false });
  return { ...plan, firstTimer: true };
}

export function getPerformanceLevel(score) {
  if (score <= 25) return { label: "Needs attention", color: "#c0392b" };
  if (score <= 50) return { label: "Below average", color: "#e67e22" };
  if (score <= 75) return { label: "Average", color: "#2980b9" };
  return { label: "Strong", color: "#27ae60" };
}

// Returns the top dominant disciplines for a system category, weighted by
// the total yield of sub-topics that belong to each discipline.
// Used by the priority crossover bonus to amplify system priority when
// the student is also weak in the disciplines that dominate that system.
function getDominantDisciplinesForSystem(category) {
  const subs = SUB_TOPICS[category] || [];
  const discWeight = {};
  for (const sub of subs) {
    for (const d of (sub.disciplines || [])) {
      discWeight[d] = (discWeight[d] || 0) + (sub.yield || 5);
    }
  }
  return Object.entries(discWeight)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => d);
}

// Returns the single discipline the student is weakest in, weighted by sub-topic yield.
// subTopics: [{topic, yield, disciplines?}], scores: {disciplineName: number}
function getWeakestDisciplineInSubTopics(subTopics, scores) {
  const discScore = {}; // discipline → { totalWeight, weightedScoreSum }
  for (const sub of subTopics) {
    for (const d of (sub.disciplines || [])) {
      if (!discScore[d]) discScore[d] = { totalWeight: 0, weightedSum: 0 };
      const w = sub.yield || 5;
      discScore[d].totalWeight += w;
      discScore[d].weightedSum += (scores[d] ?? 50) * w;
    }
  }
  let weakest = null;
  let lowestAvg = Infinity;
  for (const [d, { totalWeight, weightedSum }] of Object.entries(discScore)) {
    const avg = totalWeight > 0 ? weightedSum / totalWeight : 50;
    if (avg < lowestAvg) { lowestAvg = avg; weakest = d; }
  }
  return weakest; // null if no sub-topics have disciplines
}

// Builds a discipline-aware Block 2 content review activity string.
// discipline: string|null, system: string, subLabel: string, gapType: string,
// resources: string[], b2Hrs: number, studyDayNum: number
function getDisciplineAwareActivity(discipline, system, subLabel, gapType, resources, b2Hrs) {
  // Returns a compact summary line — the detailed step-by-step instructions live in
  // the ContentSequencePanel (rendered from block.contentSequence), not in this text.
  const gapLabel = gapType === 'knowledge' ? 'Knowledge gap' : 'Application gap';
  if (subLabel) {
    return `Sub-topics: ${subLabel}  ·  ${gapLabel}`;
  }
  return `${system}  ·  ${gapLabel}`;
}

export function generatePlan(profile, scores, stickingPoints, options = {}) {
  const weights = HIGH_YIELD_WEIGHTS;
  const totalCalendarDays = Math.max(1, Math.round((new Date(profile.examDate) - new Date()) / 86400000));
  const hrs = profile.hoursPerDay || 8;
  const planStartDate = new Date();
  planStartDate.setHours(0, 0, 0, 0);
  const studentRestDaySet = new Set(profile.rest_days || []);

  let priorities = [];
  for (const cat of STEP1_CATEGORIES) {
    const score = scores[cat] ?? 50;
    const weakness = Math.max(0, 100 - score);
    const yld = weights[cat] || 5;
    const flagged = stickingPoints.includes(cat);
    // Auto-derive gap type: knowledge gap when score < 50, application gap otherwise
    const gapType = score < 50 ? "knowledge" : "application";
    // Discipline crossover bonus: amplify system priority when the student is
    // also weak (< 60%) in the disciplines that dominate that system.
    // This ensures Cardiovascular + weak Pharmacology outranks GI + strong Pathology.
    // Only applies to system categories (not discipline categories themselves).
    let crossoverBonus = 1.0;
    if (!STEP1_DISCIPLINE_CATEGORIES.includes(cat)) {
      for (const disc of getDominantDisciplinesForSystem(cat)) {
        if ((scores[disc] ?? 50) < 60) crossoverBonus = Math.min(crossoverBonus + 0.15, 1.5);
      }
    }
    const compositeScore = ((weakness * 0.4) + (yld * 8 * 0.35) + (flagged ? 25 : 0)) * crossoverBonus;
    priorities.push({ category: cat, score, weakness, yield: yld, flagged, compositeScore, gapType });
  }
  priorities.sort((a, b) => b.compositeScore - a.compositeScore);

  let timelineMode, contentRampDays;
  if (totalCalendarDays >= 42) { timelineMode = "full"; contentRampDays = 3; }
  else if (totalCalendarDays >= 21) { timelineMode = "standard"; contentRampDays = 1; }
  else if (totalCalendarDays >= 10) { timelineMode = "compressed"; contentRampDays = 0; }
  else { timelineMode = "triage"; contentRampDays = 0; }

  // ── Assessment scheduler ──────────────────────────────────────────────
  const hasExistingScores = options.hasExistingScores ?? Object.keys(scores).length > 0;
  const assessmentSchedule = scheduleAssessments(profile, totalCalendarDays, hasExistingScores);
  const assessmentDayMap = new Map(assessmentSchedule.map(a => [a.day, a]));
  // Review days = day after each assessment (unless that day is also an assessment day or exam day).
  // Review days are FULL study days — they take priority over student-selected rest days.
  const reviewDayMap = new Map(
    assessmentSchedule
      .filter(a => {
        const nextDay = a.day + 1;
        return !assessmentDayMap.has(nextDay) && nextDay < totalCalendarDays;
      })
      .map(a => [a.day + 1, a])
  );

  // Build day schedule
  let daySchedule = [];
  for (let d = 0; d < totalCalendarDays; d++) {
    const calendarDay = d + 1;
    const isLastDay = d === totalCalendarDays - 1;
    // Exam-week lockdown: applies only for plans ≥ 14 days, covers the 7 days before exam-eve + eve itself
    const isInLockdown = totalCalendarDays >= 14 && calendarDay >= totalCalendarDays - 8 && !isLastDay;
    const isExamEve = isInLockdown && calendarDay === totalCalendarDays - 1;
    const isExamWeekDay = isInLockdown && !isExamEve;
    // Student-selected rest day: check actual weekday for this calendar date
    const dayDate = new Date(planStartDate);
    dayDate.setDate(planStartDate.getDate() + d);
    const isStudentRest = studentRestDaySet.size > 0 && studentRestDaySet.has(dayDate.getDay());
    if (isLastDay) {
      daySchedule.push({ calendarDay, type: "rest" });
    } else if (assessmentDayMap.has(calendarDay)) {
      // Assessments always override rest days — NBME/Free120 takes priority
      daySchedule.push({ calendarDay, type: "nbme", assessItem: assessmentDayMap.get(calendarDay) });
    } else if (reviewDayMap.has(calendarDay)) {
      // Review day wins over student rest — exam data is time-sensitive
      daySchedule.push({ calendarDay, type: "review", prevAssessItem: reviewDayMap.get(calendarDay) });
    } else if (isExamEve) {
      daySchedule.push({ calendarDay, type: "exam-eve" });
    } else if (isExamWeekDay) {
      daySchedule.push({ calendarDay, type: "exam-week" });
    } else if (isStudentRest) {
      daySchedule.push({ calendarDay, type: "student-rest" });
    } else if (d > 6 && (d + 1) % 7 === 0 && timelineMode !== "triage") {
      daySchedule.push({ calendarDay, type: "light" });
    } else {
      daySchedule.push({ calendarDay, type: "study" });
    }
  }

  const getRes = (cat) => {
    const pool = RESOURCE_MAP[cat] || { learning: ["firstaid"], practice: ["uworld"] };
    return {
      learning: pool.learning?.filter(r => profile.resources.includes(r)) || [],
      practice: pool.practice?.filter(r => profile.resources.includes(r)) || [],
    };
  };
  const rn = (id) => RESOURCES.find(r => r.id === id)?.name || id;
  const hasAnki = profile.resources.includes("anking");
  // "none" = Anki not selected (UWorld incorrects) OR selected but never used (→ setup guide on day 1)
  const ankiLevel = hasAnki ? (profile.anki_experience_level || "none") : "none";
  const ankiDeck = hasAnki ? (profile.ankiDeck || 'anking') : 'anking';

  const topPriorities = priorities.filter(p => p.flagged || p.score <= 50);
  const midPriorities = priorities.filter(p => !p.flagged && p.score > 50 && p.score <= 70);

  const qBlockSize = 40;
  // Anki block only if student has AnKing
  const ankiHrs = hasAnki ? Math.min(1, roundToQuarterHour(hrs * 0.12)) : 0;

  const FOCUS_BLOCK_HRS = 2.5;   // 1h questions + 1.5h review
  const RANDOM_BLOCK_HRS = 1.8;  // 1h questions + 0.8h review
  const MAX_CONTENT_HRS = 1.5;

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

    // ── Assessment day ────────────────────────────────────────────────
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
          { resource: 'Self-review', activity: `Thorough review of every wrong answer — understand the concept, annotate patterns in First Aid.${hasAnki ? ` ${getUnsuspendInstruction(ankiDeck).charAt(0).toUpperCase() + getUnsuspendInstruction(ankiDeck).slice(1)} for any concept you missed — do NOT make your own cards.` : ' Star flagged First Aid pages for your morning review sessions.'}`, hours: reviewHrs },
        ]}],
      });
      continue;
    }

    // ── Post-assessment REVIEW DAY — full structured study day ───────
    // This is NOT a rest day. The student just generated their most valuable
    // diagnostic data. Today converts wrong answers into score improvement.
    if (sched.type === "review") {
      const ai = sched.prevAssessItem;
      const testName = ai?.test?.name || 'assessment';
      const reviewBlocks = [];

      // Block 1: Morning retention (Anki due reviews / UWorld incorrects)
      reviewBlocks.push({ type: "anki", label: "Morning retention", tasks: [
        hasAnki
          ? { resource: getDeckName(ankiDeck), activity: `Due reviews only — keep the streak. 45–60 min max. This primes your memory before the deep review session.`, hours: 1 }
          : { resource: "UWorld", activity: `Review yesterday's incorrect/marked questions from ${testName} — read every explanation, including why the right answer is right and why each distractor is wrong. 45–60 min.`, hours: 1 },
      ]});

      // Block 2: Deep wrong-answer review (4 hrs, no questions)
      reviewBlocks.push({ type: "catchup", label: `${testName} — deep wrong-answer review`, tasks: [
        { resource: "Self-review", activity: `System-by-system review of every wrong answer from ${testName}. For each missed question: (1) identify the exact concept that tripped you up, (2) look it up in First Aid — read the full section, not just the answer, (3) annotate the margin with the specific wrong-answer pattern${hasAnki ? `, (4) ${getUnsuspendInstruction(ankiDeck)} — do NOT create your own cards` : ', (4) star or flag the page for tomorrow\'s morning review'}. Work slowly — this review session is worth more than any single study day.`, hours: 4 },
      ]});

      // Lunch
      reviewBlocks.push({ type: "lunch", label: "Lunch break", tasks: [
        { resource: "Break", activity: "Step away completely. Eat, move, decompress. Your brain needs this reset before the afternoon execution session.", hours: 1 },
      ]});

      // Block 3: Targeted reinforcement — 40 Qs on the 2–3 weakest systems from yesterday
      const topWeak = priorities.slice(0, 3);
      const weakSystemStr = topWeak.length > 0 ? topWeak.map(p => p.category).slice(0, 3).join(", ") : "weakest systems";
      const primaryRes = topWeak.length > 0 ? getRes(topWeak[0].category) : { practice: [] };
      const primaryQBank = primaryRes.practice.length > 0 ? rn(primaryRes.practice[0]) : "Question bank";
      reviewBlocks.push({
        type: "questions-focus",
        label: `Targeted reinforcement: ${weakSystemStr}`,
        tasks: [
          { resource: primaryQBank, activity: `${qBlockSize} Qs — filtered to the 2–3 systems with the most wrong answers on ${testName} (${weakSystemStr}). Timed, test mode. This is your first test of whether the morning's review actually stuck.`, hours: 1.25 },
          { resource: "Self-review", activity: `Thorough review of every wrong answer. If you missed something you reviewed this morning, it means you need a different mental model — not more re-reading. Annotate the pattern, not the fact.`, hours: 0.75 },
        ],
      });

      // Block 4: Random maintenance — 40 Qs all systems
      reviewBlocks.push({ type: "questions-random", label: "Random maintenance: all systems", tasks: [
        { resource: primaryQBank, activity: `${qBlockSize} Qs — RANDOM, all systems, timed. Maintains broad coverage and prevents over-indexing on yesterday's weak areas.`, hours: 0.75 },
        { resource: "Self-review", activity: "Wrong answers only — quick First Aid lookup per concept (2 min max). Flag patterns for tomorrow's morning retention session.", hours: 0.25 },
      ]});

      // Block 5: Plan recalibration — 30 min
      reviewBlocks.push({ type: "end-review", label: "Plan recalibration check", tasks: [
        { resource: "Study plan", activity: `Review how your plan adjusted based on ${testName}'s new scores. Note which focus systems changed and why. Check whether today's reinforcement questions showed improvement. Adjust tomorrow's priority focus if needed.`, hours: 0.5 },
      ]});

      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "review", triageFor: testName,
        blocks: reviewBlocks, totalQuestions: qBlockSize * 2, // 40 targeted + 40 random
      });
      continue;
    }

    // ── Rest day (exam day — final rest) ─────────────────────────────
    if (sched.type === "rest") {
      const restBlocks = [];
      if (hasAnki) {
        restBlocks.push({ type: "anki", label: "Light retention", tasks: [
          { resource: getDeckName(ankiDeck), activity: "Due reviews only — 30 min max. Protect sleep and mental energy.", hours: 0.5 },
        ]});
      }
      restBlocks.push({ type: "rest", label: "Pre-exam rest", tasks: [
        { resource: "Self", activity: "Rest. No new content. Light review of your own notes if needed. Early bedtime.", hours: 1 },
      ]});
      currentWeek.days.push({ calendarDay: sched.calendarDay, dayType: "rest", blocks: restBlocks });
      continue;
    }

    // ── Exam-eve day (night before exam) ─────────────────────────────
    if (sched.type === "exam-eve") {
      const firstPri = priorities[0];
      const firstRes = firstPri ? getRes(firstPri.category) : { practice: [] };
      const examQBank = firstRes.practice.length > 0 ? rn(firstRes.practice[0]) : "Question bank";
      const eveBlocks = [];
      if (hasAnki) {
        eveBlocks.push({ type: "anki", label: "Light retention", tasks: [
          { resource: getDeckName(ankiDeck), activity: "Due reviews only — 20 min max. Calm and focused.", hours: 0.25 },
        ]});
      }
      eveBlocks.push({ type: "questions-random", label: "Warm-up: 20 random questions", tasks: [
        { resource: examQBank, activity: "20 Qs — RANDOM, all systems, relaxed pace. Confidence run, not a drill.", hours: 0.5 },
        { resource: "Self-review", activity: "Skim wrong answers briefly — note patterns, don't start studying new concepts.", hours: 0.25 },
      ]});
      eveBlocks.push({ type: "content-reactive", label: "Personal high-yield notes review", tasks: [
        { resource: "Your notes + First Aid", activity: "Flip through your personal high-yield notes and flagged cards from past NBMEs. 30 min max — nothing new, only familiar material.", hours: 0.5 },
      ]});
      eveBlocks.push({ type: "rest", label: "Exam-eve protocol", tasks: [
        { resource: "Logistics", activity: "Pack your ID, confirmation email, water, and snacks. Know the route and travel time. Set two alarms.", hours: 0.25 },
        { resource: "Evening", activity: "Light dinner. No alcohol, no cramming, no new content. Wind down by 9 PM. In bed by 10 PM — sleep is worth more than any last-minute review.", hours: 0.25 },
      ]});
      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "exam-eve",
        blocks: eveBlocks, totalQuestions: 20,
      });
      continue;
    }

    // ── Exam-week day (lockdown mode — no new content) ────────────────
    if (sched.type === "exam-week") {
      studyDayNum++;
      const firstPri = priorities[0];
      const firstRes = firstPri ? getRes(firstPri.category) : { practice: [] };
      const examQBank = firstRes.practice.length > 0 ? rn(firstRes.practice[0]) : "Question bank";
      const lockdownBlocks = [];
      if (hasAnki) {
        lockdownBlocks.push({ type: "anki", label: "Morning retention", tasks: [
          { resource: getDeckName(ankiDeck), activity: "Due reviews only — quick streak maintenance.", hours: ankiHrs },
        ]});
      }
      lockdownBlocks.push({ type: "content-reactive", label: "Most-missed concepts review", tasks: [
        { resource: "First Aid + flagged notes", activity: "Quick pass through annotated notes and flagged cards from past NBMEs. 30–45 min max — only familiar review, no new reading. Focus on patterns that have tripped you up more than once.", hours: 0.5 },
      ]});
      // 2-3 random blocks based on available hours (targeting 80–120 Qs)
      const lockdownHrsAvail = hrs - ankiHrs - 0.5 - 1.5; // minus anki, review, free-time buffer
      const lockdownRandomBlocks = Math.max(2, Math.min(3, Math.round(lockdownHrsAvail / 1.5)));
      for (let rb = 0; rb < lockdownRandomBlocks; rb++) {
        lockdownBlocks.push({ type: "questions-random", label: `Random block ${rb + 1} — all systems`, tasks: [
          { resource: examQBank, activity: `${qBlockSize} Qs — RANDOM, all systems, timed. Simulate exam-day pacing.`, hours: 1.0 },
          { resource: "Self-review", activity: "Wrong answers only — 2 min max per concept, then move on. Maintenance mode: no deep dives.", hours: 0.5 },
        ]});
      }
      lockdownBlocks.push({ type: "rest", label: "Finish by 3 PM — rest the remainder", tasks: [
        { resource: "Self", activity: "Done for the day. Finish all study by 3 PM. Rest, exercise, socialise — protect your sleep schedule and mental energy for exam day.", hours: 1 },
      ]});
      const lockdownTotalQs = lockdownRandomBlocks * qBlockSize;
      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "exam-week",
        blocks: lockdownBlocks, totalQuestions: lockdownTotalQs,
      });
      continue;
    }

    // ── Student-selected rest day ─────────────────────────────────────
    if (sched.type === "student-rest") {
      const studentRestBlocks = [];
      if (hasAnki) {
        studentRestBlocks.push({ type: "anki", label: "Anki reviews only", tasks: [
          { resource: getDeckName(ankiDeck), activity: "Due reviews only — 30–45 min max. No new cards. Stop at 45 minutes even if cards remain.", hours: 0.75 },
        ]});
      } else {
        studentRestBlocks.push({ type: "content-reactive", label: "Light First Aid review only", tasks: [
          { resource: "First Aid", activity: "Flip through only your starred/flagged weak pages. No deep reading. No new material. Skim only. Stop at 45 minutes.", hours: 0.75 },
        ]});
      }
      studentRestBlocks.push({ type: "rest", label: "Rest of day OFF", tasks: [
        { resource: "Self", activity: `The rest of today is OFF. No questions. No First Aid.${hasAnki ? '' : ' No UWorld.'} No videos. Go outside, exercise, see friends, sleep. Your brain consolidates during rest — this is productive.`, hours: 0.5 },
      ]});
      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "student-rest",
        blocks: studentRestBlocks, totalQuestions: 0,
      });
      continue;
    }

    // ── Study / light day ─────────────────────────────────────────────
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

    // ── BLOCK 1: Morning retention — always first, every day ──────────────
    // Content and duration vary by Anki experience level (see buildMorningRetentionBlock).
    const b1Hrs = hasAnki ? ankiHrs : 0.5;
    blocks.push(buildMorningRetentionBlock(ankiLevel, hasAnki, b1Hrs, studyDayNum === 1, ankiDeck));

    if (isLight) {
      // ── LIGHT DAY: Block 1 + shortened targeted Qs + 1 random block ──────
      // No Block 2 content review. Recovery pace — keep the habit, don't push.
      const lightFocusSubs = focusTopic ? getTopSubTopics(focusTopic.category, 5, profile.subTopicProgress || {}) : [];
      blocks.push({
        type: "questions-focus",
        label: `Targeted questions: ${focusTopic?.category || "focus system"} — 20 Qs`,
        highYield: lightFocusSubs,
        primaryQBank,
        tasks: [
          { resource: primaryQBank, activity: `20 Qs — ${focusTopic?.category || "focus system"} only, timed. Lighter pace today.`, hours: 0.5 },
          { resource: "Self-review", activity: "Review wrong answers only — quick lookup, no deep dives.", hours: 0.5 },
        ],
      });
      blocks.push({ type: "questions-random", label: "Random block: all systems", tasks: [
        { resource: primaryQBank, activity: `${qBlockSize} Qs — RANDOM, all systems, timed. Recovery day — keep the habit, don't push.`, hours: 0.75 },
        { resource: "Self-review", activity: "Wrong answers only — quick flag and move on. Save energy for tomorrow.", hours: 0.25 },
      ]});
    } else {
      // ── STANDARD STUDY DAY: Evidence-based 5-block sequence ──────────────
      // Block 1 (retention) → Block 2 (content, morning) → Block 3 (targeted Qs, same system) →
      // Lunch → Block 4 (random Qs, afternoon) → Block 5 (end-of-day review)
      const params = getStudyDayParams(availHrs, hasAnki);
      const isKG = focusTopic?.gapType === "knowledge";
      const topSubs = focusTopic ? getTopSubTopics(focusTopic.category, 3, profile.subTopicProgress || {}) : [];
      const focusSubTopics = focusTopic ? getTopSubTopics(focusTopic.category, 5, profile.subTopicProgress || {}) : [];
      const top3Short = topSubs.map(s => s.topic.split("(")[0].trim());
      const qbankFilterTip = getQbankFilterTip(primaryQBank, focusTopic?.category, focusSubTopics);

      // BLOCK 2 — Content review: gap-fill on high-yield sub-topics (MORNING, brain fresh)
      // NEVER placed after questions. Maximum 1.5h. Targets 2–3 highest-yield sub-topics only.
      if (focusTopic) {
        const b2Hrs = isKG ? params.b2Hrs : Math.min(params.b2Hrs, 0.75); // ~45 min for application gaps
        const subLabel = top3Short.length > 0 ? top3Short.slice(0, 3).join(", ") : focusTopic.category;
        // Build content sequence — PRACTICE is the final step in the sequence
        const contentSeqFull = getContentSequence(focusTopic.category, focusTopic.gapType, profile.resources || [], topSubs);
        const contentSeqB2 = contentSeqFull || null;
        const b2Resource = "Content review";
        // Identify the weakest discipline in today's focus sub-topics for targeted advice
        const weakestDisc = getWeakestDisciplineInSubTopics(topSubs, scores);
        const b2Activity = getDisciplineAwareActivity(
          weakestDisc,
          focusTopic.category,
          subLabel,
          focusTopic.gapType,
          profile.resources || [],
          b2Hrs,
        );
        const b2Label = isRamp
          ? `Content foundation: ${focusTopic.category}`
          : `Content review: ${focusTopic.category}`;
        blocks.push({
          type: "content",
          label: b2Label,
          contentSequence: contentSeqB2,
          highYield: topSubs,
          tasks: [{ resource: b2Resource, activity: b2Activity, hours: b2Hrs }],
        });
      }

      // BLOCK 3 — Targeted question block on the SAME system as Block 2
      // Immediately tests whether the morning's content review stuck.
      const prioritizeStr = top3Short.length > 0 ? ` Prioritize: ${top3Short.join(", ")}.` : "";
      blocks.push({
        type: "questions-focus",
        label: `Targeted questions: ${focusTopic?.category || "focus system"}`,
        highYield: focusSubTopics,
        primaryQBank,
        qbankFilterTip,
        tasks: [
          { resource: primaryQBank, activity: `${qBlockSize} Qs — ${focusTopic?.category || "focus system"} only, timed, test mode.${qbankFilterTip ? " " + qbankFilterTip : ""}${prioritizeStr}`, hours: params.b3QHrs },
          { resource: "Self-review", activity: (() => {
              const focusDisc = getWeakestDisciplineInSubTopics(focusSubTopics, scores);
              const strategy = focusDisc ? DISCIPLINE_ATTACK_STRATEGIES[focusDisc] : null;
              const base = "Thorough review of EVERY question — right and wrong. Track which sub-topics you're still missing.";
              return strategy
                ? `${base} ${strategy.wrongAnswerReview}`
                : `${base} Annotate First Aid for wrong answers.`;
            })(), hours: params.b3ReviewHrs },
        ],
      });

      // LUNCH — explicit break between Block 3 (targeted) and Block 4 (random)
      blocks.push({
        type: "lunch",
        label: "Lunch break",
        tasks: [{ resource: "Break", activity: "Step away completely — eat, move, decompress. Mental reset before afternoon execution mode.", hours: params.lunchHrs }],
      });

      // BLOCK 4 — Mixed random timed question blocks (afternoon execution mode)
      // Two or three blocks of 40 Qs each. ALL systems, RANDOM. Context-switching is the point.
      for (let rb = 0; rb < params.numRandom; rb++) {
        const blockLabel = params.numRandom === 1
          ? "Random block: all systems"
          : `Random block ${rb + 1} of ${params.numRandom}: all systems`;
        blocks.push({ type: "questions-random", label: blockLabel, tasks: [
          { resource: primaryQBank, activity: `${qBlockSize} Qs — RANDOM, all systems, timed. Context-switching between systems is the point — exam-day simulation.`, hours: 0.75 },
          { resource: "Self-review", activity: "Wrong answers only — quick First Aid lookup per concept (2 min max). Flag anything unclear for tomorrow's morning retention session.", hours: 0.25 },
        ]});
      }

      // BLOCK 5 — End-of-day review: consolidate the day, triage misses, prep tomorrow's retention
      const b5AnkiNote = hasAnki
        ? `For any concept you keep missing: ${getUnsuspendInstruction(ankiDeck)} — do NOT make your own cards.`
        : 'Star or annotate flagged First Aid pages — these become tomorrow\'s morning review targets.';
      blocks.push({ type: "end-review", label: "End-of-day review", tasks: [
        { resource: "Self-review", activity: `Review ALL wrong answers from today's random blocks. Quick First Aid lookup for each missed concept (2 min max). ${b5AnkiNote} Flag patterns for tomorrow's retention session.`, hours: params.b5Hrs },
      ]});
    }

    // Validate block order — content must always precede questions
    validateDayStructure(blocks);

    if (focusTopic && !currentWeek.focusTopics.includes(focusTopic.category)) currentWeek.focusTopics.push(focusTopic.category);
    currentWeek.days.push({
      calendarDay: sched.calendarDay, dayType: sched.type, focusTopic: focusTopic?.category,
      focusGapType: focusTopic?.gapType, maintainTopics: [maint1, maint2].filter(Boolean).map(t => t.category),
      blocks, totalQuestions: isLight
        ? (20 + qBlockSize)  // light day: 20 targeted + 40 random
        : blocks.reduce((sum, b) => sum + (b.type.includes("questions") ? qBlockSize : 0), 0),
    });
  }
  if (currentWeek.days.length > 0) weeks.push(currentWeek);

  // ── Safety net: no more than 1 rest day per week ──────────────────────
  // If any code path produced >1 rest day in a week, convert extras to study days.
  // "review" days are never rest days — this only catches dayType === "rest" or "student-rest".
  for (const week of weeks) {
    const restInWeek = week.days.filter(d => d.dayType === 'rest' || d.dayType === 'student-rest');
    if (restInWeek.length > 1) {
      // Keep the first rest day; convert remaining to study days with a minimal block set
      for (let ri = 1; ri < restInWeek.length; ri++) {
        const rd = restInWeek[ri];
        rd.dayType = 'study';
        if (!rd.blocks || rd.blocks.length === 0) {
          rd.blocks = [{ type: "questions-random", label: "Random block: all systems", tasks: [
            { resource: "Question bank", activity: `${qBlockSize} Qs — RANDOM, all systems, timed.`, hours: 0.75 },
            { resource: "Self-review", activity: "Review wrong answers.", hours: 0.25 },
          ]}];
          rd.totalQuestions = qBlockSize;
        }
      }
    }
  }

  const totalWeeks = weeks.length;
  weeks.forEach((w, i) => {
    const hasLockdown = w.days.some(d => d.dayType === 'exam-week' || d.dayType === 'exam-eve');
    if (hasLockdown) {
      w.phase = "Exam week — maintenance and confidence mode";
      w.isLockdown = true;
      return;
    }
    if (i === 0 && contentRampDays > 0) w.phase = "Foundation — build framework, ramp into questions";
    else if (i < Math.ceil(totalWeeks * 0.55)) w.phase = "Build — question-heavy, attack weak + high-yield";
    else if (i < Math.ceil(totalWeeks * 0.8)) w.phase = "Strengthen — broad coverage, refine weak spots";
    else w.phase = "Sharpen — simulate test conditions, full blocks";
  });

  const totalStudyDays = daySchedule.filter(d => d.type === "study").length;
  const totalLightDays  = daySchedule.filter(d => d.type === "light").length;
  const sdParams = getStudyDayParams(hrs, hasAnki);
  const totalQEstimate = totalStudyDays * (1 + sdParams.numRandom) * qBlockSize
    + totalLightDays * (20 + qBlockSize);
  const nbmeDays = assessmentSchedule.length;

  return { priorities, weeks, totalCalendarDays, totalWeeks, totalStudyDays, totalQEstimate, nbmeDays, topPriorities, midPriorities, timelineMode, contentRampDays, assessmentSchedule };
}
