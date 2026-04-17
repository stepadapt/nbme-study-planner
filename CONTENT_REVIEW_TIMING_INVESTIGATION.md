# Content Review Timing — Investigation & Proposed Decisions

Branch: `content-review-timing`

---

## Resolution (implemented after user approved all proposed decisions)

### Files changed

| File | Change |
|------|--------|
| `frontend/src/lib/videoLookup.js` | Added `parseVideoDurationToMinutes()` and `calculateContentReviewMinutes()` exports |
| `frontend/src/planEngine.js` | Import new helpers; replace hardcoded `seqMins` sum with `calculateContentReviewMinutes(libraryVideos, firstAidMins)`; bump `PLAN_ENGINE_VERSION` to 5 |
| `frontend/src/pages/StudyPlanner.jsx` | Added 1.5x tip above video buttons in `ContentSequencePanel` |
| `scripts/test-content-review-timing.mjs` | End-to-end test script (run with `node scripts/test-content-review-timing.mjs`) |

### Test output (all passed)

```
=== Unit tests: parseVideoDurationToMinutes ===
  PASS [duration_min: 36]: 36
  PASS [duration "14:10" → 15]: 15
  PASS [duration "1:04:34" → 65]: 65
  PASS [duration "7:30" → 8]: 8
  PASS [no duration → 20]: 20
  PASS [null → 20]: 20

=== Integration tests: topic → videos → block time ===

--- Heart failure ---
Videos found: 5
  [Ninja Nerd] "Heart Failure" → 36 min (duration_min)
  [Dirty Medicine] "Heart Failure" → 15 min (duration string)
  ... (3 more Armando Hasudungan entries)
Content review block: 56 min → 1.00 hr slot   ✓ was previously ~0.75 hr (hardcoded 40 min)

--- Diabetes mellitus ---
Videos found: 5
Content review block: 53 min → 1.00 hr slot

--- Acid-base disorders ---
Videos found: 3
Content review block: 40 min → 0.75 hr slot   ✓ Ninja Nerd entry has no duration → 20 min default

--- Biostatistics ---
Videos found: 5
  [Randy Neil MD] longest → 33 min
Content review block: 53 min → 1.00 hr slot

--- nonexistent_topic_xyz ---
Videos found: 0
Content review block: 40 min → 0.75 hr slot   ✓ fallback (20 min video default + 20 min FA)

=== ALL TESTS PASSED ===
```

### Notes

- **Diabetes / Acid-base Ninja Nerd entries have no duration in the library** — these entries exist but lack `duration_min` and `duration` fields. They correctly fall back to the 20-min default. If someone adds duration data to those entries later, the calculation automatically improves with no code change.
- **PLAN_ENGINE_VERSION bumped to 5** — existing user plans will auto-regenerate on next login, updating their content review block sizes to reflect real durations.
- The fallback (hardcoded timelabel sum) is preserved for categories with no library match — plan generation cannot crash even for topics completely absent from the library.

### Merge and start

```bash
git checkout main && git merge content-review-timing
cd frontend && npm run build
```

Or for local dev:
```bash
git checkout main && git merge content-review-timing
cd frontend && npm run dev
```

### Three things to test after merging

1. **Generate a plan with a known topic (e.g., Cardiovascular System / Heart failure focus day).** Open the content review block. Confirm the block's time slot reflects a real number (≥36 min for Heart Failure when Ninja Nerd is longest) rather than the old flat ~0.75 hr estimate.

2. **Open the daily plan view and expand a content review block.** Confirm the `💡 Watch at 1.5x speed to stay on schedule` tip appears in small italic text above the video buttons, once per WATCH step, not on READ steps.

3. **Click a video button.** Confirm it still opens the correct YouTube URL (regression check — the 1.5x tip change doesn't touch link generation, but verify nothing broke).

---

## Investigation Findings

### Q1: How is content review block time currently calculated?

**Location:** `frontend/src/planEngine.js`, lines 1268–1274

**Answer: (c) Derived from hardcoded timelabel strings set in contentEngine.js — NOT from real video durations.**

```javascript
// planEngine.js ~line 1268
const seqMins = (contentSeqFull?.sequence || []).reduce(
  (sum, s) => sum + parseStepMinutes(s.timeLabel), 0
);
const b2Hrs = seqMins > 0
  ? Math.ceil(seqMins / 15) * 15 / 60  // e.g. 50 min → 1.0 hr
  : (isKG ? 0.75 : 0.5);               // fallback if sequence is empty
```

`parseStepMinutes` (planEngine.js lines 61–68) parses strings like `"~20 min"`, `"~15–20 min"` — taking the **upper end of any range**:

```javascript
function parseStepMinutes(timeLabel) {
  const cleaned = (timeLabel || '').replace(/~/g, '').replace(/\s*min\s*/gi, '').trim();
  if (cleaned.includes('–') || cleaned.includes('-')) {
    const parts = cleaned.split(/[–\-]/);
    return parseInt(parts[parts.length - 1].trim(), 10) || 15;
  }
  return parseInt(cleaned, 10) || 15;
}
```

The timelabels are hardcoded in `contentEngine.js`:
- WATCH (primary video, knowledge gap): `"~20 min"`
- WATCH (secondary video, knowledge gap): `"~15 min"`
- READ (First Aid): `"~15–20 min"` (knowledge) / `"~10–15 min"` (application)
- Sketchy/Pathoma: `"~25 min"` or `"~15 min"`

**Current result:** A typical knowledge-gap day with 2 WATCH steps + 1 READ = 20 + 15 + 20 = 55 min → rounds up to 60 min = **1.0 hr block**. A single WATCH + READ = 20 + 20 = 40 min → **0.75 hr block**. These are estimates — the actual Ninja Nerd Heart Failure video is 36 min; the current system would budget only 20 min for it.

---

### Q2: How is video duration stored in video-library.json?

**File:** `/Applications/NBMEStudyPlanner/src/data/video-library.json`
**Note:** The import path in videoLookup.js uses `'../../../src/data/video-library.json'` (3 levels up from `frontend/src/lib/`).

**Duration stats across all 890 resource entries:**

| Format | Count | Notes |
|--------|-------|-------|
| `duration_min` (number, minutes) | 45 | All Ninja Nerd long-form videos. Average: **52 min** |
| `duration` (string, "MM:SS" or "H:MM:SS") | 806 | All other channels |
| No duration at all | 39 | Mix of Ninja Nerd (some) + channel_reference entries |

**Examples:**
```json
// duration_min style (Ninja Nerd):
{ "title": "Heart Failure", "duration_min": 36 }
{ "title": "Valvular Heart Disease", "duration_min": 42 }
{ "title": "Heart Sounds & Murmurs", "duration_min": 47 }

// duration string style:
{ "title": "Heart Failure", "duration": "14:10" }
{ "title": "Heart Sounds (Murmurs and Splitting)", "duration": "1:04:34" }
{ "title": "Heart Murmurs Locations...", "duration": "22:17" }

// No duration (39 entries):
{ "title": "Asthma", "channel": "ninja_nerd" }  // missing even though NN
{ "title": "Acid Base Disorders", "channel": "ninja_nerd" }
```

**Already partially handled:** `normalizeResource()` in videoLookup.js already outputs:
```javascript
durationMin: resource.duration_min || null,
duration:    resource.duration || (resource.duration_min ? `${resource.duration_min} min` : null),
```
So normalized video objects already carry `durationMin` (number or null) and `duration` (string or null). A new parser just needs to handle both cases.

---

### Q3: What's the current First Aid review situation?

**Answer: (a) First Aid is PART OF the content review block — it is the final step in the WATCH → READ sequence, not a separate daily block.**

From `contentEngine.js` lines 1013–1022:
```javascript
const firstAidStep = hasFirstAid ? {
  type: 'read', emoji: '📕',
  label: `First Aid: ${faRef.section}`,
  action: 'READ', resource: 'First Aid', topic: faRef.section,
  timeLabel: gapType === 'knowledge' ? '~15–20 min' : '~10–15 min',
  focus: shortFocus(faRef.focus),
  instruction: `${faRef.focus}...`,
  links: [],
} : null;
```

The sequence is built as:
```javascript
const sequence = [
  primaryVideoStep,    // WATCH ~20 min
  secondaryVideoStep,  // WATCH ~15 min (only if KG + 2+ sub-topics)
  firstAidStep || annotateStep,  // READ ~15–20 min
].filter(Boolean);
```

`hasFirstAid` is true when the student has "firstaid" in their selected resources AND the category has an FA reference defined. First Aid is NOT a separate daily block anywhere in the plan — it's embedded in content review only.

No separate "First Aid block" exists. The Q-block review tasks do mention annotating First Aid ("Annotate First Aid for wrong answers") but that is part of the question block activity string, not a timed block of its own.

---

### Q4: Where is the time estimate displayed to the student?

**Location:** `ContentSequencePanel` component in `frontend/src/pages/StudyPlanner.jsx`, lines 20–86.

Each step's time is shown at the far right of the step header row:
```jsx
<span style={{ marginLeft: 'auto', fontSize: sz.time, color: '#999', whiteSpace: 'nowrap', paddingLeft: 6 }}>
  {timeStr}  {/* ← this is step.timeLabel, currently "~20 min", "~15–20 min" etc. */}
</span>
```

The **block-level hours** (used by `assignBlockTimes` for clock-time scheduling) comes from `block.tasks[0].hours`, which is `b2Hrs` from planEngine.js. The `timeLabel` strings shown in `ContentSequencePanel` are separate per-step labels, not derived from `b2Hrs`.

So there are two places where duration appears to the student:
1. `step.timeLabel` — per-step string in the sequence panel ("~20 min")
2. `task.hours` on the block — drives the calendar time slot allocation

Both currently come from hardcoded estimates. The feature would update both.

---

### Q5: Where are the video buttons/links rendered?

**Location:** `ContentSequencePanel` in `frontend/src/pages/StudyPlanner.jsx`, lines 70–80:

```jsx
{/* YouTube search links */}
{step.links && step.links.length > 0 && (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: compact ? 18 : 20, marginTop: compact ? 3 : 5 }}>
    {step.links.slice(0, 2).map((link, li) => (
      <a key={li} href={link.url} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: compact ? 10 : 11, fontWeight: 600, color: '#c0392b', ... }}>
        ▶ {link.channel}
      </a>
    ))}
  </div>
)}
```

`step.links` is built in `contentEngine.js` via `buildLinks()`, which calls `getVerifiedLink()` from videoLookup.js. Each link has `{ channel, url, verified, duration }`.

The 1.5x tip should render **directly above this `div`** — once per content review block, which means once per WATCH step (since READ steps don't have links). We can gate it on `act === 'WATCH'` and `step.links?.length > 0`.

`ContentSequencePanel` is used in two places:
- Line 1267: `<ContentSequencePanel contentSequence={block.contentSequence} compact={true} />` (dashboard compact view)
- Line 2928: `<ContentSequencePanel contentSequence={block.contentSequence} />` (full plan view)

One change to `ContentSequencePanel` covers both views.

---

### Q6: How does the plan know which topic is in today's content review block?

**Trace:**

1. `planEngine.js` line 1262: `getContentSequence(focusTopic.category, focusTopic.gapType, profile.resources, topSubs)`
2. `contentEngine.js → getContentSequence()` uses `topSubs[0]` (the #1 weakest sub-topic) to select sub-topic-specific videos via `getVerifiedLink(channel, topSubs[0].topic)`
3. `getVerifiedLink()` in videoLookup.js calls `getVideosForTopic(subTopicQuery)` and finds the matching verified URL
4. The resulting `contentSeqFull` is stored on the block as `block.contentSequence`

For duration integration:
- After `getContentSequence()` returns, we can call `getVideosForTopic(topSubs[0]?.topic || focusTopic.category)` to get the actual video objects with real durations
- This is the call point for `calculateContentReviewMinutes(videos, firstAidMinutes)`

---

## Proposed Decisions

### D1: Which video's duration represents the block?

**Proposed: (A) Longest video in the returned results.**

Reasoning: `getVideosForTopic` returns up to 5 ranked videos. The student picks ONE to watch. Budgeting for the longest means the schedule never runs short, even if the student picks the long Ninja Nerd video. If they pick a shorter one, they finish early — that's fine. Shortest (B) would chronically under-budget for Ninja Nerd (36-52 min) which is the most-used channel.

**Important caveat:** The Ninja Nerd `duration_min` values average 52 min, while the other channels (MM:SS format) often run 10-25 min. The "longest" for a typical cardiovascular topic might be 47 min (Ninja Nerd Valvular) vs. 14 min (Dirty Medicine Heart Failure). Budgeting 47 min is reasonable and realistic. This will push most content review blocks from ~0.75 hr to ~1.0-1.25 hrs — a significant change to plan density.

---

### D2: Real video time vs 1.5x math in block allocation?

**Proposed: (B) Budget at 1x (real video time).**

Reasoning: The tip encourages 1.5x as a tool, not a requirement. A student who doesn't use 1.5x still finishes within the allocated block. Students who do use 1.5x finish ~33% early and can use the freed time for FA annotation — which is exactly the right behavior.

---

### D3: First Aid review time allocation

First Aid IS part of the content review block (READ step, hardcoded "~15–20 min"). Per the investigation rule:

**Proposed: Content review block = video time (at 1x, using D1 longest) + 15 min First Aid.**

The FA step's timeLabel will remain unchanged at "~15–20 min" (the parser takes the upper bound = 20 min). The video WATCH step's timeLabel will be updated to show the actual duration (e.g., "36 min") if a real duration is available, or "~20 min" (the existing fallback) if not.

Implementation note: `calculateContentReviewMinutes(videos, firstAidMinutes = 20)` will receive `firstAidMinutes = 20` as its second argument (matching the upper bound of the current "~15-20 min" label). If the student doesn't have First Aid selected (`hasFirstAid = false`), pass `firstAidMinutes = 0`.

---

### D4: Default for videos with no duration

**Proposed: 20 minutes default.** (39/890 entries — ~4.4% of resources)

The actual average of `duration_min` entries is 52 min, but those are exclusively Ninja Nerd long-form lectures. The broader library average for the MM:SS entries is closer to 15-25 min. 20 min is a conservative middle-ground default.

Display: In the `timeLabel` for WATCH steps with no duration found, keep the existing `"~20 min"` label unchanged (the tilde already signals "approximate"). No additional UI indicator needed — the existing fallback label is already tilde-prefixed.

---

### D5: Exact wording for the 1.5x tip

```
💡 Watch at 1.5x speed to stay on schedule
```

**Placement:** Directly above the video links row in `ContentSequencePanel`, only when:
- `act === 'WATCH'` (not READ, not PRACTICE)
- `step.links?.length > 0` (there are actual video buttons to show)

**Style:** Small, muted, italic — not a banner. Suggested inline style (matching existing patterns in the component):
```jsx
<div style={{ fontSize: compact ? 9 : 11, color: '#8a857e', fontStyle: 'italic',
              fontFamily: 'Georgia, "Times New Roman", serif',
              paddingLeft: compact ? 18 : 20, marginBottom: 3 }}>
  💡 Watch at 1.5x speed to stay on schedule
</div>
```

---

### D6: Duration parsing for time calculation

**Proposed helper: `parseVideoDurationToMinutes(video)`** — to be added to `frontend/src/lib/videoLookup.js`

```javascript
/**
 * Parse a video object's duration to minutes (rounded up).
 * Handles three cases from the library:
 *   - duration_min (number):        Ninja Nerd style — return directly
 *   - duration (string "MM:SS"):    parse and convert
 *   - duration (string "H:MM:SS"):  parse and convert
 *   - neither:                      return 20 (D4 default)
 */
export function parseVideoDurationToMinutes(video) {
  if (!video) return 20;
  if (video.durationMin != null) return Math.round(video.durationMin);
  if (video.duration) {
    const parts = video.duration.split(':').map(Number);
    let totalSec;
    if (parts.length === 3) {
      totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      totalSec = parts[0] * 60 + parts[1];
    } else {
      return 20;
    }
    return Math.ceil(totalSec / 60);
  }
  return 20;
}
```

**Second helper: `calculateContentReviewMinutes(videos, firstAidMinutes = 0)`**

```javascript
/**
 * Calculate total content review block time from video array.
 * Applies D1 (longest), D2 (1x), D3 (+ firstAidMinutes), D4 (20 min default).
 * Returns total in minutes.
 */
export function calculateContentReviewMinutes(videos, firstAidMinutes = 0) {
  if (!videos || videos.length === 0) return 20 + firstAidMinutes;
  const durations = videos.map(v => parseVideoDurationToMinutes(v));
  const longestVideoMin = Math.max(...durations);  // D1: longest
  return longestVideoMin + firstAidMinutes;         // D2: 1x, D3: add FA time
}
```

---

## Impact Summary

For a typical **knowledge-gap day** with Heart Failure as focus topic:
- **Before:** 20 (WATCH) + 15 (WATCH 2) + 20 (READ FA) = 55 min → rounded to **1.0 hr**
- **After (with real duration):** 36 (Ninja Nerd Heart Failure, longest) + 20 (FA) = 56 min → **1.0 hr** (same result in this case)

For a topic where only shorter videos are available (e.g., Dirty Medicine 14:10):
- **Before:** 20 + 20 = 40 min → **0.75 hr**
- **After:** 15 (ceiling of 14:10) + 20 (FA) = 35 min → **0.5 hr** (shorter — more accurate)

For a Ninja Nerd-heavy topic (e.g., 47-min Valvular):
- **Before:** 20 + 20 = 40 min → **0.75 hr**
- **After:** 47 (NN Valvular) + 20 (FA) = 67 min → **1.25 hr** (longer — more realistic)

Net effect: some days get slightly longer content review, some shorter. Overall more accurate to what students actually experience.

---

> **Investigation complete. Please review the findings and proposed decisions D1–D6 above and reply either:**
> - `approved` to implement all proposed defaults, OR
> - Specific changes to any of D1–D6 you want different
>
> I will not proceed until I hear back.
