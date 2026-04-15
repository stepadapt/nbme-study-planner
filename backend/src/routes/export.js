const express = require('express');
const PDFDocument = require('pdfkit');
const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType,
} = require('docx');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// ── Helper: get latest plan + profile for user ───────────────────────
function getUserPlanData(userId) {
  const planRow = db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
  if (!planRow) return null;

  const plan          = JSON.parse(planRow.plan_data);
  const profile       = JSON.parse(planRow.profile_snapshot);
  const planStartDate = new Date(planRow.created_at);

  const assessmentRows = db.prepare(`
    SELECT form_name, scores, sticking_points, gap_types, created_at
    FROM assessments WHERE user_id = ? ORDER BY created_at ASC
  `).all(userId);

  const assessments = assessmentRows.map(r => ({
    formName : r.form_name,
    date     : new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    scores   : JSON.parse(r.scores),
  }));

  return { plan, profile, assessments, planStartDate };
}

// ── Shared helpers ────────────────────────────────────────────────────
const BLOCK_SHORT = {
  'anki'            : 'Morning Retention',
  'questions-focus' : 'Focus Block',
  'questions-random': 'Random Block',
  'questions'       : 'Questions',
  'content'         : 'Content Review',
  'content-reactive': 'Reactive Review',
  'catchup'         : 'Catch-up',
  'nbme'            : 'NBME Assessment',
  'rest'            : 'Rest',
};
function blockShortLabel(type) { return BLOCK_SHORT[type] || type; }

function parseTimeToMin(t) {
  if (!t) return 7 * 60;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function fmtTime(min) {
  const h    = Math.floor(min / 60) % 24;
  const m    = min % 60;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12  = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function assignBlockTimes(blocks, studyStartTime, studyEndTime) {
  const startMin = parseTimeToMin(studyStartTime || '07:00');
  const endMin   = parseTimeToMin(studyEndTime   || '17:00');
  const midpoint = Math.floor((startMin + endMin) / 2);
  let cursor     = startMin;
  const result   = [];
  let lunchDone  = false;

  for (const block of (blocks || [])) {
    const durMin = Math.max(15, Math.round(
      (block.tasks || []).reduce((s, t) => s + (t.hours || 0), 0) * 60
    ));
    if (!lunchDone && cursor < midpoint && cursor + durMin > midpoint) {
      result.push({ type: 'lunch', label: '☕ Lunch break', startMin: midpoint });
      lunchDone = true;
      cursor    = midpoint + 30;
    }
    result.push({ ...block, startMin: cursor, endMin: cursor + durMin });
    cursor += durMin;
    if (durMin >= 60 && cursor + 15 < endMin) {
      result.push({ type: 'break', label: '⏸ Short break', startMin: cursor });
      cursor += 15;
    }
  }
  return result;
}

function avgScore(scores) {
  const cats = Object.keys(scores || {});
  return cats.length
    ? Math.round(cats.reduce((s, c) => s + (scores[c] || 0), 0) / cats.length)
    : 0;
}

function shortResource(name) {
  return (name || '')
    .replace(/UWorld/g,          'UW')
    .replace(/First Aid/g,       'FA')
    .replace(/AnKing Deck/g,     'AnKing')
    .replace(/AnKing/g,          'AnKing')
    .replace(/Mehlman Medical/g, 'Mehlman')
    .replace(/Amboss/g,          'AMBOSS');
}

// ── GET /api/export/pdf ──────────────────────────────────────────────
router.get('/pdf', (req, res) => {
  const data = getUserPlanData(req.user.userId);
  if (!data) return res.status(404).json({ error: 'No study plan found. Generate a plan first.' });

  const { plan, profile, assessments, planStartDate } = data;

  const examDate      = profile.examDate ? new Date(profile.examDate) : null;
  const today         = new Date();
  const daysRemaining = examDate ? Math.max(0, Math.ceil((examDate - today) / 86400000)) : null;
  const studyStart    = profile.studyStartTime || '07:00';
  const studyEnd      = profile.studyEndTime   || '17:00';

  function dayDate(calendarDay) {
    const d = new Date(planStartDate);
    d.setDate(d.getDate() + calendarDay - 1);
    return d;
  }
  function fmtDateShort(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  const DARK   = '#1a1816';
  const GOLD   = '#b45309';
  const BLUE   = '#1e40af';
  const GREEN  = '#15803d';
  const GRAY   = '#6b7280';
  const RED    = '#c0392b';
  const ORANGE = '#D85A30';
  const L = 50, R = 545, W = 495;

  function scoreColor(pct) {
    return pct < 50 ? RED : pct < 65 ? ORANGE : pct < 75 ? BLUE : GREEN;
  }

  const doc = new PDFDocument({ margin: 50, size: 'A4', compress: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="StepAdapt-Study-Plan-${Date.now()}.pdf"`);
  doc.pipe(res);

  // ══════════════════════════════════════════════
  // PAGE 1 · COVER + SUMMARY
  // ══════════════════════════════════════════════
  let y = 50;

  doc.rect(L, y, W, 48).fill(DARK);
  doc.fontSize(17).font('Helvetica-Bold').fillColor('#e8dcc8')
     .text('StepAdapt AI — Personalized Study Plan', L + 12, y + 10, { width: W - 24 });
  doc.fontSize(9).font('Helvetica').fillColor('#a89880')
     .text('USMLE Step 1 Schedule', L + 12, y + 31);
  y += 56;

  const examDateStr = examDate
    ? examDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not set';
  const resources = (profile.resources || []).join(', ') || 'Not specified';

  doc.rect(L, y, W, 52).fill('#f9f7f4');
  doc.moveTo(L, y    ).lineTo(R, y    ).strokeColor('#d6cfc4').lineWidth(0.5).stroke();
  doc.moveTo(L, y + 52).lineTo(R, y + 52).strokeColor('#d6cfc4').lineWidth(0.5).stroke();

  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('EXAM DATE', L + 8, y + 6);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(examDateStr, L + 8, y + 18, { width: 140 });

  const drColor = daysRemaining !== null && daysRemaining <= 14 ? RED
                : daysRemaining !== null && daysRemaining <= 30 ? ORANGE : GOLD;
  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('DAYS LEFT', L + 168, y + 6);
  doc.fontSize(22).font('Helvetica-Bold').fillColor(drColor)
     .text(daysRemaining !== null ? String(daysRemaining) : '—', L + 168, y + 14);

  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('HOURS/DAY', L + 238, y + 6);
  doc.fontSize(16).font('Helvetica-Bold').fillColor(DARK).text(`${profile.hoursPerDay || 8}h`, L + 238, y + 18);

  doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text('RESOURCES', L + 298, y + 6);
  doc.fontSize(8.5).font('Helvetica').fillColor(DARK).text(resources, L + 298, y + 18, { width: 240 });

  y += 60;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(GOLD).text('Plan at a Glance', L, y);
  y += 16;

  const stats = [
    { label: 'Calendar Days',  value: String(plan.totalCalendarDays || '—') },
    { label: 'Study Days',     value: String(plan.totalStudyDays    || '—') },
    { label: 'Practice NBMEs', value: String(plan.nbmeDays          || '—') },
    { label: 'Est. Questions', value: plan.totalQEstimate ? `~${plan.totalQEstimate}` : '—' },
    { label: 'Phase Mode',     value: plan.timelineMode              || '—' },
    { label: 'Weeks',          value: String((plan.weeks || []).length) },
  ];

  const cellW = Math.floor(W / 3);
  stats.forEach((s, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const sx = L + col * cellW, sy = y + row * 42;
    doc.rect(sx + 1, sy, cellW - 2, 40).fill('#f0f9f5');
    doc.rect(sx + 1, sy, 2, 40).fill('#1D9E75');
    doc.fontSize(7.5).font('Helvetica').fillColor(GRAY).text(s.label, sx + 8, sy + 6);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(DARK).text(s.value, sx + 8, sy + 18);
  });

  y += 2 * 42 + 12;

  doc.fontSize(11).font('Helvetica-Bold').fillColor(GOLD).text('Focus Areas by Priority', L, y);
  y += 16;

  const priorities = (plan.priorities || []).slice(0, 5);
  if (priorities.length === 0) {
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text('No assessment data yet — add scores to see prioritized topics.', L, y);
    y += 18;
  } else {
    priorities.forEach((p, i) => {
      const pct    = p.score || 0;
      const barW   = Math.round((pct / 100) * 170);
      const bColor = pct < 40 ? RED : pct < 60 ? ORANGE : pct < 80 ? BLUE : GREEN;
      const bg     = i % 2 === 0 ? '#f9f7f4' : '#ffffff';
      doc.rect(L, y, W, 20).fill(bg);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text(`${i + 1}. ${p.category}`, L + 6, y + 5, { width: 200 });
      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(`Yield ${p.yield}/10${p.flagged ? '  ★' : ''}`, L + 212, y + 6);
      doc.rect(L + 300, y + 5, 170, 10).fill('#e5e7eb');
      if (barW > 0) doc.rect(L + 300, y + 5, barW, 10).fill(bColor);
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(bColor).text(`${pct}%`, L + 476, y + 5);
      y += 20;
    });
  }

  y += 8;

  if (assessments.length > 0) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor(GOLD).text('Assessment History', L, y);
    y += 14;
    assessments.forEach((a, i) => {
      const avg    = avgScore(a.scores);
      const aColor = scoreColor(avg);
      doc.rect(L, y, 4, 14).fill(aColor);
      doc.fontSize(9).font('Helvetica').fillColor(DARK).text(a.formName || `Assessment ${i + 1}`, L + 10, y + 2, { width: 240 });
      doc.fillColor(GRAY).text(a.date, L + 270, y + 2, { width: 120 });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(aColor).text(`${avg}%`, L + 420, y + 2);
      y += 18;
    });
  }

  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
     .text(
       `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · StepAdapt AI`,
       L, 822, { align: 'center', width: W }
     );

  // ══════════════════════════════════════════════
  // PAGE 2 · HOW EVERY DAY WORKS
  // ══════════════════════════════════════════════
  doc.addPage();
  y = 50;

  doc.rect(L, y, W, 38).fill(DARK);
  doc.fontSize(15).font('Helvetica-Bold').fillColor('#e8dcc8').text('How Every Day Works', L + 12, y + 10);
  doc.fontSize(9).font('Helvetica').fillColor('#a89880')
     .text('This structure applies to every study day — topics rotate, the framework stays constant', L + 12, y + 26);
  y += 46;

  doc.fontSize(9.5).font('Helvetica').fillColor('#374151').text(
    'Every study day uses the same 5-block framework. Your focus topic changes daily, but the order ' +
    'of activities stays the same — this builds consistent habits and maximizes retention.',
    L, y, { width: W }
  );
  y += 36;

  const blocks5 = [
    { num: '1', icon: '🌅', name: 'Morning Retention (Anki)',
      when: 'First 45–60 min · before new content',
      what: "Review all due cards first, then unsuspend/find cards for today's focus topic. Do not study new content yet — retention before input.",
      bg: '#fef9ec', accent: '#d97706' },
    { num: '2', icon: '🎯', name: 'Focus Block',
      when: '~2 hours · timed 40-question sets',
      what: "All questions from today's focus topic only. Timed practice. Review every wrong answer immediately — this is your primary learning block.",
      bg: '#eff6ff', accent: '#2563eb' },
    { num: '3', icon: '🔀', name: 'Random Block',
      when: '~1–2 hours · mixed topics',
      what: 'Cross-system, randomized question sets. Simulates exam conditions, reinforces previously studied material, and fills retention gaps.',
      bg: '#f0fdf4', accent: '#16a34a' },
    { num: '4', icon: '📖', name: 'Content Foundation / Reactive Review',
      when: 'Afternoon · 1–2 hours',
      what: "Passive reading (Pathoma, Sketchy, First Aid) aligned to today's topic. If weak areas surfaced in today's questions, switch to reactive review of those concepts instead.",
      bg: '#faf5ff', accent: '#9333ea' },
    { num: '5', icon: '🔁', name: 'End-of-Day Review',
      when: 'Final 30–45 min',
      what: "Review all flagged questions · consolidate key facts · update Anki for any concept missed twice · prep tomorrow's topic.",
      bg: '#fff7ed', accent: '#ea580c' },
  ];

  blocks5.forEach(b => {
    if (y > 720) { doc.addPage(); y = 50; }
    const bh = 68;
    doc.rect(L, y, W, bh).fill(b.bg);
    doc.rect(L, y, 3, bh).fill(b.accent);
    doc.circle(L + 17, y + 14, 9).fill(b.accent);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff').text(b.num, L + 12, y + 9, { width: 10, align: 'center' });
    doc.fontSize(10).font('Helvetica-Bold').fillColor(DARK).text(`${b.icon}  ${b.name}`, L + 32, y + 6, { width: W - 38 });
    doc.fontSize(8).font('Helvetica').fillColor(b.accent).text(b.when, L + 32, y + 21);
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151').text(b.what, L + 32, y + 34, { width: W - 38 });
    y += bh + 6;
  });

  y += 10;
  doc.fontSize(11).font('Helvetica-Bold').fillColor(GOLD).text('Special Day Types', L, y);
  y += 14;

  [
    { name: '📋 NBME Practice Day',
      desc: 'Full 280-question timed exam (~7 hours across 4 blocks). No other study blocks. Review all wrong answers that evening.' },
    { name: '🌤 Light Day',
      desc: 'Reduced intensity — Morning Anki + passive content reading only. Scheduled around high-stress or travel periods.' },
    { name: '🔄 Catch-up Day',
      desc: 'Flexible block — revisit weak topics, clear a question backlog, or get ahead on upcoming content.' },
    { name: '🌿 Rest Day',
      desc: 'No structured study. Light Anki reviews optional (≤10 min). Prioritize sleep, exercise, and recovery.' },
  ].forEach(sd => {
    if (y > 790) { doc.addPage(); y = 50; }
    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text(sd.name, L, y, { width: 148 });
    doc.fontSize(8.5).font('Helvetica').fillColor('#374151').text(sd.desc, L + 152, y, { width: W - 152 });
    y += 22;
  });

  // ══════════════════════════════════════════════
  // PAGES 3+ · DAILY SCHEDULE (COMPACT DAY CARDS)
  // ══════════════════════════════════════════════
  doc.addPage();
  y = 50;

  for (const week of (plan.weeks || [])) {
    const weekDays = week.days || [];
    let weekRange  = '';
    if (weekDays.length) {
      const fd = dayDate(weekDays[0].calendarDay);
      const ld = dayDate(weekDays[weekDays.length - 1].calendarDay);
      weekRange = `${fd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${ld.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    const needsWeekH = 24 + (week.focusTopics && week.focusTopics.length ? 16 : 0);
    if (y + needsWeekH > 800) { doc.addPage(); y = 50; }

    doc.rect(L, y, W, 24).fill(DARK);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#e8dcc8')
       .text(`Week ${week.week}${week.phase ? ': ' + week.phase : ''}`, L + 8, y + 7, { width: 300 });
    if (weekRange) {
      doc.fontSize(8.5).font('Helvetica').fillColor('#a89880')
         .text(weekRange, R - 110, y + 8, { width: 105, align: 'right' });
    }
    y += 24;

    if (week.focusTopics && week.focusTopics.length) {
      doc.rect(L, y, W, 16).fill('#2a2724');
      doc.fontSize(7.5).font('Helvetica').fillColor('#9d8f7f')
         .text(`Focus: ${week.focusTopics.slice(0, 6).join(' · ')}`, L + 8, y + 3, { width: W - 16 });
      y += 16;
    }

    y += 4;

    for (const day of weekDays) {
      const isNBME  = day.dayType === 'nbme';
      const isRest  = day.dayType === 'rest';
      const isLight = day.dayType === 'light';
      const isCatch = day.dayType === 'catchup';

      const timedBlocks = (!isNBME && !isRest)
        ? assignBlockTimes(day.blocks || [], studyStart, studyEnd)
        : [];

      let cardH = 24;
      if (isRest) {
        cardH += 14;
      } else if (isNBME) {
        cardH += 30;
      } else {
        if (day.focusTopic) cardH += 13;
        cardH += timedBlocks.length * 14;
        cardH += 4;
      }
      cardH = Math.max(cardH, 38) + 3;

      if (y + cardH > 805) { doc.addPage(); y = 50; }

      const cardBg     = isNBME ? '#fff8f0' : isRest ? '#f2fbf5' : isLight ? '#f5f3ff' : isCatch ? '#f8fbff' : '#fafafa';
      const cardAccent = isNBME ? ORANGE     : isRest ? GREEN     : isLight ? '#6366f1' : isCatch ? BLUE      : '#b8b0a4';

      doc.rect(L, y, W, cardH - 3).fill(cardBg);
      doc.rect(L, y, 3, cardH - 3).fill(cardAccent);
      doc.moveTo(L, y + cardH - 3).lineTo(R, y + cardH - 3).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

      const dateStr = fmtDateShort(dayDate(day.calendarDay));
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text(`Day ${day.calendarDay}`, L + 8, y + 7, { width: 46 });
      doc.fontSize(8.5).font('Helvetica').fillColor(GRAY).text(dateStr, L + 58, y + 8, { width: 130 });

      const typeTag = isNBME ? 'NBME EXAM' : isRest ? 'REST' : isLight ? 'LIGHT' : isCatch ? 'CATCH-UP' : '';
      if (typeTag) {
        const tagW = doc.widthOfString(typeTag, { fontSize: 7 }) + 12;
        doc.rect(R - tagW - 4, y + 5, tagW, 14).fill(cardAccent);
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff').text(typeTag, R - tagW, y + 8, { width: tagW, align: 'center' });
      }

      if (!isRest && !isNBME && day.totalQuestions > 0) {
        doc.fontSize(8).font('Helvetica').fillColor(BLUE).text(`~${day.totalQuestions} Qs`, R - 62, y + 8, { width: 56, align: 'right' });
      }

      let ry = y + 22;

      if (isRest) {
        doc.fontSize(8).font('Helvetica').fillColor(GRAY)
           .text('No structured study. Light Anki reviews optional (≤10 min).', L + 8, ry, { width: W - 16 });
      } else if (isNBME) {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(ORANGE)
           .text('Full 280-question timed exam across 4 blocks (~7 hours)', L + 8, ry, { width: W - 16 });
        ry += 15;
        doc.fontSize(8).font('Helvetica').fillColor(GRAY)
           .text('No other study blocks this day. Review all incorrect answers this evening.', L + 8, ry, { width: W - 16 });
      } else {
        if (day.focusTopic) {
          doc.fontSize(8).font('Helvetica').fillColor(GRAY).text('Focus: ', L + 8, ry, { width: 38 });
          doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text(day.focusTopic, L + 48, ry, { width: W - 56 });
          ry += 13;
        }
        timedBlocks.forEach(tb => {
          if (tb.type === 'lunch' || tb.type === 'break') {
            doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(fmtTime(tb.startMin), L + 8, ry, { width: 54 });
            doc.fillColor('#a89880').text(tb.label, L + 66, ry, { width: 200 });
          } else {
            const resource = (tb.tasks && tb.tasks[0]) ? shortResource(tb.tasks[0].resource) : '';
            doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(fmtTime(tb.startMin), L + 8, ry, { width: 54 });
            doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text(blockShortLabel(tb.type), L + 66, ry, { width: 148 });
            if (resource) {
              doc.fontSize(8).font('Helvetica').fillColor(DARK).text(`· ${resource}`, L + 218, ry, { width: W - 226 });
            }
          }
          ry += 14;
        });
      }

      y += cardH;
    }

    y += 8;
  }

  doc.fontSize(7).font('Helvetica').fillColor(GRAY)
     .text(
       'StepAdapt AI · Personalized plans based on your assessment data · Results vary by individual',
       L, 826, { align: 'center', width: W }
     );

  doc.end();
});

// ── GET /api/export/docx ─────────────────────────────────────────────
router.get('/docx', async (req, res) => {
  const data = getUserPlanData(req.user.userId);
  if (!data) return res.status(404).json({ error: 'No study plan found. Generate a plan first.' });

  const { plan, profile, assessments, planStartDate } = data;

  const examDate      = profile.examDate ? new Date(profile.examDate) : null;
  const today         = new Date();
  const daysRemaining = examDate ? Math.max(0, Math.ceil((examDate - today) / 86400000)) : null;
  const studyStart    = profile.studyStartTime || '07:00';
  const studyEnd      = profile.studyEndTime   || '17:00';

  function dayDate(calendarDay) {
    const d = new Date(planStartDate);
    d.setDate(d.getDate() + calendarDay - 1);
    return d;
  }
  function fmtDateShort(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Colors without # for docx library
  const DARK   = '1a1816';
  const GOLD   = 'b45309';
  const BLUE   = '1e40af';
  const GREEN  = '15803d';
  const GRAY   = '6b7280';
  const RED    = 'c0392b';
  const ORANGE = 'D85A30';

  function scoreColor(pct) {
    return pct < 50 ? RED : pct < 65 ? ORANGE : pct < 75 ? BLUE : GREEN;
  }

  // Border / shading helpers
  const NONE_B = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const noBorders = { top: NONE_B, bottom: NONE_B, left: NONE_B, right: NONE_B };

  function accentLeft(color) {
    return { top: NONE_B, bottom: NONE_B, right: NONE_B, left: { style: BorderStyle.THICK, size: 24, color } };
  }

  function shade(fill) {
    return { type: ShadingType.SOLID, fill, color: 'auto' };
  }

  // Font size: pt → half-points for docx
  const sz = (pt) => Math.round(pt * 2);

  const children = [];

  // ══════════════════════════════════════════════
  // PAGE 1 · COVER + SUMMARY
  // ══════════════════════════════════════════════

  // Header bar
  children.push(new Paragraph({
    children: [new TextRun({ text: 'StepAdapt AI — Personalized Study Plan', bold: true, color: 'e8dcc8', size: sz(17) })],
    shading: shade(DARK),
    spacing: { before: 0, after: 20 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'USMLE Step 1 Schedule', color: 'a89880', size: sz(9) })],
    shading: shade(DARK),
    spacing: { before: 0, after: 200 },
  }));

  // Profile strip
  const examDateStr = examDate
    ? examDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not set';
  const resources = (profile.resources || []).join(', ') || 'Not specified';
  const drColor   = daysRemaining !== null && daysRemaining <= 14 ? RED
                  : daysRemaining !== null && daysRemaining <= 30 ? ORANGE : GOLD;
  const profileB  = {
    top   : { style: BorderStyle.SINGLE, size: 4, color: 'd6cfc4' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'd6cfc4' },
    left  : NONE_B, right: NONE_B,
  };
  const profMar = { top: 80, bottom: 80, left: 100, right: 60 };

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'EXAM DATE', color: GRAY, size: sz(7.5) })], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun({ text: examDateStr, bold: true, color: DARK, size: sz(10) })] }),
          ],
          shading: shade('f9f7f4'), borders: profileB, margins: profMar,
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'DAYS LEFT', color: GRAY, size: sz(7.5) })], spacing: { after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: daysRemaining !== null ? String(daysRemaining) : '—', bold: true, color: drColor, size: sz(22) })] }),
          ],
          shading: shade('f9f7f4'), borders: profileB, margins: profMar,
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'HOURS/DAY', color: GRAY, size: sz(7.5) })], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun({ text: `${profile.hoursPerDay || 8}h`, bold: true, color: DARK, size: sz(16) })] }),
          ],
          shading: shade('f9f7f4'), borders: profileB, margins: profMar,
        }),
        new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: 'RESOURCES', color: GRAY, size: sz(7.5) })], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun({ text: resources, color: DARK, size: sz(8.5) })] }),
          ],
          shading: shade('f9f7f4'), borders: profileB, margins: profMar,
        }),
      ],
    })],
  }));
  children.push(new Paragraph({ spacing: { after: 160 } }));

  // Plan at a Glance stats
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Plan at a Glance', bold: true, color: GOLD, size: sz(11) })],
    spacing: { before: 80, after: 80 },
  }));

  const stats = [
    { label: 'Calendar Days',  value: String(plan.totalCalendarDays || '—') },
    { label: 'Study Days',     value: String(plan.totalStudyDays    || '—') },
    { label: 'Practice NBMEs', value: String(plan.nbmeDays          || '—') },
    { label: 'Est. Questions', value: plan.totalQEstimate ? `~${plan.totalQEstimate}` : '—' },
    { label: 'Phase Mode',     value: plan.timelineMode              || '—' },
    { label: 'Weeks',          value: String((plan.weeks || []).length) },
  ];
  const statsMar = { top: 80, bottom: 80, left: 100, right: 60 };
  const statsRows = [];
  for (let row = 0; row < 2; row++) {
    statsRows.push(new TableRow({
      children: [0, 1, 2].map(col => {
        const s = stats[row * 3 + col];
        return new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: s.label, color: GRAY, size: sz(7.5) })], spacing: { after: 20 } }),
            new Paragraph({ children: [new TextRun({ text: s.value, bold: true, color: DARK, size: sz(14) })] }),
          ],
          shading: shade('f0f9f5'),
          borders: { ...noBorders, left: { style: BorderStyle.THICK, size: 12, color: '1D9E75' } },
          margins: statsMar,
        });
      }),
    }));
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: statsRows }));
  children.push(new Paragraph({ spacing: { after: 160 } }));

  // Focus Areas by Priority
  children.push(new Paragraph({
    children: [new TextRun({ text: 'Focus Areas by Priority', bold: true, color: GOLD, size: sz(11) })],
    spacing: { before: 80, after: 80 },
  }));

  const priorities = (plan.priorities || []).slice(0, 5);
  if (priorities.length === 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'No assessment data yet — add scores to see prioritized topics.', color: GRAY, size: sz(9) })],
    }));
  } else {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: priorities.map((p, i) => {
        const pct    = p.score || 0;
        const bColor = pct < 40 ? RED : pct < 60 ? ORANGE : pct < 80 ? BLUE : GREEN;
        const bg     = i % 2 === 0 ? 'f9f7f4' : 'ffffff';
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${i + 1}. ${p.category}`, bold: true, color: DARK, size: sz(9) })] })],
              shading: shade(bg), borders: noBorders,
              width: { size: 60, type: WidthType.PERCENTAGE },
              margins: { left: 60, top: 40, bottom: 40 },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `Yield ${p.yield}/10${p.flagged ? ' ★' : ''}`, color: GRAY, size: sz(8) })] })],
              shading: shade(bg), borders: noBorders,
              width: { size: 25, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40 },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${pct}%`, bold: true, color: bColor, size: sz(9) })], alignment: AlignmentType.RIGHT })],
              shading: shade(bg), borders: noBorders,
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: { right: 60, top: 40, bottom: 40 },
            }),
          ],
        });
      }),
    }));
  }
  children.push(new Paragraph({ spacing: { after: 160 } }));

  // Assessment History
  if (assessments.length > 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Assessment History', bold: true, color: GOLD, size: sz(11) })],
      spacing: { before: 80, after: 80 },
    }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: assessments.map((a, i) => {
        const avg    = avgScore(a.scores);
        const aColor = scoreColor(avg);
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: a.formName || `Assessment ${i + 1}`, color: DARK, size: sz(9) })] })],
              borders: { ...noBorders, left: { style: BorderStyle.THICK, size: 16, color: aColor } },
              width: { size: 55, type: WidthType.PERCENTAGE },
              margins: { left: 80, top: 40, bottom: 40 },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: a.date, color: GRAY, size: sz(8.5) })] })],
              borders: noBorders,
              width: { size: 30, type: WidthType.PERCENTAGE },
              margins: { top: 40, bottom: 40 },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${avg}%`, bold: true, color: aColor, size: sz(9) })], alignment: AlignmentType.RIGHT })],
              borders: noBorders,
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: { right: 60, top: 40, bottom: 40 },
            }),
          ],
        });
      }),
    }));
    children.push(new Paragraph({ spacing: { after: 120 } }));
  }

  // ══════════════════════════════════════════════
  // PAGE 2 · HOW EVERY DAY WORKS
  // ══════════════════════════════════════════════

  children.push(new Paragraph({
    children: [new TextRun({ text: 'How Every Day Works', bold: true, color: 'e8dcc8', size: sz(15) })],
    shading: shade(DARK),
    pageBreakBefore: true,
    spacing: { before: 0, after: 20 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: 'This structure applies to every study day — topics rotate, the framework stays constant', color: 'a89880', size: sz(9) })],
    shading: shade(DARK),
    spacing: { before: 0, after: 200 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({
      text: 'Every study day uses the same 5-block framework. Your focus topic changes daily, but the order of activities stays the same — this builds consistent habits and maximizes retention.',
      color: '374151', size: sz(9.5),
    })],
    spacing: { before: 0, after: 160 },
  }));

  const docxBlocks5 = [
    { icon: '🌅', name: 'Morning Retention (Anki)',
      when: 'First 45–60 min · before new content',
      what: "Review all due cards first, then unsuspend/find cards for today's focus topic. Do not study new content yet — retention before input.",
      bg: 'fef9ec', accent: 'd97706' },
    { icon: '🎯', name: 'Focus Block',
      when: '~2 hours · timed 40-question sets',
      what: "All questions from today's focus topic only. Timed practice. Review every wrong answer immediately — this is your primary learning block.",
      bg: 'eff6ff', accent: '2563eb' },
    { icon: '🔀', name: 'Random Block',
      when: '~1–2 hours · mixed topics',
      what: 'Cross-system, randomized question sets. Simulates exam conditions, reinforces previously studied material, and fills retention gaps.',
      bg: 'f0fdf4', accent: '16a34a' },
    { icon: '📖', name: 'Content Foundation / Reactive Review',
      when: 'Afternoon · 1–2 hours',
      what: "Passive reading (Pathoma, Sketchy, First Aid) aligned to today's topic. If weak areas surfaced in today's questions, switch to reactive review of those concepts instead.",
      bg: 'faf5ff', accent: '9333ea' },
    { icon: '🔁', name: 'End-of-Day Review',
      when: 'Final 30–45 min',
      what: "Review all flagged questions · consolidate key facts · update Anki for any concept missed twice · prep tomorrow's topic.",
      bg: 'fff7ed', accent: 'ea580c' },
  ];

  docxBlocks5.forEach(b => {
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          children: [
            new Paragraph({ children: [new TextRun({ text: `${b.icon}  ${b.name}`, bold: true, color: DARK, size: sz(10) })], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun({ text: b.when, color: b.accent, size: sz(8) })], spacing: { after: 40 } }),
            new Paragraph({ children: [new TextRun({ text: b.what, color: '374151', size: sz(8.5) })] }),
          ],
          shading: shade(b.bg),
          borders: { ...noBorders, left: { style: BorderStyle.THICK, size: 24, color: b.accent } },
          margins: { top: 80, bottom: 80, left: 120, right: 80 },
        })],
      })],
    }));
    children.push(new Paragraph({ spacing: { after: 60 } }));
  });

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Special Day Types', bold: true, color: GOLD, size: sz(11) })],
    spacing: { before: 120, after: 80 },
  }));
  [
    { name: '📋 NBME Practice Day',
      desc: 'Full 280-question timed exam (~7 hours across 4 blocks). No other study blocks. Review all wrong answers that evening.' },
    { name: '🌤 Light Day',
      desc: 'Reduced intensity — Morning Anki + passive content reading only. Scheduled around high-stress or travel periods.' },
    { name: '🔄 Catch-up Day',
      desc: 'Flexible block — revisit weak topics, clear a question backlog, or get ahead on upcoming content.' },
    { name: '🌿 Rest Day',
      desc: 'No structured study. Light Anki reviews optional (≤10 min). Prioritize sleep, exercise, and recovery.' },
  ].forEach(sd => {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: sd.name + '  ', bold: true, color: DARK, size: sz(9) }),
        new TextRun({ text: sd.desc, color: '374151', size: sz(8.5) }),
      ],
      spacing: { after: 80 },
    }));
  });

  // ══════════════════════════════════════════════
  // PAGES 3+ · DAILY SCHEDULE
  // ══════════════════════════════════════════════

  let firstWeek = true;

  for (const week of (plan.weeks || [])) {
    const weekDays = week.days || [];
    let weekRange  = '';
    if (weekDays.length) {
      const fd = dayDate(weekDays[0].calendarDay);
      const ld = dayDate(weekDays[weekDays.length - 1].calendarDay);
      weekRange = `${fd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${ld.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    // Week header
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Week ${week.week}${week.phase ? ': ' + week.phase : ''}`, bold: true, color: 'e8dcc8', size: sz(11) }),
        ...(weekRange ? [new TextRun({ text: `    ${weekRange}`, color: 'a89880', size: sz(8.5) })] : []),
      ],
      shading: shade(DARK),
      pageBreakBefore: firstWeek,
      spacing: { before: firstWeek ? 0 : 240, after: 0 },
    }));
    firstWeek = false;

    if (week.focusTopics && week.focusTopics.length) {
      children.push(new Paragraph({
        children: [new TextRun({ text: `Focus: ${week.focusTopics.slice(0, 6).join(' · ')}`, color: '9d8f7f', size: sz(7.5) })],
        shading: shade('2a2724'),
        spacing: { before: 0, after: 80 },
      }));
    } else {
      children.push(new Paragraph({ spacing: { after: 60 } }));
    }

    // Day cards
    for (const day of weekDays) {
      const isNBME  = day.dayType === 'nbme';
      const isRest  = day.dayType === 'rest';
      const isLight = day.dayType === 'light';
      const isCatch = day.dayType === 'catchup';

      const timedBlocks = (!isNBME && !isRest)
        ? assignBlockTimes(day.blocks || [], studyStart, studyEnd)
        : [];

      const dateStr    = fmtDateShort(dayDate(day.calendarDay));
      const cardAccent = isNBME ? ORANGE : isRest ? GREEN : isLight ? '6366f1' : isCatch ? BLUE : 'b8b0a4';
      const cardBg     = isNBME ? 'fff8f0' : isRest ? 'f2fbf5' : isLight ? 'f5f3ff' : isCatch ? 'f8fbff' : 'fafafa';
      const typeTag    = isNBME ? 'NBME EXAM' : isRest ? 'REST' : isLight ? 'LIGHT' : isCatch ? 'CATCH-UP' : '';
      const cardMar    = { top: 50, bottom: 40, left: 100, right: 40 };

      const cardRows = [];

      // Header row
      cardRows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [
                new TextRun({ text: `Day ${day.calendarDay}`, bold: true, color: DARK, size: sz(9) }),
                new TextRun({ text: `  ·  ${dateStr}`, color: GRAY, size: sz(8.5) }),
              ],
            })],
            shading: shade(cardBg),
            borders: accentLeft(cardAccent),
            width: { size: 70, type: WidthType.PERCENTAGE },
            margins: cardMar,
          }),
          new TableCell({
            children: [new Paragraph({
              children: [
                ...(typeTag ? [new TextRun({ text: typeTag, bold: true, color: cardAccent, size: sz(7.5) })] : []),
                ...(!isRest && !isNBME && day.totalQuestions > 0
                  ? [new TextRun({ text: (typeTag ? '    ' : '') + `~${day.totalQuestions} Qs`, color: BLUE, size: sz(8) })]
                  : []),
              ],
              alignment: AlignmentType.RIGHT,
            })],
            shading: shade(cardBg),
            borders: noBorders,
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 50, bottom: 40, right: 60 },
          }),
        ],
      }));

      // Body
      if (isRest) {
        cardRows.push(new TableRow({
          children: [new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'No structured study. Light Anki reviews optional (≤10 min).', color: GRAY, size: sz(8) })] })],
            columnSpan: 2,
            shading: shade(cardBg),
            borders: accentLeft(cardAccent),
            margins: { top: 30, bottom: 60, left: 100, right: 40 },
          })],
        }));
      } else if (isNBME) {
        cardRows.push(new TableRow({
          children: [new TableCell({
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Full 280-question timed exam across 4 blocks (~7 hours)', bold: true, color: ORANGE, size: sz(8.5) })], spacing: { after: 40 } }),
              new Paragraph({ children: [new TextRun({ text: 'No other study blocks this day. Review all incorrect answers this evening.', color: GRAY, size: sz(8) })] }),
            ],
            columnSpan: 2,
            shading: shade(cardBg),
            borders: accentLeft(cardAccent),
            margins: { top: 30, bottom: 60, left: 100, right: 40 },
          })],
        }));
      } else {
        // Focus topic row
        if (day.focusTopic) {
          cardRows.push(new TableRow({
            children: [new TableCell({
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'Focus: ', color: GRAY, size: sz(8) }),
                  new TextRun({ text: day.focusTopic, bold: true, color: DARK, size: sz(8) }),
                ],
              })],
              columnSpan: 2,
              shading: shade(cardBg),
              borders: accentLeft(cardAccent),
              margins: { top: 30, bottom: 30, left: 100, right: 40 },
            })],
          }));
        }

        // Timed schedule rows
        timedBlocks.forEach(tb => {
          const isBreakRow = tb.type === 'lunch' || tb.type === 'break';
          const resource   = (!isBreakRow && tb.tasks && tb.tasks[0])
            ? shortResource(tb.tasks[0].resource)
            : '';

          cardRows.push(new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: fmtTime(tb.startMin), color: GRAY, size: sz(8) })] })],
                shading: shade(cardBg),
                borders: accentLeft(cardAccent),
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { top: 25, bottom: 25, left: 100, right: 40 },
              }),
              new TableCell({
                children: [new Paragraph({
                  children: isBreakRow
                    ? [new TextRun({ text: tb.label, color: 'a89880', size: sz(8) })]
                    : [
                        new TextRun({ text: blockShortLabel(tb.type), bold: true, color: BLUE, size: sz(8) }),
                        ...(resource ? [new TextRun({ text: `  ·  ${resource}`, color: DARK, size: sz(8) })] : []),
                      ],
                })],
                shading: shade(cardBg),
                borders: noBorders,
                width: { size: 85, type: WidthType.PERCENTAGE },
                margins: { top: 25, bottom: 25, right: 40 },
              }),
            ],
          }));
        });

        // Bottom padding row
        cardRows.push(new TableRow({
          children: [new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ' ' })] })],
            columnSpan: 2,
            shading: shade(cardBg),
            borders: accentLeft(cardAccent),
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
          })],
        }));
      }

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: cardRows }));
      children.push(new Paragraph({ spacing: { after: 80 } }));
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: sz(9) } },
      },
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="StepAdapt-Study-Plan-${Date.now()}.docx"`);
  res.send(buffer);
});

module.exports = router;
