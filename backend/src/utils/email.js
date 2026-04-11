const nodemailer = require('nodemailer');

// ── Sender identity ───────────────────────────────────────────────────
const FROM = process.env.EMAIL_FROM || 'StepAdapt <noreply@stepadapt.com>';
const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Transport selection ───────────────────────────────────────────────
// Priority: 1) Resend SDK  2) SMTP (nodemailer)  3) Console (dev mode)

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const { Resend } = require('resend');
    return new Resend(key);
  } catch {
    return null;
  }
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, html, text }) {
  // 1. Try Resend SDK
  const resend = getResend();
  if (resend) {
    await resend.emails.send({ from: FROM, to, subject, html, text });
    return;
  }

  // 2. Try SMTP (nodemailer)
  const transport = getSmtpTransport();
  if (transport) {
    await transport.sendMail({ from: FROM, to, subject, html, text });
    return;
  }

  // 3. Dev fallback — print to console so you can follow links without email setup
  console.log('\n📧 ─── DEV EMAIL (not sent) ───────────────────────────');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text || html);
  console.log('────────────────────────────────────────────────────\n');
}

// ── Email templates ───────────────────────────────────────────────────

exports.sendVerificationEmail = async (email, token) => {
  const link = `${APP_URL}?action=verify&token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify your StepAdapt email',
    text: `Welcome to StepAdapt!\n\nPlease verify your email address by clicking the link below:\n\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1816;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 28px; font-family: Georgia, serif; font-weight: 700; letter-spacing: -0.02em;"><span style="color: #1a1816;">Step</span><span style="color: #1D9E75;">Adapt</span></span>
        </div>
        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">Verify your email address</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #3a3630; margin-bottom: 28px;">
          Welcome! Click the button below to verify your email and activate your account.
        </p>
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${link}" style="display: inline-block; padding: 13px 32px; background: #1D9E75; color: #fff; text-decoration: none; border-radius: 10px; font-family: sans-serif; font-size: 15px; font-weight: 600;">
            Verify my email →
          </a>
        </div>
        <p style="font-size: 13px; color: #8a857e; font-family: sans-serif;">
          This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e8e4dd; margin: 28px 0;" />
        <p style="font-size: 12px; color: #aaa9a6; font-family: sans-serif; text-align: center;">
          StepAdapt · Helping medical students ace their boards
        </p>
      </div>
    `,
  });
};

exports.sendPasswordResetEmail = async (email, token) => {
  const link = `${APP_URL}?action=reset&token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset your StepAdapt password',
    text: `You requested a password reset for your StepAdapt account.\n\nClick the link below to set a new password:\n\n${link}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email — your password won't change.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #1a1816;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 28px; font-family: Georgia, serif; font-weight: 700; letter-spacing: -0.02em;"><span style="color: #1a1816;">Step</span><span style="color: #1D9E75;">Adapt</span></span>
        </div>
        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">Reset your password</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #3a3630; margin-bottom: 28px;">
          We received a request to reset the password for your account. Click below to choose a new one.
        </p>
        <div style="text-align: center; margin-bottom: 28px;">
          <a href="${link}" style="display: inline-block; padding: 13px 32px; background: #1D9E75; color: #fff; text-decoration: none; border-radius: 10px; font-family: sans-serif; font-size: 15px; font-weight: 600;">
            Reset my password →
          </a>
        </div>
        <p style="font-size: 13px; color: #8a857e; font-family: sans-serif;">
          This link expires in 1 hour. If you didn't request a password reset, no action is needed — your account is safe.
        </p>
        <hr style="border: none; border-top: 1px solid #e8e4dd; margin: 28px 0;" />
        <p style="font-size: 12px; color: #aaa9a6; font-family: sans-serif; text-align: center;">
          StepAdapt · Helping medical students ace their boards
        </p>
      </div>
    `,
  });
};
