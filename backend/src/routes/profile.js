const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/profile
router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(req.user.userId);
  if (!profile) return res.json({ profile: null });
  res.json({
    profile: {
      exam: profile.exam,
      resources: JSON.parse(profile.resources || '[]'),
      examDate: profile.exam_date,
      hoursPerDay: profile.hours_per_day,
    }
  });
});

// PUT /api/profile
router.put('/', (req, res) => {
  const { exam, resources, examDate, hoursPerDay } = req.body;
  const existing = db.prepare('SELECT id FROM user_profiles WHERE user_id = ?').get(req.user.userId);

  if (existing) {
    db.prepare(`UPDATE user_profiles SET exam=?, resources=?, exam_date=?, hours_per_day=?, updated_at=datetime('now') WHERE user_id=?`)
      .run(exam || null, JSON.stringify(resources || []), examDate || null, hoursPerDay || 8, req.user.userId);
  } else {
    db.prepare('INSERT INTO user_profiles (user_id, exam, resources, exam_date, hours_per_day) VALUES (?, ?, ?, ?, ?)')
      .run(req.user.userId, exam || null, JSON.stringify(resources || []), examDate || null, hoursPerDay || 8);
  }

  res.json({ success: true });
});

module.exports = router;
