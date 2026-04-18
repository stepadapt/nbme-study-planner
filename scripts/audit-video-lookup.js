#!/usr/bin/env node
// ── Systemic Audit: Video Lookup ──────────────────────────────────────────
// Tests every topic key from data.js SUB_TOPICS against the video library.
// Run: node scripts/audit-video-lookup.js

const fs   = require('fs');
const path = require('path');

// Load library directly for reference
const libraryPath = path.join(__dirname, '../src/data/video-library.json');
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

// ─── Replicate the full lookup logic inline (CommonJS, mirrors videoLookup.js) ──

const CHANNEL_NAMES = {
  ninja_nerd:         'Ninja Nerd',
  dirty_medicine:     'Dirty Medicine',
  armando_hasudungan: 'Armando Hasudungan',
  randy_neil_md:      'Randy Neil MD',
  hyguru:             'HyGuru',
  pathoma:            'Pathoma',
  sketchy:            'Sketchy',
};

const CHANNEL_SEARCH_NAME = { ...CHANNEL_NAMES };

function buildSearchUrl(channelKey, title) {
  const chName = CHANNEL_SEARCH_NAME[channelKey] || channelKey;
  const query  = title ? `${chName} ${title}` : chName;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function normalizeResource(resource) {
  const channelKey  = resource.channel;
  const channelName = CHANNEL_NAMES[channelKey] || channelKey;

  if (resource.type === 'channel_reference') {
    if (!resource.search) return null;
    return {
      channel:     channelKey,
      channelName,
      title:       resource.search,
      url:         `https://www.youtube.com/results?search_query=${encodeURIComponent(resource.search)}`,
      directUrl:   false,
      durationMin: null,
      duration:    null,
      verified:    false,
      note:        resource.note || null,
    };
  }

  const directUrl = resource.url && resource.url.includes('youtu') ? resource.url : null;
  const title     = resource.title || channelName;
  const url       = directUrl || buildSearchUrl(channelKey, title);

  return {
    channel:     channelKey,
    channelName,
    title,
    url,
    directUrl:   !!directUrl,
    durationMin: resource.duration_min || null,
    duration:    resource.duration || (resource.duration_min ? `${resource.duration_min} min` : null),
    verified:    !!(resource.verified || resource.verified_title),
    note:        resource.note || null,
  };
}

function collectEntries(structure) {
  if (!structure) return [];
  if (Array.isArray(structure)) return structure;

  const entries = [];
  for (const val of Object.values(structure)) {
    if (Array.isArray(val)) {
      entries.push(...val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      for (const inner of Object.values(val)) {
        if (Array.isArray(inner)) entries.push(...inner);
      }
    }
  }
  return entries;
}

function matchesTopic(query, subtopic) {
  if (!query || !subtopic) return false;

  const q = query.split('(')[0].trim().toLowerCase();
  const s = subtopic.split('(')[0].trim().toLowerCase();
  if (!q || !s) return false;

  if (s.includes(q) || q.includes(s)) return true;

  const qStem = q.replace(/s$/, '');
  if (qStem.length >= 4 && (s.includes(qStem) || qStem.includes(s))) return true;

  const qFirstWord = q.split(/\s+/)[0];
  const sFirstWord = s.split(/\s+/)[0];
  if (qFirstWord.length >= 6 && qFirstWord === sFirstWord) return true;

  return false;
}

let _allEntries = null;
function getAllEntries() {
  if (_allEntries) return _allEntries;

  const entries = [];

  for (const sysData of Object.values(library.videos_by_system || {})) {
    if (sysData.low_hanging_fruit) entries.push(...sysData.low_hanging_fruit);
    if (sysData.second_tier)       entries.push(...sysData.second_tier);
  }

  for (const discData of Object.values(library.videos_by_discipline || {})) {
    entries.push(...collectEntries(discData));
  }

  _allEntries = entries.filter(e => typeof e.subtopic === 'string' && e.subtopic.trim());
  return _allEntries;
}

function getVideosForTopic(query, options = {}) {
  const { maxResults = 5, channelPreference = [] } = options;
  if (!query) return [];

  const CHANNEL_NAME_TO_KEY = Object.fromEntries(
    Object.entries(CHANNEL_NAMES).map(([k, v]) => [v.toLowerCase(), k])
  );
  const preferredKeys = channelPreference.map(n => CHANNEL_NAME_TO_KEY[n.toLowerCase()] || n.toLowerCase());

  const results = [];
  const seen    = new Set();

  for (const entry of getAllEntries()) {
    if (!matchesTopic(query, entry.subtopic)) continue;

    for (const resource of (entry.resources || [])) {
      const normalized = normalizeResource(resource);
      if (!normalized) continue;

      const dedupeKey = `${normalized.channel}::${normalized.title}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      results.push(normalized);
    }
  }

  results.sort((a, b) => {
    if (a.directUrl !== b.directUrl) return a.directUrl ? -1 : 1;
    const ai = preferredKeys.indexOf(a.channel);
    const bi = preferredKeys.indexOf(b.channel);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  return results.slice(0, maxResults);
}

// ─── ALL topic keys from data.js SUB_TOPICS (the .topic field of each sub-topic entry) ──

// These are the exact strings that planEngine.js passes to getVideosForTopic
// via:  const topSubQuery = topSubs?.[0]?.topic || focusTopic.category;

const topicKeys = [
  // ── Reproductive & Endocrine Systems ──
  "Diabetes mellitus (Type 1 vs 2, DKA vs HHS, insulin)",
  "Thyroid disorders (Graves', Hashimoto's, thyroid cancer)",
  "Adrenal disorders (Cushing's, Addison's, Conn's, CAH)",
  "Pituitary disorders (prolactinoma, acromegaly, SIADH, DI)",
  "Calcium & parathyroid disorders",
  "Pregnancy complications (ectopic, pre-eclampsia, gestational DM)",
  "Ovarian & uterine pathology (cancers, endometriosis, fibroids)",
  "Breast pathology (carcinoma, fibroadenoma, BRCA)",
  "Menstrual cycle & hormones",
  "Testicular & prostate pathology (seminoma, BPH)",
  "MEN syndromes",
  "Disorders of sexual development",

  // ── Respiratory and Renal/Urinary Systems ──
  "Acid-base disorders (ABGs, metabolic, respiratory, mixed)",
  "Obstructive lung diseases (COPD, asthma, bronchiectasis)",
  "Glomerulonephritis (nephrotic vs nephritic, histology)",
  "Electrolyte disorders (Na, K, Ca — SIADH, DI, causes)",
  "Diuretics (mechanism, nephron site, side effects)",
  "Restrictive lung diseases (IPF, sarcoidosis, pneumoconioses)",
  "Lung cancer (types, location, paraneoplastic syndromes)",
  "Pulmonary embolism & DVT (Virchow's, workup, treatment)",
  "Nephron physiology (GFR, clearance, tubuloglomerular feedback)",
  "AKI vs CKD (BUN/Cr, FENa, urinalysis, complications)",
  "Oxygen-hemoglobin dissociation curve (shifts, CO, MetHb)",
  "Pulmonary function tests (FEV1/FVC, compliance)",
  "TB (primary, secondary, PPD, treatment)",
  "Renal tubular acidosis (types I, II, IV)",
  "Pulmonary hypertension",

  // ── Behavioral Health & Nervous Systems/Special Senses ──
  "Stroke syndromes (vascular territories, tPA, hemorrhagic vs ischemic)",
  "Neurotransmitters & receptor pharmacology (dopamine pathways, GABA)",
  "Biostatistics (sensitivity, specificity, PPV/NPV, study design, NNT)",
  "Ethics (autonomy, informed consent, capacity, HIPAA, mandatory reporting)",
  "Seizure disorders & antiepileptic drugs",
  "Demyelinating diseases (MS, Guillain-Barré, CIDP)",
  "Psychiatric disorders (MDD, bipolar, schizophrenia, antidepressants)",
  "Neurodegenerative diseases (Alzheimer's, Parkinson's, ALS, Huntington's)",
  "Spinal cord lesions (Brown-Séquard, anterior cord, subacute combined)",
  "CNS tumors (glioblastoma, meningioma, medulloblastoma — location & age)",
  "Bias & confounding (selection, recall, lead-time, Hawthorne)",
  "Substance use disorders (opioids, alcohol, stimulants — withdrawal)",
  "Meningitis (bacterial vs viral, CSF findings)",
  "Cranial nerve palsies (anatomy, lesion localization)",
  "Sleep disorders & stages",

  // ── Blood & Lymphoreticular/Immune Systems ──
  "Anemias (iron, B12/folate, sickle cell, thalassemia, hemolytic — blood smear)",
  "Coagulation cascade & bleeding disorders (PT/PTT, hemophilia, vWD, DIC)",
  "Leukemias & lymphomas (ALL, AML, CLL, CML, Hodgkin's, Burkitt's)",
  "Hypersensitivity reactions (Types I–IV, anaphylaxis, serum sickness)",
  "Immunodeficiency disorders (SCID, DiGeorge, Bruton's, CGD)",
  "Platelet disorders (ITP, TTP, HUS, Bernard-Soulier, Glanzmann's)",
  "Autoimmune diseases (SLE, RA, Sjögren's — antibodies, organ involvement)",
  "Transplant immunology (rejection types, immunosuppressants)",
  "Complement system & cytokines (pathways, deficiencies)",
  "Myeloproliferative disorders (PV, ET, MF)",
  "Blood transfusion reactions",

  // ── Multisystem Processes & Disorders ──
  "Neoplasia (benign vs malignant, grading/staging, tumor markers, oncogenes)",
  "Inflammation (acute vs chronic, mediators, granulomas, wound healing)",
  "Cell injury & death (necrosis types, apoptosis pathways, free radicals)",
  "Hemodynamics (thrombosis, embolism, infarction, edema, shock types)",
  "Paraneoplastic syndromes",
  "Granulomatous diseases (sarcoidosis, TB, Crohn's)",
  "Amyloidosis (AL vs AA, Congo red, apple-green birefringence)",
  "Vitamin deficiencies & toxicities (A, B1, B3, B6, B12, C, D, E, K)",
  "Systemic infections & sepsis",
  "Environmental & occupational pathology",

  // ── Musculoskeletal, Skin & Subcutaneous Tissue ──
  "Autoimmune joint disease (RA, gout, pseudogout, ankylosing spondylitis)",
  "Bone disorders (osteoporosis, Paget's, rickets, osteosarcoma, Ewing's)",
  "Skin pathology (melanoma, BCC, SCC, pemphigus vs bullous pemphigoid, psoriasis)",
  "Nerve injuries & brachial plexus (Erb-Duchenne, Klumpke, median/ulnar/radial)",
  "Muscle disorders (Duchenne, myasthenia gravis, Lambert-Eaton, polymyositis)",
  "MSK pharmacology (DMARDs, biologics, colchicine, allopurinol)",
  "Connective tissue disorders (Marfan's, Ehlers-Danlos, OI)",
  "Compartment syndrome",

  // ── Cardiovascular System ──
  "Heart failure pathophysiology (HFrEF vs HFpEF, Frank-Starling, RAAS)",
  "Ischemic heart disease & MI (atherosclerosis, troponin, ECG, complications)",
  "Valvular heart disease (murmurs, maneuvers, rheumatic fever, endocarditis)",
  "Cardiac pharmacology (antiarrhythmics, ACE-I/ARBs, beta-blockers, digoxin)",
  "Hypertension (primary vs secondary, end-organ damage, drug selection)",
  "Arrhythmias & ECG interpretation (AF, heart blocks, long QT, WPW)",
  "Congenital heart defects (VSD, ASD, Tetralogy, TGA, coarctation, PDA)",
  "Shock (hemodynamic parameters, cardiogenic vs distributive vs obstructive)",
  "Cardiac cycle & pressure-volume loops",
  "Pericardial disease (tamponade — Beck's triad, constrictive pericarditis)",
  "Cardiac tumors (myxoma, rhabdomyoma)",

  // ── Gastrointestinal System ──
  "Liver pathology (hepatitis A-E, cirrhosis complications, Wilson's, hemochromatosis)",
  "GI cancers (colorectal — FAP/Lynch, gastric, esophageal, pancreatic)",
  "Inflammatory bowel disease (Crohn's vs UC — location, depth, complications)",
  "Bilirubin metabolism & jaundice (conjugated vs unconjugated, Gilbert's)",
  "Peptic ulcer disease & H. pylori (triple therapy, PPIs, Zollinger-Ellison)",
  "GI pharmacology (PPIs, H2 blockers, antiemetics, laxatives)",
  "Malabsorption syndromes (celiac — anti-tTG, tropical sprue, Whipple's)",
  "Gallbladder disease (cholelithiasis, cholecystitis, cholangitis)",
  "Esophageal disorders (achalasia, Barrett's, GERD)",
  "GI embryology (midgut rotation, atresias, Meckel's)",

  // ── Pathology discipline ──
  "Inflammation — acute vs chronic, mediators, granulomas",
  "Neoplasia — benign vs malignant, grading, staging, tumor markers",
  "Cell injury & death — apoptosis, necrosis types, free radicals",
  "Hemodynamics — thrombosis, embolism, infarction, edema",
  "Lab findings & patterns (anemia workup, LFTs, UA)",
  "Wound healing, repair & regeneration",
  "Environmental/occupational pathology",
  "Amyloidosis & storage disorders",

  // ── Physiology discipline ──
  "Cardiac cycle & hemodynamics (Frank-Starling, pressure-volume loops)",
  "Renal physiology (GFR, tubular transport, concentration/dilution)",
  "Pulmonary physiology (V/Q matching, gas exchange, compliance)",
  "Endocrine feedback loops & hormone synthesis",
  "Autonomic nervous system (sympathetic vs parasympathetic)",
  "GI motility, secretion & absorption",
  "Acid-base physiology & renal buffering",
  "Neuromuscular physiology (action potentials, NMJ)",
  "Blood flow & vascular resistance",

  // ── Microbiology & Immunology discipline ──
  "Bacterial identification (Gram stain, culture, morphology)",
  "Antimicrobial mechanisms & resistance patterns",
  "HIV/AIDS (pathogenesis, CD4 count, opportunistic infections)",
  "Hepatitis viruses (A–E, serology panels)",
  "Bacterial toxins & virulence factors",
  "STIs (syphilis, chlamydia, gonorrhea, HPV, HSV)",
  "Viral classification & replication",
  "TB & atypical mycobacteria",
  "Fungal infections (Candida, Aspergillus, Crypto, Histo, Cocci)",
  "Hypersensitivity reactions (Types I–IV)",
  "Immunodeficiency disorders (SCID, DiGeorge, Bruton's, CGD)",
  "Parasitology (malaria, toxoplasma, giardia, helminths)",

  // ── Gross Anatomy & Embryology discipline ──
  "Cardiovascular embryology (fetal circulation, congenital defects)",
  "Peripheral nerve anatomy & injury patterns (brachial plexus, lumbosacral)",
  "Abdominal anatomy (retroperitoneum, hernia sites, vessels)",
  "Thorax anatomy (lung lobes, pleura, mediastinum, diaphragm)",
  "Neural tube defects & CNS embryology",
  "Head & neck anatomy (cranial nerves, triangles)",
  "GI embryology (midgut rotation, atresias, Meckel's)",
  "Limb development & musculoskeletal embryology",
  "Renal & urogenital embryology",

  // ── Pharmacology discipline ──
  "Autonomic drugs (cholinergic, anticholinergic, adrenergic, blockers)",
  "Cardiac drugs (antiarrhythmics, antianginals, antihypertensives)",
  "Antimicrobials (mechanism, resistance, side effects by class)",
  "Drug metabolism & pharmacokinetics (CYP450, half-life, Vd, bioavailability)",
  "CNS drugs (antidepressants, antipsychotics, anxiolytics, mood stabilizers)",
  "Anti-inflammatory drugs (NSAIDs, corticosteroids, DMARDs)",
  "Anticoagulants & antiplatelets (heparin, warfarin, DOACs, aspirin)",
  "Antiepileptic drugs",
  "Endocrine drugs (insulin, oral hypoglycemics, thyroid, steroids)",
  "Anticancer drugs (mechanism, side effects, cell-cycle specificity)",
  "Toxicology & antidotes",
  "Drug-drug interactions & adverse effects",

  // ── Behavioral Sciences discipline ──
  "Biostatistics (sensitivity, specificity, PPV, NPV, LR)",
  "Study design types (RCT, cohort, case-control, cross-sectional)",
  "Ethics (autonomy, beneficence, non-maleficence, informed consent)",
  "Epidemiology — incidence, prevalence, risk measures (RR, OR, ARR, NNT)",
  "Bias types & confounders",
  "Statistical tests (p-value, confidence intervals, power)",
  "Substance use disorders (alcohol, opioids, stimulants)",
  "Defense mechanisms",
  "Developmental milestones",
  "Sleep stages & disorders",

  // ── Biochemistry & Nutrition discipline ──
  "Metabolic pathways (glycolysis, TCA cycle, ETC, gluconeogenesis)",
  "Lysosomal storage diseases (Gaucher's, Tay-Sachs, Niemann-Pick, Fabry's)",
  "Vitamins — deficiencies & toxicities (fat-soluble & water-soluble)",
  "Amino acid derivatives & metabolism disorders (PKU, homocystinuria)",
  "Lipid metabolism & transport (lipoproteins, dyslipidemia)",
  "Glycogen storage diseases (von Gierke, Pompe, McArdle)",
  "DNA replication, transcription & translation",
  "DNA repair mechanisms",
  "Fatty acid oxidation disorders",
  "Purine & pyrimidine metabolism",

  // ── Histology & Cell Biology discipline ──
  "Connective tissue disorders (collagen synthesis, Marfan's, Ehlers-Danlos)",
  "Cell cycle & cancer biology (oncogenes, tumor suppressors, checkpoints)",
  "Epithelial histology & glandular structures",
  "Organelle functions & associated pathologies",
  "Cytoskeleton & cell junction disorders",
  "Receptor types & signal transduction pathways",
  "Apoptosis pathways (intrinsic vs extrinsic)",
  "Membrane transport (Na/K-ATPase, CFTR, channels)",

  // ── Genetics discipline ──
  "Autosomal dominant disorders (Marfan's, Huntington's, ADPKD, NF)",
  "Autosomal recessive disorders (CF, PKU, sickle cell, thalassemia)",
  "Chromosomal disorders (Down, Turner, Klinefelter, DiGeorge)",
  "X-linked disorders (Duchenne, Fabry's, G6PD, hemophilia A/B)",
  "Mendelian inheritance patterns & pedigree analysis",
  "Hardy-Weinberg equilibrium",
  "Genetic testing methods (karyotype, FISH, PCR, sequencing)",
  "Mitochondrial inheritance & disorders",
  "Imprinting & uniparental disomy (Prader-Willi, Angelman)",

  // ── Category-level fallback queries (used when topSubs is empty) ──
  "Reproductive & Endocrine Systems",
  "Respiratory and Renal/Urinary Systems",
  "Behavioral Health & Nervous Systems/Special Senses",
  "Blood & Lymphoreticular/Immune Systems",
  "Multisystem Processes & Disorders",
  "Musculoskeletal, Skin & Subcutaneous Tissue",
  "Cardiovascular System",
  "Gastrointestinal System",
  "Pathology",
  "Physiology",
  "Microbiology & Immunology",
  "Gross Anatomy & Embryology",
  "Pharmacology",
  "Behavioral Sciences",
  "Biochemistry & Nutrition",
  "Histology & Cell Biology",
  "Genetics",
];

// ─── Run the audit ────────────────────────────────────────────────────────────

const issues    = [];
const successes = [];

for (const key of topicKeys) {
  let results;
  try {
    results = getVideosForTopic(key);
  } catch (err) {
    issues.push({ key, error: err.message });
    continue;
  }

  if (!results || results.length === 0) {
    issues.push({ key, problem: 'no videos returned' });
    continue;
  }

  const keywords = key.toLowerCase().split(/[_\s\-—&]+/).filter(w => w.length > 3 && !/^\(/.test(w));

  const mismatched = results.filter(v => {
    const title = (v.title || '').toLowerCase();
    return !keywords.some(kw => title.includes(kw));
  });

  if (mismatched.length > 0 && mismatched.length === results.length) {
    issues.push({
      key,
      problem: 'ALL videos do not match topic keywords',
      totalReturned: results.length,
      keywords,
      mismatched: mismatched.slice(0, 5).map(v => `[${v.channel || '?'}] ${v.title}`),
    });
  } else if (mismatched.length > 0) {
    issues.push({
      key,
      problem: 'SOME videos do not match topic keywords',
      totalReturned: results.length,
      mismatchedCount: mismatched.length,
      keywords,
      mismatched: mismatched.slice(0, 3).map(v => `[${v.channel || '?'}] ${v.title}`),
    });
  } else {
    successes.push({ key, count: results.length });
  }
}

console.log('=== AUDIT SUMMARY ===');
console.log(`Topics tested: ${topicKeys.length}`);
console.log(`Topics with matching videos: ${successes.length}`);
console.log(`Topics with issues: ${issues.length}`);
console.log('\n=== ISSUES ===');
issues.forEach(i => console.log(JSON.stringify(i, null, 2)));
console.log('\n=== SUCCESSFUL LOOKUPS ===');
successes.forEach(s => console.log(`  ${s.key}: ${s.count} videos`));

// ─── Also show raw stats: how many library entries have null subtopics ─────
let totalEntries = 0;
let nullSubtopicEntries = 0;

for (const sysData of Object.values(library.videos_by_system || {})) {
  for (const tier of ['low_hanging_fruit', 'second_tier']) {
    for (const e of (sysData[tier] || [])) {
      totalEntries++;
      if (typeof e.subtopic !== 'string' || !e.subtopic.trim()) nullSubtopicEntries++;
    }
  }
}

function countDiscEntries(structure, depth = 0) {
  if (!structure) return;
  if (Array.isArray(structure)) {
    for (const e of structure) {
      totalEntries++;
      if (typeof e.subtopic !== 'string' || !e.subtopic.trim()) nullSubtopicEntries++;
    }
  } else if (typeof structure === 'object' && depth < 3) {
    for (const val of Object.values(structure)) {
      countDiscEntries(val, depth + 1);
    }
  }
}
for (const discData of Object.values(library.videos_by_discipline || {})) {
  countDiscEntries(discData);
}

console.log('\n=== LIBRARY ENTRY STATS ===');
console.log(`Total entries in library (system + discipline): ${totalEntries}`);
console.log(`Entries with null/missing subtopic (invisible to lookup): ${nullSubtopicEntries}`);
console.log(`Entries with valid subtopic (searchable): ${totalEntries - nullSubtopicEntries}`);
