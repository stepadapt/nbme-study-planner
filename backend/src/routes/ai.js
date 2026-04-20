const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../auth');
const db = require('../db');
const { buildTutorSystemPrompt, TUTOR_SYSTEM_PROMPT, buildCoachContextFromDB } = require('../config/system-prompt');

const router = express.Router();
router.use(requireAuth);

// Warn loudly at startup if key is missing or placeholder
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
  console.error('⚠️  ANTHROPIC_API_KEY is not set — AI parsing and chat will fail. Set it in Railway Variables.');
}

const anthropic = new Anthropic({ apiKey });

// Multer — store upload in memory (max 20 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only image or PDF files are accepted'));
  },
});

// ── POST /api/ai/parse-screenshot ────────────────────────────────────
// Accepts a screenshot (image) or PDF of an NBME score report, returns parsed scores.
router.post('/parse-screenshot', upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { examId } = req.body;
  const fileData = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;
  const isPDF = mediaType === 'application/pdf';

  // Build the file content block — PDFs use 'document', images use 'image'
  const fileBlock = isPDF
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileData } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileData } };

  const promptText = `This is ${isPDF ? 'a PDF' : 'a screenshot'} of a USMLE Step 1 NBME CBSSA practice exam score report${examId ? ` for ${examId}` : ''}.

Extract the scores for every category listed in the report and map them to the closest matching name from the lists below.

PERFORMANCE BY SYSTEM categories (use these exact names):
- "Reproductive & Endocrine Systems"
- "Respiratory and Renal/Urinary Systems"
- "Behavioral Health & Nervous Systems/Special Senses"
- "Blood & Lymphoreticular/Immune Systems"
- "Multisystem Processes & Disorders"
- "Musculoskeletal, Skin & Subcutaneous Tissue"
- "Cardiovascular System"
- "Gastrointestinal System"

PERFORMANCE BY DISCIPLINE categories (use these exact names):
- "Pathology"
- "Physiology"
- "Microbiology & Immunology"
- "Gross Anatomy & Embryology"
- "Pharmacology"
- "Behavioral Sciences"
- "Biochemistry & Nutrition"
- "Histology & Cell Biology"
- "Genetics"

Return ONLY a JSON object with this exact structure:
{
  "formName": "NBME 26" — use EXACTLY one of: "NBME 26", "NBME 27", "NBME 28", "NBME 29", "NBME 30", "NBME 31", "NBME 32", "NBME 33", "UWSA 1", "UWSA 2", "Free 120 (2024)", "Free 120 (old)", "AMBOSS SA". Use null if no form is identifiable.
  "scores": {
    "Exact Category Name From List Above": <integer 0-100>,
    ...
  },
  "totalScore": <overall percent correct or predicted score if shown, or null>,
  "notes": "any important observations (e.g., predicted score, passing threshold)" or null
}

Rules:
- Map each score to the EXACT category name from the lists above (closest match)
- Scores are typically shown as fractions (e.g. 12/18) — convert to percentage: round(numerator/denominator * 100)
- Include ALL categories you can find scores for
- Omit any category you cannot read clearly
- Return only valid JSON, no markdown code blocks, no explanation`;

  // Guard: API key not configured
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return res.status(503).json({ error: 'AI service is not configured. Please contact support.' });
  }

  // Both haiku-4-5 supports images and PDFs — cheapest option
  const model = 'claude-haiku-4-5';

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [fileBlock, { type: 'text', text: promptText }],
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
    // Log full error details for debugging
    console.error('Screenshot parse error:', err.status, err.message, JSON.stringify(err.error || err.body || ''));
    if (err.status === 401) {
      return res.status(503).json({ error: 'AI service authentication failed. Check the ANTHROPIC_API_KEY in Railway Variables.' });
    }
    if (err.status === 400) {
      console.error('Anthropic 400 details:', JSON.stringify(err.error || err.body || err.headers || ''));
      return res.status(400).json({ error: 'File could not be read by AI. Try a clearer screenshot or enter scores manually.' });
    }
    res.status(500).json({ error: 'AI parsing failed. Please enter scores manually.' });
  }
});

// ── POST /api/ai/chat ────────────────────────────────────────────────
// Streaming coaching chat. Fetches fresh student data from DB on every
// message — never relies on frontend-sent planContext for the system prompt.
router.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // ── 1. Fetch fresh student data from DB ──────────────────────────
  const userId = req.user.userId;

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(userId);
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  const assessmentRows = db.prepare(`
    SELECT id, form_name, scores, sticking_points, gap_types, created_at
    FROM assessments
    WHERE user_id = ? AND (is_archived = 0 OR is_archived IS NULL)
    ORDER BY created_at ASC
  `).all(userId);
  const latestPlan = db.prepare(`
    SELECT id, plan_data, profile_snapshot, created_at
    FROM study_plans
    WHERE user_id = ? AND (is_archived = 0 OR is_archived IS NULL)
    ORDER BY created_at DESC LIMIT 1
  `).get(userId);

  // ── 2. Build fresh context summary ──────────────────────────────
  const coachContext = buildCoachContextFromDB({
    user,
    profile,
    assessments: assessmentRows,
    latestPlan,
  });

  const systemPrompt = TUTOR_SYSTEM_PROMPT + coachContext;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Guard: API key not configured
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    res.write(`data: ${JSON.stringify({ error: 'AI service is not configured. Please contact support.' })}\n\n`);
    return res.end();
  }

  try {
    // Filter out system-role placeholder messages (intro message from frontend)
    // and strip any internal _streaming flags before sending to Anthropic
    const cleanMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .filter(m => m.content && m.content.trim().length > 0)
      .map(m => ({ role: m.role, content: m.content }));

    if (cleanMessages.length === 0) {
      res.write(`data: ${JSON.stringify({ error: 'No valid messages to send.' })}\n\n`);
      return res.end();
    }

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: cleanMessages,
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

// ── POST /api/ai/plan-intelligence ──────────────────────────────────
// Called once after planEngine generates a base plan. Returns AI enrichment
// (specific sub-topics, step-by-step resource sequence, strategic insight)
// that gets merged into the rendered plan on the frontend.
// Graceful degradation: if this fails, the base plan still renders.
router.post('/plan-intelligence', async (req, res) => {
  const { student_data, base_plan } = req.body;
  if (!student_data || !base_plan) {
    return res.status(400).json({ error: 'student_data and base_plan required' });
  }

  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return res.status(503).json({ error: 'AI service not configured' });
  }

  const userMessage = `Analyze the student's NBME performance data and enrich their next study days with specific, targeted recommendations.

Return ONLY valid JSON (no markdown, no explanation) matching this exact schema:
{
  "enrichments": {
    "day_N": {
      "content_review": {
        "sub_topics": ["Sub-topic 1", "Sub-topic 2"],
        "skip_topics": ["Low-yield topic to skip"],
        "steps": [
          {
            "step": 1,
            "resource": "Ninja Nerd",
            "topic": "Exact topic name",
            "specific_focus": "Exactly what to focus on within this resource",
            "skip": "What to skip",
            "duration": "30 min",
            "youtube_search_query": "Ninja Nerd Topic Name"
          }
        ]
      },
      "targeted_questions": {
        "filter_suggestion": "UWorld: System — Sub-topic A + Sub-topic B",
        "what_to_watch_for": "Common NBME pattern or trap to notice"
      }
    }
  },
  "priority_summary": {
    "weak_systems": [{"system": "...", "score": 0, "gap_type": "knowledge", "top_sub_topics": ["..."]}],
    "top_5_opportunities": [{"system": "...", "sub_topic": "...", "yield": 10, "estimated_point_gain": "2-3 points"}],
    "sticky_weaknesses": []
  },
  "strategic_insight": "3-5 sentences directly to the student about their score trajectory and this week's single most important priority."
}

Rules:
- Only generate enrichment for days that have a content block in the base plan
- "day_N" keys must match the calendarDay numbers from the base plan
- Pathoma: ONLY for Pathology content — never for Physiology, Pharmacology, Anatomy, Biochemistry
- Sketchy: ONLY for Pharmacology and Microbiology
- Ninja Nerd: knowledge gaps (deep conceptual understanding, physiology, pathophysiology)
- Dirty Medicine: application gaps (quick mnemonics, recall hooks, memorization)
- youtube_search_query: include ONLY for YouTube resources (Ninja Nerd, Dirty Medicine, Armando Hasudungan, Randy Neil MD, HY Guru). OMIT for Pathoma, Sketchy, First Aid.
- NEVER recommend watching an entire video or chapter — always specify which sub-topic and for how long
- strategic_insight must reference the student's actual scores and trajectory — no generic advice

STUDENT DATA:
${JSON.stringify(student_data, null, 2)}

BASE PLAN — NEXT STUDY DAYS:
${JSON.stringify(base_plan.days, null, 2)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: TUTOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = response.content.find(b => b.type === 'text')?.text || '';
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let enrichment;
    try {
      enrichment = JSON.parse(cleaned);
    } catch {
      console.error('Plan intelligence JSON parse failed:', cleaned.slice(0, 300));
      return res.status(422).json({ error: 'Failed to parse AI enrichment response' });
    }

    res.json(enrichment);
  } catch (err) {
    console.error('Plan intelligence error:', err.status, err.message);
    if (err.status === 401) return res.status(503).json({ error: 'AI authentication failed' });
    res.status(500).json({ error: 'Plan intelligence generation failed' });
  }
});

module.exports = router;
