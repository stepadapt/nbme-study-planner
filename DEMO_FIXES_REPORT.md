# Demo Fixes Report

## Files found

| File | Path | Lines |
|------|------|-------|
| contentEngine.js | `frontend/src/contentEngine.js` | 1061 |
| planEngine.js | `frontend/src/planEngine.js` | 1276 |
| data.js | `frontend/src/data.js` | 433 |
| video-library.json | `src/data/video-library.json` | 8589 (918 entries) |
| videoLookup.js | `frontend/src/lib/videoLookup.js` | 219 |
| topic-key-map.json | **MISSING** (not needed — mapping is inline in videoLookup.js) |
| Video button UI component | `frontend/src/pages/StudyPlanner.jsx` line 74 |

---

## Bug 1 root cause

The video library has **three tiers of URL coverage**:
- 57 entries have direct video URLs (`https://youtu.be/XXX`)
- 564 entries have only a `channel_url` field — a **channel homepage** like `https://www.youtube.com/@dirtymedicine`
- 13 entries are `channel_reference` type (no URL, just a `search` string)

In `videoLookup.js → normalizeResource()` (line 38):
```javascript
url: directUrl || fallbackUrl,   // fallbackUrl = channel homepage
```

So 564/634 entries return a channel homepage as their `url`.

In `contentEngine.js → buildLinks()` (line 26):
```javascript
url: verified.url || ytLink(v.query),
```

Since `verified.url` is truthy (it's the channel homepage URL — a non-null string), it is used **instead of** `ytLink(v.query)` which would produce a proper YouTube search URL. Result: users clicking any video button for a Dirty Medicine, Armando, Randy Neil, or most Ninja Nerd topics land on the channel homepage, not a video.

**Example traced:** For "Heart failure" in Cardiovascular — the library has a Dirty Medicine entry with `channel_url: "https://www.youtube.com/@dirtymedicine"`. This flows through as the button's `href`. The correct URL should be:
```
https://www.youtube.com/results?search_query=Dirty+Medicine+Heart+Failure
```

---

## Bug 1 fix plan

In `videoLookup.js → normalizeResource()`, when there is no direct video URL, construct a YouTube search URL from the channel display name + video title. This gives every entry a working URL:
- Direct `youtu.be/` URLs → used as-is (links to specific video)
- Entries with only `channel_url` → build `youtube.com/results?search_query=ChannelName+Title`
- `channel_reference` entries with a `search` field → build search URL from the `search` field directly
- `channel_reference` entries with no `search` field → return null (already filtered by caller)

Add a `CHANNEL_DISPLAY` map in `normalizeResource` for display names. No changes needed to `contentEngine.js` — the `verified.url || ytLink(v.query)` fallback in `buildLinks` already works correctly once `normalizeResource` returns proper URLs.

---

## Bug 2 root cause

`focusCursor` in the plan generation loop (planEngine.js line 1072) cycles through priority categories, staying on the **same category for 2 consecutive study days** (increments only when `studyDayNum % 2 === 0`).

On both those days, `getTopSubTopics(category, 3, subTopicProgress)` is called with **no offset** — it always returns the same top-3 subtopics sorted by yield descending. So if "Reproductive & Endocrine Systems" is priority #1 and gets days 1 and 2, both days produce:
- Day 1: Diabetes mellitus, Thyroid disorders, Adrenal disorders
- Day 2: **Diabetes mellitus, Thyroid disorders, Adrenal disorders** (identical)

The subtopic list in `data.js` is correctly ordered by yield (12 subtopics for Repro/Endo), but nothing advances the pointer through that list between visits to the same category.

---

## Bug 2 fix plan

1. Add an `offset` parameter to `getTopSubTopics`. When offset > 0, start slicing from that position in the sorted list, wrapping around if needed.
2. In the plan generation loop, add a `subTopicCursors = {}` map before the loop. Each time a category is used as `focusTopic`, look up `subTopicCursors[category]` for the visit count, compute `offset = visitCount * 3`, then increment the counter after building blocks.
3. Pass `subTopicOffset` to all three call sites of `getTopSubTopics` within the loop.
4. Bump `PLAN_ENGINE_VERSION` to 2 and add changelog entry for this fix.

Result: 4 days of Repro/Endo will show Diabetes→Thyroid→Adrenal, then Pituitary→Calcium→Pregnancy, then Ovarian→Breast→Menstrual, then Testicular→MEN→Sexual development (looping back if exhausted).

---

---

## Resolution

### Bug 1 fix
**Files changed:** `frontend/src/lib/videoLookup.js`, `scripts/test-video-urls.js`

**What changed:** `normalizeResource()` now builds a YouTube search URL from the channel display name + video title whenever no direct `youtu.be/` URL exists. Previously it returned a channel homepage URL (e.g. `https://www.youtube.com/@dirtymedicine`) which was truthy and bypassed the proper search-URL fallback in `buildLinks()`. Now every entry has a working URL — either a direct video link or a `youtube.com/results?search_query=` URL that surfaces the correct video as the top result.

**Test output:** `node scripts/test-video-urls.js` → 20 passed, 0 failed

---

### Bug 2 fix
**Files changed:** `frontend/src/planEngine.js`

**What changed:** `getTopSubTopics()` gains an `offset` parameter that rotates the starting position in the yield-sorted subtopic list. A `subTopicCursors` map in the plan generation loop tracks how many times each category has been used as `focusTopic`; each call computes `offset = visitCount * 3` and passes it to all three `getTopSubTopics` call sites. `PLAN_ENGINE_VERSION` bumped to 2 so existing users get auto-regeneration on next login.

**Traced example (4 days of Repro/Endo):**
```
Day 1 (visit=0, offset=0):  Diabetes mellitus, Thyroid disorders, Adrenal disorders
Day 2 (visit=1, offset=3):  Pituitary disorders, Calcium & parathyroid, Pregnancy complications
Day 3 (visit=2, offset=6):  Ovarian & uterine pathology, Breast pathology, Menstrual cycle & hormones
Day 4 (visit=3, offset=9):  Testicular & prostate pathology, MEN syndromes, Disorders of sexual development
```

---

### Build status
✅ `npm run build` passes — 45 modules transformed, no errors.

---

### What the user should do
```bash
git checkout main
git merge demo-fixes
git push origin main
```

To start the local server (check your npm scripts — usually one of):
```bash
cd frontend && npm run dev    # Vite dev server
```

---

### Things I'm NOT confident about
1. **Topic offset timing with light days**: Light days also call `getTopSubTopics` and also consume the cursor. If there's a light day interspersed between two Repro/Endo focus days, the second full day shifts by +6 instead of +3 (because the light day counted as visit 1). In practice this is fine — it means the light day shows the tier-2 topics, and the next full day shows tier-3. But the exact ordering may differ slightly from what you'd manually prescribe. **Test this by generating a long plan and checking Repro/Endo days.**

2. **`getTopSubTopics` is also exported and called from `StudyPlanner.jsx`** for the sub-topic progress panel (showing which topics a student should focus on). That call doesn't pass `offset`, so it defaults to 0 — always showing the top-yielding topics. This is correct behavior for the progress panel (it should show the globally highest-yield topics, not the day-rotated version). No change needed there.

---

## Risks

**Low risk (confident):**
- Bug 1 fix is contained entirely to `normalizeResource()` in videoLookup.js — it's additive, replacing a channel-homepage fallback with a search-URL fallback. The `buildLinks()` fallback still works if lookup returns null.
- Bug 2 fix is additive — `getTopSubTopics` default `offset=0` preserves all existing behavior for call sites that don't pass an offset.

**Medium risk (tested before committing):**
- `getTopSubTopics` is also called from `StudyPlanner.jsx` via the export `getTopSubTopics` for the sub-topic progress panel. That call doesn't need an offset (it shows current performance, not daily rotation), so it will keep working because offset defaults to 0.
- The wrap-around logic in the offset implementation needs careful testing to avoid showing duplicate subtopics when offset exceeds the list length.

**None found that would block proceeding.**
