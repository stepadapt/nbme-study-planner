# StepAdapt AI

USMLE study strategist that analyzes performance data to generate optimized, adaptive study plans via the Anthropic API.

## Architecture

- **Frontend:** React (Vite) + React Router, Recharts, plain CSS/inline styles, ESM/JSX
- **Backend:** Node.js + Express (CommonJS), SQLite via `better-sqlite3`, JWT auth, `bcryptjs`, `multer` (uploads), `nodemailer` (email)
- **AI:** Anthropic SDK (`claude-haiku-4-5`) — image parsing + chat only
- **Infra:** Railway (hosting + SQLite volume), GitHub auto-deploy on push to `main`

## Domain Logic

All strategy logic is **in the application code**, not delegated to the AI. Core algorithm:
1. Parse practice exam score images via Anthropic API → structured data
2. Rank topics by: weakness severity → exam yield → ease of improvement
3. Output a structured 7-day plan (topic focus, question count, review strategy per day)

**Key principle:** maximize score gain per hour studied. Prioritize high-yield weak areas over completeness. Never generate generic advice — all recommendations must be data-driven from the student's actual performance.

## AI Integration

- Uses Anthropic SDK (`claude-haiku-4-5`) for two purposes: **image parsing** (extracting scores from screenshots → structured JSON) and **chat**
- All analysis, ranking, and plan generation is **application logic, not AI** — never offload strategy to the API

## Code Conventions

- JavaScript throughout — CommonJS on backend, ESM/JSX on frontend
- Keep components small and single-purpose
- Separate data fetching from presentation
- All AI prompts (for image parsing) stored as templates, not inline strings

## Testing

- Unit test the ranking/prioritization algorithm independently
- Mock Anthropic API calls in tests — use sample parsed score data
- Validate parsed image output matches expected schema before processing
- Test edge cases: student with no weak areas, all topics equally weak, missing data, malformed score images

## Constraints

- Never expose API keys client-side
- Never store raw API responses or uploaded images long-term — extract structured data and discard
- Plans must always reference the student's actual parsed data; reject requests without input data
