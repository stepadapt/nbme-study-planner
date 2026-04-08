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
      studyStartTime: profile.study_start_time || '07:00',
      studyEndTime: profile.study_end_time || '17:00',
      takenAssessments: JSON.parse(profile.taken_assessments || '[]'),
      subTopicProgress: JSON.parse(profile.sub_topic_progress || '{}'),
      rest_days: JSON.parse(profile.rest_days || '[]'),
    }
  });
});

// PUT /api/profile
router.put('/', (req, res) => {
  const { exam, resources, examDate, hoursPerDay, studyStartTime, studyEndTime, takenAssessments, subTopicProgress, rest_days } = req.body;
  const existing = db.prepare('SELECT id FROM user_profiles WHERE user_id = ?').get(req.user.userId);

  if (existing) {
    db.prepare(`UPDATE user_profiles SET exam=?, resources=?, exam_date=?, hours_per_day=?, study_start_time=?, study_end_time=?, taken_assessments=?, sub_topic_progress=?, rest_days=?, updated_at=datetime('now') WHERE user_id=?`)
      .run(exam || null, JSON.stringify(resources || []), examDate || null, hoursPerDay || 8, studyStartTime || '07:00', studyEndTime || '17:00', JSON.stringify(takenAssessments || []), JSON.stringify(subTopicProgress || {}), JSON.stringify(rest_days || []), req.user.userId);
  } else {
    db.prepare('INSERT INTO user_profiles (user_id, exam, resources, exam_date, hours_per_day, study_start_time, study_end_time, taken_assessments, sub_topic_progress, rest_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(req.user.userId, exam || null, JSON.stringify(resources || []), examDate || null, hoursPerDay || 8, studyStartTime || '07:00', studyEndTime || '17:00', JSON.stringify(takenAssessments || []), JSON.stringify(subTopicProgress || {}), JSON.stringify(rest_days || []));
  }

  res.json({ success: true });
});

module.exports = router;
