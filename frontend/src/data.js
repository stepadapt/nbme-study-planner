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

// HIGH_YIELD_WEIGHTS — based on midpoint of % of questions on actual NBME report (1-10 scale)
export const HIGH_YIELD_WEIGHTS = {
  // System — weights reflect % of exam
  "Reproductive & Endocrine Systems": 7,
  "Respiratory and Renal/Urinary Systems": 7,
  "Behavioral Health & Nervous Systems/Special Senses": 7,
  "Blood & Lymphoreticular/Immune Systems": 6,
  "Multisystem Processes & Disorders": 6,
  "Musculoskeletal, Skin & Subcutaneous Tissue": 6,
  "Cardiovascular System": 6,
  "Gastrointestinal System": 5,
  // Discipline — Pathology/Physiology dominate Step 1
  "Pathology": 10,
  "Physiology": 9,
  "Microbiology & Immunology": 8,
  "Pharmacology": 7,
  "Gross Anatomy & Embryology": 6,
  "Behavioral Sciences": 6,
  "Biochemistry & Nutrition": 5,
  "Histology & Cell Biology": 5,
  "Genetics": 4,
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

export const SUB_TOPICS = {
  // ── System ──
  "Reproductive & Endocrine Systems": [
    { topic: "Diabetes mellitus (Type 1 vs 2, DKA vs HHS, insulin)", yield: 10 },
    { topic: "Thyroid disorders (Graves', Hashimoto's, hyper/hypo)", yield: 9 },
    { topic: "Adrenal disorders (Cushing's, Addison's, Conn's, pheo)", yield: 9 },
    { topic: "Female reproductive pathology (PCOS, fibroids, endometriosis, cancers)", yield: 8 },
    { topic: "Pituitary disorders (prolactinoma, acromegaly, SIADH, DI)", yield: 8 },
    { topic: "Pregnancy complications (ectopic, pre-eclampsia, gestational DM)", yield: 8 },
    { topic: "Calcium & parathyroid disorders", yield: 7 },
    { topic: "Male reproductive pathology (BPH, prostate cancer, testicular tumors)", yield: 7 },
    { topic: "Adrenal steroid synthesis pathway", yield: 7 },
    { topic: "Hormonal contraception & reproductive pharmacology", yield: 6 },
    { topic: "MEN syndromes", yield: 6 },
    { topic: "Sexual differentiation & embryology", yield: 5 },
  ],
  "Respiratory and Renal/Urinary Systems": [
    { topic: "Acid-base disorders (metabolic/respiratory, compensation, ABGs)", yield: 10 },
    { topic: "Obstructive lung diseases (COPD, asthma, bronchiectasis)", yield: 10 },
    { topic: "Glomerulonephritis (nephrotic vs nephritic syndrome)", yield: 9 },
    { topic: "Diuretics (mechanism, site of action, side effects)", yield: 9 },
    { topic: "Electrolyte disorders (Na, K, Ca — causes & management)", yield: 9 },
    { topic: "Pulmonary embolism & DVT", yield: 8 },
    { topic: "Acute kidney injury (pre-renal, intrinsic, post-renal)", yield: 8 },
    { topic: "Lung cancer (types, location, paraneoplastic)", yield: 8 },
    { topic: "RAAS system & blood pressure regulation", yield: 7 },
    { topic: "Chronic kidney disease (stages, complications)", yield: 7 },
    { topic: "Pulmonary function tests (FEV1/FVC, compliance)", yield: 7 },
    { topic: "TB (primary, secondary, PPD, treatment)", yield: 7 },
    { topic: "Renal tubular acidosis (types I, II, IV)", yield: 6 },
    { topic: "Oxygen-hemoglobin dissociation curve", yield: 6 },
    { topic: "Restrictive lung diseases (fibrosis, sarcoidosis)", yield: 6 },
  ],
  "Behavioral Health & Nervous Systems/Special Senses": [
    { topic: "Stroke syndromes (vascular territories, deficits)", yield: 10 },
    { topic: "Ethics (autonomy, beneficence, informed consent, capacity)", yield: 9 },
    { topic: "Neurotransmitters & receptor pharmacology", yield: 9 },
    { topic: "Mood disorders (MDD, bipolar — diagnosis, treatment)", yield: 9 },
    { topic: "Cranial nerves (pathways, lesions, deficits)", yield: 8 },
    { topic: "Seizure disorders & antiepileptic drugs", yield: 8 },
    { topic: "Psychotic disorders (schizophrenia, antipsychotics)", yield: 8 },
    { topic: "Anxiety disorders (GAD, panic, OCD, PTSD)", yield: 7 },
    { topic: "Neurodegenerative diseases (Alzheimer's, Parkinson's, ALS)", yield: 7 },
    { topic: "Spinal cord lesions (Brown-Séquard, syringomyelia)", yield: 7 },
    { topic: "Brain tumors (types, location, age)", yield: 6 },
    { topic: "Substance use disorders", yield: 6 },
    { topic: "Demyelinating diseases (MS, Guillain-Barré)", yield: 6 },
    { topic: "Meningitis (bacterial vs viral, CSF findings)", yield: 6 },
    { topic: "Biostatistics (sensitivity, specificity, study design, PPV/NPV)", yield: 6 },
  ],
  "Blood & Lymphoreticular/Immune Systems": [
    { topic: "Anemias (iron deficiency, B12/folate, sickle cell, thalassemia, hemolytic)", yield: 10 },
    { topic: "Leukemias & lymphomas (ALL, AML, CLL, CML, Hodgkin's, NHL)", yield: 9 },
    { topic: "Hypersensitivity reactions (Types I–IV)", yield: 9 },
    { topic: "Coagulation cascade & bleeding disorders", yield: 8 },
    { topic: "Immunodeficiency disorders (SCID, DiGeorge, Bruton's)", yield: 8 },
    { topic: "Platelet disorders (ITP, TTP, HUS, DIC)", yield: 8 },
    { topic: "Anticoagulants & antiplatelets (heparin, warfarin, DOACs)", yield: 7 },
    { topic: "Autoimmune diseases (SLE, RA, Sjögren's)", yield: 7 },
    { topic: "Complement system & cytokines", yield: 7 },
    { topic: "Transplant rejection (hyperacute, acute, chronic)", yield: 6 },
    { topic: "Blood transfusion reactions", yield: 6 },
    { topic: "Myeloproliferative disorders", yield: 5 },
  ],
  "Multisystem Processes & Disorders": [
    { topic: "Neoplasia (benign vs malignant, grading, staging, tumor markers)", yield: 10 },
    { topic: "Inflammation (acute vs chronic, mediators)", yield: 9 },
    { topic: "Hemodynamics (thrombosis, embolism, infarction, edema, shock)", yield: 9 },
    { topic: "Cell injury & death (apoptosis vs necrosis types)", yield: 8 },
    { topic: "Paraneoplastic syndromes", yield: 7 },
    { topic: "Granulomatous diseases (sarcoidosis, TB)", yield: 7 },
    { topic: "Wound healing & repair", yield: 6 },
    { topic: "Vitamin deficiencies & toxicities", yield: 6 },
    { topic: "Amyloidosis", yield: 5 },
    { topic: "Systemic infections & sepsis", yield: 5 },
  ],
  "Musculoskeletal, Skin & Subcutaneous Tissue": [
    { topic: "Autoimmune joint disease (RA, SLE, gout, pseudogout)", yield: 9 },
    { topic: "Skin pathology (melanoma, SCC, BCC, dermatitis, psoriasis)", yield: 8 },
    { topic: "Bone disorders (osteoporosis, Paget's, osteomalacia, rickets)", yield: 8 },
    { topic: "Muscle diseases (muscular dystrophies, myasthenia gravis)", yield: 7 },
    { topic: "Peripheral nerve anatomy & injury patterns", yield: 7 },
    { topic: "Bone tumors (osteosarcoma, Ewing's, giant cell tumor)", yield: 6 },
    { topic: "MSK pharmacology (DMARDs, biologics, gout drugs)", yield: 6 },
    { topic: "Compartment syndrome", yield: 4 },
  ],
  "Cardiovascular System": [
    { topic: "Heart failure (systolic vs diastolic, Frank-Starling)", yield: 10 },
    { topic: "Ischemic heart disease / MI (pathophysiology, ECG, enzymes)", yield: 10 },
    { topic: "Valvular heart disease (murmurs, rheumatic fever)", yield: 9 },
    { topic: "Cardiac pharmacology (antiarrhythmics, antihypertensives)", yield: 9 },
    { topic: "Arrhythmias & ECG interpretation", yield: 9 },
    { topic: "Congenital heart defects (shunts, cyanotic vs acyanotic)", yield: 8 },
    { topic: "Hypertension (primary, secondary causes)", yield: 7 },
    { topic: "Shock (cardiogenic, hypovolemic, septic, neurogenic)", yield: 7 },
    { topic: "Atherosclerosis pathogenesis", yield: 7 },
    { topic: "Cardiac cycle & pressure-volume loops", yield: 6 },
    { topic: "Aortic dissection / aneurysm", yield: 6 },
    { topic: "Pericardial disease (tamponade, constrictive pericarditis)", yield: 5 },
  ],
  "Gastrointestinal System": [
    { topic: "Liver pathology (viral hepatitis, cirrhosis, liver failure)", yield: 10 },
    { topic: "Inflammatory bowel disease (Crohn's vs UC)", yield: 9 },
    { topic: "GI cancers (colorectal, pancreatic, esophageal, gastric)", yield: 9 },
    { topic: "Pancreatic pathology (pancreatitis, pancreatic cancer)", yield: 8 },
    { topic: "Bilirubin metabolism & jaundice (pre/intra/post-hepatic)", yield: 8 },
    { topic: "Peptic ulcer disease / H. pylori", yield: 7 },
    { topic: "GI pharmacology (PPIs, H2 blockers, antiemetics)", yield: 7 },
    { topic: "Esophageal disorders (achalasia, Barrett's, GERD)", yield: 7 },
    { topic: "Malabsorption syndromes (celiac, Whipple's)", yield: 6 },
    { topic: "Gallbladder disease (cholelithiasis, cholecystitis)", yield: 6 },
    { topic: "GI embryology (midgut rotation, atresias)", yield: 5 },
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
    { topic: "Developmental milestones", yield: 5 },
    { topic: "Sleep stages & disorders", yield: 5 },
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
