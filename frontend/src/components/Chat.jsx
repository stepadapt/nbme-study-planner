import { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';

const G = '#1D9E75';
const G2 = '#0F6E56';
const DARK = '#1a1816';
const MID = '#4a4540';
const LIGHT = '#8a857e';
const BG = '#f7f5f1';

const F = '"DM Sans", sans-serif';

// ── Markdown renderer (bold, italic, inline code, lists, headings) ──────────
function renderMarkdown(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 13, color: DARK, marginTop: 10, marginBottom: 2 }}>{inlineFormat(line.slice(4))}</div>);
    } else if (line.startsWith('## ')) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, color: DARK, marginTop: 12, marginBottom: 2 }}>{inlineFormat(line.slice(3))}</div>);
    } else if (line.startsWith('# ')) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 15, color: DARK, marginTop: 12, marginBottom: 2 }}>{inlineFormat(line.slice(2))}</div>);
    } else if (line.match(/^[-*•] /)) {
      result.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: G, flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      result.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
          <span style={{ color: G, flexShrink: 0 }}>{line.match(/^(\d+)\./)[1]}.</span>
          <span>{inlineFormat(line.replace(/^\d+\. /, ''))}</span>
        </div>
      );
    } else if (line === '') {
      result.push(<div key={i} style={{ height: 5 }} />);
    } else {
      result.push(<div key={i} style={{ marginBottom: 2 }}>{inlineFormat(line)}</div>);
    }
    i++;
  }
  return result;
}

function inlineFormat(text) {
  // Supports **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Bold data points get the green accent so students can see their actual numbers
      const inner = part.slice(2, -2);
      const isDataPoint = /\d+%|\d+ (days|pts|points|Qs)|Day \d+/i.test(inner);
      return <strong key={i} style={isDataPoint ? { color: G2 } : {}}>{inner}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: '#f0ece6', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// ── Suggested prompt chips ──────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  { label: 'What should I focus on right now?', icon: '🎯' },
  { label: "Why is my plan structured this way?", icon: '📋' },
  { label: "My scores aren't improving — help", icon: '📉' },
  { label: "I'm feeling burnt out", icon: '😮‍💨' },
  { label: 'Should I postpone my exam?', icon: '📅' },
];

function SuggestedPrompts({ onSelect, hasData }) {
  return (
    <div style={{ padding: '4px 18px 16px' }}>
      <div style={{ fontSize: 11, color: LIGHT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, fontFamily: F }}>
        {hasData ? 'Try asking:' : 'Quick starts:'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {SUGGESTED_PROMPTS.map(p => (
          <button
            key={p.label}
            onClick={() => onSelect(p.label)}
            style={{
              padding: '6px 11px', borderRadius: 20,
              border: `1.5px solid rgba(0,0,0,0.10)`, background: BG,
              color: MID, fontSize: 12, fontFamily: F, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G2; e.currentTarget.style.background = G + '10'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'; e.currentTarget.style.color = MID; e.currentTarget.style.background = BG; }}
          >
            <span>{p.icon}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Chat component ─────────────────────────────────────────────────────
export default function Chat({ onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your Step 1 coach. I can see your NBME scores, your current plan, and where you are right now. Ask me anything — why your plan is structured this way, what to focus on today, or how to get unstuck.",
    }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Whether the student has sent at least one message (hides prompts after first send)
  const hasUserMessages = messages.some(m => m.role === 'user');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '', _streaming: true }]);

    try {
      let accumulated = '';
      // Send full conversation including the intro assistant message as context
      const cleanMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      for await (const chunk of api.ai.chat(cleanMessages)) {
        accumulated += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated, _streaming: true };
          return updated;
        });
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: accumulated };
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Sorry, I ran into an error. Please try again.' };
        return updated;
      });
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, width: 440, maxHeight: '82vh',
      background: '#fff', borderRadius: 20, boxShadow: '0 12px 48px rgba(0,0,0,0.16)',
      border: '1px solid #e0dcd6', display: 'flex', flexDirection: 'column',
      zIndex: 1000, overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '14px 18px 12px',
        borderBottom: '1px solid #f0ece6',
        background: `linear-gradient(135deg, ${G}12, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: `linear-gradient(135deg, ${G}, ${G2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: `0 3px 10px ${G}40`, flexShrink: 0,
            }}>🎓</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: DARK, fontFamily: F, lineHeight: 1.2 }}>Your Step 1 Coach</div>
              <div style={{ fontSize: 11, color: LIGHT, fontFamily: F, marginTop: 1 }}>
                Sees your scores, plan &amp; progress · AI-powered
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: LIGHT, padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.color = DARK}
            onMouseLeave={e => e.currentTarget.style.color = LIGHT}
          >✕</button>
        </div>

        {/* Context indicator */}
        <div style={{
          marginTop: 10, padding: '7px 12px',
          background: G + '12', borderRadius: 8, border: `1px solid ${G}25`,
          fontSize: 12, color: G2, fontFamily: F, lineHeight: 1.4,
        }}>
          💡 I have your NBME scores, weak areas, and today's schedule in front of me.
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '90%',
              padding: '10px 13px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              background: msg.role === 'user' ? DARK : '#f5f2ed',
              color: msg.role === 'user' ? '#fff' : '#2c2a26',
              fontSize: 13, fontFamily: F, lineHeight: 1.6,
            }}>
              {msg.role === 'user'
                ? msg.content
                : msg.content
                  ? renderMarkdown(msg.content)
                  : <span style={{ opacity: 0.35 }}>●●●</span>
              }
              {msg._streaming && <span style={{ opacity: 0.4, marginLeft: 2 }}>▌</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggested prompts (shown until first user message) ───────── */}
      {!hasUserMessages && (
        <SuggestedPrompts onSelect={send} hasData={true} />
      )}

      {/* ── Input ───────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #f0ece6', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
          }}
          onKeyDown={handleKey}
          placeholder="Ask about your plan, scores, or strategy…"
          disabled={streaming}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 10,
            border: `1.5px solid ${streaming ? G + '40' : '#e0dcd6'}`,
            fontSize: 13, fontFamily: F, resize: 'none', outline: 'none',
            background: '#faf8f5', color: '#2c2a26', lineHeight: 1.4,
            maxHeight: 100, overflow: 'auto', transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = G + '60'; }}
          onBlur={e => { e.target.style.borderColor = '#e0dcd6'; }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || streaming}
          style={{
            padding: '9px 14px', borderRadius: 10, border: 'none',
            background: !input.trim() || streaming ? '#e0dcd6' : `linear-gradient(135deg, ${G}, ${G2})`,
            color: !input.trim() || streaming ? LIGHT : '#fff',
            fontSize: 14, cursor: !input.trim() || streaming ? 'default' : 'pointer',
            fontFamily: F, fontWeight: 600, flexShrink: 0,
            transition: 'all 0.15s', boxShadow: !input.trim() || streaming ? 'none' : `0 3px 10px ${G}40`,
          }}
        >
          {streaming ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}
