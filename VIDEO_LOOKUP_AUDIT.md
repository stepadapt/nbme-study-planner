# Video Lookup Systemic Audit Report

**Audit date:** 2026-04-18
**Branch:** fix-video-lookup-systemic
**Auditor:** automated script + manual analysis

---

## Files Found

| File | Path |
|------|------|
| videoLookup.js | `/Applications/NBMEStudyPlanner/frontend/src/lib/videoLookup.js` |
| video-library.json | `/Applications/NBMEStudyPlanner/src/data/video-library.json` |
| planEngine.js | `/Applications/NBMEStudyPlanner/frontend/src/planEngine.js` |
| contentEngine.js | `/Applications/NBMEStudyPlanner/frontend/src/contentEngine.js` |
| data.js | `/Applications/NBMEStudyPlanner/frontend/src/data.js` |
| topic-key-map.json | **Does not exist** |

---

## topic-key-map.json

**Does not exist.** There is no topic-key-map.json file anywhere in the project. The lookup system uses fuzzy string matching at runtime (see videoLookup.js) rather than a pre-built mapping.

---

## videoLookup.js Structure

**Location:** `frontend/src/lib/videoLookup.js` (ESM module, 313 lines)

### Key functions:

**`getAllEntries()`** — builds and caches a flat pool of all searchable video entries from the library. Pulls from `videos_by_system` (iterating `low_hanging_fruit` + `second_tier` per system) and `videos_by_discipline` (via `collectEntries()`). Filters out entries where `entry.subtopic` is not a non-empty string.

**`matchesTopic(query, subtopic)`** — fuzzy matcher. Core logic (the source of most bugs):

```js
function matchesTopic(query, subtopic) {
  const q = query.split('(')[0].trim().toLowerCase();
  const s = subtopic.split('(')[0].trim().toLowerCase();

  // 1. Direct includes match
  if (s.includes(q) || q.includes(s)) return true;

  // 2. Plural stem: strip trailing 's'
  const qStem = q.replace(/s$/, '');
  if (qStem.length >= 4 && (s.includes(qStem) || qStem.includes(s))) return true;

  // 3. First-word match (6+ char first word)
  const qFirstWord = q.split(/\s+/)[0];
  const sFirstWord = s.split(/\s+/)[0];
  if (qFirstWord.length >= 6 && qFirstWord === sFirstWord) return true;

  return false;
}
```

**`getVideosForTopic(query, options)`** — iterates all entries, applies `matchesTopic`, collects and deduplicates resources, sorts by directUrl then channelPreference.

### How planEngine.js calls it:

```js
const topSubQuery = topSubs?.[0]?.topic || focusTopic.category;
const libraryVideos = getVideosForTopic(topSubQuery, { maxResults: 5 });
```

The query is the full sub-topic string from `SUB_TOPICS[category][0].topic` — e.g. `"Cardiac cycle & pressure-volume loops"` or `"Anemias (iron, B12/folate, sickle cell...)"`.

---

## Total Topics Tested

196 topic keys were tested (179 sub-topic strings from `data.js` `SUB_TOPICS`, plus 17 category-level fallback strings).

---

## Audit Results Summary

| Outcome | Count |
|---------|-------|
| Topics with fully matching videos | 17 (8.7%) |
| Topics returning NO videos | 113 (57.7%) |
| Topics returning ALL mismatched videos | 38 (19.4%) |
| Topics returning SOME mismatched videos | 28 (14.3%) |
| **Total with issues** | **179 (91.3%)** |

---

## Topics With Mismatched Videos (Worst 10 — Wrong Videos Returned)

These are cases where the function returns videos but ALL of them are from the wrong topic, which is worse than returning nothing because the plan silently shows the wrong content.

1. **"Cardiac cycle & pressure-volume loops"** — Returns: Hypertension, Hyperlipidemia, Antiplatelet Medications, Antiarrhythmic Pharmacology, Lipid Lowering Agents. Root cause: first-word "cardiac" matches "Cardiac pharmacology" subtopic, polluting all results with pharmacology videos.

2. **"Cardiac tumors (myxoma, rhabdomyoma)"** — Returns: same 5 cardiac pharmacology videos. Same false-positive first-word match.

3. **"Cardiac cycle & hemodynamics (Frank-Starling, pressure-volume loops)"** — Returns: same 5 cardiac pharmacology videos. Same mechanism.

4. **"Pituitary disorders (prolactinoma, acromegaly, SIADH, DI)"** — Returns: "Diabetes Insipidus & SIADH" (correct) + "SIADH vs. Diabetes Insipidus" (correct), but query word "pituitary" has no matching subtopic. These happen to be returned because "SIADH" appears in the full library — but the match is coincidental, not on "pituitary".

5. **"Pregnancy complications (ectopic, pre-eclampsia, gestational DM)"** — Returns: Placenta Pathology, Polyhydramnios vs. Oligohydramnios, Teratogens. Completely wrong videos; none cover ectopic pregnancy or pre-eclampsia.

6. **"Systemic infections & sepsis"** — Returns: 5 Armando Hasudungan Malaria/Parasites videos. "Infections" matches "Infections (additional pathogens - Armando detailed)" which contains only parasitology.

7. **"Fungal infections (Candida, Aspergillus, Crypto, Histo, Cocci)"** — Returns same 5 Malaria/Parasites videos for the same reason.

8. **"STIs (syphilis, chlamydia, gonorrhea, HPV, HSV)"** — Returns: Syphilis, Chlamydia, Gonorrhea, Trichomoniasis, Bacterial Vaginosis. "STIs" in the query doesn't match "STIs" in the library subtopic because the library subtopic is plain "STIs" and the query starts with "STIs" — which IS 3 chars, too short for the first-word rule, and the full strings differ. Videos returned are coincidentally correct by include-match on partial substring, not intentional.

9. **"Anemias (iron, B12/folate, sickle cell, thalassemia, hemolytic)"** — Returns: Microcytic Anemia, Macrocytic Anemia, Normocytic Anemia, Anemia (Types), Anaemia - classification. These are actually correct content, but they fail the keyword test because "anemias" (plural) doesn't include the word "anemia" (the audit's keyword check is strict). This is a false positive in the audit script's evaluation, not a true lookup failure — the videos are appropriate.

10. **"Leukemias & lymphomas (ALL, AML, CLL, CML, Hodgkin's, Burkitt's)"** — Returns: Acute Leukemia, Chronic Leukemia, Lymphoma (Hodgkin + NHL), Myeloproliferative Neoplasms, Leukemia. Again, videos are actually correct content; "leukemias" vs "leukemia" causes the audit script's keyword check to flag it. True lookup partially works here.

---

## Pattern Analysis

### Pattern 1: ZERO matches for entire discipline categories (most common — 57.7% of topics)

The majority of failures are outright "no videos returned" for essentially all discipline sub-topics:
- ALL of Biochemistry & Nutrition (10/10 topics fail)
- ALL of Genetics (9/9 fail — except none return videos)
- ALL of Histology & Cell Biology (8/8 fail)
- ALL of Pharmacology (12/12 — most fail)
- ALL of Gross Anatomy & Embryology (9/9 fail)

**Root cause:** The `videos_by_discipline` section of the library contains 27 entries where `entry.subtopic` is `null` (not a string). These entries are explicitly filtered out by `getAllEntries()`:

```js
_allEntries = entries.filter(e => typeof e.subtopic === 'string' && e.subtopic.trim());
```

This means 27 entries (containing ~200 individual video resources, 22.5% of all resources in the library) are permanently invisible to the lookup engine. The disciplines that are almost entirely without subtopic labels include: physiology sub-sections (cardiovascular, renal, pulmonary, GI), pharmacology sub-sections (autonomic, cardiovascular, antimicrobials, psych_drugs, other_pharm), all of anatomy_embryology, all of behavioral_sciences, most of biochemistry_nutrition, all of immunology sub-sections, all of histology_cell_biology, and most of genetics.

### Pattern 2: First-word false positives (clustered around "Cardiac" and "Pulmonary")

The first-word matching rule (`qFirstWord.length >= 6 && qFirstWord === sFirstWord`) causes any query beginning with "Cardiac" to match the library subtopic "Cardiac pharmacology." This produces:
- "Cardiac cycle & pressure-volume loops" → returns 5 cardiac pharmacology videos
- "Cardiac cycle & hemodynamics" → same
- "Cardiac tumors" → same

Similarly, any query starting with "Pulmonary" matches "Pulmonary physiology (Armando visual)" and returns Armando's spirometry/lung volumes videos regardless of what the query is actually about.

### Pattern 3: Short subtopic names match as a subset of longer queries (overly broad includes check)

The `s.includes(q) || q.includes(s)` check is bidirectional — if the library subtopic text appears anywhere in the query string, it fires. This is the main mechanism behind several partial matches, e.g., "Acid-base disorders (ABGs...)" correctly matches the library's "Acid-base disorders" via `s.includes(q)` after stripping parens, but it also allows any query containing a short subtopic string (like "Infections") to match any broader subtopic containing that word.

### Pattern 4: Library subtopic vocabulary doesn't align with data.js topic vocabulary

The library was built with different terminology than what data.js uses. Examples:
- data.js: "Glomerulonephritis (nephrotic vs nephritic, histology)" → library: "Glomerular disease (nephritic vs nephrotic)" — no match because "glomerulonephritis" ≠ "glomerular disease"
- data.js: "Calcium & parathyroid disorders" → library: "Calcium/PTH disorders and hyperparathyroidism" — "calcium" is too short for first-word (7 chars), "parathyroid" ≠ "calcium/pth"
- data.js: "Liver pathology (hepatitis A-E...)" → library: "Liver disease and hepatitis" — "liver" first-word (5 chars, < 6 threshold) doesn't fire; "liver pathology" vs "liver disease" don't include-match

---

## Red Flag Findings from Step 1.6

**A) `.includes()` on topic keys — CONFIRMED PROBLEMATIC**

The `matchesTopic` function uses `.includes()` bidirectionally: `s.includes(q) || q.includes(s)`. The `q.includes(s)` direction means that if any library subtopic string is a substring of the query, it fires. Since many library subtopics are short (e.g., "Shock", "Diuretics", "Meningitis"), and data.js queries are long (e.g., "Shock (hemodynamic parameters, cardiogenic vs distributive vs obstructive)"), the bidirectional check causes legitimate matches as well as false positives when library subtopics accidentally appear as substrings.

**B) No try/catch returning default list — NOT PRESENT**

No such pattern exists in videoLookup.js. Errors propagate normally.

**C) Loop variable corruption — NOT PRESENT**

No loop variable reuse. Standard `for...of` loops. No index corruption.

**D) `videos_by_discipline` double-registration — PRESENT (structural, not a bug per se)**

Both `videos_by_system` and `videos_by_discipline` are traversed and merged into a single flat pool. Some entries exist in both sections (e.g., cardiovascular physiology videos appear in both the system and discipline sections). Deduplication by `channel::title` key prevents double-returns, but it means some discipline-section videos only appear once even if they cover multiple topics.

**E) Fallback returning `library[firstKey]` — NOT PRESENT**

No such fallback exists. When nothing matches, an empty array is returned.

---

## Library Entry Stats

| Metric | Count |
|--------|-------|
| Total library entries (system + discipline) | 180 |
| Entries with null/missing subtopic (invisible) | 27 |
| Entries with valid named subtopic (searchable) | 153 |
| Total video resources in library | 890 |
| Resources in null-subtopic entries (unreachable) | 200 (22.5%) |
| Resources in named-subtopic entries (reachable) | 690 |

---

## Root Cause Hypothesis

The failure is **two overlapping structural bugs**, not one:

### Bug 1 (Primary — causes ~57% of failures): Missing subtopic labels on discipline entries

The `videos_by_discipline` section of the library has 27 entries with `subtopic: null`. These entries were likely created before the lookup system was designed, when the JSON was just an organizational reference. When the lookup engine was built, it correctly filters them out — but nobody audited whether all the important discipline content had subtopic labels added first. Result: all of physiology, pharmacology, anatomy, biochemistry, immunology, histology, and genetics are functionally invisible to the lookup engine.

### Bug 2 (Secondary — causes ~19% of failures): Overly broad first-word matching rule

The first-word fallback rule (`qFirstWord.length >= 6 && qFirstWord === sFirstWord`) was intended to handle plurals and near-synonyms like "Thyroid disorders" → "Thyroid disease." Instead it creates a 1-to-many fanout: any query starting with "Cardiac" matches every library entry starting with "Cardiac" (including "Cardiac pharmacology" for a query about pressure-volume loops), and any query starting with "Pulmonary" matches "Pulmonary physiology (Armando visual)" for a query about PE/DVT.

### Summary classification:

**Structural Type: Missing data + overly permissive fuzzy matcher**

This is not a logic error in the matching algorithm per se — the algorithm is correct given complete input data. The problem is (a) the library was populated with null subtopics for entire discipline sections, making those entries permanently invisible, and (b) the first-word fallback was added to compensate for vocabulary mismatches but has a threshold (6 chars) that is too low, causing false positives for broad topic-level words.

---

## Proposed Structural Fix

**NOT "add subtopic labels to each bad entry by hand"** — that is cosmetic and will drift again.

**Structural fix: Two-part change**

**Part 1 — Add subtopic labels to all 27 null-subtopic discipline entries in video-library.json.**

Each null-subtopic entry corresponds to a named section key (e.g., `physiology/cardiovascular`, `pharmacology/other_pharm`). The section key itself is a valid label. Map each section key to a subtopic string that matches the vocabulary used in data.js `SUB_TOPICS`. For example:
- `pharmacology/cardiovascular` → subtopic: `"Cardiac drugs"` (matching "Cardiac pharmacology" queries)
- `biochemistry_nutrition/metabolic_pathways` → subtopic: `"Metabolic pathways"`
- `genetics/inheritance_patterns` → subtopic: `"Inheritance patterns"`

This makes the 200 hidden resources searchable immediately.

**Part 2 — Replace the first-word fallback with a word-overlap matcher.**

Instead of the first-word rule, score matches by counting how many significant words (>4 chars) are shared between query and subtopic:

```js
// Proposed replacement for first-word rule:
const qWords = new Set(q.split(/\W+/).filter(w => w.length > 4));
const sWords = new Set(s.split(/\W+/).filter(w => w.length > 4));
const overlap = [...qWords].filter(w => sWords.has(w)).length;
if (overlap >= 1) return true;
```

This makes "Cardiac cycle & pressure-volume loops" match "Pressure-volume loops (physiology)" (shared: "pressure", "volume", "loops") but NOT match "Cardiac pharmacology" (shared: "cardiac" — but wait, "cardiac" is 7 chars and WOULD match under word-overlap).

A safer variant: require `overlap >= 2` OR restrict to cases where at least one of the shared words is a domain-specific clinical term (length >= 8 chars). Alternatively, replace the first-word rule with an explicit alias table mapping known vocabulary mismatches between data.js terms and library subtopic terms.

---

## Why This Is Structural, Not Cosmetic

A cosmetic fix would be: "add Thyroid Disorders to the library" or "rename the subtopic to match." A structural fix addresses the mechanism that causes the failure to be invisible and pervasive.

The current system has no validation that the vocabulary in `data.js` aligns with the vocabulary in `video-library.json`. Both files are maintained independently. When data.js adds a new sub-topic string, there is no test or warning that the library has no matching entry. The matching is silent — it returns an empty array and the plan falls back to hardcoded timelabels, with no error logged.

**The structural fix must:**
1. Make null-subtopic entries impossible (or at minimum, flagged at build time)
2. Make vocabulary drift detectable (an automated test that runs the full audit and fails if >N topics return no videos)
3. Use a matching strategy that doesn't silently return wrong videos (a true mismatch is worse than no match)

---

## Risks

1. **Adding subtopics to discipline entries** — if the subtopic label chosen doesn't match the data.js vocabulary, those entries stay invisible. The fix requires careful vocabulary alignment, not just any label.

2. **Tightening the first-word rule** — some current correct matches (e.g., "Thyroid disorders" → "Thyroid disease") rely on the first-word rule. Removing it without adding an alias table will break those working lookups. The 17 topics that currently succeed must remain working after the fix.

3. **Word-overlap matcher false positives** — "Cardiac cycle & hemodynamics" and "Cardiac pharmacology" share the word "cardiac" (7 chars). A word-overlap threshold of 1 would still produce false positives. Threshold of 2 may under-match for short subtopics.

4. **No regression test exists** — the audit script (`scripts/audit-video-lookup.js`) is the closest thing to a test. It should be converted to a proper test that runs in CI and fails the build when issue count exceeds a threshold, to prevent silent future drift.
