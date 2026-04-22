import { STEP1_CATEGORIES, STEP1_DISCIPLINE_CATEGORIES, HIGH_YIELD_WEIGHTS, RESOURCE_MAP, RESOURCES, SUB_TOPICS, PRACTICE_TESTS, DISCIPLINE_ATTACK_STRATEGIES } from './data.js';
import { getContentSequence } from './contentEngine.js';
// getVideosForTopic / calculateContentReviewMinutes removed — content review uses fixed 30 min default.

// ── Plan Engine Version ───────────────────────────────────────────────────
// In production builds, PLAN_ENGINE_VERSION is the Unix timestamp (ms) injected
// by Vite at build time — so every Railway deploy automatically produces a new,
// larger version number and all existing student plans regenerate on next login.
// In dev, __BUILD_TIME__ is the string 'dev' and we fall back to the last known
// numbered version (5) so local hot-reloads don't trigger constant plan regens.
// eslint-disable-next-line no-undef
const _buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev';
export const PLAN_ENGINE_VERSION = _buildTime === 'dev' ? 5 : Number(_buildTime);

/**
 * Returns an array of changelog strings for versions after `oldVersion`.
 * Used to populate the "Your plan was updated" notification banner.
 */
export function getChangesSince(oldVersion) {
  if (oldVersion < PLAN_ENGINE_VERSION) {
    return ['Your study plan has been updated with the latest improvements.'];
  }
  return [];
}

// ── Time-block helpers ────────────────────────────────────────────────

function parseMinutes(t) {
  // "07:00" → 420
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmt12(mins) {
  // Snap to nearest 5-min mark, then format as 12-hr time
  const snapped = Math.round(mins / 5) * 5;
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

// Parses a step timeLabel string to minutes.
// Handles: "~20 min", "~15–20 min", "~15 min", "~10–15 min"
// For ranges (e.g. "15–20 min"), returns the higher end.
function parseStepMinutes(timeLabel) {
  const cleaned = (timeLabel || '').replace(/~/g, '').replace(/\s*min\s*/gi, '').trim();
  if (cleaned.includes('–') || cleaned.includes('-')) {
    const parts = cleaned.split(/[–\-]/);
    return parseInt(parts[parts.length - 1].trim(), 10) || 15;
  }
  return parseInt(cleaned, 10) || 15;
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
  // Sequential layout: each block's window = its task-hours sum, rounded to nearest 5 min.
  // No scaling, no auto-break/lunch insertion.
  // Explicit lunch/break blocks in the array are rendered like any other block.
  // endTime is accepted for API compatibility but not used internally.
  let cursor = parseMinutes(startTime);
  const result = [];

  for (const block of blocks) {
    const rawMins = (block.tasks || []).reduce((s, t) => s + Math.round(t.hours * 60), 0);
    const blockMins = Math.max(5, Math.round(rawMins / 5) * 5);
    result.push({ ...block, startTime: fmt12(cursor), endTime: fmt12(cursor + blockMins), durationMinutes: blockMins });
    cursor += blockMins;
  }

  return result;
}

// Dev-mode validation: checks that block time windows match their task-hour sums.
// Call after assignBlockTimes in dev/test contexts to catch duration mismatches.
export function validateBlockDurations(dayLabel, blocks) {
  if (typeof __BUILD_TIME__ !== 'undefined' && __BUILD_TIME__ !== 'dev') return; // prod: skip
  // eslint-disable-next-line no-undef
  for (const b of blocks) {
    if (!b.startTime || !b.endTime || !b.tasks) continue;
    const windowMins = b.durationMinutes || 0;
    const taskSum = Math.round(b.tasks.reduce((s, t) => s + Math.round(t.hours * 60), 0) / 5) * 5;
    if (Math.abs(windowMins - taskSum) > 5) {
      console.error(
        `[validateBlockDurations] ${dayLabel} — "${b.label}": ` +
        `window ${windowMins} min (${b.startTime}–${b.endTime}) but tasks sum to ${taskSum} min. MISMATCH.`
      );
    }
  }
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

export function getTopSubTopics(category, count = 5, subTopicProgress = {}, offset = 0) {
  const subs = SUB_TOPICS[category];
  if (!subs) return [];
  // Improving sub-topics are de-prioritized to the bottom — struggling/untouched stay at top
  const sorted = [...subs].sort((a, b) => {
    const aImproving = subTopicProgress[a.topic] === 'improving';
    const bImproving = subTopicProgress[b.topic] === 'improving';
    if (aImproving !== bImproving) return aImproving ? 1 : -1;
    return b.yield - a.yield;
  });
  if (!offset || sorted.length === 0) return sorted.slice(0, count);
  // Rotate through subtopics across multi-day blocks so the same category doesn't
  // repeat the same topics when it appears on consecutive days.
  const result = [];
  for (let i = 0; i < count && i < sorted.length; i++) {
    result.push(sorted[(offset + i) % sorted.length]);
  }
  return result;
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
// Builds the assessment sequence with graduated spacing.
//
// SCHEDULING PRINCIPLES:
// 1. NBME 26 ALWAYS first (oldest form — saves newer, more predictive forms for later).
//    Exception: if NBME 26 already taken, use the lowest available form as first slot.
// 2. Highest numbered untaken form ALWAYS occupies the LAST NBME slot before Free 120.
// 3. Wider gaps early (student still building) → tighter late (frequent calibration).
//    Transition at ~60% through the plan.
// 4. Assessments ONLY on days with ≥6 study hours (uses eligibleCalendarDays pool).
// 5. Short dedicated (≤21 days): skip older forms 27-29, go straight to newer (30-33).
// 6. Free 120 (2024) MANDATORY at exactly T-2, never moved.
// 7. UWSA2/UWSA1 only after ALL 8 NBMEs taken (existing gate unchanged).
//    Exception: for 45+ day plans, UWSA2 fills a gap ≥10 days between last NBME and Free 120.
// 8. If student has ANY prior assessment data (takenAssessments.length > 0), the first
//    scheduled NBME is delayed by earlyGapDays (~2 weeks) and labeled "Progress check".
//    Only students with ZERO prior data get a "Baseline diagnostic" placed early.

export function scheduleAssessments(profile, totalCalendarDays, hasExistingScores = false, eligibleCalendarDays = null) {
  const takenList = profile.takenAssessments || [];
  const now = new Date();
  const SIX_MONTHS_MS = 183 * 24 * 60 * 60 * 1000;
  const SIX_WEEKS_MS  = 42  * 24 * 60 * 60 * 1000;

  // ── Taken/retake eligibility (unchanged) ──────────────────────────────
  const recentlyTaken = new Set(
    takenList.filter(t => !t.takenDate || (now - new Date(t.takenDate)) < SIX_WEEKS_MS).map(t => t.id)
  );
  const everTaken = new Set(takenList.map(t => t.id));
  const canUse = (id) => !recentlyTaken.has(id);

  // ── Fixed anchors ──────────────────────────────────────────────────────
  const FREE120_DAY        = totalCalendarDays - 2;  // ALWAYS locked here
  const LAST_ASSESSMENT_DAY = totalCalendarDays - 5; // 3-day buffer before Free 120
  if (FREE120_DAY < 1) return [];

  // ── NBME availability (unchanged) ─────────────────────────────────────
  const ALL_NBME_IDS = ['nbme26','nbme27','nbme28','nbme29','nbme30','nbme31','nbme32','nbme33'];
  const allNBMEsDone = ALL_NBME_IDS.every(id => everTaken.has(id));

  const nbmeRetakeEligible = (id) => {
    if (!allNBMEsDone) return false;
    const entry = takenList.find(t => t.id === id);
    if (!entry || !entry.takenDate) return false;
    return (now - new Date(entry.takenDate)) >= SIX_MONTHS_MS;
  };

  const untakenNBMEs = ALL_NBME_IDS
    .filter(id => !everTaken.has(id) || nbmeRetakeEligible(id))
    .map(id => PRACTICE_TESTS.find(t => t.id === id))
    .filter(Boolean);

  // UWSA/AMBOSS: only after all 8 NBMEs done (unchanged gate)
  const uwsa1  = (allNBMEsDone && canUse('uwsa1'))  ? PRACTICE_TESTS.find(t => t.id === 'uwsa1')  : null;
  const uwsa2  = (allNBMEsDone && canUse('uwsa2'))  ? PRACTICE_TESTS.find(t => t.id === 'uwsa2')  : null;
  const amboss = (allNBMEsDone && canUse('amboss')) ? PRACTICE_TESTS.find(t => t.id === 'amboss') : null;

  const free120 = PRACTICE_TESTS.find(t => t.id === 'free120new')
               || PRACTICE_TESTS.find(t => t.id === 'free120old');
  const free120IsRetake = everTaken.has('free120new') || everTaken.has('free120old');

  const result = [];
  // claimedDays: days blocked (assessment day + its review day)
  const claimedDays = new Set([
    FREE120_DAY, FREE120_DAY + 1,
    totalCalendarDays, totalCalendarDays - 1,
  ]);
  const claimDay  = (day) => { claimedDays.add(day); claimedDays.add(day + 1); };
  const isClaimed = (day) => claimedDays.has(day) || claimedDays.has(day + 1);

  // ── STEP 1: Lock Free 120 at T-2 (unchanged) ──────────────────────────
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
  }

  // ── STEP 2: Build sorted eligible day pool ─────────────────────────────
  // Pool = calendar days with ≥6 study hours, within LAST_ASSESSMENT_DAY
  let eligiblePool;
  if (eligibleCalendarDays && eligibleCalendarDays.size > 0) {
    eligiblePool = [...eligibleCalendarDays]
      .filter(d => d >= 1 && d <= LAST_ASSESSMENT_DAY)
      .sort((a, b) => a - b);
  } else {
    // Fallback: all days eligible (no per-day schedule configured)
    eligiblePool = [];
    for (let d = 1; d <= LAST_ASSESSMENT_DAY; d++) eligiblePool.push(d);
  }

  if (eligiblePool.length === 0) {
    // No eligible days — place no assessments (only Free 120 remains)
    if (typeof __BUILD_TIME__ === 'undefined' || __BUILD_TIME__ === 'dev') {
      console.warn('[scheduleAssessments] No assessment-eligible days — only Free 120 placed.');
    }
    result.sort((a, b) => a.day - b.day);
    return result;
  }

  // ── STEP 3: Graduated spacing parameters ──────────────────────────────
  // earlyGapDays / lateGapDays = minimum calendar days between consecutive assessments.
  // Transition at ~60% through the plan.
  const transitionDay = Math.floor(totalCalendarDays * 0.6);

  // Detect working student: ≤2 unique assessment-eligible days of the week
  const ws = migrateToWeeklySchedule(profile);
  const eligibleDowCount = Object.values(ws).filter(c => (c.studyHours || 0) >= 6).length;
  const hasLimitedDays = eligibleDowCount > 0 && eligibleDowCount <= 2;

  let earlyGapDays, lateGapDays;
  if (hasLimitedDays) {
    // Working student: compute average calendar days between eligible days
    const avgGap = eligiblePool.length > 1
      ? Math.round((eligiblePool[eligiblePool.length - 1] - eligiblePool[0]) / (eligiblePool.length - 1))
      : 7;
    earlyGapDays = avgGap * 2; // every other eligible day (e.g., every other Saturday = ~14 days)
    lateGapDays  = avgGap;     // every eligible day (e.g., every Saturday = ~7 days)
  } else {
    if (totalCalendarDays > 60) { earlyGapDays = 14; lateGapDays = 7;  }
    else if (totalCalendarDays > 42) { earlyGapDays = 10; lateGapDays = 5; }
    else if (totalCalendarDays > 21) { earlyGapDays = 8;  lateGapDays = 4; }
    else                             { earlyGapDays = 5;  lateGapDays = 2; }
  }

  // Find the next eligible pool day ≥ afterDay + minGapDays.
  // Falls back to the nearest available day after afterDay if the gap cannot be satisfied
  // (space running out near exam — never leave a slot empty unnecessarily).
  const findNextEligible = (afterDay, minGapDays) => {
    const minDay = afterDay + minGapDays;
    for (const d of eligiblePool) {
      if (d >= minDay && !isClaimed(d)) return d;
    }
    // Fallback: respect no gap, just take the next available
    for (const d of eligiblePool) {
      if (d > afterDay && !isClaimed(d)) return d;
    }
    return null;
  };

  // ── STEP 4a: Schedule NBMEs (untaken forms remain) ────────────────────
  if (untakenNBMEs.length > 0) {
    const sortedByNum = [...untakenNBMEs].sort((a, b) => a.number - b.number);

    // NBME 26 is ALWAYS first unless already taken
    const firstNBME  = sortedByNum.find(t => t.id === 'nbme26') || sortedByNum[0];
    const remaining  = sortedByNum.filter(t => t.id !== firstNBME.id);

    let middleForms, lastNBME;
    if (remaining.length === 0) {
      middleForms = []; lastNBME = null;
    } else {
      lastNBME    = remaining[remaining.length - 1]; // highest numbered form → last slot
      let middle  = remaining.slice(0, -1);
      // Short dedicated (≤21 days): skip old forms 27-29; use newer 30-33 only in middle
      if (totalCalendarDays <= 21) middle = middle.filter(t => t.number >= 30);
      middleForms = middle;
    }

    // ── STEP 5: Place first NBME ──────────────────────────────────────
    // hasBaseline = student already has at least one prior assessment on record.
    // No baseline → place early (2nd–4th study day), labeled "Baseline diagnostic".
    // Has baseline → push out by earlyGapDays (~2 weeks) so the student has time
    //   to actually improve before the next data point. Labeled "Progress check".
    const hasBaseline = takenList.length > 0;

    let firstDay;
    if (!hasBaseline) {
      // New student — place baseline diagnostic soon after study begins
      const initialGap = hasLimitedDays ? 0 : Math.min(3, Math.floor(totalCalendarDays * 0.07));
      firstDay = findNextEligible(initialGap, 1);
    } else {
      // Student has prior data — delay first progress check by a full earlyGapDays
      firstDay = findNextEligible(0, earlyGapDays);
      // Fallback: gap impossible near exam — take first available eligible day
      if (!firstDay) firstDay = findNextEligible(0, 1);
    }

    if (firstDay) {
      let label, reason;
      if (!hasBaseline) {
        label = 'Baseline diagnostic';
        reason = firstNBME.id === 'nbme26'
          ? `NBME 26 is your baseline — the oldest form, chosen intentionally so newer, more predictive forms are saved for later. Most students feel underprepared at this point — that's expected and irrelevant. The score doesn't define where you'll land; the system breakdown becomes the blueprint for your entire plan.`
          : `Your first NBME before dedicated study kicks in. Most students feel underprepared at this stage — that's expected. What matters is the system breakdown, which becomes the blueprint for everything that follows.`;
      } else {
        label = `Progress check — NBME ${firstNBME.number}`;
        reason = firstNBME.number >= 32
          ? `NBME ${firstNBME.number} — one of the newest forms and most representative of current Step 1 content. Your score here is a strong prediction signal for your actual exam.`
          : firstNBME.number >= 30
            ? `NBME ${firstNBME.number} — a newer form, well-aligned with current Step 1 content. Check whether your weak areas are improving; the system breakdown matters more than the total score.`
            : `NBME ${firstNBME.number} — your first progress check. You already have baseline data; what matters here is the direction of movement in your weak systems since your last assessment.`;
      }
      result.push({ day: firstDay, test: firstNBME, label, reason, reviewHours: 2.0 });
      claimDay(firstDay);

      // ── STEP 6: Place middle forms with graduated spacing ──────────────
      let prevDay = firstDay;
      for (const nbme of middleForms) {
        const gap     = prevDay >= transitionDay ? lateGapDays : earlyGapDays;
        const nextDay = findNextEligible(prevDay, gap);
        if (!nextDay) break;

        let label, reason;
        if (nbme.number >= 32) {
          label  = `Progress check — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — one of the newest forms and most representative of current Step 1 content. Your score here is a strong prediction signal for your actual exam.`;
        } else if (nbme.number >= 30) {
          label  = `Progress check — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — a newer form, well-aligned with current Step 1 content. Check whether your weak areas are improving; the system breakdown matters more than the total score.`;
        } else {
          label  = `Progress check — NBME ${nbme.number}`;
          reason = `NBME ${nbme.number} — progress check. The total score matters less than the direction of movement in your weak systems since your last assessment.`;
        }

        result.push({ day: nextDay, test: nbme, label, reason, reviewHours: 2.0 });
        claimDay(nextDay);
        prevDay = nextDay;
      }

      // ── STEP 7: Place highest form in the last NBME slot ──────────────
      if (lastNBME) {
        const gap     = prevDay >= transitionDay ? lateGapDays : earlyGapDays;
        const lastDay = findNextEligible(prevDay, gap);
        if (lastDay) {
          let label, reason;
          if (lastNBME.number >= 32) {
            label  = `Progress check — NBME ${lastNBME.number}`;
            reason = `NBME ${lastNBME.number} — the highest numbered form, saved for this final slot because it's most representative of current Step 1 content. Your score here directly predicts exam-day performance.`;
          } else {
            label  = `Progress check — NBME ${lastNBME.number}`;
            reason = `NBME ${lastNBME.number} — final NBME before exam week. Use the system breakdown to confirm whether your targeted weak areas have moved since your last assessment.`;
          }
          result.push({ day: lastDay, test: lastNBME, label, reason, reviewHours: 2.0 });
          claimDay(lastDay);
          prevDay = lastDay;
        }
      }

      // ── STEP 8: UWSA in gap between last NBME and Free 120 ────────────
      // Only for 45+ day plans when there's a meaningful gap (≥10 days).
      if (totalCalendarDays >= 45) {
        const gapToFree = FREE120_DAY - prevDay;
        const uwsa2Test = PRACTICE_TESTS.find(t => t.id === 'uwsa2');

        if (gapToFree >= 10 && uwsa2Test && canUse('uwsa2')) {
          // Place UWSA2 closest to T-7 (7 days before Free 120)
          const uwsa2Target = FREE120_DAY - 7;
          let best2 = null;
          for (const d of eligiblePool) {
            if (d > prevDay && d <= LAST_ASSESSMENT_DAY && !isClaimed(d)) {
              if (!best2 || Math.abs(d - uwsa2Target) < Math.abs(best2 - uwsa2Target)) best2 = d;
            }
          }
          if (best2) {
            result.push({
              day: best2, test: uwsa2Test, label: 'Score predictor',
              reason: `UWSA 2 is the strongest single predictor of your actual Step 1 score. Students typically land within 3–5 points of this number. Take it under full exam conditions — 280 questions, timed, no interruptions. The score you see here is approximately where you'll score on exam day.`,
              reviewHours: 2.5, predictorNote: true,
            });
            claimDay(best2);

            // Also try UWSA1 if gap is large enough (≥18 days)
            if (gapToFree >= 18 && canUse('uwsa1')) {
              const uwsa1Test = PRACTICE_TESTS.find(t => t.id === 'uwsa1');
              if (uwsa1Test) {
                const uwsa1Target = prevDay + Math.round((best2 - prevDay) / 2);
                let best1 = null;
                for (const d of eligiblePool) {
                  if (d > prevDay && d < best2 && !isClaimed(d)) {
                    if (!best1 || Math.abs(d - uwsa1Target) < Math.abs(best1 - uwsa1Target)) best1 = d;
                  }
                }
                if (best1) {
                  result.push({
                    day: best1, test: uwsa1Test, label: 'Midpoint learning tool',
                    reason: `UWSA 1 shows how far you've come — and where you still need work. Critical caveat: UWSA 1 consistently overpredicts by 10–25 points. A score of 245 here often translates to 220–235 on exam day. Don't get complacent if the number looks high.`,
                    reviewHours: 2.0,
                    overpredictWarning: 'This exam typically overpredicts by 10–25 points. Use it for learning direction, not score prediction.',
                  });
                  claimDay(best1);
                }
              }
            }
          }
        }
      }
    }

  // ── STEP 4b: All NBMEs done — schedule UWSA / AMBOSS ──────────────────
  } else if (allNBMEsDone) {
    const tier = totalCalendarDays >= 56 ? '8w'
      : totalCalendarDays >= 35 ? '5w'
      : totalCalendarDays >= 21 ? '3w' : '2w';

    const pickEligible = (target) => {
      let best = null;
      for (const d of eligiblePool) {
        if (d >= 1 && d <= LAST_ASSESSMENT_DAY && !isClaimed(d)) {
          if (!best || Math.abs(d - target) < Math.abs(best - target)) best = d;
        }
      }
      return best;
    };

    if (uwsa2 && LAST_ASSESSMENT_DAY >= 3 && tier !== '2w') {
      const d = pickEligible(Math.min(LAST_ASSESSMENT_DAY, FREE120_DAY - 9));
      if (d) {
        result.push({
          day: d, test: uwsa2, label: 'Score predictor',
          reason: `UWSA 2 is the strongest single predictor of your actual Step 1 score. Students typically land within 3–5 points of this number. Take it under full exam conditions — 280 questions, timed, no interruptions. The score you see here is approximately where you'll score on exam day.`,
          reviewHours: 2.5, predictorNote: true,
        });
        claimDay(d);
      }
    }

    if (uwsa1 && (tier === '8w' || tier === '5w') && LAST_ASSESSMENT_DAY >= 5) {
      const d = pickEligible(Math.min(Math.floor(totalCalendarDays / 2), LAST_ASSESSMENT_DAY - 5));
      if (d) {
        result.push({
          day: d, test: uwsa1, label: 'Midpoint learning tool',
          reason: `UWSA 1 at the halfway point shows how far you've come — and where you still need work. Critical caveat: UWSA 1 consistently overpredicts by 10–25 points. A score of 245 here often translates to 220–235 on exam day. Don't get complacent if the number looks high.`,
          reviewHours: 2.0,
          overpredictWarning: 'This exam typically overpredicts by 10–25 points. Use it for learning direction, not score prediction.',
        });
        claimDay(d);
      }
    }

    if (!uwsa1 && amboss && (tier === '8w' || tier === '5w') && LAST_ASSESSMENT_DAY >= 5) {
      const d = pickEligible(Math.min(Math.floor(totalCalendarDays / 2), LAST_ASSESSMENT_DAY - 5));
      if (d) {
        result.push({
          day: d, test: amboss, label: 'Midpoint check (AMBOSS)',
          reason: `AMBOSS SA runs harder than the real exam intentionally — students typically score 5–15 points lower than their actual Step 1 result. Use it as a high-fidelity stress test to find remaining gaps.`,
          reviewHours: 2.0,
        });
        claimDay(d);
      }
    }
  }

  result.sort((a, b) => a.day - b.day);

  // Validation: catch scheduling bugs in dev
  if (typeof __BUILD_TIME__ === 'undefined' || __BUILD_TIME__ === 'dev') {
    for (const s of result) {
      if (s.test?.type === 'nbme' && everTaken.has(s.test.id) && !nbmeRetakeEligible(s.test.id)) {
        console.error(`[scheduleAssessments] BUG: ${s.test.id} scheduled day ${s.day} but already taken and not retake-eligible.`);
      }
    }
  }

  return result;
}

// ── Study-day time allocation by hours-per-day ────────────────────────────
// Returns fixed block durations for the 5-block daily structure.
// All numbers in hours. Sums match the student's declared hours/day.
function getStudyDayParams(hrs, hasAnki) {
  const b1Hrs = hasAnki ? (hrs >= 8 ? 1.0 : 0.75) : 0.5;
  // ≤3 hrs (short evening/morning): 20 targeted + 20 random, no lunch
  if (hrs <= 3) return { b1Hrs: hasAnki ? 0.5 : 0.5,  b2Hrs: 0.33, b3QHrs: 0.5,  b3ReviewHrs: 0.33, lunchHrs: 0,    numRandom: 1, b5Hrs: 0.17, shortDay: true,  shortQs: 20 };
  // 4–5 hrs (medium day): 40 targeted + 40 random, no lunch
  if (hrs <= 5) return { b1Hrs: hasAnki ? 0.75 : 0.75, b2Hrs: 0.75, b3QHrs: 0.75, b3ReviewHrs: 1.0,  lunchHrs: 0,    numRandom: 1, b5Hrs: 0.25, shortDay: false, shortQs: null };
  // 10+ h/day: 4 random blocks
  if (hrs >= 10) return { b1Hrs, b2Hrs: 1.5,  b3QHrs: 1.0, b3ReviewHrs: 1.5, lunchHrs: 1.0, numRandom: 4, b5Hrs: 0.75, shortDay: false, shortQs: null };
  // 8–9 h/day : 3 random blocks
  if (hrs >= 8)  return { b1Hrs, b2Hrs: 1.25, b3QHrs: 1.0, b3ReviewHrs: 1.5, lunchHrs: 1.0, numRandom: 3, b5Hrs: 0.75, shortDay: false, shortQs: null };
  // 6–7 h/day : 2 random blocks
  return             { b1Hrs, b2Hrs: 1.0,  b3QHrs: 0.75, b3ReviewHrs: 1.25, lunchHrs: 0.75, numRandom: 2, b5Hrs: 0.5, shortDay: false, shortQs: null };
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
    return { type: 'anki', label: 'Morning retention — UWorld review', tasks: [
      { resource: 'UWorld incorrect review', activity: 'Revisit 15–20 previously missed UWorld questions. Read the full explanation for each — focus on WHY you got it wrong, not just the right answer. Flag any concept you miss twice for First Aid annotation.', hours },
    ]};
  }

  const deckLabel = getDeckName(ankiDeck);

  // ── Mehlman deck ────────────────────────────────────────────────────────
  if (ankiDeck === 'mehlman') {
    if (ankiLevel === 'none' && isFirstStudyDay) {
      return { type: 'anki', label: 'Morning retention — Mehlman setup', tasks: [
        { resource: 'Mehlman Medical', activity: 'First time? Complete the one-time Anki setup before starting reviews.\n\nAfter setup: do your due reviews, then learn 20–30 new cards. Focus on Rapid Review and HY Arrows cards first.\n\nDo NOT make your own cards.', hours, setupLink: '/anki' },
      ]};
    }
    if (ankiLevel === 'none' || ankiLevel === 'beginner') {
      return { type: 'anki', label: 'Morning retention', tasks: [
        { resource: 'Mehlman Medical', activity: 'Mehlman Deck — all due reviews, then 20–30 new cards for today\'s focus system. 1 hour max.', hours },
      ]};
    }
    if (ankiLevel === 'intermediate') {
      return { type: 'anki', label: 'Morning retention', tasks: [
        { resource: 'Mehlman Medical', activity: 'All due reviews — 1 hour max. If reviews stay under 30 min, use the remaining time reviewing UWorld incorrects in First Aid.\n\nDo NOT make your own cards.', hours },
      ]};
    }
    // veteran
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'Mehlman Medical', activity: 'All due reviews — 1 hour max. Deck should be mostly mature now. Remaining time → UWorld incorrects from yesterday.\n\nDo NOT make your own cards.', hours },
    ]};
  }

  // ── Other / custom deck ─────────────────────────────────────────────────
  if (ankiDeck === 'other') {
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'Anki (your deck)', activity: 'All due reviews — 1 hour max. Stop at 1 hour even if cards remain. Add new cards only if reviews finish comfortably under 30 minutes.\n\nDo NOT make your own cards during dedicated.', hours },
    ]};
  }

  // ── AnKing (default) ────────────────────────────────────────────────────
  if (ankiLevel === 'none' && isFirstStudyDay) {
    // Brand-new user: show a one-time setup pointer to the /anki guide page
    return { type: 'anki', label: 'Morning retention — AnKing setup', tasks: [
      { resource: 'AnKing Deck', activity: 'First time? Complete the one-time Anki setup before starting reviews.\n\nAfter setup: do your due reviews, then unsuspend 20–30 AnKing cards for today\'s focus system.\n\nDo NOT make your own cards.', hours, setupLink: '/anki' },
    ]};
  }

  if (ankiLevel === 'none' || ankiLevel === 'beginner') {
    return { type: 'anki', label: 'Morning retention', tasks: [
      { resource: 'AnKing Deck', activity: 'AnKing Deck — all due reviews first, then unsuspend 20–30 new cards for today\'s focus system. 1 hour max.', hours },
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

// ── Per-day schedule helpers ──────────────────────────────────────────────

/**
 * Migrate old single-hrs profile to weeklySchedule format.
 * Called when profile.weeklySchedule is absent (existing users).
 */
function migrateToWeeklySchedule(profile) {
  if (profile.weeklySchedule) return profile.weeklySchedule;
  const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const s = {};
  for (let d = 0; d <= 6; d++) {
    const isRest = (profile.rest_days || []).includes(d);
    s[d] = {
      dayName: names[d],
      studyHours: isRest ? 0 : (profile.hoursPerDay || 8),
      startTime: profile.studyStartTime || '07:00',
    };
  }
  return s;
}

/**
 * Returns { hours, startTime } for a specific calendar date from weeklySchedule.
 * Returns { hours: 0, startTime: null } when day is configured as rest.
 */
function getStudyHoursForDay(weeklySchedule, dayDate) {
  const cfg = weeklySchedule[dayDate.getDay()];
  if (!cfg || cfg.studyHours === 0) return { hours: 0, startTime: null };
  return { hours: cfg.studyHours, startTime: cfg.startTime || '07:00' };
}

/**
 * Returns a Set of weekday numbers (0–6) that have ≥6 study hours configured
 * (i.e., days long enough for a full-length practice NBME).
 */
function getAssessmentEligibleDows(weeklySchedule) {
  const s = new Set();
  for (const [d, cfg] of Object.entries(weeklySchedule)) {
    if ((cfg.studyHours || 0) >= 6) s.add(parseInt(d, 10));
  }
  return s;
}

/**
 * Returns a display label for a day header based on hours + start time.
 * Used to show "Evening", "Morning", "Full day", "Rest", etc.
 */
function getDayLabel(hours, startTime) {
  if (!hours || hours === 0) return 'Rest';
  if (hours >= 6) return 'Full day';
  if (!startTime) return hours <= 3 ? 'Short' : null;
  const h = parseInt(startTime.split(':')[0], 10);
  return h >= 12 ? 'Evening' : 'Morning';
}

export function generatePlan(profile, scores, stickingPoints, options = {}) {
  const weights = HIGH_YIELD_WEIGHTS;
  const totalCalendarDays = Math.max(1, Math.round((new Date(profile.examDate) - new Date()) / 86400000));
  const hrs = profile.hoursPerDay || 8; // global fallback; per-day overrides used in loop
  const planStartDate = new Date();
  planStartDate.setHours(0, 0, 0, 0);

  // Per-day schedule — migrate from old single-hrs model if needed
  const weeklySchedule = migrateToWeeklySchedule(profile);
  const eligibleAssessmentDows = getAssessmentEligibleDows(weeklySchedule);
  const hasAssessmentEligibleDay = eligibleAssessmentDows.size > 0;

  // Rest days are derived from weeklySchedule (studyHours === 0)
  const studentRestDaySet = new Set(
    Object.entries(weeklySchedule)
      .filter(([, c]) => (c.studyHours || 0) === 0)
      .map(([d]) => parseInt(d, 10))
  );

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

  // Build set of calendar days that fall on assessment-eligible weekdays (≥6 hrs)
  const eligibleCalendarDaySet = new Set();
  for (let d = 0; d < totalCalendarDays; d++) {
    const dd = new Date(planStartDate);
    dd.setDate(planStartDate.getDate() + d);
    if (eligibleAssessmentDows.has(dd.getDay())) eligibleCalendarDaySet.add(d + 1);
  }
  // If no eligible days exist, pass null so scheduleAssessments falls back to unrestricted placement
  const effectiveEligible = eligibleCalendarDaySet.size > 0 ? eligibleCalendarDaySet : null;

  const assessmentSchedule = scheduleAssessments(profile, totalCalendarDays, hasExistingScores, effectiveEligible);
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

  // Bug 1 fix: also check student-entered assessments for review days.
  // If a student entered scores for an NBME taken on any plan day N-1 (or the day before
  // the plan started), today/the next plan day becomes a review day.
  // This covers onboarding entries ("I took NBME 26 yesterday") and mid-plan "Enter new scores".
  for (const taken of (profile.takenAssessments || [])) {
    if (!taken.takenDate) continue;
    const takenDate = new Date(taken.takenDate);
    takenDate.setHours(0, 0, 0, 0);
    // Which calendar day did the student take this assessment?
    // calendarDay 1 = planStartDate; calendarDay 0 = day before plan (yesterday)
    const msDiff = takenDate.getTime() - planStartDate.getTime();
    const daysTaken = Math.round(msDiff / (24 * 60 * 60 * 1000)) + 1; // e.g., 0 = yesterday, 1 = today
    const reviewCalDay = daysTaken + 1;
    if (reviewCalDay < 1 || reviewCalDay >= totalCalendarDays) continue;
    if (assessmentDayMap.has(reviewCalDay) || reviewDayMap.has(reviewCalDay)) continue;
    // Only full-length assessments (NBME, UWSA, Free 120) trigger a review day
    const practiceTest = PRACTICE_TESTS.find(t => t.id === taken.id);
    if (!practiceTest) continue;
    reviewDayMap.set(reviewCalDay, {
      day: daysTaken,
      test: practiceTest,
      label: practiceTest.name,
      reason: `You took ${practiceTest.name} — today is your dedicated review day.`,
      reviewHours: 2.0,
      source: 'student_entered',
    });
  }

  // Build day schedule
  let daySchedule = [];
  for (let d = 0; d < totalCalendarDays; d++) {
    const calendarDay = d + 1;
    const isLastDay = d === totalCalendarDays - 1;
    // Exam-week lockdown: applies only for plans ≥ 14 days, covers the 7 days before exam-eve + eve itself
    const isInLockdown = totalCalendarDays >= 14 && calendarDay >= totalCalendarDays - 8 && !isLastDay;
    const isExamEve = isInLockdown && calendarDay === totalCalendarDays - 1;
    const isExamWeekDay = isInLockdown && !isExamEve;
    // Per-day hours and start time from weeklySchedule
    const dayDate = new Date(planStartDate);
    dayDate.setDate(planStartDate.getDate() + d);
    const { hours: dayHours, startTime: dayStartTime } = getStudyHoursForDay(weeklySchedule, dayDate);
    // Student rest: weeklySchedule marks this day as 0 hours (and it's not an assessment or review day)
    const isStudentRest = dayHours === 0 && !assessmentDayMap.has(calendarDay) && !reviewDayMap.has(calendarDay);
    if (isLastDay) {
      daySchedule.push({ calendarDay, type: "rest", dayHours, dayStartTime });
    } else if (assessmentDayMap.has(calendarDay)) {
      // Assessments always override rest days — NBME/Free120 takes priority
      daySchedule.push({ calendarDay, type: "nbme", assessItem: assessmentDayMap.get(calendarDay), dayHours, dayStartTime });
    } else if (reviewDayMap.has(calendarDay)) {
      // Review day wins over student rest — exam data is time-sensitive
      daySchedule.push({ calendarDay, type: "review", prevAssessItem: reviewDayMap.get(calendarDay), dayHours, dayStartTime });
    } else if (isExamEve) {
      daySchedule.push({ calendarDay, type: "exam-eve", dayHours, dayStartTime });
    } else if (isExamWeekDay) {
      daySchedule.push({ calendarDay, type: "exam-week", dayHours, dayStartTime });
    } else if (isStudentRest) {
      daySchedule.push({ calendarDay, type: "student-rest", dayHours: 0, dayStartTime: null });
    } else if (d > 6 && (d + 1) % 7 === 0 && timelineMode !== "triage") {
      daySchedule.push({ calendarDay, type: "light", dayHours, dayStartTime });
    } else {
      daySchedule.push({ calendarDay, type: "study", dayHours, dayStartTime });
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
  // Tracks how many times each category has been used as focusTopic,
  // so getTopSubTopics can advance through the subtopic list on repeat days.
  const subTopicCursors = {};
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
        startTime: sched.dayStartTime || profile.studyStartTime || '07:00',
        dayHours: sched.dayHours ?? hrs,
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
      const reviewDayHrs = sched.dayHours ?? hrs;
      const reviewBlocks = [];

      // ── Short review day (≤3 hrs) — compressed structure ──────────────
      if (reviewDayHrs <= 3) {
        reviewBlocks.push(buildMorningRetentionBlock(ankiLevel, hasAnki, Math.min(0.5, reviewDayHrs * 0.15), false, ankiDeck));
        reviewBlocks.push({ type: "questions-focus", label: `${testName} — deep wrong-answer review`,
          tasks: [{ resource: "Self-review", activity: `System-by-system review of every wrong answer from ${testName}. For each: identify the concept, look it up in First Aid, annotate the margin.${hasAnki ? ` ${getUnsuspendInstruction(ankiDeck).charAt(0).toUpperCase() + getUnsuspendInstruction(ankiDeck).slice(1)} for any concept you missed.` : ''}`, hours: Math.max(0.5, reviewDayHrs - 0.75) }],
        });
        reviewBlocks.push({ type: "end-review", label: "Flag patterns for tomorrow",
          tasks: [{ resource: "Notes", activity: "Flag any recurring patterns for tomorrow's morning retention session.", hours: 0.25 }],
        });
        currentWeek.days.push({
          calendarDay: sched.calendarDay, dayType: "review", triageFor: testName,
          startTime: sched.dayStartTime || profile.studyStartTime || '07:00',
          dayLabel: 'Review day',
          blocks: reviewBlocks, totalQuestions: 0,
        });
        continue;
      }

      // Derive the weakest system from the student's current priorities
      // (priorities are ordered by score ASC — priority[0] = weakest/most urgent)
      const weakTopic = priorities[0];
      const weakSystem = weakTopic ? weakTopic.category : null;
      const weakSystemLabel = weakSystem || "weakest system";
      const reviewRes = weakTopic ? getRes(weakTopic.category) : { practice: [] };
      const reviewQBank = reviewRes.practice.length > 0 ? rn(reviewRes.practice[0]) : "Question bank";

      // Tier-specific review day blocks — structure varies by available hours
      // All tiers: retention → deep review → (lunch) → (content review) → (targeted Qs) → recalibration
      // Short days skip content review and questions entirely

      const retentionHrs = reviewDayHrs <= 3 ? Math.min(0.5, reviewDayHrs * 0.15) : (reviewDayHrs <= 7 ? 0.75 : 1.0);
      reviewBlocks.push(buildMorningRetentionBlock(ankiLevel, hasAnki, retentionHrs, false, ankiDeck));

      // Deep wrong-answer review — scales with available time
      const deepReviewHrs = reviewDayHrs <= 3 ? Math.max(0.5, reviewDayHrs - retentionHrs - 0.25)
        : reviewDayHrs <= 5 ? 2.0
        : reviewDayHrs <= 7 ? 2.5
        : 3.0;
      const deepReviewActivity = `System-by-system review of every wrong answer from ${testName}. For each missed question: (1) identify the exact concept, (2) look it up in First Aid — read the full section, not just the answer, (3) annotate the margin with the specific wrong-answer pattern${hasAnki ? `, (4) ${getUnsuspendInstruction(ankiDeck)} — do NOT create your own cards` : ', (4) star or flag the page for tomorrow\'s morning review'}. Work slowly — this review session is worth more than any single study day.`;
      reviewBlocks.push({ type: "catchup", label: `${testName} — deep wrong-answer review`,
        tasks: [{ resource: "Self-review", activity: deepReviewActivity, hours: deepReviewHrs }],
      });

      if (reviewDayHrs <= 3) {
        // SHORT day: retention + deep review + flag only — no content or questions
        reviewBlocks.push({ type: "end-review", label: "Flag patterns for tomorrow",
          tasks: [{ resource: "Notes", activity: "Flag any recurring patterns for tomorrow's morning retention session.", hours: 0.25 }],
        });
      } else {
        // MEDIUM+ days: add lunch → content review → targeted Qs → recalibration
        const lunchHrs = reviewDayHrs <= 5 ? 0.5 : reviewDayHrs <= 7 ? 0.75 : 1.0;
        reviewBlocks.push({ type: "lunch", label: "Lunch break",
          tasks: [{ resource: "Break", activity: "Step away completely. Eat, move, decompress.", hours: lunchHrs }],
        });

        // Content review — focused on weakest NBME system
        const contentHrs = reviewDayHrs <= 5 ? 0.5 : reviewDayHrs <= 7 ? 0.75 : 1.0;
        reviewBlocks.push({ type: "content", label: `Content review: ${weakSystemLabel} (weakest from ${testName})`,
          tasks: [{ resource: "First Aid", activity: `Review the ${weakSystemLabel} section in First Aid, focusing on the specific sub-topics where you had the most wrong answers on ${testName}. Read actively — annotate patterns you missed.`, hours: contentHrs }],
        });

        // Targeted questions — only for standard+ days (>5 hrs)
        if (reviewDayHrs > 5) {
          const targetedQCount = reviewDayHrs <= 7 ? 20 : 40;
          const targetedQHrs = reviewDayHrs <= 7 ? 1.25 : 2.0;
          reviewBlocks.push({
            type: "questions-focus",
            label: `${targetedQCount} Qs: ${weakSystemLabel}`,
            tasks: [
              { resource: reviewQBank, activity: `${targetedQCount} Qs — filtered to ${weakSystemLabel} (weakest from ${testName}). Timed, test mode. First test of whether the morning's review actually stuck.`, hours: targetedQCount <= 20 ? 0.75 : 1.25 },
              { resource: "Self-review", activity: `Thorough review of every wrong answer. Annotate the pattern, not the fact.`, hours: targetedQCount <= 20 ? 0.5 : 0.75 },
            ],
          });

          // Random maintenance block only for heavy days (>7 hrs)
          if (reviewDayHrs > 7) {
            reviewBlocks.push({ type: "questions-random", label: "Random maintenance: all systems", tasks: [
              { resource: reviewQBank, activity: `${qBlockSize} Qs — RANDOM, all systems, timed. Maintains broad coverage.`, hours: 0.75 },
              { resource: "Self-review", activity: "Wrong answers only — quick First Aid lookup per concept (2 min max).", hours: 0.25 },
            ]});
          }
        }

        reviewBlocks.push({ type: "end-review", label: "Plan recalibration check", tasks: [
          { resource: "Study plan", activity: `Review how your plan adjusted based on ${testName}'s new scores. Note which focus systems changed and why.`, hours: 0.5 },
        ]});
      }

      const reviewTotalQs = reviewDayHrs <= 5 ? 0
        : reviewDayHrs <= 7 ? 20
        : reviewDayHrs > 7 ? qBlockSize * 2 : 0;
      currentWeek.days.push({
        calendarDay: sched.calendarDay, dayType: "review", triageFor: testName,
        startTime: sched.dayStartTime || profile.studyStartTime || '07:00',
        dayLabel: `${testName} review day`,
        blocks: reviewBlocks, totalQuestions: reviewTotalQs,
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
      currentWeek.days.push({ calendarDay: sched.calendarDay, dayType: "rest", startTime: null, dayLabel: 'Rest', blocks: restBlocks });
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
        startTime: sched.dayStartTime || profile.studyStartTime || '07:00',
        dayLabel: 'Exam eve',
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
      // Per-day hours for exam-week block sizing
      const lockdownDayHrs = sched.dayHours ?? hrs;
      const lockdownAnkiHrs = hasAnki ? Math.min(1, roundToQuarterHour(lockdownDayHrs * 0.12)) : 0;
      const lockdownBlocks = [];
      if (hasAnki) {
        lockdownBlocks.push({ type: "anki", label: "Morning retention", tasks: [
          { resource: getDeckName(ankiDeck), activity: "Due reviews only — quick streak maintenance.", hours: lockdownAnkiHrs },
        ]});
      }
      lockdownBlocks.push({ type: "content-reactive", label: "Most-missed concepts review", tasks: [
        { resource: "First Aid + flagged notes", activity: "Quick pass through annotated notes and flagged cards from past NBMEs. 30–45 min max — only familiar review, no new reading. Focus on patterns that have tripped you up more than once.", hours: 0.5 },
      ]});
      // 2-3 random blocks based on available hours (targeting 80–120 Qs)
      const lockdownHrsAvail = lockdownDayHrs - lockdownAnkiHrs - 0.5 - 1.5; // minus anki, review, free-time buffer
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
        startTime: sched.dayStartTime || profile.studyStartTime || '07:00',
        dayLabel: getDayLabel(lockdownDayHrs, sched.dayStartTime),
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
        startTime: null, dayLabel: 'Rest',
        blocks: studentRestBlocks, totalQuestions: 0,
      });
      continue;
    }

    // ── Study / light day ─────────────────────────────────────────────
    studyDayNum++;
    const isLight = sched.type === "light";
    const isRamp = studyDayNum <= contentRampDays;
    const dayHrs = sched.dayHours ?? hrs;  // per-day hours, fallback to global
    const availHrs = isLight ? Math.round(dayHrs * 0.6 * 10) / 10 : dayHrs;
    const dayAnkiHrs = hasAnki ? Math.min(1, roundToQuarterHour(availHrs * 0.12)) : 0;

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

    // Subtopic offset: each visit to the same category shifts 3 positions in the
    // sorted subtopic list, so consecutive days on the same system show new topics.
    const _catKey = focusTopic?.category;
    const _subTopicVisit = _catKey ? (subTopicCursors[_catKey] || 0) : 0;
    const subTopicOffset = _subTopicVisit * 3;

    let blocks = [];
    const res1 = focusTopic ? getRes(focusTopic.category) : { learning: [], practice: [] };
    const primaryQBank = res1.practice.length > 0 ? rn(res1.practice[0]) : "Question bank";

    // ── BLOCK 1: Morning retention — always first, every day ──────────────
    // Content and duration vary by Anki experience level (see buildMorningRetentionBlock).
    const b1Hrs = hasAnki ? dayAnkiHrs : (availHrs <= 3 ? 0.5 : availHrs <= 5 ? 0.75 : 1.0);
    blocks.push(buildMorningRetentionBlock(ankiLevel, hasAnki, b1Hrs, studyDayNum === 1, ankiDeck));

    if (isLight) {
      // ── LIGHT DAY: Block 1 + shortened targeted Qs + 1 random block ──────
      // No Block 2 content review. Recovery pace — keep the habit, don't push.
      const lightFocusSubs = focusTopic ? getTopSubTopics(focusTopic.category, 5, profile.subTopicProgress || {}, subTopicOffset) : [];
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
      const topSubs = focusTopic ? getTopSubTopics(focusTopic.category, 3, profile.subTopicProgress || {}, subTopicOffset) : [];
      const focusSubTopics = focusTopic ? getTopSubTopics(focusTopic.category, 5, profile.subTopicProgress || {}, subTopicOffset) : [];
      const top3Short = topSubs.map(s => s.topic.split("(")[0].trim());
      const qbankFilterTip = getQbankFilterTip(primaryQBank, focusTopic?.category, focusSubTopics);

      // BLOCK 2 — Content review: gap-fill on high-yield sub-topics (MORNING, brain fresh)
      // NEVER placed after questions. Duration is derived from actual WATCH + READ step times.
      let b3ReviewHrs = params.b3ReviewHrs; // may grow if content review is shorter than params expected
      if (focusTopic) {
        // Build content sequence first — duration is computed from its steps, not hardcoded
        const contentSeqFull = getContentSequence(focusTopic.category, focusTopic.gapType, profile.resources || [], topSubs);
        // Short days (≤3 hrs): truncate to first WATCH step only — no READ step
        if (params.shortDay && contentSeqFull?.sequence?.length > 1) {
          contentSeqFull.sequence = [contentSeqFull.sequence[0]];
        }
        const contentSeqB2 = contentSeqFull || null;
        // Content review block time: fixed 30-minute default.
        // Video duration lookup has been replaced with static channel buttons.
        const hasFirstAidStep = (contentSeqFull?.sequence || []).some(s => s.resource === 'First Aid');
        const firstAidMins = hasFirstAidStep ? 20 : 0; // +20 min FA if included
        const seqMins = 30 + firstAidMins;
        const b2Hrs = seqMins > 0
          ? Math.ceil(seqMins / 5) * 5 / 60   // round up to nearest 5 min → hours
          : (isKG ? 0.75 : 0.5);               // fallback if sequence is somehow empty
        // Redistribute freed time → targeted Q review (skip on short days to preserve exact durations)
        if (!params.shortDay) {
          const prevB2Hrs = isKG ? params.b2Hrs : Math.min(params.b2Hrs, 0.75);
          b3ReviewHrs = roundToQuarterHour(params.b3ReviewHrs + Math.max(0, prevB2Hrs - b2Hrs));
        }
        const subLabel = top3Short.length > 0 ? top3Short.slice(0, 3).join(", ") : focusTopic.category;
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
      const effectiveQs = params.shortQs ?? qBlockSize; // 20 on short days, 40 on full days
      const prioritizeStr = top3Short.length > 0 ? `Prioritize: ${top3Short.join(", ")}` : "";
      blocks.push({
        type: "questions-focus",
        label: `Targeted questions: ${focusTopic?.category || "focus system"}`,
        highYield: focusSubTopics,
        primaryQBank,
        qbankFilterTip,
        tasks: [
          { resource: primaryQBank, activity: `${effectiveQs} Qs — ${focusTopic?.category || "focus system"} only, timed, test mode${prioritizeStr ? " · " + prioritizeStr : ""}`, hours: params.b3QHrs },
          { resource: "Review", activity: "Every question — right and wrong · For wrongs: identify the gap (mechanism, presentation, or recall) · Annotate First Aid for each missed concept", hours: b3ReviewHrs },
        ],
      });

      // LUNCH — explicit break between Block 3 (targeted) and Block 4 (random)
      // Short days (≤3 hrs, ≤5 hrs) skip the lunch break — session doesn't warrant it.
      if (params.lunchHrs > 0) {
        blocks.push({
          type: "lunch",
          label: "Lunch break",
          tasks: [{ resource: "Break", activity: "Step away completely — eat, move, decompress. Mental reset before afternoon execution mode.", hours: params.lunchHrs }],
        });
      }

      // BLOCK 4 — Mixed random timed question blocks (afternoon execution mode)
      // Two or three blocks of 40 Qs each (or 20 on short days). ALL systems, RANDOM.
      for (let rb = 0; rb < params.numRandom; rb++) {
        const blockLabel = params.numRandom === 1
          ? "Random block: all systems"
          : `Random block ${rb + 1} of ${params.numRandom}: all systems`;
        blocks.push({ type: "questions-random", label: blockLabel, tasks: [
          { resource: primaryQBank, activity: `${effectiveQs} Qs — RANDOM, all systems, timed. Context-switching between systems is the point — exam-day simulation.`, hours: params.shortDay ? 0.5 : 0.75 },
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

    // Advance the subtopic cursor for this category so the next visit shows different topics
    if (_catKey) subTopicCursors[_catKey] = _subTopicVisit + 1;
    if (focusTopic && !currentWeek.focusTopics.includes(focusTopic.category)) currentWeek.focusTopics.push(focusTopic.category);
    const params2 = getStudyDayParams(availHrs, hasAnki); // re-fetch to get shortDay/shortQs
    currentWeek.days.push({
      calendarDay: sched.calendarDay, dayType: sched.type, focusTopic: focusTopic?.category,
      focusGapType: focusTopic?.gapType, maintainTopics: [maint1, maint2].filter(Boolean).map(t => t.category),
      startTime: sched.dayStartTime || profile.studyStartTime || '07:00',
      dayLabel: getDayLabel(availHrs, sched.dayStartTime),
      blocks,
      totalQuestions: isLight
        ? (20 + qBlockSize)  // light day: 20 targeted + 40 random
        : params2.shortDay
          ? ((params2.shortQs ?? 20) * 2)  // short day: 20 targeted + 20 random = 40
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

  return { priorities, weeks, totalCalendarDays, totalWeeks, totalStudyDays, totalQEstimate, nbmeDays, topPriorities, midPriorities, timelineMode, contentRampDays, assessmentSchedule, noAssessmentEligibleDay: !hasAssessmentEligibleDay };
}
