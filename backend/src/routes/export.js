const express = require('express');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, ShadingType } = require('docx');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// ── Helper: get latest plan + profile for user ───────────────────────
function getUserPlanData(userId) {
  const planRow = db.prepare('SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId);
  if (!planRow) return null;

  const plan = JSON.parse(planRow.plan_data);
  const profile = JSON.parse(planRow.profile_snapshot);

  const assessmentRows = db.prepare(`
    SELECT form_name, scores, sticking_points, gap_types, created_at
    FROM assessments WHERE user_id = ? ORDER BY created_at ASC
  `).all(userId);

  const assessments = assessmentRows.map(r => ({
    formName: r.form_name,
    date: new Date(r.created_at).toLocaleDateString(),
    scores: JSON.parse(r.scores),
  }));

  return { plan, profile, assessments };
}

// ── Block type display names ─────────────────────────────────────────
const BLOCK_LABELS = {
  'anki': 'Morning Retention (Anki)',
  'questions-focus': 'Focus Block',
  'questions-random': 'Random Block',
  'questions': 'Question Block',
  'content': 'Content Foundation',
  'content-reactive': 'Reactive Content Review',
  'catchup': 'Catch-up / Review',
  'nbme': 'Practice NBME',
  'rest': 'Rest Day',
};

function blockLabel(type) {
  return BLOCK_LABELS[type] || type;
}

// ── GET /api/export/pdf ──────────────────────────────────────────────
router.get('/pdf', (req, res) => {
  const data = getUserPlanData(req.user.userId);
  if (!data) return res.status(404).json({ error: 'No study plan found. Generate a plan first.' });

  const { plan, profile, assessments } = data;
  const examName = profile.exam || 'Exam';
  const examDate = profile.examDate ? new Date(profile.examDate).toLocaleDateString() : 'Not set';

  const doc = new PDFDocument({ margin: 50, size: 'A4', compress: true });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="NBME-Study-Plan-${Date.now()}.pdf"`);
  doc.pipe(res);

  // ── Cover / header ──
  doc.fontSize(22).font('Helvetica-Bold').text('NBME Study Planner', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica').text('Personalised Study Plan', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e8dcc8').lineWidth(1).stroke();
  doc.moveDown(0.5);

  // ── Profile summary ──
  doc.fontSize(11).font('Helvetica-Bold').text('Profile', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text(`Exam: ${examName}  |  Exam Date: ${examDate}  |  Hours/Day: ${profile.hoursPerDay || 8}h`);
  doc.text(`Resources: ${(profile.resources || []).join(', ') || 'Not specified'}`);
  doc.moveDown(0.5);

  // ── Plan summary ──
  doc.fontSize(11).font('Helvetica-Bold').text('Plan Summary', { underline: true });
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total days: ${plan.totalCalendarDays}  |  Study days: ${plan.totalStudyDays}  |  Practice NBMEs: ${plan.nbmeDays}  |  Est. questions: ~${plan.totalQEstimate}`);
  doc.text(`Mode: ${plan.timelineMode}`);
  doc.moveDown(0.5);

  // ── Priority ranking ──
  doc.fontSize(11).font('Helvetica-Bold').text('Priority Ranking (Top 10)', { underline: true });
  doc.fontSize(9).font('Helvetica');
  (plan.priorities || []).slice(0, 10).forEach((p, i) => {
    const flag = p.flagged ? ' ★ Flagged' : '';
    doc.text(`${i + 1}. ${p.category} — ${p.score}% score, yield ${p.yield}/10${flag}`);
  });
  doc.moveDown(0.5);

  // ── Assessment history ──
  if (assessments.length > 0) {
    doc.fontSize(11).font('Helvetica-Bold').text('Assessment History', { underline: true });
    doc.fontSize(9).font('Helvetica');
    assessments.forEach((a, i) => {
      const cats = Object.keys(a.scores);
      const avg = cats.length > 0 ? Math.round(cats.reduce((s, c) => s + (a.scores[c] || 0), 0) / cats.length) : 0;
      doc.text(`#${i + 1} ${a.formName || `Assessment ${i + 1}`} — ${a.date} — Avg: ${avg}%`);
    });
    doc.moveDown(0.5);
  }

  // ── Week-by-week plan ──
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e8dcc8').lineWidth(1).stroke();
  doc.moveDown(0.3);
  doc.fontSize(14).font('Helvetica-Bold').text('Week-by-Week Plan', { align: 'center' });
  doc.moveDown(0.5);

  for (const week of (plan.weeks || [])) {
    if (doc.y > 720) doc.addPage();

    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor('#b45309')
      .text(`Week ${week.week}: ${week.phase || ''}`);
    doc.fillColor('#000000');

    if (week.focusTopics && week.focusTopics.length > 0) {
      doc.fontSize(9).font('Helvetica').text(`Focus topics: ${week.focusTopics.join(', ')}`);
    }
    doc.moveDown(0.3);

    for (const day of (week.days || [])) {
      if (doc.y > 720) doc.addPage();

      const dayLabel = day.dayType === 'nbme' ? `Day ${day.calendarDay} — PRACTICE NBME`
        : day.dayType === 'rest' ? `Day ${day.calendarDay} — Rest`
        : day.dayType === 'light' ? `Day ${day.calendarDay} — Light Day`
        : `Day ${day.calendarDay}${day.focusTopic ? ` — Focus: ${day.focusTopic}` : ''}`;

      doc.fontSize(10).font('Helvetica-Bold').text(dayLabel);
      if (day.totalQuestions > 0) {
        doc.fontSize(9).font('Helvetica').text(`  Total: ~${day.totalQuestions} questions`);
      }

      for (const block of (day.blocks || [])) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#2980b9').text(`    ${blockLabel(block.type)}: ${block.label}`);
        doc.fillColor('#000000');
        for (const task of (block.tasks || [])) {
          doc.fontSize(8.5).font('Helvetica').text(`      • ${task.resource} — ${task.activity} (${task.hours}h)`);
        }
      }
      doc.moveDown(0.25);
    }
    doc.moveDown(0.3);
  }

  doc.end();
});

// ── GET /api/export/docx ─────────────────────────────────────────────
router.get('/docx', async (req, res) => {
  const data = getUserPlanData(req.user.userId);
  if (!data) return res.status(404).json({ error: 'No study plan found. Generate a plan first.' });

  const { plan, profile, assessments } = data;
  const examName = profile.exam || 'Exam';
  const examDate = profile.examDate ? new Date(profile.examDate).toLocaleDateString() : 'Not set';

  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: 'NBME Study Planner — Personalised Study Plan',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Profile
  children.push(new Paragraph({ text: 'Profile', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'Exam: ', bold: true }), new TextRun(examName + '  |  '),
      new TextRun({ text: 'Date: ', bold: true }), new TextRun(examDate + '  |  '),
      new TextRun({ text: 'Hours/day: ', bold: true }), new TextRun(`${profile.hoursPerDay || 8}h`),
    ],
    spacing: { after: 80 },
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: 'Resources: ', bold: true }),
      new TextRun((profile.resources || []).join(', ') || 'Not specified'),
    ],
    spacing: { after: 200 },
  }));

  // Plan summary
  children.push(new Paragraph({ text: 'Plan Summary', heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({
    children: [
      new TextRun({ text: `${plan.totalStudyDays} study days`, bold: true }),
      new TextRun(`  |  ~${plan.totalQEstimate} questions  |  ${plan.nbmeDays} practice NBMEs  |  Mode: ${plan.timelineMode}`),
    ],
    spacing: { after: 200 },
  }));

  // Priority ranking
  children.push(new Paragraph({ text: 'Priority Ranking', heading: HeadingLevel.HEADING_2 }));
  (plan.priorities || []).slice(0, 10).forEach((p, i) => {
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${i + 1}. `, bold: true }),
        new TextRun({ text: p.category, bold: i < 3 }),
        new TextRun(` — ${p.score}% score, yield ${p.yield}/10${p.flagged ? ' ★' : ''}`),
      ],
      bullet: undefined,
      spacing: { after: 40 },
    }));
  });

  // Assessment history
  if (assessments.length > 0) {
    children.push(new Paragraph({ text: 'Assessment History', heading: HeadingLevel.HEADING_2, spacing: { before: 200 } }));
    assessments.forEach((a, i) => {
      const cats = Object.keys(a.scores);
      const avg = cats.length > 0 ? Math.round(cats.reduce((s, c) => s + (a.scores[c] || 0), 0) / cats.length) : 0;
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `#${i + 1} ${a.formName || `Assessment ${i + 1}`}`, bold: true }),
          new TextRun(` — ${a.date} — Avg: ${avg}%`),
        ],
        spacing: { after: 40 },
      }));
    });
  }

  // Week-by-week plan
  children.push(new Paragraph({
    text: 'Week-by-Week Study Plan',
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400 },
    pageBreakBefore: assessments.length > 0 || (plan.priorities || []).length > 0,
  }));

  for (const week of (plan.weeks || [])) {
    children.push(new Paragraph({
      text: `Week ${week.week}: ${week.phase || ''}`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 80 },
    }));

    if (week.focusTopics && week.focusTopics.length > 0) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: 'Focus topics: ', bold: true }),
          new TextRun(week.focusTopics.join(', ')),
        ],
        spacing: { after: 120 },
      }));
    }

    for (const day of (week.days || [])) {
      const dayHeader = day.dayType === 'nbme' ? `Day ${day.calendarDay} — PRACTICE NBME`
        : day.dayType === 'rest' ? `Day ${day.calendarDay} — Rest`
        : day.dayType === 'light' ? `Day ${day.calendarDay} — Light Day`
        : `Day ${day.calendarDay}${day.focusTopic ? ` — Focus: ${day.focusTopic}` : ''}`;

      const qNote = day.totalQuestions > 0 ? ` (~${day.totalQuestions} Qs)` : '';

      children.push(new Paragraph({
        children: [
          new TextRun({ text: dayHeader + qNote, bold: true, color: '1a1816' }),
        ],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 160, after: 60 },
      }));

      for (const block of (day.blocks || [])) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${blockLabel(block.type)}: `, bold: true, color: '2563eb' }),
            new TextRun(block.label),
          ],
          indent: { left: 360 },
          spacing: { before: 60, after: 40 },
        }));

        for (const task of (block.tasks || [])) {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${task.resource}`, bold: true }),
              new TextRun(` — ${task.activity}`),
              new TextRun({ text: `  (${task.hours}h)`, italics: true, color: '888888' }),
            ],
            bullet: { level: 0 },
            indent: { left: 720 },
            spacing: { after: 30 },
          }));
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
        },
      },
    },
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="NBME-Study-Plan-${Date.now()}.docx"`);
  res.send(buffer);
});

module.exports = router;
