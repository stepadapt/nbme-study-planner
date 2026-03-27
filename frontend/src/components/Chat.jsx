import { useState, useRef, useEffect } from 'react';
import { api } from '../api.js';

const S = {
  f: '"DM Sans", sans-serif',
};

// Simple markdown-ish renderer (bold, italic, code, lists)
function renderMarkdown(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    if (line.startsWith('### ')) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, color: '#1a1816', marginTop: 10, marginBottom: 2 }}>{line.slice(4)}</div>);
    } else if (line.startsWith('## ')) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 15, color: '#1a1816', marginTop: 12, marginBottom: 2 }}>{line.slice(3)}</div>);
    } else if (line.startsWith('# ')) {
      result.push(<div key={i} style={{ fontWeight: 700, fontSize: 16, color: '#1a1816', marginTop: 12, marginBottom: 2 }}>{line.slice(2)}</div>);
    // List item
    } else if (line.match(/^[-*•] /)) {
      result.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
          <span style={{ color: '#8a857e', flexShrink: 0 }}>•</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      result.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
          <span style={{ color: '#8a857e', flexShrink: 0 }}>{line.match(/^(\d+)\./)[1]}.</span>
          <span>{inlineFormat(line.replace(/^\d+\. /, ''))}</span>
        </div>
      );
    } else if (line === '') {
      result.push(<div key={i} style={{ height: 6 }} />);
    } else {
      result.push(<div key={i} style={{ marginBottom: 2 }}>{inlineFormat(line)}</div>);
    }
    i++;
  }
  return result;
}

function inlineFormat(text) {
  // bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{ background: '#f0ece6', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export default function Chat({ planContext, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your study coach. Ask me anything about your plan — why certain topics are prioritized, how to study a specific system, what to do with 2 weeks left, or anything else about your prep.",
    }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    // Add placeholder for assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '', _streaming: true }]);

    try {
      let accumulated = '';
      // Only pass actual conversation (not system-like first message)
      const apiMessages = newMessages.filter((_, i) => i > 0 || newMessages[0].role !== 'assistant');
      // Re-include the intro message as context but filter out streaming placeholders
      const cleanMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      for await (const chunk of api.ai.chat(cleanMessages, planContext)) {
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
      position: 'fixed', bottom: 20, right: 20, width: 420, maxHeight: '80vh',
      background: '#fff', borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
      border: '1px solid #e0dcd6', display: 'flex', flexDirection: 'column',
      zIndex: 1000, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0ece6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#faf8f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1816', fontFamily: S.f }}>Study Coach</div>
            <div style={{ fontSize: 11, color: '#8a857e', fontFamily: S.f }}>AI-powered · knows your plan</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#8a857e', padding: '2px 6px', borderRadius: 6 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '88%',
              padding: '10px 13px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
              background: msg.role === 'user' ? '#1a1816' : '#f5f2ed',
              color: msg.role === 'user' ? '#fff' : '#2c2a26',
              fontSize: 13,
              fontFamily: S.f,
              lineHeight: 1.55,
            }}>
              {msg.role === 'user'
                ? msg.content
                : msg.content
                  ? renderMarkdown(msg.content)
                  : <span style={{ opacity: 0.4 }}>●●●</span>
              }
              {msg._streaming && <span style={{ opacity: 0.4, marginLeft: 2 }}>▌</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #f0ece6', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
          onKeyDown={handleKey}
          placeholder="Ask about your plan…"
          disabled={streaming}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e0dcd6',
            fontSize: 13, fontFamily: S.f, resize: 'none', outline: 'none',
            background: '#faf8f5', color: '#2c2a26', lineHeight: 1.4,
            maxHeight: 100, overflow: 'auto',
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || streaming}
          style={{
            padding: '9px 14px', borderRadius: 10, border: 'none', background: '#1a1816', color: '#fff',
            fontSize: 14, cursor: 'pointer', fontFamily: S.f, fontWeight: 600,
            opacity: !input.trim() || streaming ? 0.4 : 1, flexShrink: 0,
          }}
        >
          {streaming ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}
