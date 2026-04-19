# Discovery Notes: Static Channel Buttons

## Task
Replace per-topic video lookup (getVideosForTopic) with four static channel buttons shown on every topic.

## Files Found

### Video UI Rendering
- `frontend/src/pages/StudyPlanner.jsx` — ContentSequencePanel (lines 20-92)
  - Renders step.links[] as channel buttons for WATCH steps
  - 1.5x speed tip already present (line 70-75), conditional on `step.links.length > 0`
  - Currently slices to first 2 links: `step.links.slice(0, 2)`

### getVideosForTopic Callers
- `frontend/src/planEngine.js` — line 3 (import), line 1219 (call)
  - Calls `getVideosForTopic(topSubQuery, { maxResults: 5 })` to get video durations for block time calculation
  - Also imports `calculateContentReviewMinutes`
  - Falls back to summed timelabels when no videos found (line 1228-1230)
- `frontend/src/lib/videoLookup.js` — definition + internal use (line 311)

### videoLookup.js Exports
- `getVideosForTopic` — to be stubbed (returns [])
- `parseVideoDurationToMinutes` — keep
- `calculateContentReviewMinutes` — keep (still used by planEngine.js)
- `getVerifiedLink` — keep (still used by contentEngine.js)

### contentEngine.js
- Imports `getVerifiedLink` (not getVideosForTopic)
- No changes needed here

## 1.5x Tip Status
PRE-EXISTING at StudyPlanner.jsx lines 70-75.
Currently conditional: only shown when `step.links.length > 0`.
After replacement, tip must remain for all WATCH steps.

## Content Review Time
planEngine.js lines 1219-1231: currently calls `getVideosForTopic` to get real durations.
When stub returns [], it falls into the fallback branch (sum timelabels).
Need to replace with fixed 30-minute default per instructions.

## Plan
1. Create src/data/static-channels.json
2. Update StudyPlanner.jsx ContentSequencePanel to render 4 static channel buttons unconditionally
3. Stub getVideosForTopic in videoLookup.js to return []
4. Replace getVideosForTopic call in planEngine.js with fixed 30-min default

---

## Resolution

### Changes Made
1. `src/data/static-channels.json` — created with 4 channel entries
2. `frontend/src/pages/StudyPlanner.jsx` — ContentSequencePanel updated to render 4 static channel buttons for all WATCH steps; 1.5x tip now unconditional on WATCH
3. `frontend/src/lib/videoLookup.js` — getVideosForTopic stubbed to return []
4. `frontend/src/planEngine.js` — video lookup replaced with fixed 30-min default

### Build
Passed with exit 0.
