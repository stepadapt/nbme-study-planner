require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const assessmentRoutes = require('./routes/assessments');
const planRoutes = require('./routes/plans');
const aiRoutes = require('./routes/ai');
const scheduleRoutes = require('./routes/schedule');
const exportRoutes = require('./routes/export');
const adminRoutes = require('./routes/admin');
const resetRoutes = require('./routes/reset');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Rate limiters ─────────────────────────────────────────────────────
// Global: 300 requests/min per IP (DDoS protection)
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

// Auth login/signup: 15 attempts per 15 min per IP (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});

// Forgot-password: 5 per hour per IP (prevent email spam)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please wait an hour and try again.' },
});

// AI chat: 40 messages per 15 min per IP/user (cost protection)
const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  message: { error: 'Chat rate limit reached. Please wait 15 minutes before sending more messages.' },
});

// AI plan intelligence: 5 per hour per user (once-per-plan-generation call)
const aiPlanIntelligenceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  message: { error: 'Plan intelligence limit reached. Please wait an hour.' },
});

// AI screenshot: 10 per hour per IP/user
const aiScreenshotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?.userId?.toString() || req.ip,
  message: { error: 'Screenshot parse limit reached. Please wait an hour or enter scores manually.' },
});

// Admin: 20 requests per 15 min per IP — tight window, wrong key still burns attempts
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please wait 15 minutes.' },
});

// ── Middleware ───────────────────────────────────────────────────────
app.use(globalLimiter);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Routes ───────────────────────────────────────────────────────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', forgotPasswordLimiter);
app.use('/api/ai/chat', aiChatLimiter);
app.use('/api/ai/parse-screenshot', aiScreenshotLimiter);
app.use('/api/ai/plan-intelligence', aiPlanIntelligenceLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/reset', resetRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Serve React frontend in production ───────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Error handler ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  if (err.message === 'Only image files are accepted') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
