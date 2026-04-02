const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/reset/full — delete all study data, preserve account + profile settings
router.post('/full', (req, res) => {
  const uid = req.user.userId;
  db.prepare('DELETE FROM assessments WHERE user_id = ?').run(uid);
  db.prepare('DELETE FROM study_plans WHERE user_id = ?').run(uid);
  db.prepare(`UPDATE user_profiles SET taken_assessments='[]', sub_topic_progress='{}' WHERE user_id=?`).run(uid);
  res.json({ success: true });
});

// POST /api/reset/keep-scores — delete plans only, preserve all assessment history
router.post('/keep-scores', (req, res) => {
  const uid = req.user.userId;
  db.prepare('DELETE FROM study_plans WHERE user_id = ?').run(uid);
  db.prepare(`UPDATE user_profiles SET sub_topic_progress='{}' WHERE user_id=?`).run(uid);
  res.json({ success: true });
});

// POST /api/reset/archive — soft-archive all current data and create a cycle record
router.post('/archive', (req, res) => {
  const uid = req.user.userId;
  const count = db.prepare(
    'SELECT COUNT(*) as cnt FROM assessments WHERE user_id = ? AND is_archived = 0'
  ).get(uid);
  const cycle = db.prepare(`
    INSERT INTO study_cycles (user_id, label, assessment_count, archived_at)
    VALUES (?, ?, ?, datetime('now'))
  `).run(
    uid,
    `Archived — ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
    count?.cnt || 0
  );
  db.prepare('UPDATE assessments SET is_archived = 1 WHERE user_id = ? AND is_archived = 0').run(uid);
  db.prepare('UPDATE study_plans SET is_archived = 1 WHERE user_id = ? AND is_archived = 0').run(uid);
  db.prepare(`UPDATE user_profiles SET taken_assessments='[]', sub_topic_progress='{}' WHERE user_id=?`).run(uid);
  res.json({ success: true, cycleId: cycle.lastInsertRowid });
});

module.exports = router;
