# Video Library Integration Notes

Branch: `video-library-integration`

## 1. Video Library JSON Structure

**Location:** `src/data/video-library.json` (repo root)
**Size:** 918 verified video entries, ~8590 insertions

### Top-level keys
```
metadata, channels, videos_by_system, videos_by_discipline, gaps_and_guidance
```

### `videos_by_system` — keys
```
cardiovascular, respiratory, renal, reproductive, endocrine,
neuro_behavioral, blood_lymphoreticular_immune, musculoskeletal_skin,
multisystem, gastrointestinal, biostatistics_epidemiology,
social_sciences_communication, human_development
```

Each system entry: `{ low_hanging_fruit: [...], second_tier: [...] }`
Each tier: array of `{ subtopic: "Title Case String", resources: [...] }`

### `videos_by_discipline` — keys
```
pathology, physiology, pharmacology, microbiology, anatomy_embryology,
behavioral_sciences, biochemistry_nutrition, immunology,
histology_cell_biology, genetics
```

Each discipline entry: **varies** — some are arrays, most are keyed objects:
- `pathology`: `{ foundation: [...], system_specific_guidance }`
- `physiology`: `{ cardiovascular, renal, pulmonary, gi }`
- `pharmacology`: `{ autonomic, cardiovascular, antimicrobials, ... }`
- `microbiology`: `{ bacteria_comprehensive }`
- `anatomy_embryology`: `{ nerve_injuries, vascular_territories, embryology, general }`
- `behavioral_sciences`: `{ biostats, ethics, defense_mechanisms_and_psych }`
- `biochemistry_nutrition`: `{ metabolic_pathways, storage_diseases, ... }`
- `immunology`: `{ hypersensitivity_and_immunodeficiencies, cell_markers_and_antibodies, autoimmune }`
- `histology_cell_biology`: `{ cell_biology, histology_glomerular_and_smear, collagen }`
- `genetics`: `{ inheritance_patterns, randy_neil_genetics_series }`

### Resource entry shapes
Two main variants:

**Direct-URL entry (ninja_nerd):**
```json
{
  "channel": "ninja_nerd",
  "title": "Heart Failure",
  "url": "https://youtu.be/Gsu8NT1yYes",
  "duration_min": 36,
  "verified": true
}
```

**Channel-URL entry (dirty_medicine, armando_hasudungan, etc.):**
```json
{
  "channel": "dirty_medicine",
  "title": "Heart Failure",
  "duration": "14:10",
  "channel_url": "https://www.youtube.com/@dirtymedicine",
  "verified_title": true,
  "note": "Search title on Dirty Medicine channel for direct URL"
}
```

**Channel-reference entry (no specific video):**
```json
{
  "channel": "pathoma",
  "type": "channel_reference",
  "note": "Ch. 1-3 - the critical foundation"
}
```

### Channel keys → display names
```
ninja_nerd         → "Ninja Nerd"
dirty_medicine     → "Dirty Medicine"
armando_hasudungan → "Armando Hasudungan"
randy_neil_md      → "Randy Neil MD"
hyguru             → "HyGuru"
pathoma            → "Pathoma"
sketchy            → "Sketchy"
```

### Subtopic naming convention
Title Case strings with spaces and optional parentheticals:
- `"Heart failure"`, `"Acid-base disorders"`, `"Valvular disease and murmurs"`
- `"Obstructive vs restrictive (asthma, COPD, ILD, PFTs)"`

---

## 2. Existing Codebase — Category Keys

### NBME CBSSA Category names (from `frontend/src/data.js`)

**Systems:**
```
"Cardiovascular System"
"Respiratory and Renal/Urinary Systems"
"Behavioral Health & Nervous Systems/Special Senses"
"Blood & Lymphoreticular/Immune Systems"
"Multisystem Processes & Disorders"
"Musculoskeletal, Skin & Subcutaneous Tissue"
"Gastrointestinal System"
"Reproductive & Endocrine Systems"
```

**Disciplines:**
```
"Pathology"
"Physiology"
"Microbiology & Immunology"
"Gross Anatomy & Embryology"
"Pharmacology"
"Behavioral Sciences"
"Biochemistry & Nutrition"
"Histology & Cell Biology"
"Genetics"
```

### Video library → NBME category mapping

```
cardiovascular               → "Cardiovascular System"
respiratory                  → "Respiratory and Renal/Urinary Systems"
renal                        → "Respiratory and Renal/Urinary Systems"
reproductive                 → "Reproductive & Endocrine Systems"
endocrine                    → "Reproductive & Endocrine Systems"
neuro_behavioral             → "Behavioral Health & Nervous Systems/Special Senses"
blood_lymphoreticular_immune → "Blood & Lymphoreticular/Immune Systems"
musculoskeletal_skin         → "Musculoskeletal, Skin & Subcutaneous Tissue"
multisystem                  → "Multisystem Processes & Disorders"
gastrointestinal             → "Gastrointestinal System"
biostatistics_epidemiology   → "Behavioral Sciences"
social_sciences_communication→ "Behavioral Sciences"
human_development            → null (no direct NBME category)

pathology          → "Pathology"
physiology         → "Physiology"
pharmacology       → "Pharmacology"
microbiology       → "Microbiology & Immunology"
anatomy_embryology → "Gross Anatomy & Embryology"
behavioral_sciences→ "Behavioral Sciences"
biochemistry_nutrition → "Biochemistry & Nutrition"
immunology         → "Microbiology & Immunology"
histology_cell_biology → "Histology & Cell Biology"
genetics           → "Genetics"
```

---

## 3. Existing `contentEngine.js` — Relevant API

### `getContentSequence(category, gapType, resources, subTopics)`
Returns `{ gapType, sequence: Step[] }` where each `Step` has:
```javascript
{
  type: 'video' | 'read' | 'practice' | 'annotate',
  emoji, label, action, resource, topic,
  timeLabel, focus, skip, instruction,
  links: [{ channel, url, label }]  // ← integration target
}
```

The `links` array currently uses `ytLink(query)` = YouTube search URL.
**Integration:** Replace search URLs with verified direct URLs from the library.

### Sub-topic matching (in `matchSubTopicVideos`)
Uses case-insensitive partial match:
```javascript
cleanTopic.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(cleanTopic)
```
Where `cleanTopic` strips the parenthetical suffix: `"Acid-base disorders (ABGs...)" → "acid-base disorders"`.

The video library subtopic strings use the same parenthetical pattern, so the same stripping approach works for lookup.

---

## 4. Integration Plan

### Step 4: `frontend/src/lib/videoLookup.js`

**Exported function:**
```javascript
getVideosForTopic(query, options = {})
// → [{ channel, channelName, title, url, durationMin, duration, verified, note }]
```

**Algorithm:**
1. Normalize `query`: strip parenthetical suffix, lowercase
2. Collect all subtopic entries from `videos_by_system` (both tiers) and `videos_by_discipline` (flatten all nested structures)
3. Fuzzy match: `entry.subtopic` (cleaned) includes `query` OR vice versa
4. Normalize matched resources: skip `channel_reference` type entries
5. Sort: direct-URL entries (`url` = youtu.be/...) first; channel-URL entries second
6. Return up to `options.maxResults` (default 3)

### Step 5: Integration point in `contentEngine.js`

**Single location:** In the YouTube-video branch of `getContentSequence` (the `else` block after Pathoma/Sketchy checks), where `primaryVideoStep.links` is built:

```javascript
// BEFORE:
links: finalList.slice(0, 2).map(v => ({ channel: v.channel, url: ytLink(v.query), label: v.channel }))

// AFTER:
links: buildLinks(finalList.slice(0, 2), topSubNames[0] || category)
```

Where `buildLinks` uses `getVideosForTopic` to look up verified URLs for each channel, falling back to `ytLink(query)` if none found.

Same for `secondaryVideoStep.links`.

**Key constraint:** The integration must NOT change `getContentSequence`'s signature, return shape, or any existing behavior for Pathoma/Sketchy/practice/read steps.

---

## 5. Files to Create/Modify

| File | Action |
|------|--------|
| `src/data/video-library.json` | ✅ Already placed & committed |
| `frontend/src/lib/videoLookup.js` | CREATE — lookup function |
| `frontend/src/contentEngine.js` | MODIFY — one integration point only |
| `scripts/test-video-lookup.js` | CREATE — validation script |
