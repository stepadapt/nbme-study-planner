const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../auth');

// ── POST /api/feedback ────────────────────────────────────────────────────
// Stores feedback from any widget. Automatically captures context from DB.
router.post('/', requireAuth, (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      feedback_type,
      rating = null,
      responses = {},
      plan_day = null,   // frontend can supply these if it knows them
      focus_system = null,
    } = req.body;

    if (!feedback_type) return res.status(400).json({ error: 'feedback_type is required' });

    // ── Auto-capture context ──────────────────────────────────────────
    let daysUntilExam = null;
    let latestScore   = null;

    const profile = db.prepare(
      'SELECT exam_date FROM user_profiles WHERE user_id = ?'
    ).get(userId);

    if (profile?.exam_date) {
      const examDate = new Date(profile.exam_date);
      const now      = new Date();
      daysUntilExam  = Math.ceil((examDate - now) / 86400000);
    }

    const latestAssessment = db.prepare(
      'SELECT scores FROM assessments WHERE user_id = ? ORDER BY COALESCE(taken_at, created_at) DESC LIMIT 1'
    ).get(userId);

    if (latestAssessment) {
      try {
        const s = JSON.parse(latestAssessment.scores);
        const vals = Object.values(s).filter(v => typeof v === 'number' && v > 0);
        if (vals.length > 0) {
          latestScore = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        }
      } catch { /* ignore */ }
    }

    db.prepare(`
      INSERT INTO feedback
        (user_id, feedback_type, rating, responses, plan_day, days_until_exam, latest_score, focus_system)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      feedback_type,
      rating,
      JSON.stringify(responses),
      plan_day,
      daysUntilExam,
      latestScore,
      focus_system,
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[feedback/post]', err);
    res.status(500).json({ error: 'Failed to save feedback.' });
  }
});

module.exports = router;
