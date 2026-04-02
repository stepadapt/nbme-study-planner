const express = require('express');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const { requireAuth } = require('../auth');
const { buildTutorSystemPrompt } = require('../config/system-prompt');

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
  "formName": "NBME 26" (or whatever form number is shown, or null if not visible),
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
// Streaming coaching chat. Accepts conversation history + plan context.
router.post('/chat', async (req, res) => {
  const { messages, planContext } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const systemPrompt = buildTutorSystemPrompt(planContext);

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
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
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


module.exports = router;
