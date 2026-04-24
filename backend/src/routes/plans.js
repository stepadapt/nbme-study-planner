const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/plans/archived-cycles — list archived study cycles
router.get('/archived-cycles', (req, res) => {
  const cycles = db.prepare(
    'SELECT id, label, assessment_count, archived_at FROM study_cycles WHERE user_id = ? ORDER BY archived_at DESC'
  ).all(req.user.userId);
  res.json({ cycles });
});

// GET /api/plans — list active (non-archived) plans (summary only)
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, assessment_id, profile_snapshot, created_at
    FROM study_plans WHERE user_id = ? AND (is_archived = 0 OR is_archived IS NULL) ORDER BY created_at DESC LIMIT 20
  `).all(req.user.userId);

  const plans = rows.map(row => ({
    id: row.id,
    assessmentId: row.assessment_id,
    profileSnapshot: JSON.parse(row.profile_snapshot),
    createdAt: row.created_at,
  }));

  res.json({ plans });
});

// GET /api/plans/latest — get most recent active (non-archived) plan with full data
router.get('/latest', (req, res) => {
  const row = db.prepare(`
    SELECT * FROM study_plans WHERE user_id = ? AND (is_archived = 0 OR is_archived IS NULL) ORDER BY created_at DESC LIMIT 1
  `).get(req.user.userId);

  if (!row) return res.json({ plan: null });

  res.json({
    plan: {
      id: row.id,
      assessmentId: row.assessment_id,
      planData: JSON.parse(row.plan_data),
      profileSnapshot: JSON.parse(row.profile_snapshot),
      createdAt: row.created_at,
      engineVersion: row.engine_version || 0,
    }
  });
});

// PUT /api/plans/:id — update plan in-place, preserving created_at.
// Pass createdAt in body only for the one-time reset-recovery case (restores original start date).
router.put('/:id', (req, res) => {
  const { planData, profileSnapshot, engineVersion, createdAt } = req.body;
  if (!planData || !profileSnapshot) {
    return res.status(400).json({ error: 'planData and profileSnapshot required' });
  }
  const row = db.prepare('SELECT id FROM study_plans WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.userId);
  if (!row) return res.status(404).json({ error: 'Plan not found' });

  if (createdAt) {
    db.prepare('UPDATE study_plans SET plan_data=?, profile_snapshot=?, engine_version=?, created_at=? WHERE id=? AND user_id=?')
      .run(JSON.stringify(planData), JSON.stringify(profileSnapshot), engineVersion || 0, createdAt, req.params.id, req.user.userId);
  } else {
    db.prepare('UPDATE study_plans SET plan_data=?, profile_snapshot=?, engine_version=? WHERE id=? AND user_id=?')
      .run(JSON.stringify(planData), JSON.stringify(profileSnapshot), engineVersion || 0, req.params.id, req.user.userId);
  }
  res.json({ id: parseInt(req.params.id) });
});

// POST /api/plans — save a generated plan
router.post('/', (req, res) => {
  const { planData, profileSnapshot, assessmentId, engineVersion } = req.body;
  if (!planData || !profileSnapshot) {
    return res.status(400).json({ error: 'planData and profileSnapshot required' });
  }

  const result = db.prepare(`
    INSERT INTO study_plans (user_id, assessment_id, plan_data, profile_snapshot, engine_version)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    req.user.userId,
    assessmentId || null,
    JSON.stringify(planData),
    JSON.stringify(profileSnapshot),
    engineVersion || 0
  );

  res.status(201).json({ id: result.lastInsertRowid, createdAt: new Date().toISOString() });
});

module.exports = router;
