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

// ── GET /api/admin/feedback ───────────────────────────────────────────────
// Full feedback table with metrics. Query params: type, rating_max, rating_min,
// sort (newest|oldest|lowest_rating), limit, offset
router.get('/feedback', (req, res) => {
  try {
    const {
      type,
      rating_max,
      rating_min,
      sort = 'newest',
      limit: limRaw  = '100',
      offset: offRaw = '0',
    } = req.query;

    const limitN  = Math.min(parseInt(limRaw)  || 100, 500);
    const offsetN = parseInt(offRaw) || 0;

    // ── Build WHERE clause ──────────────────────────────────────────
    const conditions = [];
    const params     = [];

    if (type && type !== 'all') {
      conditions.push('f.feedback_type = ?');
      params.push(type);
    }
    if (rating_max) {
      conditions.push('f.rating <= ?');
      params.push(Number(rating_max));
    }
    if (rating_min) {
      conditions.push('f.rating >= ?');
      params.push(Number(rating_min));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const order = (
      sort === 'oldest'       ? 'f.created_at ASC' :
      sort === 'lowest_rating' ? 'CASE WHEN f.rating IS NULL THEN 1 ELSE 0 END ASC, f.rating ASC' :
      'f.created_at DESC'
    );

    // Total matching rows (for pagination)
    const countParams = [...params];
    const total = db.prepare(
      `SELECT COUNT(*) AS n FROM feedback f ${where}`
    ).get(...countParams).n;

    // Paginated rows
    const rows = db.prepare(`
      SELECT f.id, f.feedback_type, f.rating, f.responses,
             f.plan_day, f.days_until_exam, f.latest_score, f.focus_system,
             f.created_at,
             u.email AS user_email
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ${where}
      ORDER BY ${order}
      LIMIT ? OFFSET ?
    `).all(...params, limitN, offsetN);

    const feedback = rows.map(r => ({
      ...r,
      responses: (() => { try { return JSON.parse(r.responses); } catch { return {}; } })(),
    }));

    // ── Summary metrics ─────────────────────────────────────────────

    // Daily avg rating (last 7 days)
    const dailyAvgRow = db.prepare(`
      SELECT ROUND(AVG(rating), 2) AS avg, COUNT(*) AS count
      FROM feedback
      WHERE feedback_type = 'daily_rating' AND rating IS NOT NULL
        AND created_at >= datetime('now', '-7 days')
    `).get();

    // NPS from general feedback (1-10 scale)
    const npsRows = db.prepare(
      `SELECT rating FROM feedback WHERE feedback_type = 'general' AND rating IS NOT NULL`
    ).all();
    let nps = null;
    if (npsRows.length > 0) {
      const promoters  = npsRows.filter(r => r.rating >= 9).length;
      const detractors = npsRows.filter(r => r.rating <= 6).length;
      nps = Math.round(((promoters - detractors) / npsRows.length) * 100);
    }

    // Plan helped rate (post_nbme: rating 3 = Yes)
    const postNbmeRows = db.prepare(
      `SELECT rating FROM feedback WHERE feedback_type = 'post_nbme' AND rating IS NOT NULL`
    ).all();
    let planHelpedRate = null;
    if (postNbmeRows.length > 0) {
      planHelpedRate = Math.round(
        (postNbmeRows.filter(r => r.rating === 3).length / postNbmeRows.length) * 100
      );
    }

    // Churn reason breakdown (return_checkin)
    const churnRows = db.prepare(
      `SELECT responses FROM feedback WHERE feedback_type = 'return_checkin'`
    ).all();
    const churnCounts = {};
    for (const row of churnRows) {
      try {
        const r = JSON.parse(row.responses);
        if (r.reason) churnCounts[r.reason] = (churnCounts[r.reason] || 0) + 1;
      } catch { /* ignore */ }
    }
    const sortedChurn = Object.entries(churnCounts).sort((a, b) => b[1] - a[1]);
    const totalChurn  = churnRows.length;
    const churnBreakdown = sortedChurn.map(([reason, count]) => ({
      reason,
      count,
      pct: totalChurn > 0 ? Math.round((count / totalChurn) * 100) : 0,
    }));

    // Daily rating trend (last 14 days)
    const dailyTrend = db.prepare(`
      SELECT date(created_at) AS day,
             ROUND(AVG(rating), 2) AS avg_rating,
             COUNT(*) AS count
      FROM feedback
      WHERE feedback_type = 'daily_rating' AND rating IS NOT NULL
        AND created_at >= datetime('now', '-14 days')
      GROUP BY date(created_at)
      ORDER BY day ASC
    `).all();

    // ── Score outcome correlation ───────────────────────────────────
    // For users with daily_rating feedback: compare avg rating for improving
    // vs declining students (based on first vs last assessment avg score).
    const feedbackUsers = db.prepare(`
      SELECT user_id, AVG(rating) AS avg_rating
      FROM feedback WHERE feedback_type = 'daily_rating' AND rating IS NOT NULL
      GROUP BY user_id HAVING COUNT(*) >= 1
    `).all();

    let correlImproving = null;
    let correlDeclining = null;
    let correlImprovingCount = 0;
    let correlDecliningCount = 0;

    if (feedbackUsers.length > 0) {
      const improvingRatings = [];
      const decliningRatings = [];

      for (const fu of feedbackUsers) {
        const userScores = db.prepare(`
          SELECT scores FROM assessments
          WHERE user_id = ?
          ORDER BY COALESCE(taken_at, created_at) ASC
        `).all(fu.user_id);

        if (userScores.length < 2) continue;

        const avgScores = userScores.map(a => {
          try {
            const s    = JSON.parse(a.scores);
            const vals = Object.values(s).filter(v => typeof v === 'number' && v > 0);
            return vals.length > 0 ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
          } catch { return null; }
        }).filter(v => v !== null);

        if (avgScores.length < 2) continue;

        const delta = avgScores[avgScores.length - 1] - avgScores[0];
        if (delta > 0) improvingRatings.push(fu.avg_rating);
        else           decliningRatings.push(fu.avg_rating);
      }

      if (improvingRatings.length > 0) {
        correlImproving      = parseFloat((improvingRatings.reduce((a, b) => a + b, 0) / improvingRatings.length).toFixed(1));
        correlImprovingCount = improvingRatings.length;
      }
      if (decliningRatings.length > 0) {
        correlDeclining      = parseFloat((decliningRatings.reduce((a, b) => a + b, 0) / decliningRatings.length).toFixed(1));
        correlDecliningCount = decliningRatings.length;
      }
    }

    res.json({
      feedback,
      total,
      metrics: {
        daily_avg:          dailyAvgRow.avg    ? Number(dailyAvgRow.avg) : null,
        daily_avg_count:    dailyAvgRow.count  || 0,
        nps,
        nps_count:          npsRows.length,
        plan_helped_rate:   planHelpedRate,
        plan_helped_count:  postNbmeRows.length,
        top_churn_reason:   sortedChurn[0]?.[0] || null,
        churn_breakdown:    churnBreakdown,
        total_churn:        totalChurn,
      },
      daily_trend: dailyTrend,
      correlation: {
        improving_avg:   correlImproving,
        improving_count: correlImprovingCount,
        declining_avg:   correlDeclining,
        declining_count: correlDecliningCount,
      },
    });
  } catch (err) {
    console.error('[admin/feedback]', err);
    res.status(500).json({ error: 'Failed to load feedback.' });
  }
});

module.exports = router;
