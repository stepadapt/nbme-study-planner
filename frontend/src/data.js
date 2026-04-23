// ── NBME CBSSA categories — exact names from the score report ─────────

// Performance by System (% of exam questions shown on report)
export const STEP1_SYSTEM_CATEGORIES = [
  "Reproductive & Endocrine Systems",          // 12-16%
  "Respiratory and Renal/Urinary Systems",      // 11-15%
  "Behavioral Health & Nervous Systems/Special Senses", // 10-14%
  "Blood & Lymphoreticular/Immune Systems",     // 9-13%
  "Multisystem Processes & Disorders",          // 8-12%
  "Musculoskeletal, Skin & Subcutaneous Tissue", // 8-12%
  "Cardiovascular System",                      // 7-11%
  "Gastrointestinal System",                    // 6-10%
];

// Performance by Discipline (% of exam questions shown on report)
export const STEP1_DISCIPLINE_CATEGORIES = [
  "Pathology",                    // 45-55%
  "Physiology",                   // 30-40%
  "Microbiology & Immunology",    // 15-35%
  "Gross Anatomy & Embryology",   // 10-20%
  "Pharmacology",                 // 10-20%
  "Behavioral Sciences",          // 10-15%
  "Biochemistry & Nutrition",     // 5-15%
  "Histology & Cell Biology",     // 5-15%
  "Genetics",                     // 5-10%
];

// Flat list of all categories (system first, then discipline)
export const STEP1_CATEGORIES = [
  ...STEP1_SYSTEM_CATEGORIES,
  ...STEP1_DISCIPLINE_CATEGORIES,
];

export const STEP1_PASSING_SCORE = 196;

export const RESOURCES = [
  { id: "firstaid", name: "First Aid", type: "learning", icon: "📕" },
  { id: "pathoma", name: "Pathoma", type: "learning", icon: "🔬" },
  { id: "sketchy", name: "Sketchy", type: "learning", icon: "🎨" },
  { id: "bnb", name: "Boards & Beyond", type: "learning", icon: "📺" },
  { id: "physeo", name: "Physeo", type: "learning", icon: "⚡" },
  { id: "pixorize", name: "Pixorize", type: "learning", icon: "🧩" },
  { id: "costanzo", name: "Costanzo Physiology", type: "learning", icon: "📘" },
  { id: "uworld", name: "UWorld", type: "practice", icon: "🎯" },
  { id: "amboss", name: "AMBOSS", type: "practice", icon: "💡" },
  { id: "anking", name: "AnKing Deck", type: "practice", icon: "🃏" },
];

// HIGH_YIELD_WEIGHTS — midpoint of official USMLE Step 1 content specification %, normalized 1-10
export const HIGH_YIELD_WEIGHTS = {
  // System — calibrated to official USMLE content spec midpoints
  "Reproductive & Endocrine Systems":                  9, // 12-16%, midpoint 14 — highest-weighted system
  "Respiratory and Renal/Urinary Systems":             9, // 11-15%, midpoint 13
  "Behavioral Health & Nervous Systems/Special Senses":8, // 10-14%, midpoint 12
  "Blood & Lymphoreticular/Immune Systems":            8, // 9-13%,  midpoint 11
  "Multisystem Processes & Disorders":                 7, // 8-12%,  midpoint 10
  "Musculoskeletal, Skin & Subcutaneous Tissue":       7, // 8-12%,  midpoint 10
  "Cardiovascular System":                             7, // 7-11%,  midpoint 9
  "Gastrointestinal System":                           6, // 6-10%,  midpoint 8
  // Discipline — Pathology dominates at 45-55%; Physiology at 30-40%
  "Pathology":                  10, // 45-55%
  "Physiology":                  9, // 30-40%
  "Microbiology & Immunology":   7, // 10-20% (combined)
  "Pharmacology":                7, // 10-20%
  "Gross Anatomy & Embryology":  7, // 10-20%
  "Behavioral Sciences":         6, // 10-15%
  "Biochemistry & Nutrition":    5, // 5-15%
  "Histology & Cell Biology":    5, // 5-15%
  "Genetics":                    4, // 5-10%
};

// DISCIPLINE_YIELD_WEIGHTS — official USMLE content spec for discipline categories
// Used by the priority crossover bonus: if a student is weak in both a system
// AND the dominant disciplines for that system, priority amplifies.
export const DISCIPLINE_YIELD_WEIGHTS = {
  "Pathology":                  { yield: 10, examPercent: "45-55%", midpoint: 50 },
  "Physiology":                 { yield: 9,  examPercent: "30-40%", midpoint: 35 },
  "Microbiology & Immunology":  { yield: 7,  examPercent: "10-20%", midpoint: 15 },
  "Pharmacology":               { yield: 7,  examPercent: "10-20%", midpoint: 15 },
  "Gross Anatomy & Embryology": { yield: 7,  examPercent: "10-20%", midpoint: 15 },
  "Behavioral Sciences":        { yield: 6,  examPercent: "10-15%", midpoint: 12.5 },
  "Biochemistry & Nutrition":   { yield: 5,  examPercent: "5-15%",  midpoint: 10 },
  "Histology & Cell Biology":   { yield: 5,  examPercent: "5-15%",  midpoint: 10 },
  "Genetics":                   { yield: 4,  examPercent: "5-10%",  midpoint: 7.5 },
};

export const RESOURCE_MAP = {
  // ── System ──
  "Reproductive & Endocrine Systems": { learning: ["firstaid", "pathoma", "bnb", "sketchy"], practice: ["uworld", "amboss", "anking"] },
  "Respiratory and Renal/Urinary Systems": { learning: ["firstaid", "costanzo", "pathoma", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Behavioral Health & Nervous Systems/Special Senses": { learning: ["firstaid", "bnb", "pathoma", "sketchy"], practice: ["uworld", "amboss", "anking"] },
  "Blood & Lymphoreticular/Immune Systems": { learning: ["firstaid", "pathoma", "bnb", "sketchy"], practice: ["uworld", "amboss", "anking"] },
  "Multisystem Processes & Disorders": { learning: ["pathoma", "firstaid", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Musculoskeletal, Skin & Subcutaneous Tissue": { learning: ["firstaid", "pathoma", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Cardiovascular System": { learning: ["firstaid", "bnb", "pathoma", "physeo"], practice: ["uworld", "amboss", "anking"] },
  "Gastrointestinal System": { learning: ["firstaid", "pathoma", "bnb"], practice: ["uworld", "amboss", "anking"] },
  // ── Discipline ──
  "Pathology": { learning: ["pathoma", "firstaid", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Physiology": { learning: ["costanzo", "physeo", "bnb", "firstaid"], practice: ["uworld", "amboss", "anking"] },
  "Microbiology & Immunology": { learning: ["sketchy", "firstaid", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Gross Anatomy & Embryology": { learning: ["firstaid", "bnb"], practice: ["uworld", "amboss"] },
  "Pharmacology": { learning: ["sketchy", "firstaid", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Behavioral Sciences": { learning: ["firstaid", "bnb"], practice: ["uworld", "amboss"] },
  "Biochemistry & Nutrition": { learning: ["pixorize", "firstaid", "bnb"], practice: ["uworld", "amboss", "anking"] },
  "Histology & Cell Biology": { learning: ["pathoma", "firstaid", "bnb"], practice: ["uworld", "amboss"] },
  "Genetics": { learning: ["pixorize", "firstaid", "bnb"], practice: ["uworld", "amboss"] },
};

// ── Practice assessment catalog ──────────────────────────────────────
// Forms 26-33 are the current NBME CBSSA shelf. Special tests have fixed
// placement roles in the plan (UWSA1 = midpoint, UWSA2 = predictor, etc.)
export const PRACTICE_TESTS = [
  // NBME CBSSA forms — higher number = newer = more representative of current exam
  { id: 'nbme26', name: 'NBME 26', type: 'nbme', number: 26 },
  { id: 'nbme27', name: 'NBME 27', type: 'nbme', number: 27 },
  { id: 'nbme28', name: 'NBME 28', type: 'nbme', number: 28 },
  { id: 'nbme29', name: 'NBME 29', type: 'nbme', number: 29 },
  { id: 'nbme30', name: 'NBME 30', type: 'nbme', number: 30 },
  { id: 'nbme31', name: 'NBME 31', type: 'nbme', number: 31 },
  { id: 'nbme32', name: 'NBME 32', type: 'nbme', number: 32 },
  { id: 'nbme33', name: 'NBME 33', type: 'nbme', number: 33 },
  // Special assessments — each has a specific role and placement rule
  { id: 'uwsa1',      name: 'UWSA 1',          type: 'uwsa',    role: 'midpoint',   icon: '📊' },
  { id: 'uwsa2',      name: 'UWSA 2',          type: 'uwsa',    role: 'predictor',  icon: '🎯' },
  { id: 'free120new', name: 'Free 120 (2024)', type: 'free120', role: 'calibrator', icon: '🆓' },
  { id: 'free120old', name: 'Free 120 (old)',  type: 'free120', role: 'calibrator', icon: '🆓' },
  { id: 'amboss',     name: 'AMBOSS SA',       type: 'amboss',  role: 'checkpoint', icon: '💡' },
];

export const SUB_TOPICS = {
  // ── System — enriched with discipline tags for crossover bonus calculation ──
  "Reproductive & Endocrine Systems": [
    // Exam weight 12-16% — most-tested system; students chronically underprepare it
    { topic: "Diabetes mellitus (Type 1 vs 2, DKA vs HHS, insulin)", yield: 10, disciplines: ["Pathology", "Pharmacology", "Physiology"] },
    { topic: "Thyroid disorders (Graves', Hashimoto's, thyroid cancer)", yield: 10, disciplines: ["Pathology", "Pharmacology", "Physiology"] },
    { topic: "Adrenal disorders (Cushing's, Addison's, Conn's, CAH)", yield: 9,  disciplines: ["Pathology", "Physiology", "Biochemistry & Nutrition"] },
    { topic: "Pituitary disorders (prolactinoma, acromegaly, SIADH, DI)", yield: 8, disciplines: ["Pathology", "Physiology"] },
    { topic: "Calcium & parathyroid disorders", yield: 8, disciplines: ["Physiology", "Pathology"] },
    { topic: "Pregnancy complications (ectopic, pre-eclampsia, gestational DM)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Ovarian & uterine pathology (cancers, endometriosis, fibroids)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Breast pathology (carcinoma, fibroadenoma, BRCA)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Menstrual cycle & hormones", yield: 7, disciplines: ["Physiology"] },
    { topic: "Testicular & prostate pathology (seminoma, BPH)", yield: 6, disciplines: ["Pathology"] },
    { topic: "MEN syndromes", yield: 6, disciplines: ["Pathology", "Genetics"] },
    { topic: "Disorders of sexual development", yield: 4, disciplines: ["Genetics", "Pathology"] },
  ],
  "Respiratory and Renal/Urinary Systems": [
    // Exam weight 11-15% — second-highest system; ABGs and diuretics are free points
    { topic: "Acid-base disorders (ABGs, metabolic, respiratory, mixed)", yield: 10, disciplines: ["Physiology", "Pathology"] },
    { topic: "Obstructive lung diseases (COPD, asthma, bronchiectasis)", yield: 10, disciplines: ["Pathology", "Pharmacology"] },
    { topic: "Glomerulonephritis (nephrotic vs nephritic, histology)", yield: 9,  disciplines: ["Pathology", "Histology & Cell Biology"] },
    { topic: "Electrolyte disorders (Na, K, Ca — SIADH, DI, causes)", yield: 9,  disciplines: ["Physiology", "Pathology"] },
    { topic: "Diuretics (mechanism, nephron site, side effects)", yield: 9,  disciplines: ["Pharmacology"] },
    { topic: "Restrictive lung diseases (IPF, sarcoidosis, pneumoconioses)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Lung cancer (types, location, paraneoplastic syndromes)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Pulmonary embolism & DVT (Virchow's, workup, treatment)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Nephron physiology (GFR, clearance, tubuloglomerular feedback)", yield: 8, disciplines: ["Physiology"] },
    { topic: "AKI vs CKD (BUN/Cr, FENa, urinalysis, complications)", yield: 7,  disciplines: ["Pathology"] },
    { topic: "Oxygen-hemoglobin dissociation curve (shifts, CO, MetHb)", yield: 7, disciplines: ["Physiology"] },
    { topic: "Pulmonary function tests (FEV1/FVC, compliance)", yield: 6,  disciplines: ["Physiology"] },
    { topic: "TB (primary, secondary, PPD, treatment)", yield: 6,  disciplines: ["Microbiology & Immunology"] },
    { topic: "Renal tubular acidosis (types I, II, IV)", yield: 5,  disciplines: ["Pathology"] },
    { topic: "Pulmonary hypertension", yield: 5,  disciplines: ["Pathology"] },
  ],
  "Behavioral Health & Nervous Systems/Special Senses": [
    // Exam weight 10-14%; neurology, psychiatry, and sensory systems
    { topic: "Stroke syndromes (vascular territories, tPA, hemorrhagic vs ischemic)", yield: 10, disciplines: ["Pathology", "Gross Anatomy & Embryology"] },
    { topic: "Neurotransmitters & receptor pharmacology (dopamine pathways, GABA)", yield: 9, disciplines: ["Pharmacology", "Physiology"] },
    { topic: "Seizure disorders & antiepileptic drugs", yield: 8, disciplines: ["Pathology", "Pharmacology"] },
    { topic: "Demyelinating diseases (MS, Guillain-Barré, CIDP)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Psychiatric disorders (MDD, bipolar, schizophrenia, antidepressants)", yield: 7, disciplines: ["Behavioral Sciences", "Pharmacology"] },
    { topic: "Neurodegenerative diseases (Alzheimer's, Parkinson's, ALS, Huntington's)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Spinal cord lesions (Brown-Séquard, anterior cord, subacute combined)", yield: 7, disciplines: ["Pathology", "Gross Anatomy & Embryology"] },
    { topic: "CNS tumors (glioblastoma, meningioma, medulloblastoma — location & age)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Substance use disorders (opioids, alcohol, stimulants — withdrawal)", yield: 6, disciplines: ["Behavioral Sciences"] },
    { topic: "Meningitis (bacterial vs viral, CSF findings)", yield: 6, disciplines: ["Microbiology & Immunology"] },
    { topic: "Cranial nerve palsies (anatomy, lesion localization)", yield: 5, disciplines: ["Gross Anatomy & Embryology"] },
    { topic: "Sleep disorders & stages", yield: 4, disciplines: ["Behavioral Sciences"] },
  ],
  "Blood & Lymphoreticular/Immune Systems": [
    // Exam weight 9-13%; anemias and coagulopathies on nearly every form
    { topic: "Anemias (iron, B12/folate, sickle cell, thalassemia, hemolytic — blood smear)", yield: 10, disciplines: ["Pathology", "Physiology"] },
    { topic: "Coagulation cascade & bleeding disorders (PT/PTT, hemophilia, vWD, DIC)", yield: 9, disciplines: ["Pathology", "Pharmacology"] },
    { topic: "Leukemias & lymphomas (ALL, AML, CLL, CML, Hodgkin's, Burkitt's)", yield: 9, disciplines: ["Pathology"] },
    { topic: "Hypersensitivity reactions (Types I–IV, anaphylaxis, serum sickness)", yield: 8, disciplines: ["Microbiology & Immunology", "Pathology"] },
    { topic: "Immunodeficiency disorders (SCID, DiGeorge, Bruton's, CGD)", yield: 8, disciplines: ["Microbiology & Immunology", "Pathology"] },
    { topic: "Platelet disorders (ITP, TTP, HUS, Bernard-Soulier, Glanzmann's)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Autoimmune diseases (SLE, RA, Sjögren's — antibodies, organ involvement)", yield: 7, disciplines: ["Microbiology & Immunology", "Pathology"] },
    { topic: "Transplant immunology (rejection types, immunosuppressants)", yield: 7, disciplines: ["Microbiology & Immunology"] },
    { topic: "Complement system & cytokines (pathways, deficiencies)", yield: 6, disciplines: ["Microbiology & Immunology"] },
    { topic: "Myeloproliferative disorders (PV, ET, MF)", yield: 5, disciplines: ["Pathology"] },
    { topic: "Blood transfusion reactions", yield: 4, disciplines: ["Pathology"] },
  ],
  "Multisystem Processes & Disorders": [
    // Exam weight 8-12%; general pathology mechanisms underlie every other system
    { topic: "Neoplasia (benign vs malignant, grading/staging, tumor markers, oncogenes)", yield: 10, disciplines: ["Pathology"] },
    { topic: "Inflammation (acute vs chronic, mediators, granulomas, wound healing)", yield: 10, disciplines: ["Pathology"] },
    { topic: "Cell injury & death (necrosis types, apoptosis pathways, free radicals)", yield: 9,  disciplines: ["Pathology"] },
    { topic: "Hemodynamics (thrombosis, embolism, infarction, edema, shock types)", yield: 8,  disciplines: ["Pathology"] },
    { topic: "Paraneoplastic syndromes", yield: 7, disciplines: ["Pathology"] },
    { topic: "Granulomatous diseases (sarcoidosis, TB, Crohn's)", yield: 7, disciplines: ["Pathology"] },
    { topic: "Amyloidosis (AL vs AA, Congo red, apple-green birefringence)", yield: 6, disciplines: ["Pathology"] },
    { topic: "Vitamin deficiencies & toxicities (A, B1, B3, B6, B12, C, D, E, K)", yield: 6, disciplines: ["Biochemistry & Nutrition"] },
    { topic: "Systemic infections & sepsis", yield: 5, disciplines: ["Pathology", "Microbiology & Immunology"] },
    { topic: "Environmental & occupational pathology", yield: 3, disciplines: ["Pathology"] },
  ],
  "Musculoskeletal, Skin & Subcutaneous Tissue": [
    // Exam weight 8-12%; nerve injuries and joint diseases appear on almost every form
    { topic: "Autoimmune joint disease (RA, gout, pseudogout, ankylosing spondylitis)", yield: 9, disciplines: ["Pathology", "Microbiology & Immunology"] },
    { topic: "Bone disorders (osteoporosis, Paget's, rickets, osteosarcoma, Ewing's)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Skin pathology (melanoma, BCC, SCC, pemphigus vs bullous pemphigoid, psoriasis)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Nerve injuries & brachial plexus (Erb-Duchenne, Klumpke, median/ulnar/radial)", yield: 7, disciplines: ["Gross Anatomy & Embryology"] },
    { topic: "Muscle disorders (Duchenne, myasthenia gravis, Lambert-Eaton, polymyositis)", yield: 6, disciplines: ["Pathology"] },
    { topic: "MSK pharmacology (DMARDs, biologics, colchicine, allopurinol)", yield: 6, disciplines: ["Pharmacology"] },
    { topic: "Connective tissue disorders (Marfan's, Ehlers-Danlos, OI)", yield: 6, disciplines: ["Pathology", "Genetics"] },
    { topic: "Compartment syndrome", yield: 4, disciplines: ["Pathology"] },
  ],
  "Cardiovascular System": [
    // Exam weight 7-11%; cardiac pharm (antiarrhythmics, ACE-I) consistently high-yield
    { topic: "Heart failure pathophysiology (HFrEF vs HFpEF, Frank-Starling, RAAS)", yield: 10, disciplines: ["Pathology", "Physiology"] },
    { topic: "Ischemic heart disease & MI (atherosclerosis, troponin, ECG, complications)", yield: 10, disciplines: ["Pathology"] },
    { topic: "Valvular heart disease (murmurs, maneuvers, rheumatic fever, endocarditis)", yield: 9, disciplines: ["Pathology", "Physiology"] },
    { topic: "Cardiac pharmacology (antiarrhythmics, ACE-I/ARBs, beta-blockers, digoxin)", yield: 9, disciplines: ["Pharmacology"] },
    { topic: "Hypertension (primary vs secondary, end-organ damage, drug selection)", yield: 9, disciplines: ["Pathology", "Pharmacology"] },
    { topic: "Arrhythmias & ECG interpretation (AF, heart blocks, long QT, WPW)", yield: 8, disciplines: ["Pathology", "Physiology"] },
    { topic: "Congenital heart defects (VSD, ASD, Tetralogy, TGA, coarctation, PDA)", yield: 7, disciplines: ["Pathology", "Gross Anatomy & Embryology"] },
    { topic: "Shock (hemodynamic parameters, cardiogenic vs distributive vs obstructive)", yield: 7, disciplines: ["Pathology", "Physiology"] },
    { topic: "Cardiac cycle & pressure-volume loops", yield: 7, disciplines: ["Physiology"] },
    { topic: "Pericardial disease (tamponade — Beck's triad, constrictive pericarditis)", yield: 5, disciplines: ["Pathology"] },
    { topic: "Cardiac tumors (myxoma, rhabdomyoma)", yield: 4, disciplines: ["Pathology"] },
  ],
  "Gastrointestinal System": [
    // Exam weight 6-10%; liver pathology dominates; IBD and GI cancers every exam
    { topic: "Liver pathology (hepatitis A-E, cirrhosis complications, Wilson's, hemochromatosis)", yield: 10, disciplines: ["Pathology"] },
    { topic: "GI cancers (colorectal — FAP/Lynch, gastric, esophageal, pancreatic)", yield: 9, disciplines: ["Pathology"] },
    { topic: "Inflammatory bowel disease (Crohn's vs UC — location, depth, complications)", yield: 8, disciplines: ["Pathology"] },
    { topic: "Bilirubin metabolism & jaundice (conjugated vs unconjugated, Gilbert's)", yield: 8, disciplines: ["Physiology", "Pathology", "Biochemistry & Nutrition"] },
    { topic: "Peptic ulcer disease & H. pylori (triple therapy, PPIs, Zollinger-Ellison)", yield: 7, disciplines: ["Pathology", "Pharmacology"] },
    { topic: "GI pharmacology (PPIs, H2 blockers, antiemetics, laxatives)", yield: 7, disciplines: ["Pharmacology"] },
    { topic: "Malabsorption syndromes (celiac — anti-tTG, tropical sprue, Whipple's)", yield: 6, disciplines: ["Pathology"] },
    { topic: "Gallbladder disease (cholelithiasis, cholecystitis, cholangitis)", yield: 5, disciplines: ["Pathology"] },
    { topic: "Esophageal disorders (achalasia, Barrett's, GERD)", yield: 5, disciplines: ["Pathology"] },
    { topic: "GI embryology (midgut rotation, atresias, Meckel's)", yield: 4, disciplines: ["Gross Anatomy & Embryology"] },
  ],

  // ── Discipline ──
  "Pathology": [
    { topic: "Inflammation — acute vs chronic, mediators, granulomas", yield: 10 },
    { topic: "Neoplasia — benign vs malignant, grading, staging, tumor markers", yield: 10 },
    { topic: "Cell injury & death — apoptosis, necrosis types, free radicals", yield: 9 },
    { topic: "Hemodynamics — thrombosis, embolism, infarction, edema", yield: 9 },
    { topic: "Lab findings & patterns (anemia workup, LFTs, UA)", yield: 8 },
    { topic: "Wound healing, repair & regeneration", yield: 7 },
    { topic: "Environmental/occupational pathology", yield: 5 },
    { topic: "Amyloidosis & storage disorders", yield: 5 },
  ],
  "Physiology": [
    { topic: "Cardiac cycle & hemodynamics (Frank-Starling, pressure-volume loops)", yield: 10 },
    { topic: "Renal physiology (GFR, tubular transport, concentration/dilution)", yield: 10 },
    { topic: "Pulmonary physiology (V/Q matching, gas exchange, compliance)", yield: 9 },
    { topic: "Endocrine feedback loops & hormone synthesis", yield: 9 },
    { topic: "Autonomic nervous system (sympathetic vs parasympathetic)", yield: 8 },
    { topic: "GI motility, secretion & absorption", yield: 7 },
    { topic: "Acid-base physiology & renal buffering", yield: 7 },
    { topic: "Neuromuscular physiology (action potentials, NMJ)", yield: 6 },
    { topic: "Blood flow & vascular resistance", yield: 6 },
  ],
  "Microbiology & Immunology": [
    { topic: "Bacterial identification (Gram stain, culture, morphology)", yield: 10 },
    { topic: "Antimicrobial mechanisms & resistance patterns", yield: 10 },
    { topic: "HIV/AIDS (pathogenesis, CD4 count, opportunistic infections)", yield: 9 },
    { topic: "Hepatitis viruses (A–E, serology panels)", yield: 9 },
    { topic: "Bacterial toxins & virulence factors", yield: 8 },
    { topic: "STIs (syphilis, chlamydia, gonorrhea, HPV, HSV)", yield: 8 },
    { topic: "Viral classification & replication", yield: 7 },
    { topic: "TB & atypical mycobacteria", yield: 7 },
    { topic: "Fungal infections (Candida, Aspergillus, Crypto, Histo, Cocci)", yield: 7 },
    { topic: "Hypersensitivity reactions (Types I–IV)", yield: 8 },
    { topic: "Immunodeficiency disorders (SCID, DiGeorge, Bruton's, CGD)", yield: 7 },
    { topic: "Parasitology (malaria, toxoplasma, giardia, helminths)", yield: 5 },
  ],
  "Gross Anatomy & Embryology": [
    { topic: "Cardiovascular embryology (fetal circulation, congenital defects)", yield: 9 },
    { topic: "Peripheral nerve anatomy & injury patterns (brachial plexus, lumbosacral)", yield: 8 },
    { topic: "Abdominal anatomy (retroperitoneum, hernia sites, vessels)", yield: 8 },
    { topic: "Thorax anatomy (lung lobes, pleura, mediastinum, diaphragm)", yield: 7 },
    { topic: "Neural tube defects & CNS embryology", yield: 7 },
    { topic: "Head & neck anatomy (cranial nerves, triangles)", yield: 7 },
    { topic: "GI embryology (midgut rotation, atresias, Meckel's)", yield: 6 },
    { topic: "Limb development & musculoskeletal embryology", yield: 5 },
    { topic: "Renal & urogenital embryology", yield: 5 },
  ],
  "Pharmacology": [
    { topic: "Autonomic drugs (cholinergic, anticholinergic, adrenergic, blockers)", yield: 10 },
    { topic: "Cardiac drugs (antiarrhythmics, antianginals, antihypertensives)", yield: 10 },
    { topic: "Antimicrobials (mechanism, resistance, side effects by class)", yield: 10 },
    { topic: "Drug metabolism & pharmacokinetics (CYP450, half-life, Vd, bioavailability)", yield: 9 },
    { topic: "CNS drugs (antidepressants, antipsychotics, anxiolytics, mood stabilizers)", yield: 8 },
    { topic: "Anti-inflammatory drugs (NSAIDs, corticosteroids, DMARDs)", yield: 8 },
    { topic: "Anticoagulants & antiplatelets (heparin, warfarin, DOACs, aspirin)", yield: 8 },
    { topic: "Antiepileptic drugs", yield: 7 },
    { topic: "Endocrine drugs (insulin, oral hypoglycemics, thyroid, steroids)", yield: 7 },
    { topic: "Anticancer drugs (mechanism, side effects, cell-cycle specificity)", yield: 7 },
    { topic: "Toxicology & antidotes", yield: 6 },
    { topic: "Drug-drug interactions & adverse effects", yield: 6 },
  ],
  "Behavioral Sciences": [
    { topic: "Biostatistics (sensitivity, specificity, PPV, NPV, LR)", yield: 10 },
    { topic: "Study design types (RCT, cohort, case-control, cross-sectional)", yield: 9 },
    { topic: "Ethics (autonomy, beneficence, non-maleficence, informed consent)", yield: 9 },
    { topic: "Epidemiology — incidence, prevalence, risk measures (RR, OR, ARR, NNT)", yield: 8 },
    { topic: "Bias types & confounders", yield: 7 },
    { topic: "Statistical tests (p-value, confidence intervals, power)", yield: 7 },
    { topic: "Substance use disorders (alcohol, opioids, stimulants)", yield: 6 },
    { topic: "Defense mechanisms", yield: 6 },
    { topic: "Developmental milestones (Freud, Piaget, Erikson, Vygotsky)", yield: 5 },
    { topic: "Sleep stages & disorders", yield: 5 },
    { topic: "End-of-life care (advance directives, DNR, hospice, palliative care)", yield: 7 },
    { topic: "Communication skills (SPIKES, breaking bad news, motivational interviewing)", yield: 5 },
    { topic: "Healthcare law (EMTALA, Good Samaritan, malpractice, mandatory reporting)", yield: 5 },
    { topic: "Patient safety & quality improvement (PDSA, root cause analysis, handoffs)", yield: 4 },
  ],
  "Biochemistry & Nutrition": [
    { topic: "Metabolic pathways (glycolysis, TCA cycle, ETC, gluconeogenesis)", yield: 9 },
    { topic: "Lysosomal storage diseases (Gaucher's, Tay-Sachs, Niemann-Pick, Fabry's)", yield: 9 },
    { topic: "Vitamins — deficiencies & toxicities (fat-soluble & water-soluble)", yield: 8 },
    { topic: "Amino acid derivatives & metabolism disorders (PKU, homocystinuria)", yield: 8 },
    { topic: "Lipid metabolism & transport (lipoproteins, dyslipidemia)", yield: 7 },
    { topic: "Glycogen storage diseases (von Gierke, Pompe, McArdle)", yield: 7 },
    { topic: "DNA replication, transcription & translation", yield: 6 },
    { topic: "DNA repair mechanisms", yield: 6 },
    { topic: "Fatty acid oxidation disorders", yield: 5 },
    { topic: "Purine & pyrimidine metabolism", yield: 5 },
  ],
  "Histology & Cell Biology": [
    { topic: "Connective tissue disorders (collagen synthesis, Marfan's, Ehlers-Danlos)", yield: 9 },
    { topic: "Cell cycle & cancer biology (oncogenes, tumor suppressors, checkpoints)", yield: 9 },
    { topic: "Epithelial histology & glandular structures", yield: 7 },
    { topic: "Organelle functions & associated pathologies", yield: 7 },
    { topic: "Cytoskeleton & cell junction disorders", yield: 6 },
    { topic: "Receptor types & signal transduction pathways", yield: 6 },
    { topic: "Apoptosis pathways (intrinsic vs extrinsic)", yield: 6 },
    { topic: "Membrane transport (Na/K-ATPase, CFTR, channels)", yield: 5 },
  ],
  "Genetics": [
    { topic: "Autosomal dominant disorders (Marfan's, Huntington's, ADPKD, NF)", yield: 9 },
    { topic: "Autosomal recessive disorders (CF, PKU, sickle cell, thalassemia)", yield: 9 },
    { topic: "Chromosomal disorders (Down, Turner, Klinefelter, DiGeorge)", yield: 8 },
    { topic: "X-linked disorders (Duchenne, Fabry's, G6PD, hemophilia A/B)", yield: 8 },
    { topic: "Mendelian inheritance patterns & pedigree analysis", yield: 8 },
    { topic: "Hardy-Weinberg equilibrium", yield: 7 },
    { topic: "Genetic testing methods (karyotype, FISH, PCR, sequencing)", yield: 6 },
    { topic: "Mitochondrial inheritance & disorders", yield: 6 },
    { topic: "Imprinting & uniparental disomy (Prader-Willi, Angelman)", yield: 5 },
  ],
};

// ── Discipline-specific attack strategies ────────────────────────────────────
// Used by planEngine to generate tailored Block 2 (content review) and Block 3
// (wrong-answer review) instructions for each discipline's failure mode.
export const DISCIPLINE_ATTACK_STRATEGIES = {
  "Pathology": {
    approach: "Mechanism → Morphology → Manifestation",
    primaryResource: "Pathoma Ch. 1-3 (Cell Injury, Inflammation, Neoplasia) + Ninja Nerd for system-specific pathology",
    freeVideo: "Ninja Nerd Pathology series (system-specific); Pathoma Ch. 1-3 only for general principles",
    contentReview: "For general pathology principles (cell injury, inflammation, neoplasia): use Pathoma Ch. 1-3. For system-specific pathology (Ch. 4-17 topics): watch Ninja Nerd instead — do not use Pathoma past Ch. 3. Then read First Aid. For each disease: write the mechanism → gross/micro finding → clinical result chain. Annotate buzzwords (\"apple-green birefringence\", \"psammoma bodies\") directly in First Aid.",
    wrongAnswerReview: "For every wrong path question: identify whether you missed the mechanism, the morphology, or the clinical presentation. Map it to the M→M→M chain and annotate First Aid. If you missed a buzzword, highlight it in yellow and read the full FA paragraph.",
    keyInsight: "Pathology is tested visually — if you can't picture the gross or micro finding, you'll miss the question. Sketchy Path mnemonics work well for associations.",
  },
  "Physiology": {
    approach: "Baseline → Perturbation → Compensation",
    primaryResource: "BRS Physiology (Costanzo) — read the chapter, not just FA",
    freeVideo: "Ninja Nerd Physiology — best free resource for mechanisms",
    contentReview: "For the target system: draw the physiologic circuit from scratch (e.g., cardiac output loop, nephron reabsorption). Annotate each step with the drug or disease that perturbs it. Read BRS or FA and fill in gaps in your diagram.",
    wrongAnswerReview: "For every wrong physiology question: re-draw the affected circuit. Identify the step you misunderstood. Find the matching FA table and annotate which direction each variable shifts under the question's condition.",
    keyInsight: "Most physiology questions are about compensatory responses, not baseline physiology. Practice predicting: if X goes up, what else changes and why?",
  },
  "Pharmacology": {
    approach: "Mechanism → Side Effects → Clinical Use",
    primaryResource: "First Aid Pharmacology chapter + Sketchy Pharm",
    freeVideo: "Sketchy Pharm (best ROI for memorization)",
    contentReview: "Use Sketchy Pharm for the drug class, then read the FA pharmacology table for the same class. For each drug: commit MOA → 3 key side effects → top clinical indication. Group drugs by class and compare within-class differences.",
    wrongAnswerReview: "For wrong pharm questions: was it MOA, side effect, or indication? Write the drug name + the fact you missed on a flashcard-style sticky note. If it was a side effect, find all drugs in FA that share that side effect.",
    keyInsight: "Pharmacology rewards systematic thinking. Learn drug classes, not individual drugs — then learn the exceptions within each class.",
  },
  "Microbiology & Immunology": {
    approach: "Bug → Virulence Factor → Disease → Treatment",
    primaryResource: "Sketchy Micro (non-negotiable) + FA Micro tables",
    freeVideo: "Sketchy Micro — each video is a story, not a list",
    contentReview: "Watch Sketchy Micro for the bug category, then read the matching FA table. For each pathogen: commit the virulence factor → classic clinical scenario → drug of choice. Pay special attention to gram stain, encapsulation, and culture findings.",
    wrongAnswerReview: "For wrong micro questions: did you confuse two bugs? Draw a comparison table of both bugs side-by-side. If you missed a treatment, look up all drugs used for that pathogen class and their resistance patterns.",
    keyInsight: "Micro questions are heavily scenario-based. Practice converting clinical vignettes into a bug profile: immunocompromised vs healthy host, exposure history, culture result.",
  },
  "Gross Anatomy & Embryology": {
    approach: "Structure → Function → Clinical Correlation",
    primaryResource: "First Aid Anatomy sections + Acland's Atlas (free online)",
    freeVideo: "Ninja Nerd Anatomy for clinical correlations",
    contentReview: "For each anatomical region: draw the relevant structures from memory (brachial plexus, inguinal canal, etc.). For embryology: draw the developmental timeline and identify what goes wrong at each stage for each high-yield defect.",
    wrongAnswerReview: "For wrong anatomy questions: trace the clinical presentation back to the injured structure. Draw the cross-section or diagram. For embryo: identify the developmental week and the failed process.",
    keyInsight: "Anatomy on Step 1 is almost entirely clinical — nerve injuries, hernias, referred pain, developmental defects. Learn the clinical correlation, not just the structure name.",
  },
  "Behavioral Sciences": {
    approach: "Concept → Statistical Definition → Clinical Example",
    primaryResource: "First Aid Behavioral Science chapter (complete read-through)",
    freeVideo: "Dirty Medicine behavioral science review",
    contentReview: "Read the FA behavioral science chapter in one sitting — it's short and dense. For biostats: make a 2×2 table and derive sensitivity, specificity, PPV, NPV from scratch. For ethics: memorize the 4-scenario framework (competent adult, minor, impaired patient, end of life).",
    wrongAnswerReview: "For wrong behavioral science questions: write out the exact statistical formula or ethical rule that applies. If biostats, draw the 2×2 and recalculate. If ethics, state which of the 4 principles (autonomy, beneficence, non-maleficence, justice) was violated.",
    keyInsight: "Biostats is pure calculation — you either know the formula or you don't. Spend 30 minutes deriving all formulas from a single 2×2 table and you'll never miss a biostats question.",
  },
  "Biochemistry & Nutrition": {
    approach: "Enzyme → Pathway → Deficiency Disease",
    primaryResource: "First Aid Biochemistry chapter + Dirty Medicine biochem videos",
    freeVideo: "Dirty Medicine — short, high-yield biochem reviews",
    contentReview: "For each pathway (glycolysis, TCA, urea cycle, etc.): draw the pathway from memory, label each enzyme, then list the disease caused by each enzyme deficiency. For vitamins: use the FA table and focus on deficiency vs toxicity presentations.",
    wrongAnswerReview: "For wrong biochem questions: identify whether you missed the enzyme name, the substrate/product, or the clinical deficiency syndrome. Redraw the relevant pathway section with the correct answer annotated.",
    keyInsight: "Biochemistry is low-yield individually but tested in clusters. Know the pathways cold — the questions all follow the same template: enzyme deficiency → accumulate upstream substrate → present with classic findings.",
  },
  "Histology & Cell Biology": {
    approach: "Cell Type → Function → Pathological Change",
    primaryResource: "First Aid Histology tables + Pathoma Chapter 1 (cell injury)",
    freeVideo: "Pathoma Chapter 1 (Robbins-level cell biology in 30 minutes)",
    contentReview: "Focus on cell injury (reversible vs irreversible), cellular adaptations (hypertrophy, hyperplasia, metaplasia, dysplasia), and tissue-specific cell types (goblet cells, chief cells, parietal cells). Know which cell types are in each tissue and what their pathologic changes look like.",
    wrongAnswerReview: "For wrong histo questions: identify the tissue layer or cell type you confused. Find the FA table for that organ system and read the full description of each cell type's function and location.",
    keyInsight: "Histology on Step 1 is mostly about recognizing normal cell types and their pathological counterparts. A photomicrograph question is asking: which normal cell here has gone wrong, and how?",
  },
  "Genetics": {
    approach: "Pattern → Mechanism → Classic Disease",
    primaryResource: "First Aid Genetics chapter (pedigrees, mutations, testing)",
    freeVideo: "Ninja Nerd Genetics — clear visual explanations",
    contentReview: "Master all 6 inheritance patterns with a representative disease for each. For chromosomal disorders: know the karyotype, clinical features, and mechanism (nondisjunction, deletion, imprinting). For molecular: know the difference between missense, nonsense, frameshift, and splice site mutations.",
    wrongAnswerReview: "For wrong genetics questions: draw the pedigree again and re-determine the pattern. If you missed a disease, add it to your inheritance pattern list. For molecular genetics, redraw the codon and mutation type.",
    keyInsight: "Genetics questions are almost always pedigrees or molecular mechanisms — they test pattern recognition. Practice interpreting 10 pedigrees in a row until the pattern jumps out immediately.",
  },
};
