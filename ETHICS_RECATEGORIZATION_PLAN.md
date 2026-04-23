# Ethics & Biostatistics Recategorization Plan

## Files involved

| File | Role |
|---|---|
| `frontend/src/data.js` | **Primary fix.** `SUB_TOPICS` object (exported, line 130) is the single source of truth for which topics appear in each study block. `getTopSubTopics(category)` in planEngine calls `SUB_TOPICS[category]` directly. |
| `frontend/src/contentEngine.js` | **Secondary fix.** Contains two maps keyed by category: (1) `subTopicVideos` — which YouTube channel queries to use per subtopic (lines 123–502); (2) `subTopics` reading guides — which First Aid section and focus text to display per subtopic (lines 659–805). Both maps have Ethics and Biostatistics under BOTH "Behavioral Health & NS/SS" AND "Behavioral Sciences" — the BH&NS/SS copies need to be removed. |
| `frontend/src/planEngine.js` | **No change needed.** Imports `SUB_TOPICS` and calls `getTopSubTopics(category)`. Categorization is entirely driven by which key topics live under in `data.js`. |

---

## Current data structure

Topics are stored in `SUB_TOPICS` (data.js line 130) as a plain object keyed by category name. Each value is an array of `{ topic: string, yield: number, disciplines?: string[] }` objects.

```javascript
export const SUB_TOPICS = {
  // System categories
  "Behavioral Health & Nervous Systems/Special Senses": [
    { topic: "Biostatistics...", yield: 9, disciplines: ["Behavioral Sciences"] },  // line 169 — WRONG
    { topic: "Ethics...",        yield: 8, disciplines: ["Behavioral Sciences"] },  // line 170 — WRONG
    { topic: "Seizure...",       yield: 8, disciplines: ["Pathology","Pharmacology"] }, // stays
    ...
    { topic: "Bias & confounding...", yield: 7, disciplines: ["Behavioral Sciences"] }, // line 177 — WRONG
  ],

  // Discipline categories
  "Behavioral Sciences": [
    { topic: "Biostatistics...", yield: 10 },  // line 311 — correct home
    { topic: "Ethics...",        yield: 9  },  // line 313 — correct home
    { topic: "Bias types...",    yield: 7  },  // line 315 — correct home
    ...
  ],
};
```

The `disciplines: [...]` field on system topics is **metadata only** — used by `getDominantDisciplinesForSystem()` and `getWeakestDisciplineInSubTopics()` for priority crossover bonus calculations. It does NOT affect which block a topic appears in. The block is determined purely by which outer key the topic lives under.

---

## Current state — where things live

- **Ethics**: `data.js` line 170 — under `"Behavioral Health & NS/SS"` system (BUG), AND line 313 under `"Behavioral Sciences"` discipline (correct). Duplicated.
- **Biostatistics**: `data.js` line 169 — under `"Behavioral Health & NS/SS"` system (BUG), AND line 311 under `"Behavioral Sciences"` discipline (correct). Duplicated.
- **Bias & confounding**: `data.js` line 177 — under `"Behavioral Health & NS/SS"` system with `disciplines: ["Behavioral Sciences"]` (BUG), AND line 315 as "Bias types & confounders" under `"Behavioral Sciences"` discipline (correct). Duplicated.
- **Defense mechanisms**: `data.js` line 318 — correctly under `"Behavioral Sciences"`.
- **Developmental milestones**: `data.js` line 319 — under `"Behavioral Sciences"` as "Developmental milestones". Present.
- **Statistical tests**: `data.js` line 316 — under `"Behavioral Sciences"`. Present.
- **Study design**: `data.js` line 312 — under `"Behavioral Sciences"`. Present.
- **Substance use disorders**: `data.js` line 178 — under `"Behavioral Health & NS/SS"` with `disciplines: ["Behavioral Sciences"]`, AND line 317 under `"Behavioral Sciences"`. Duplicated (but substance use straddles both systems — psychiatry AND behavioral sciences — so this one is debatable. It is NOT in the primary fix list.)
- **Informed consent / capacity / HIPAA**: Partially covered under the Ethics entry (line 313 topic string: "Ethics (autonomy, informed consent, capacity, HIPAA, mandatory reporting)"). No separate entry.
- **End-of-life / advance directives / DNR**: NOT present anywhere in `SUB_TOPICS`.
- **Communication skills / SPIKES**: NOT present anywhere in `SUB_TOPICS`.
- **Healthcare law / EMTALA / malpractice**: NOT present anywhere in `SUB_TOPICS`.
- **Patient safety / quality improvement**: NOT present anywhere in `SUB_TOPICS`.
- **Human development stages (Piaget/Freud/Erikson)**: Covered by "Developmental milestones" entry (line 319). Entry exists but topic string is narrow. Could expand.
- **Sleep stages & disorders**: `data.js` line 181 under BH&NS/SS (with `disciplines: ["Behavioral Sciences"]`), AND line 320 under `"Behavioral Sciences"`. Duplicated (same situation as substance use — neurology & behavioral overlap is legitimate here).

### contentEngine duplicates

| Subtopic | BH&NS/SS location | Behavioral Sciences location |
|---|---|---|
| Ethics — video channels | `contentEngine.js` lines 136–139 (BUG) | lines 493–496 (correct) |
| Biostatistics — video channels | `contentEngine.js` lines 160–163 (BUG) | lines 485–488 (correct) |
| Ethics — reading guide | `contentEngine.js` line 663 (BUG) | line 801 (correct) |
| Biostatistics — reading guide | `contentEngine.js` line 669 (BUG) | line 799 (correct) |

---

## Label status

- **"Behavioral Sciences"** (discipline): **YES** — exists in `STEP1_DISCIPLINE_CATEGORIES` (line 22), `HIGH_YIELD_WEIGHTS` (line 66), `DISCIPLINE_YIELD_WEIGHTS` (line 81), `RESOURCE_MAP` (line 103), `SUB_TOPICS` (line 310), `DISCIPLINE_ATTACK_STRATEGIES` (line 401).
- **"Behavioral Health & Nervous Systems/Special Senses"** (system): **YES** — exists in `STEP1_SYSTEM_CATEGORIES` (line 7), `HIGH_YIELD_WEIGHTS` (line 54), `RESOURCE_MAP` (line 91), `SUB_TOPICS` (line 165).

No new keys or enum values need to be created. Both categories already exist fully.

---

## Topics to move TO Behavioral Sciences discipline

In priority order:

| Topic | Current (wrong) location | Action |
|---|---|---|
| Biostatistics | `data.js` line 169 (BH&NS/SS system) | REMOVE from BH&NS/SS; already in Behavioral Sciences |
| Ethics | `data.js` line 170 (BH&NS/SS system) | REMOVE from BH&NS/SS; already in Behavioral Sciences |
| Bias & confounding | `data.js` line 177 (BH&NS/SS system) | REMOVE from BH&NS/SS; already in Behavioral Sciences as "Bias types" |
| End-of-life / advance directives / DNR | Missing | ADD to Behavioral Sciences (yield ~7) |
| Communication skills / SPIKES | Missing | ADD to Behavioral Sciences (yield ~5) |
| Healthcare law / EMTALA / malpractice | Missing | ADD to Behavioral Sciences (yield ~5) |
| Patient safety / quality improvement | Missing | ADD to Behavioral Sciences (yield ~4) |

New Behavioral Sciences entries to add:
```javascript
{ topic: "End-of-life care (advance directives, DNR, hospice, palliative care)", yield: 7 },
{ topic: "Communication skills (SPIKES, breaking bad news, motivational interviewing)", yield: 5 },
{ topic: "Healthcare law (EMTALA, Good Samaritan, malpractice, mandatory reporting)", yield: 5 },
{ topic: "Patient safety & quality improvement (PDSA, root cause analysis, handoffs)", yield: 4 },
```

---

## Topics to stay in Behavioral Health & Nervous Systems/Special Senses

| Topic | data.js line |
|---|---|
| Stroke syndromes | 167 |
| Neurotransmitters & receptor pharmacology | 168 |
| **Seizure disorders & antiepileptic drugs** | 171 — MUST NOT MOVE |
| **Demyelinating diseases** | 172 — MUST NOT MOVE |
| **Psychiatric disorders (MDD, bipolar, schizophrenia)** | 173 — MUST NOT MOVE |
| Neurodegenerative diseases | 174 |
| Spinal cord lesions | 175 |
| CNS tumors | 176 |
| Substance use disorders | 178 (also in Behavioral Sciences — dual is acceptable) |
| Meningitis | 179 |
| Cranial nerve palsies | 180 |
| Sleep disorders | 181 (also in Behavioral Sciences — dual is acceptable) |

---

## Proposed changes

### Change 1 — `data.js`: Remove Biostatistics, Ethics, and Bias from BH&NS/SS system list

Delete lines 169, 170, and 177 (the three `disciplines: ["Behavioral Sciences"]` entries from the BH&NS/SS system list). No other entries in that block change.

Also update the comment on line 166 from:
```
// Exam weight 10-14%; biostatistics here because it appears on every form
```
to:
```
// Exam weight 10-14%; neurology, psychiatry, and sensory systems
```

### Change 2 — `data.js`: Add 4 missing target topics to Behavioral Sciences list

After the existing Behavioral Sciences list (after line 320, "Sleep stages & disorders"), add:
```javascript
{ topic: "End-of-life care (advance directives, DNR, hospice, palliative care)", yield: 7 },
{ topic: "Communication skills (SPIKES, breaking bad news, motivational interviewing)", yield: 5 },
{ topic: "Healthcare law (EMTALA, Good Samaritan, malpractice, mandatory reporting)", yield: 5 },
{ topic: "Patient safety & quality improvement (PDSA, root cause analysis, handoffs)", yield: 4 },
```

### Change 3 — `contentEngine.js`: Remove Ethics and Biostatistics from BH&NS/SS subTopicVideos

Remove these two entries from the `"Behavioral Health & NS/SS"` `subTopicVideos` object (lines 136–139 and 160–163). They are fully represented in the `"Behavioral Sciences"` `subTopicVideos` at lines 485–496.

### Change 4 — `contentEngine.js`: Remove Ethics and Biostatistics from BH&NS/SS reading guide

Remove these two entries from the `"Behavioral Health & NS/SS"` `subTopics` reading guide object (lines 663 and 669). They are fully represented in the `"Behavioral Sciences"` reading guide at lines 799–801.

### No change to planEngine.js

`planEngine.js` imports `SUB_TOPICS` and calls `getTopSubTopics(category)`. Once `data.js` is fixed, plan generation automatically uses the correct categorization. No planEngine changes needed.

---

## Risks identified

1. **The `disciplines` metadata on removed entries**: Removing lines 169, 170, and 177 slightly reduces the total Behavioral Sciences discipline weight computed by `getDominantDisciplinesForSystem("Behavioral Health & NS/SS")`. This makes BH&NS/SS look slightly less like a Behavioral Sciences-dominant system — which is **correct** behavior, since its true dominant disciplines are Pathology and Pharmacology (neurology).

2. **contentEngine subtopic lookup fallback**: contentEngine uses fuzzy prefix matching — it finds the subTopicVideos/reading guide entry whose key is a prefix match of the topic string. After removing "Ethics" and "Biostatistics" from BH&NS/SS entries, if the plan engine ever looks up an "Ethics" subtopic in context of BH&NS/SS, it will fall back to the system's `mainVideos` default. This is the correct behavior since Ethics belongs in Behavioral Sciences blocks, not BH&NS/SS blocks. After the data.js fix, Ethics and Biostatistics will no longer appear as subtopics of BH&NS/SS — so the contentEngine lookup never reaches that path anyway.

3. **Zero new dependencies, no schema changes, no auth changes.** All changes are pure data in two JS files.

---

## Confidence

**HIGH**

Reasoning:
- Both category keys already exist; no new structure needed.
- The fix is purely removing 3 duplicate entries from one array and removing 4 duplicate entries from two contentEngine maps.
- Topics already exist correctly in Behavioral Sciences — there's nothing to "move", just de-duplicate.
- Adding 4 new target topics to Behavioral Sciences is clean and additive.
- Seizure, demyelinating, and psychiatric entries are on different lines in the array and are not touched.
- The plan engine calls `getTopSubTopics(category)` with the exact category string — no string comparisons or conditionals anywhere in planEngine reference "ethics" or "biostatistics" by name.

---

## Resolution

### Files changed
- `frontend/src/data.js` — removed Biostatistics, Ethics, and Bias from BH&NS/SS; added 4 missing Behavioral Sciences topics; expanded developmental milestones label
- `frontend/src/contentEngine.js` — removed Ethics and Biostatistics from BH&NS/SS subTopicVideos and reading guide entries

### Verification test output
```
── Behavioral Sciences discipline ──
  PASS  Biostatistics IS in Behavioral Sciences
  PASS  Ethics IS in Behavioral Sciences
  PASS  Study design IS in Behavioral Sciences
  PASS  Defense mechanisms IS in Behavioral Sciences
  PASS  Developmental milestones IS in Behavioral Sciences
  PASS  End-of-life care IS in Behavioral Sciences
  PASS  Communication skills IS in Behavioral Sciences
  PASS  Healthcare law IS in Behavioral Sciences
  PASS  Patient safety IS in Behavioral Sciences

── BH&NS/SS system — removed topics ──
  PASS  Biostatistics NOT in BH&NS/SS
  PASS  Ethics NOT in BH&NS/SS
  PASS  Bias & confounding NOT in BH&NS/SS

── BH&NS/SS system — must-stay topics ──
  PASS  Seizure disorders STILL in BH&NS/SS
  PASS  Demyelinating diseases STILL in BH&NS/SS
  PASS  Psychiatric disorders STILL in BH&NS/SS
  PASS  Neurodegenerative STILL in BH&NS/SS
  PASS  Stroke STILL in BH&NS/SS

────────────────────────────────────────
Result: 17 passed, 0 failed
```

### Build status
PASS — `vite build` clean in 925ms, 0 errors.

### Manual verification for the user
1. Generate a study plan. Confirm there's a "Behavioral Sciences" discipline block.
2. Confirm that block contains: ethics, biostatistics, informed consent/HIPAA, end-of-life care, communication skills, healthcare law, patient safety, defense mechanisms, developmental milestones.
3. Confirm "Behavioral Health & Nervous Systems/Special Senses" block still has: seizures, demyelinating diseases, mood/psychotic disorders, stroke, neurodegenerative diseases.
4. Confirm ethics does NOT appear in the BH&NS/SS block.
5. Confirm biostatistics does NOT appear in the BH&NS/SS block as a subtopic.

### Merge command
`git checkout main && git merge fix-ethics-categorization && git push origin main`
