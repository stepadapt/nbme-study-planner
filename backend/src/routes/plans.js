const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/plans — list saved plans (summary only)
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, assessment_id, profile_snapshot, created_at
    FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.userId);

  const plans = rows.map(row => ({
    id: row.id,
    assessmentId: row.assessment_id,
    profileSnapshot: JSON.parse(row.profile_snapshot),
    createdAt: row.created_at,
  }));

  res.json({ plans });
});

// GET /api/plans/latest — get most recent plan with full data
router.get('/latest', (req, res) => {
  const row = db.prepare(`
    SELECT * FROM study_plans WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(req.user.userId);

  if (!row) return res.json({ plan: null });

  res.json({
    plan: {
      id: row.id,
      assessmentId: row.assessment_id,
      planData: JSON.parse(row.plan_data),
      profileSnapshot: JSON.parse(row.profile_snapshot),
      createdAt: row.created_at,
    }
  });
});

// POST /api/plans — save a generated plan
router.post('/', (req, res) => {
  const { planData, profileSnapshot, assessmentId } = req.body;
  if (!planData || !profileSnapshot) {
    return res.status(400).json({ error: 'planData and profileSnapshot required' });
  }

  const result = db.prepare(`
    INSERT INTO study_plans (user_id, assessment_id, plan_data, profile_snapshot)
    VALUES (?, ?, ?, ?)
  `).run(
    req.user.userId,
    assessmentId || null,
    JSON.stringify(planData),
    JSON.stringify(profileSnapshot)
  );

  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
