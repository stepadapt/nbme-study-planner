const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/assessments — list active (non-archived) assessments for user
// Ordered by taken_at when available (historical imports), otherwise created_at
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, form_name, scores, sticking_points, gap_types, created_at, taken_at
    FROM assessments
    WHERE user_id = ? AND (is_archived = 0 OR is_archived IS NULL)
    ORDER BY COALESCE(taken_at, created_at) ASC
  `).all(req.user.userId);

  const assessments = rows.map(row => {
    const effectiveDate = row.taken_at || row.created_at;
    return {
      id: row.id,
      formName: row.form_name,
      date: new Date(effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      scores: JSON.parse(row.scores),
      stickingPoints: JSON.parse(row.sticking_points),
      gapTypes: JSON.parse(row.gap_types),
      createdAt: row.created_at,
      takenAt: row.taken_at || null,
    };
  });

  res.json({ assessments });
});

// POST /api/assessments — save a new assessment
// takenAt (optional ISO date string): the actual date the exam was taken —
// used for historical imports where the exam was taken before app signup.
router.post('/', (req, res) => {
  const { formName, scores, stickingPoints, gapTypes, takenAt } = req.body;
  if (!scores || typeof scores !== 'object') {
    return res.status(400).json({ error: 'scores object required' });
  }

  // Validate takenAt if provided
  let normalizedTakenAt = null;
  if (takenAt) {
    const d = new Date(takenAt);
    if (!isNaN(d.getTime())) {
      normalizedTakenAt = d.toISOString().split('T')[0]; // store as YYYY-MM-DD
    }
  }

  const result = db.prepare(`
    INSERT INTO assessments (user_id, form_name, scores, sticking_points, gap_types, taken_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    req.user.userId,
    formName || null,
    JSON.stringify(scores),
    JSON.stringify(stickingPoints || []),
    JSON.stringify(gapTypes || {}),
    normalizedTakenAt
  );

  const saved = db.prepare('SELECT * FROM assessments WHERE id = ?').get(result.lastInsertRowid);
  const effectiveDate = saved.taken_at || saved.created_at;
  res.status(201).json({
    assessment: {
      id: saved.id,
      formName: saved.form_name,
      date: new Date(effectiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      scores: JSON.parse(saved.scores),
      stickingPoints: JSON.parse(saved.sticking_points),
      gapTypes: JSON.parse(saved.gap_types),
      createdAt: saved.created_at,
      takenAt: saved.taken_at || null,
    }
  });
});

// DELETE /api/assessments/:id
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM assessments WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!row) return res.status(404).json({ error: 'Assessment not found' });
  db.prepare('DELETE FROM assessments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
