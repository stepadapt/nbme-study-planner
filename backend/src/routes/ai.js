const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Multer — store upload in memory (max 10 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

// ── POST /api/ai/parse-screenshot ────────────────────────────────────
// Accepts a screenshot of an NBME score report, returns parsed scores.
router.post('/parse-screenshot', upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  const { examId } = req.body;
  const imageData = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageData },
          },
          {
            type: 'text',
            text: `This is a screenshot of an NBME practice exam score report${examId ? ` for ${examId}` : ''}.

Please extract all category/discipline scores from this report.

Return ONLY a JSON object with this exact structure:
{
  "formName": "NBME 26" (or whatever form is shown, or null if not visible),
  "scores": {
    "CategoryName": <integer 0-100 representing percentile or percent correct>,
    ...
  },
  "totalScore": <overall score if shown, or null>,
  "notes": "any important observations (e.g., predicted score, passing threshold)" or null
}

Rules:
- Use the exact category names as shown in the report
- Convert all scores to 0-100 integer scale (if shown as fractions like 12/18, calculate as percentage)
- If a score is shown as a percentile, use it directly (0-100)
- Include ALL subject areas shown in the report
- If you cannot read a score clearly, omit that category
- Return only valid JSON, no markdown code blocks, no explanation`,
          }
        ],
      }],
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';

    // Strip any markdown fences if present
    const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({
        error: 'Could not parse scores from image. Please enter scores manually.',
        raw: text.slice(0, 500),
      });
    }

    res.json(parsed);
  } catch (err) {
    console.error('Screenshot parse error:', err.message);
    res.status(500).json({ error: 'AI parsing failed. Please enter scores manually.' });
  }
});

// ── POST /api/ai/chat ────────────────────────────────────────────────
// Streaming coaching chat. Accepts conversation history + plan context.
router.post('/chat', async (req, res) => {
  const { messages, planContext } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const systemPrompt = buildSystemPrompt(planContext);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    const finalMsg = await stream.finalMessage();
    res.write(`data: ${JSON.stringify({ done: true, usage: finalMsg.usage })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ error: 'AI response failed. Please try again.' })}\n\n`);
    res.end();
  }
});

function buildSystemPrompt(ctx) {
  if (!ctx) {
    return `You are an expert USMLE/COMLEX study coach. You help medical students build effective study plans, understand high-yield concepts, and optimize their exam preparation. Be direct, practical, and supportive. Keep responses concise unless the student asks for depth.`;
  }

  const { profile, assessments, plan } = ctx;
  const exam = profile?.exam || 'the boards';
  const examDate = profile?.examDate;
  const daysLeft = examDate ? Math.max(0, Math.round((new Date(examDate) - new Date()) / 86400000)) : null;

  let context = `You are an expert USMLE/COMLEX study coach with deep knowledge of board exam preparation.

STUDENT PROFILE:
- Exam: ${exam}
- ${daysLeft !== null ? `Days until exam: ${daysLeft}` : 'Exam date: not set'}
- Hours per day: ${profile?.hoursPerDay || 8}h
- Resources: ${(profile?.resources || []).join(', ') || 'not specified'}`;

  if (assessments && assessments.length > 0) {
    const latest = assessments[assessments.length - 1];
    const scores = latest.scores || {};
    const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1]);
    const weakest = sorted.slice(0, 5).map(([cat, s]) => `${cat} (${s}%)`).join(', ');
    const strongest = sorted.slice(-3).reverse().map(([cat, s]) => `${cat} (${s}%)`).join(', ');

    context += `

MOST RECENT ASSESSMENT (${latest.formName || `Assessment #${assessments.length}`}, ${latest.date}):
- Weakest areas: ${weakest}
- Strongest areas: ${strongest}
- Flagged sticking points: ${(latest.stickingPoints || []).join(', ') || 'none'}
- Total assessments on file: ${assessments.length}`;
  }

  if (plan) {
    context += `

CURRENT STUDY PLAN:
- Timeline: ${plan.totalCalendarDays} days, ${plan.totalWeeks} weeks
- Mode: ${plan.timelineMode}
- Estimated questions: ~${plan.totalQEstimate}
- NBMEs scheduled: ${plan.nbmeDays}
- Top 3 priority topics: ${(plan.priorities || []).slice(0, 3).map(p => `${p.category} (score: ${p.score}%, yield: ${p.yield}/10)`).join('; ')}`;
  }

  context += `

YOUR ROLE:
- Help the student understand their study plan and why it's structured the way it is
- Answer questions about study strategies, specific topics, or resource recommendations
- Give honest, targeted advice — don't sugarcoat weak areas
- Reference the student's specific data (scores, topics, timeline) when relevant
- Keep responses focused and actionable. Use markdown formatting for clarity.
- If asked about specific medical content, provide accurate, board-relevant information`;

  return context;
}

module.exports = router;
