import { STEP1_CATEGORIES, HIGH_YIELD_WEIGHTS, RESOURCE_MAP, RESOURCES, SUB_TOPICS } from './data.js';

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

  const plan = generatePlan(profile, scores, stickingPoints, gapTypes);

  // Inject a diagnostic NBME at day 6 (prefer) → 5 → 7 → 8
  // This gives them real data to drive the first proper plan
  const TARGET_DAYS = [6, 5, 7, 8];
  let nbmeInjected = false;
  outer: for (const targetDay of TARGET_DAYS) {
    for (const week of plan.weeks) {
      for (let i = 0; i < week.days.length; i++) {
        const day = week.days[i];
        if (day.calendarDay === targetDay && day.dayType === 'study') {
          week.days[i] = {
            calendarDay: targetDay,
            dayType: 'nbme',
            totalQuestions: 0,
            blocks: [{
              type: 'nbme',
              label: 'Diagnostic Practice NBME',
              tasks: [
                { resource: 'NBME', activity: 'Full-length diagnostic exam — establishes your real baseline, no pressure on score', hours: 4 },
                { resource: 'Self-review', activity: 'Review scores and enter them into the app to unlock your fully personalised plan', hours: 1.5 },
              ],
            }],
          };
          plan.nbmeDays++;
          nbmeInjected = true;
          break outer;
        }
      }
    }
  }

  return { ...plan, firstTimer: true };
}

export function getPerformanceLevel(score) {
  if (score <= 25) return { label: "Needs attention", color: "#c0392b" };
  if (score <= 50) return { label: "Below average", color: "#e67e22" };
  if (score <= 75) return { label: "Average", color: "#2980b9" };
  return { label: "Strong", color: "#27ae60" };
}

export function generatePlan(profile, scores, stickingPoints, gapTypes) {
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

  const nbmeInterval = timelineMode === "triage" ? 999 : timelineMode === "compressed" ? 10 : 12;
  let daySchedule = [];
  let nbmeCount = 0;

  for (let d = 0; d < totalCalendarDays; d++) {
    const isLastDay = d === totalCalendarDays - 1;
    if (isLastDay) { daySchedule.push({ calendarDay: d + 1, type: "rest" }); }
    else if (d > 0 && d % nbmeInterval === 0 && d < totalCalendarDays - 2) { daySchedule.push({ calendarDay: d + 1, type: "nbme", nbmeNum: ++nbmeCount }); }
    else if (d > 6 && (d + 1) % 7 === 0 && timelineMode !== "triage") { daySchedule.push({ calendarDay: d + 1, type: "light" }); }
    else { daySchedule.push({ calendarDay: d + 1, type: "study" }); }
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

    if (sched.type === "nbme") {
      currentWeek.days.push({ calendarDay: sched.calendarDay, dayType: "nbme", blocks: [
        { type: "nbme", label: `Practice NBME #${sched.nbmeNum}`, tasks: [
          { resource: "NBME", activity: "Full-length practice exam under test conditions", hours: 4 },
          { resource: "Self-review", activity: "Score review + identify shifts in weak areas", hours: 1.5 },
        ]}
      ] });
      continue;
    }
    if (sched.type === "rest") {
      currentWeek.days.push({ calendarDay: sched.calendarDay, dayType: "rest", blocks: [
        { type: "rest", label: "Pre-exam rest", tasks: [
          { resource: hasAnki ? "AnKing Deck" : "Light review", activity: "Light Anki only — protect sleep and mental energy", hours: 0.5 },
        ]}
      ] });
      continue;
    }

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

  const totalStudyDays = daySchedule.filter(d => d.type === "study" || d.type === "light").length;
  const totalQEstimate = totalStudyDays * (1 + Math.max(0, Math.min(Math.floor(((hrs - ankiHrs) - 2.5) / 1.75), 4))) * qBlockSize;
  const nbmeDays = daySchedule.filter(d => d.type === "nbme").length;

  return { priorities, weeks, totalCalendarDays, totalWeeks, totalStudyDays, totalQEstimate, nbmeDays, topPriorities, midPriorities, timelineMode, contentRampDays };
}
