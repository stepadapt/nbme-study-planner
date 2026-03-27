const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseBlocks(rows) {
  return rows.map(row => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    dayName: DAYS[row.day_of_week],
    startTime: row.start_time,
    endTime: row.end_time,
    label: row.label,
  }));
}

// GET /api/schedule
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM class_schedule WHERE user_id = ? ORDER BY day_of_week, start_time
  `).all(req.user.userId);
  res.json({ schedule: parseBlocks(rows) });
});

// PUT /api/schedule — replace the full schedule
router.put('/', (req, res) => {
  const { blocks } = req.body;
  if (!Array.isArray(blocks)) {
    return res.status(400).json({ error: 'blocks array required' });
  }

  // Validate each block
  for (const b of blocks) {
    if (b.dayOfWeek < 0 || b.dayOfWeek > 6) {
      return res.status(400).json({ error: `Invalid dayOfWeek: ${b.dayOfWeek}` });
    }
    if (!b.startTime || !b.endTime) {
      return res.status(400).json({ error: 'startTime and endTime required for each block' });
    }
  }

  const deleteAll = db.prepare('DELETE FROM class_schedule WHERE user_id = ?');
  const insert = db.prepare(`
    INSERT INTO class_schedule (user_id, day_of_week, start_time, end_time, label)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    deleteAll.run(req.user.userId);
    for (const b of blocks) {
      insert.run(req.user.userId, b.dayOfWeek, b.startTime, b.endTime, b.label || '');
    }
  })();

  const saved = db.prepare('SELECT * FROM class_schedule WHERE user_id = ? ORDER BY day_of_week, start_time').all(req.user.userId);
  res.json({ schedule: parseBlocks(saved) });
});

// DELETE /api/schedule/:id
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM class_schedule WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!row) return res.status(404).json({ error: 'Schedule block not found' });
  db.prepare('DELETE FROM class_schedule WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
