const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { signToken, requireAuth } = require('../auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// ── POST /api/auth/signup ─────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password, name, agreedToTerms } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (!agreedToTerms) return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const hash = await bcrypt.hash(password, 12);
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, name, email_verified, verify_token, verify_token_expires)
    VALUES (?, ?, ?, 0, ?, ?)
  `).run(email.toLowerCase().trim(), hash, name || null, verifyToken, verifyExpires);

  // Send verification email (non-blocking — don't fail signup if email fails)
  sendVerificationEmail(email.toLowerCase().trim(), verifyToken).catch(err =>
    console.error('Failed to send verification email:', err.message)
  );

  const token = signToken({ userId: result.lastInsertRowid, email: email.toLowerCase().trim() });
  res.status(201).json({
    token,
    user: {
      id: result.lastInsertRowid,
      email: email.toLowerCase().trim(),
      name: name || null,
      emailVerified: false,
    },
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.email_verified === 1,
    },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, email_verified, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.email_verified === 1,
      createdAt: user.created_at,
    },
  });
});

// ── GET /api/auth/verify?token=xxx ────────────────────────────────────
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const user = db.prepare('SELECT id, verify_token_expires FROM users WHERE verify_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or already used verification link' });

  if (new Date(user.verify_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Verification link has expired. Please request a new one.' });
  }

  db.prepare('UPDATE users SET email_verified = 1, verify_token = NULL, verify_token_expires = NULL WHERE id = ?').run(user.id);
  res.json({ message: 'Email verified successfully!' });
});

// ── POST /api/auth/resend-verification ───────────────────────────────
router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = db.prepare('SELECT id, email, email_verified FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.email_verified) return res.status(400).json({ error: 'Email is already verified' });

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET verify_token = ?, verify_token_expires = ? WHERE id = ?').run(verifyToken, verifyExpires, user.id);

  await sendVerificationEmail(user.email, verifyToken).catch(err =>
    console.error('Failed to send verification email:', err.message)
  );

  res.json({ message: 'Verification email sent' });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Always return success to prevent email enumeration
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(resetToken, resetExpires, user.id);

    sendPasswordResetEmail(user.email, resetToken).catch(err =>
      console.error('Failed to send reset email:', err.message)
    );
  }

  res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
});

// ── POST /api/auth/reset-password ────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

  const user = db.prepare('SELECT id, reset_token_expires FROM users WHERE reset_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

  if (new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
  }

  const hash = await bcrypt.hash(password, 12);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?').run(hash, user.id);

  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

module.exports = router;
