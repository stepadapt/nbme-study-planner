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
<p>NBME Study Planner is an educational tool that helps medical students organize and track their board exam preparation. The Service includes study plan generation, progress tracking, a coaching chat powered by Anthropic's Claude API, and export features.</p>

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
<p style="color:#8a857e;font-size:13px;margin-top:0">Last updated: March 30, 2026</p>

<p>This Privacy Notice for <strong>StepAdapt</strong> ("we," "us," or "our") describes how and why we might access, collect, store, use, and/or share your personal information when you use our services, including when you visit <a href="https://www.stepadapt.com" style="color:#1D9E75">www.stepadapt.com</a> or use our web application that generates USMLE Step 1 study plans based on your practice exam scores.</p>

<p><strong>Questions or concerns?</strong> Contact us at <a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a>.</p>

<h3 style="margin-top:1.5rem">1. What Information Do We Collect?</h3>
<p><strong>Personal information you provide:</strong></p>
<ul>
  <li><strong>Names</strong> and <strong>email addresses</strong> — collected when you register an account.</li>
  <li><strong>Practice exam scores</strong> — you provide NBME/NBOME assessment scores so we can generate your personalized study plan.</li>
  <li><strong>Payment data</strong> — if you purchase a subscription, payment instrument details are handled and stored by <a href="https://stripe.com/privacy" style="color:#1D9E75" target="_blank">Stripe</a>. We do not store your card details.</li>
</ul>
<p><strong>Sensitive information:</strong> We do not process sensitive personal information (e.g. racial/ethnic origins, health data, biometric data).</p>
<p>All personal information you provide must be true, complete, and accurate.</p>

<h3 style="margin-top:1.5rem">2. How Do We Process Your Information?</h3>
<p>We process your personal information to:</p>
<ul>
  <li><strong>Facilitate account creation and authentication</strong> — so you can log in and keep your account in working order.</li>
  <li><strong>Generate personalized study plans</strong> — your practice exam scores are the core input to our plan engine.</li>
  <li><strong>Request feedback</strong> — to understand how to improve the Service.</li>
  <li><strong>Protect our Services</strong> — fraud monitoring and prevention.</li>
  <li><strong>Identify usage trends</strong> — aggregate, anonymized analytics to improve the product.</li>
  <li><strong>Protect vital interests</strong> — when necessary to prevent harm.</li>
</ul>

<h3 style="margin-top:1.5rem">3. What Legal Bases Do We Rely On?</h3>
<p>We process your personal information only when we have a valid legal reason to do so:</p>
<ul>
  <li><strong>Consent</strong> — where you have given us permission for a specific purpose. You may withdraw consent at any time by contacting us.</li>
  <li><strong>Legitimate interests</strong> — to analyze Service usage, diagnose problems, prevent fraud, and improve user experience.</li>
  <li><strong>Legal obligations</strong> — to comply with applicable laws.</li>
  <li><strong>Vital interests</strong> — to protect your safety or the safety of a third party.</li>
</ul>
<p><em>If you are located in the EU, UK, or Canada, additional rights and provisions under GDPR, UK GDPR, and Canadian privacy laws apply. Contact us for more details.</em></p>

<h3 style="margin-top:1.5rem">4. When and With Whom Do We Share Your Information?</h3>
<p>We may share your information in the following limited situations:</p>
<ul>
  <li><strong>Business transfers</strong> — in connection with any merger, sale, financing, or acquisition of our business.</li>
</ul>
<p>We have not sold or shared personal information to third parties for commercial purposes in the past 12 months, and we do not intend to do so in the future.</p>

<h3 style="margin-top:1.5rem">5. Artificial Intelligence Features</h3>
<p>StepAdapt offers automated features including automatic score extraction from uploaded screenshots and a coaching chat. These features are powered by <strong>Anthropic's Claude API</strong>. Your inputs (messages, uploaded screenshots) are processed by Anthropic subject to their <a href="https://www.anthropic.com/privacy" style="color:#1D9E75" target="_blank">Privacy Policy</a>. You must not use AI features in any way that violates Anthropic's usage policies.</p>
<p>AI responses are for educational and study planning purposes only and <strong>do not constitute medical advice</strong>.</p>

<h3 style="margin-top:1.5rem">6. How Long Do We Keep Your Information?</h3>
<p>We retain your personal information for as long as your account is active. When we have no ongoing legitimate business need to process your information, we will delete or anonymize it. You may request account deletion at any time by emailing <a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a>.</p>

<h3 style="margin-top:1.5rem">7. How Do We Keep Your Information Safe?</h3>
<p>We have implemented appropriate technical and organizational security measures, including bcrypt password hashing, HTTPS encryption in transit, and JWT-based authentication. However, no electronic transmission or storage technology can be guaranteed 100% secure. You use the Service at your own risk and should only access it from secure environments.</p>

<h3 style="margin-top:1.5rem">8. Do We Collect Information From Minors?</h3>
<p>We do not knowingly collect data from or market to children under 18. By using the Service, you represent that you are at least 18 years old. If you become aware of any data collected from a minor, please contact us at <a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a> and we will promptly delete it.</p>

<h3 style="margin-top:1.5rem">9. Your Privacy Rights</h3>
<p>Depending on your location, you may have the right to:</p>
<ul>
  <li>Request access to and obtain a copy of your personal information</li>
  <li>Request correction or deletion of your personal information</li>
  <li>Restrict or object to processing of your personal information</li>
  <li>Data portability (where applicable)</li>
  <li>Withdraw consent at any time</li>
  <li>Non-discrimination for exercising your rights</li>
</ul>
<p>To exercise your rights, email <a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a> or submit a <a href="https://app.termly.io/dsar/1d91614c-41c9-494b-9e76-854a2c0ebf4a" style="color:#1D9E75" target="_blank">data subject access request</a>.</p>

<h3 style="margin-top:1.5rem">10. Do-Not-Track Features</h3>
<p>We do not currently respond to Do-Not-Track (DNT) browser signals, as no uniform industry standard exists for recognizing them. If a standard is adopted that we must follow, we will update this notice.</p>

<h3 style="margin-top:1.5rem">11. US Residents — State-Specific Rights</h3>
<p>If you reside in California, Colorado, Connecticut, Virginia, Texas, or other applicable US states, you have additional rights under state data protection laws, including the right to know, access, correct, delete, and opt out of sale/sharing of personal data. To exercise these rights, email <a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a> or submit a data subject access request via the link in Section 9.</p>
<p><strong>California "Shine the Light":</strong> California residents may request information about disclosures of personal data to third parties for direct marketing purposes once per year, free of charge, by contacting us in writing.</p>
<p><strong>We do not sell your personal data.</strong></p>

<h3 style="margin-top:1.5rem">12. Updates to This Notice</h3>
<p>We may update this Privacy Notice from time to time. The updated version will be indicated by a revised "Last updated" date at the top. Material changes will be communicated by posting a prominent notice or sending you a direct notification.</p>

<h3 style="margin-top:1.5rem">13. Contact Us</h3>
<p>If you have questions or comments about this notice, contact us at:</p>
<p><strong>StepAdapt</strong><br>Connecticut, United States<br><a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a></p>

<h3 style="margin-top:1.5rem">14. Review, Update, or Delete Your Data</h3>
<p>To request access, correction, or deletion of your personal information, please <a href="https://app.termly.io/dsar/1d91614c-41c9-494b-9e76-854a2c0ebf4a" style="color:#1D9E75" target="_blank">submit a data subject access request</a> or email us at <a href="mailto:devin@stepadapt.com" style="color:#1D9E75">devin@stepadapt.com</a>.</p>
<p style="margin-top:1.5rem;font-size:12px;color:#8a857e">This Privacy Policy was created using Termly's Privacy Policy Generator.</p>
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
