import { useState } from 'react';

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 80px rgba(0,0,0,0.2)' },
  header: { padding: '24px 32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 },
  title: { fontSize: 18, fontWeight: 700, color: '#1a1816', fontFamily: 'Georgia, serif', margin: 0 },
  tabs: { display: 'flex', gap: 4, padding: '12px 32px 0', flexShrink: 0 },
  tab: (active) => ({
    padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, fontFamily: '"DM Sans", sans-serif',
    borderBottom: `2px solid ${active ? '#1a1816' : 'transparent'}`,
    fontWeight: active ? 600 : 400, color: active ? '#1a1816' : '#8a857e',
    marginBottom: -1,
  }),
  divider: { height: 1, background: '#f0ede8', flexShrink: 0 },
  body: { padding: '20px 32px 32px', overflowY: 'auto', fontFamily: '"DM Sans", sans-serif', fontSize: 14, lineHeight: 1.7, color: '#3a3630' },
  close: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#8a857e', padding: '4px 8px', borderRadius: 6, lineHeight: 1 },
};

const TERMS_HTML = `
<h3 style="margin-top:0">1. Acceptance of Terms</h3>
<p>By creating an account and using NBME Study Planner ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

<h3>2. Description of Service</h3>
<p>NBME Study Planner is an educational tool that helps medical students organize and track their board exam preparation. The Service includes study plan generation, progress tracking, AI-powered coaching, and export features.</p>

<h3>3. User Accounts</h3>
<p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate information when creating your account.</p>

<h3>4. Acceptable Use</h3>
<p>You agree not to: (a) use the Service for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Service; (c) use the Service in a way that could damage or impair it; (d) share your account credentials with others.</p>

<h3>5. AI Features</h3>
<p>The AI coaching and score-parsing features are powered by Anthropic's Claude API. AI responses are for informational and study planning purposes only and <strong>do not constitute medical advice</strong>. Always verify medical information with authoritative sources and your faculty.</p>

<h3>6. Disclaimer</h3>
<p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT USING THE SERVICE WILL RESULT IN IMPROVED EXAM SCORES OR PASSING ANY EXAM. RESULTS DEPEND ENTIRELY ON THE USER'S EFFORT AND PREPARATION.</p>

<h3>7. Limitation of Liability</h3>
<p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

<h3>8. Changes to Terms</h3>
<p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>

<h3>9. Contact</h3>
<p>Questions about these Terms? Contact us through the app.</p>
`;

const PRIVACY_HTML = `
<h3 style="margin-top:0">1. Information We Collect</h3>
<p><strong>Account information:</strong> Email address, name (optional), and hashed password.</p>
<p><strong>Study data:</strong> Exam type, target score, exam date, NBME assessment scores, sticking points, study plan preferences, and class schedule blocks.</p>
<p><strong>AI interactions:</strong> Messages sent to the AI coaching chat and NBME screenshots uploaded for score parsing.</p>

<h3>2. How We Use Your Information</h3>
<p>We use your data to: (a) provide and improve the Service; (b) generate personalized study plans; (c) send transactional emails (verification, password reset); (d) power AI coaching with your study context.</p>

<h3>3. Data Storage & Security</h3>
<p>Your data is stored securely. Passwords are hashed with bcrypt and never stored in plain text. We do not sell your personal information to third parties.</p>

<h3>4. Third-Party Services</h3>
<p><strong>Anthropic:</strong> NBME screenshots and chat messages are sent to Anthropic's Claude API for processing. Anthropic's privacy policy governs data processed by their API.</p>
<p><strong>Email:</strong> We use SMTP to send verification and password reset emails.</p>

<h3>5. Data Retention</h3>
<p>We retain your data for as long as your account is active. You may request deletion of your account and all associated data by contacting us.</p>

<h3>6. Local Storage</h3>
<p>We use browser localStorage to store your authentication token. No third-party tracking cookies are used.</p>

<h3>7. Children's Privacy</h3>
<p>The Service is not directed at children under 13. We do not knowingly collect information from children under 13.</p>

<h3>8. Changes to This Policy</h3>
<p>We may update this Privacy Policy periodically and will notify you of significant changes.</p>

<h3>9. Contact</h3>
<p>Questions about privacy or data deletion requests? Contact us through the app.</p>
`;

export default function TermsModal({ page = 'terms', onClose }) {
  const [tab, setTab] = useState(page);

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <img src="/logo.svg" alt="StepAdapt" style={{ height: 36 }} />
          <button style={S.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div style={S.tabs}>
          {[['terms', 'Terms of Service'], ['privacy', 'Privacy Policy']].map(([key, label]) => (
            <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>
        <div style={S.divider} />
        <div style={S.body} dangerouslySetInnerHTML={{ __html: tab === 'terms' ? TERMS_HTML : PRIVACY_HTML }} />
      </div>
    </div>
  );
}
