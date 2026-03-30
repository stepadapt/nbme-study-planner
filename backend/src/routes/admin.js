const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Admin auth middleware ──────────────────────────────────────────────────
// Validates the X-Admin-Key header against the ADMIN_SECRET env variable.
// Returns 401 if missing or wrong — never reveals whether the key exists.
const adminAuth = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    // ADMIN_SECRET not configured — lock down completely
    return res.status(503).json({ error: 'Admin access is not configured.' });
  }
  if (!key || key !== secret) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
};

// Apply admin auth to all routes in this router
router.use(adminAuth);

// ── GET /api/admin/stats ──────────────────────────────────────────────────
// Aggregate platform metrics
router.get('/stats', (req, res) => {
  try {
    const totals = db.prepare(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) AS verified_users,
        SUM(CASE WHEN created_at >= datetime('now', '-1 day')  THEN 1 ELSE 0 END) AS new_today,
        SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS new_this_week,
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS new_this_month
      FROM users
    `).get();

    const totalAssessments = db.prepare('SELECT COUNT(*) AS n FROM assessments').get().n;
    const totalPlans       = db.prepare('SELECT COUNT(*) AS n FROM study_plans').get().n;

    // Signups per day for the last 30 days
    const signupsByDay = db.prepare(`
      SELECT date(created_at) AS day, COUNT(*) AS count
      FROM users
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all();

    // Most popular exam types
    const examBreakdown = db.prepare(`
      SELECT exam, COUNT(*) AS count
      FROM user_profiles
      WHERE exam IS NOT NULL AND exam != ''
      GROUP BY exam
      ORDER BY count DESC
    `).all();

    res.json({
      totals,
      totalAssessments,
      totalPlans,
      signupsByDay,
      examBreakdown,
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────
// Full user list with activity summary — NO passwords returned
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        u.email_verified,
        COUNT(DISTINCT a.id)  AS assessment_count,
        COUNT(DISTINCT sp.id) AS plan_count,
        up.exam,
        up.exam_date,
        MAX(a.created_at) AS last_assessment_at
      FROM users u
      LEFT JOIN assessments   a  ON a.user_id  = u.id
      LEFT JOIN study_plans   sp ON sp.user_id = u.id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    res.json({ users });
  } catch (err) {
    console.error('[admin/users]', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────
// Single user detail — assessments + plans summary
router.get('/users/:id', (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user id.' });

    const user = db.prepare(`
      SELECT u.id, u.name, u.email, u.created_at, u.email_verified,
             up.exam, up.exam_date, up.hours_per_day, up.study_start_time, up.study_end_time
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ?
    `).get(userId);

    if (!user) return res.status(404).json({ error: 'User not found.' });

    const assessments = db.prepare(`
      SELECT id, form_name, created_at, scores
      FROM assessments
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId).map(a => ({
      ...a,
      scores: (() => { try { return JSON.parse(a.scores); } catch { return {}; } })(),
    }));

    const plans = db.prepare(`
      SELECT id, created_at, profile_snapshot
      FROM study_plans
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId).map(p => ({
      id: p.id,
      created_at: p.created_at,
    }));

    res.json({ user, assessments, plans });
  } catch (err) {
    console.error('[admin/users/:id]', err);
    res.status(500).json({ error: 'Failed to load user detail.' });
  }
});

module.exports = router;
