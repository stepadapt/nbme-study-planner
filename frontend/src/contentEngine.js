// ── Content Recommendation Engine ─────────────────────────────────────────
// Maps NBME CBSSA categories → specific YouTube resources + study sequences.
// Knowledge gap  (score < 50): Watch → Read → Practice  (40 / 30 / 50 min)
// Application gap (score ≥ 50): Practice → Watch → Annotate  (50 / 25 / 25 min)

export const ytLink = (query) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

// ── Per-category content map ───────────────────────────────────────────────
// mainVideos: shown for the category as a whole (ordered by priority)
// pathoma:    shown when student has Pathoma selected (overrides mainVideos for video step)
// sketchy:    shown when student has Sketchy selected (overrides mainVideos for video step)
// subTopicVideos: keyword → specific video recs; matched against sub-topic strings

const CONTENT_MAP = {

  // ── System categories ──────────────────────────────────────────────────

  "Cardiovascular System": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd cardiovascular system heart failure step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan cardiology heart disease" },
      { channel: "Boards & Beyond", query: "Boards Beyond cardiovascular system USMLE step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 5: Cardiovascular",
      query: "Pathoma cardiovascular chapter 5 heart disease",
    },
    subTopicVideos: {
      "Heart failure": [
        { channel: "Ninja Nerd", query: "Ninja Nerd heart failure CHF systolic diastolic step 1" },
        { channel: "Strong Medicine", query: "Strong Medicine heart failure Frank Starling" },
      ],
      "Ischemic heart disease": [
        { channel: "Ninja Nerd", query: "Ninja Nerd myocardial infarction MI ECG enzymes step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan coronary artery disease MI pathophysiology" },
      ],
      "Arrhythmias": [
        { channel: "Ninja Nerd", query: "Ninja Nerd arrhythmias ECG interpretation step 1 USMLE" },
        { channel: "Dirty Medicine", query: "Dirty Medicine ECG arrhythmia antiarrhythmics" },
      ],
      "Valvular": [
        { channel: "Ninja Nerd", query: "Ninja Nerd valvular heart disease murmurs step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan heart murmurs valvular" },
      ],
      "Congenital": [
        { channel: "Ninja Nerd", query: "Ninja Nerd congenital heart defects shunts cyanotic step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond congenital heart disease USMLE" },
      ],
      "Cardiac pharmacology": [
        { channel: "Ninja Nerd", query: "Ninja Nerd antiarrhythmics cardiac drugs pharmacology step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan cardiac pharmacology antihypertensives" },
      ],
    },
  },

  "Respiratory and Renal/Urinary Systems": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd respiratory renal system physiology step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan respiratory renal pathophysiology" },
      { channel: "Boards & Beyond", query: "Boards Beyond pulmonary renal USMLE step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 12–13: Pulmonary & Urinary",
      query: "Pathoma pulmonary pathology chapter 12 renal urinary chapter 13",
    },
    subTopicVideos: {
      "Acid-base": [
        { channel: "Ninja Nerd", query: "Ninja Nerd acid base disorders metabolic respiratory ABGs step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan acid base balance bicarbonate" },
      ],
      "Obstructive lung": [
        { channel: "Ninja Nerd", query: "Ninja Nerd COPD asthma obstructive lung disease step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan COPD emphysema chronic bronchitis" },
      ],
      "Glomerulonephritis": [
        { channel: "Ninja Nerd", query: "Ninja Nerd glomerulonephritis nephrotic nephritic syndrome step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan glomerular disease nephritis nephrosis" },
      ],
      "Diuretics": [
        { channel: "Ninja Nerd", query: "Ninja Nerd diuretics mechanism site action pharmacology step 1" },
        { channel: "Dirty Medicine", query: "Dirty Medicine diuretics USMLE loop thiazide potassium sparing" },
      ],
      "Electrolyte": [
        { channel: "Ninja Nerd", query: "Ninja Nerd electrolyte disorders hyponatremia hyperkalemia step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan sodium potassium calcium electrolytes" },
      ],
      "Pulmonary embolism": [
        { channel: "Ninja Nerd", query: "Ninja Nerd pulmonary embolism DVT deep vein thrombosis step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan pulmonary embolism pathophysiology" },
      ],
      "Acute kidney injury": [
        { channel: "Ninja Nerd", query: "Ninja Nerd acute kidney injury AKI pre-renal intrinsic step 1" },
        { channel: "Strong Medicine", query: "Strong Medicine AKI acute renal failure creatinine" },
      ],
      "Lung cancer": [
        { channel: "Ninja Nerd", query: "Ninja Nerd lung cancer types paraneoplastic syndromes step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan lung carcinoma adenocarcinoma SCC" },
      ],
    },
  },

  "Behavioral Health & Nervous Systems/Special Senses": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd neurology psychiatry behavioral health step 1 USMLE" },
      { channel: "Boards & Beyond", query: "Boards Beyond nervous system psychiatry USMLE step 1" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan neurology pathophysiology brain" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 8: Neuropathology",
      query: "Pathoma neuropathology chapter 8 brain tumors",
    },
    // NO sketchy field — Sketchy does not cover neurology/behavioral science
    subTopicVideos: {
      "Stroke": [
        { channel: "Ninja Nerd", query: "Ninja Nerd stroke syndromes vascular territories deficits step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan stroke ischemic hemorrhagic pathophysiology" },
      ],
      "Ethics": [
        { channel: "Boards & Beyond", query: "Boards Beyond medical ethics autonomy informed consent step 1" },
        { channel: "Dirty Medicine", query: "Dirty Medicine ethics USMLE informed consent capacity" },
      ],
      "Neurotransmitters": [
        { channel: "Ninja Nerd", query: "Ninja Nerd neurotransmitters receptors pharmacology step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan neurotransmitter receptor serotonin dopamine" },
      ],
      "Mood disorders": [
        { channel: "Ninja Nerd", query: "Ninja Nerd depression bipolar disorder MDD treatment step 1" },
        { channel: "Dirty Medicine", query: "Dirty Medicine mood disorders antidepressants SSRI tricyclics" },
      ],
      "Seizure": [
        { channel: "Ninja Nerd", query: "Ninja Nerd seizure epilepsy antiepileptic drugs step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan epilepsy seizure classification" },
      ],
      "Neurodegenerative": [
        { channel: "Ninja Nerd", query: "Ninja Nerd Alzheimers Parkinsons ALS neurodegenerative step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan neurodegeneration Parkinson dopamine" },
      ],
      "Cranial nerves": [
        { channel: "Ninja Nerd", query: "Ninja Nerd cranial nerves pathways lesions deficits step 1" },
        { channel: "Dr. Najeeb", query: "Dr Najeeb cranial nerves anatomy lesions" },
      ],
      "Biostatistics": [
        { channel: "Dirty Medicine", query: "Dirty Medicine biostatistics sensitivity specificity PPV NPV step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond biostatistics study design USMLE" },
      ],
    },
  },

  "Blood & Lymphoreticular/Immune Systems": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd hematology immunology blood disorders step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan hematology anemia leukemia" },
      { channel: "Boards & Beyond", query: "Boards Beyond hematology immunology step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 4 & 11: Hematopathology & Immune",
      query: "Pathoma hematology chapter 4 immunopathology chapter 11",
    },
    // NO sketchy field — Sketchy does not cover hematology/oncology
    subTopicVideos: {
      "Anemias": [
        { channel: "Ninja Nerd", query: "Ninja Nerd anemias iron deficiency B12 sickle cell thalassemia step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan anemia hemolytic microcytic macrocytic" },
      ],
      "Leukemias": [
        { channel: "Ninja Nerd", query: "Ninja Nerd leukemia lymphoma ALL AML CLL CML step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan leukemia lymphoma classification" },
      ],
      "Hypersensitivity": [
        { channel: "Ninja Nerd", query: "Ninja Nerd hypersensitivity reactions type 1 2 3 4 step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan hypersensitivity allergy immune" },
      ],
      "Coagulation": [
        { channel: "Ninja Nerd", query: "Ninja Nerd coagulation cascade bleeding disorders step 1 USMLE" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan coagulation clotting factors hemophilia" },
      ],
      "Immunodeficiency": [
        { channel: "Ninja Nerd", query: "Ninja Nerd immunodeficiency SCID DiGeorge Bruton step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan primary immunodeficiency syndromes" },
      ],
    },
  },

  "Multisystem Processes & Disorders": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd inflammation neoplasia hemodynamics pathology step 1" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan inflammation acute chronic mediators" },
      { channel: "Boards & Beyond", query: "Boards Beyond multisystem pathology neoplasia USMLE" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 1–3: Cellular Pathology, Inflammation, Neoplasia",
      query: "Pathoma cellular pathology inflammation neoplasia chapters 1 2 3",
    },
    subTopicVideos: {
      "Neoplasia": [
        { channel: "Ninja Nerd", query: "Ninja Nerd neoplasia benign malignant grading staging tumor markers" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan cancer oncogenesis tumor suppressors" },
      ],
      "Inflammation": [
        { channel: "Ninja Nerd", query: "Ninja Nerd inflammation acute chronic mediators step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan acute inflammation cytokines" },
      ],
      "Hemodynamics": [
        { channel: "Ninja Nerd", query: "Ninja Nerd hemodynamics thrombosis embolism infarction shock step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan thrombosis coagulation embolism" },
      ],
      "Cell injury": [
        { channel: "Ninja Nerd", query: "Ninja Nerd cell injury death apoptosis necrosis step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan cell death apoptosis necrosis free radicals" },
      ],
    },
  },

  "Musculoskeletal, Skin & Subcutaneous Tissue": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd musculoskeletal skin pathology step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan rheumatology musculoskeletal bone" },
      { channel: "Boards & Beyond", query: "Boards Beyond musculoskeletal skin step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 7 & 9: Musculoskeletal & Skin",
      query: "Pathoma musculoskeletal chapter 7 skin chapter 9",
    },
    subTopicVideos: {
      "Autoimmune joint": [
        { channel: "Ninja Nerd", query: "Ninja Nerd rheumatoid arthritis SLE gout pseudogout step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan rheumatology joint disease autoimmune" },
      ],
      "Skin pathology": [
        { channel: "Ninja Nerd", query: "Ninja Nerd skin pathology melanoma SCC BCC dermatitis step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan dermatology skin cancer psoriasis" },
      ],
      "Bone disorders": [
        { channel: "Ninja Nerd", query: "Ninja Nerd bone disorders osteoporosis Paget rickets step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan osteoporosis bone metabolism vitamin D" },
      ],
      "Muscle diseases": [
        { channel: "Ninja Nerd", query: "Ninja Nerd muscular dystrophy myasthenia gravis NMJ step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan myasthenia gravis motor neuron disease" },
      ],
    },
  },

  "Gastrointestinal System": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd gastrointestinal GI system pathology step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan GI pathology liver gastroenterology" },
      { channel: "Boards & Beyond", query: "Boards Beyond gastrointestinal system USMLE step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 14–15: GI & Hepatobiliary",
      query: "Pathoma gastrointestinal chapter 14 hepatobiliary chapter 15",
    },
    subTopicVideos: {
      "Liver pathology": [
        { channel: "Ninja Nerd", query: "Ninja Nerd liver pathology hepatitis cirrhosis liver failure step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan hepatology cirrhosis portal hypertension" },
      ],
      "IBD": [
        { channel: "Ninja Nerd", query: "Ninja Nerd inflammatory bowel disease Crohn UC step 1 USMLE" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan Crohns disease ulcerative colitis IBD" },
      ],
      "GI cancers": [
        { channel: "Ninja Nerd", query: "Ninja Nerd colorectal cancer GI cancers pancreatic step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan colorectal cancer gastric pancreatic cancer" },
      ],
      "Pancreatic": [
        { channel: "Ninja Nerd", query: "Ninja Nerd pancreatitis pancreatic cancer exocrine step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan acute chronic pancreatitis enzymes" },
      ],
      "Bilirubin": [
        { channel: "Ninja Nerd", query: "Ninja Nerd bilirubin metabolism jaundice pre hepatic intrahepatic step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan jaundice bilirubin metabolism liver" },
      ],
    },
  },

  "Reproductive & Endocrine Systems": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd reproductive endocrine system hormones step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan endocrinology reproductive hormones" },
      { channel: "Boards & Beyond", query: "Boards Beyond endocrine reproductive system USMLE" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 16–17: Endocrine & Reproductive",
      query: "Pathoma endocrine chapter 16 reproductive chapter 17",
    },
    // NO sketchy field — Sketchy does not cover endocrine/reproductive physiology
    subTopicVideos: {
      "Diabetes mellitus": [
        { channel: "Ninja Nerd", query: "Ninja Nerd diabetes mellitus type 1 2 DKA HHS insulin step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan diabetes pathophysiology insulin resistance" },
      ],
      "Thyroid": [
        { channel: "Ninja Nerd", query: "Ninja Nerd thyroid disorders Graves Hashimoto hyperthyroidism step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan thyroid gland disorders TSH T3 T4" },
      ],
      "Adrenal": [
        { channel: "Ninja Nerd", query: "Ninja Nerd adrenal disorders Cushings Addisons Conn pheochromocytoma step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan adrenal gland cortisol aldosterone" },
      ],
      "Female reproductive": [
        { channel: "Ninja Nerd", query: "Ninja Nerd female reproductive pathology PCOS fibroids endometriosis step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan gynecology ovarian pathology female reproductive" },
      ],
      "Pituitary": [
        { channel: "Ninja Nerd", query: "Ninja Nerd pituitary disorders prolactinoma acromegaly SIADH step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan pituitary gland hormones hypothalamus axis" },
      ],
    },
  },

  // ── Discipline categories ─────────────────────────────────────────────────

  "Pathology": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd general pathology inflammation neoplasia step 1" },
      { channel: "Boards & Beyond", query: "Boards Beyond pathology general principles USMLE step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 1–3: Core Pathology Principles",
      query: "Pathoma general pathology cellular injury inflammation neoplasia",
    },
    subTopicVideos: {
      "Inflammation": [
        { channel: "Ninja Nerd", query: "Ninja Nerd acute chronic inflammation mediators granuloma step 1" },
      ],
      "Neoplasia": [
        { channel: "Ninja Nerd", query: "Ninja Nerd neoplasia carcinogenesis tumor markers step 1" },
      ],
      "Cell injury": [
        { channel: "Ninja Nerd", query: "Ninja Nerd cell injury necrosis apoptosis free radicals step 1" },
      ],
      "Hemodynamics": [
        { channel: "Ninja Nerd", query: "Ninja Nerd hemodynamics edema shock thrombosis embolism step 1" },
      ],
    },
  },

  "Physiology": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd physiology cardiovascular renal pulmonary endocrine step 1" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan human physiology organ systems" },
      { channel: "Dr. Najeeb", query: "Dr Najeeb physiology lectures medical USMLE step 1" },
    ],
    subTopicVideos: {
      "Cardiac cycle": [
        { channel: "Ninja Nerd", query: "Ninja Nerd cardiac cycle pressure volume loops Frank Starling step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan cardiac cycle hemodynamics" },
      ],
      "Renal physiology": [
        { channel: "Ninja Nerd", query: "Ninja Nerd renal physiology GFR tubular transport concentration step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan renal physiology nephron filtration" },
      ],
      "Pulmonary physiology": [
        { channel: "Ninja Nerd", query: "Ninja Nerd pulmonary physiology V/Q mismatch gas exchange step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan lung physiology ventilation perfusion" },
      ],
      "Endocrine feedback": [
        { channel: "Ninja Nerd", query: "Ninja Nerd endocrine feedback loops hormone synthesis axis step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan hypothalamic pituitary adrenal axis" },
      ],
      "Autonomic nervous system": [
        { channel: "Ninja Nerd", query: "Ninja Nerd autonomic nervous system sympathetic parasympathetic step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan autonomic pharmacology adrenergic cholinergic" },
      ],
    },
  },

  "Microbiology & Immunology": {
    mainVideos: [
      { channel: "Armando Hasudungan", query: "Armando Hasudungan microbiology bacteria viruses fungi parasites step 1" },
      { channel: "Ninja Nerd", query: "Ninja Nerd microbiology immunology step 1 USMLE" },
      { channel: "Boards & Beyond", query: "Boards Beyond microbiology immunology USMLE step 1" },
    ],
    // Sketchy Micro: text-only recommendation (paid platform, no YouTube link)
    sketchy: {
      label: "Sketchy Micro",
    },
    subTopicVideos: {
      "Bacterial identification": [
        { channel: "Ninja Nerd", query: "Ninja Nerd bacterial identification Gram stain culture morphology step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan gram positive negative bacteria classification" },
      ],
      "Antimicrobial": [
        { channel: "Ninja Nerd", query: "Ninja Nerd antibiotics antimicrobial mechanisms resistance step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan antibiotic classes mechanism resistance" },
      ],
      "HIV": [
        { channel: "Ninja Nerd", query: "Ninja Nerd HIV AIDS pathogenesis CD4 opportunistic infections step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan HIV retrovirus pathogenesis antiretrovirals" },
      ],
      "Hepatitis": [
        { channel: "Ninja Nerd", query: "Ninja Nerd hepatitis A B C D E serology panels step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan hepatitis viruses serology surface antigen" },
      ],
      "Fungal infections": [
        { channel: "Ninja Nerd", query: "Ninja Nerd fungal infections candida aspergillus cryptococcus step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan fungal infections dimorphic opportunistic" },
      ],
    },
  },

  "Gross Anatomy & Embryology": {
    mainVideos: [
      { channel: "Dr. Najeeb", query: "Dr Najeeb anatomy embryology lectures medical step 1 USMLE" },
      { channel: "AnatomyZone", query: "AnatomyZone anatomy 3D medical gross anatomy" },
      { channel: "Boards & Beyond", query: "Boards Beyond gross anatomy embryology step 1" },
    ],
    subTopicVideos: {
      "Cardiovascular embryology": [
        { channel: "Dr. Najeeb", query: "Dr Najeeb cardiovascular embryology fetal circulation congenital" },
        { channel: "Ninja Nerd", query: "Ninja Nerd cardiovascular embryology congenital heart defects step 1" },
      ],
      "Peripheral nerve": [
        { channel: "Dr. Najeeb", query: "Dr Najeeb brachial plexus lumbosacral peripheral nerve anatomy" },
        { channel: "AnatomyZone", query: "AnatomyZone brachial plexus peripheral nerves 3D anatomy" },
      ],
      "Abdominal anatomy": [
        { channel: "Dr. Najeeb", query: "Dr Najeeb abdominal anatomy retroperitoneum hernia vessels" },
        { channel: "Ninja Nerd", query: "Ninja Nerd abdominal anatomy peritoneum retroperitoneum step 1" },
      ],
      "Thorax anatomy": [
        { channel: "Dr. Najeeb", query: "Dr Najeeb thorax anatomy lungs pleura mediastinum diaphragm" },
        { channel: "AnatomyZone", query: "AnatomyZone thorax anatomy mediastinum 3D" },
      ],
      "Neural tube defects": [
        { channel: "Ninja Nerd", query: "Ninja Nerd neural tube defects CNS embryology spina bifida step 1" },
        { channel: "Dr. Najeeb", query: "Dr Najeeb CNS embryology neural tube brain development" },
      ],
    },
  },

  "Pharmacology": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd pharmacology drug mechanisms classes step 1 USMLE" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan pharmacology drug mechanisms pharmacokinetics" },
      { channel: "Boards & Beyond", query: "Boards Beyond pharmacology USMLE step 1" },
    ],
    // Sketchy Pharm: text-only recommendation (paid platform, no YouTube link)
    sketchy: {
      label: "Sketchy Pharm",
    },
    subTopicVideos: {
      "Autonomic drugs": [
        { channel: "Ninja Nerd", query: "Ninja Nerd autonomic pharmacology cholinergic adrenergic drugs step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan autonomic drugs beta blockers ACE inhibitors" },
      ],
      "Cardiac drugs": [
        { channel: "Ninja Nerd", query: "Ninja Nerd cardiac pharmacology antiarrhythmics antihypertensives step 1" },
        { channel: "Dirty Medicine", query: "Dirty Medicine antiarrhythmics Vaughan Williams classification" },
      ],
      "Antimicrobials": [
        { channel: "Ninja Nerd", query: "Ninja Nerd antibiotic mechanisms resistance side effects step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan antibiotics penicillin aminoglycosides" },
      ],
      "Drug metabolism": [
        { channel: "Ninja Nerd", query: "Ninja Nerd pharmacokinetics CYP450 half-life Vd bioavailability step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan pharmacokinetics volume distribution clearance" },
      ],
      "CNS drugs": [
        { channel: "Ninja Nerd", query: "Ninja Nerd CNS pharmacology antidepressants antipsychotics SSRIs step 1" },
        { channel: "Dirty Medicine", query: "Dirty Medicine antidepressants SSRI SNRI tricyclic MAOIs" },
      ],
      "Anticoagulants": [
        { channel: "Ninja Nerd", query: "Ninja Nerd anticoagulants heparin warfarin DOACs antiplatelets step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan anticoagulation heparin warfarin mechanism" },
      ],
    },
  },

  "Behavioral Sciences": {
    mainVideos: [
      { channel: "Dirty Medicine", query: "Dirty Medicine biostatistics behavioral sciences step 1 USMLE" },
      { channel: "Boards & Beyond", query: "Boards Beyond behavioral sciences biostatistics ethics step 1" },
      { channel: "Ninja Nerd", query: "Ninja Nerd biostatistics study design epidemiology step 1" },
    ],
    subTopicVideos: {
      "Biostatistics": [
        { channel: "Dirty Medicine", query: "Dirty Medicine biostatistics sensitivity specificity PPV NPV LR step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond biostatistics 2x2 table calculations USMLE" },
      ],
      "Study design": [
        { channel: "Dirty Medicine", query: "Dirty Medicine study design RCT cohort case-control cross-sectional step 1" },
        { channel: "Ninja Nerd", query: "Ninja Nerd epidemiology study design bias confounding step 1" },
      ],
      "Ethics": [
        { channel: "Boards & Beyond", query: "Boards Beyond ethics informed consent autonomy beneficence step 1" },
        { channel: "Dirty Medicine", query: "Dirty Medicine medical ethics USMLE autonomy capacity" },
      ],
      "Epidemiology": [
        { channel: "Dirty Medicine", query: "Dirty Medicine epidemiology incidence prevalence risk measures OR RR step 1" },
        { channel: "Ninja Nerd", query: "Ninja Nerd epidemiology incidence prevalence relative risk odds ratio" },
      ],
    },
  },

  "Biochemistry & Nutrition": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd biochemistry metabolism glycolysis TCA ETC step 1 USMLE" },
      { channel: "AK Lectures", query: "AK Lectures biochemistry medical USMLE metabolism" },
      { channel: "Boards & Beyond", query: "Boards Beyond biochemistry nutrition step 1 USMLE" },
    ],
    subTopicVideos: {
      "Metabolic pathways": [
        { channel: "Ninja Nerd", query: "Ninja Nerd glycolysis TCA cycle electron transport chain gluconeogenesis step 1" },
        { channel: "AK Lectures", query: "AK Lectures glycolysis TCA cycle metabolism USMLE" },
      ],
      "Lysosomal storage": [
        { channel: "Ninja Nerd", query: "Ninja Nerd lysosomal storage diseases Gaucher Tay-Sachs Niemann-Pick step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond lysosomal storage diseases mnemonics" },
      ],
      "Vitamins": [
        { channel: "Ninja Nerd", query: "Ninja Nerd vitamins deficiencies toxicities fat soluble water soluble step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond vitamin deficiencies USMLE fat water soluble" },
      ],
      "Amino acid": [
        { channel: "Ninja Nerd", query: "Ninja Nerd amino acid metabolism PKU homocystinuria disorders step 1" },
        { channel: "AK Lectures", query: "AK Lectures amino acid metabolism disorders inborn errors" },
      ],
      "Lipid metabolism": [
        { channel: "Ninja Nerd", query: "Ninja Nerd lipid metabolism lipoproteins LDL HDL dyslipidemia step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan lipid metabolism cholesterol lipoproteins" },
      ],
      "Glycogen storage": [
        { channel: "Ninja Nerd", query: "Ninja Nerd glycogen storage diseases von Gierke Pompe McArdle step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond glycogen storage diseases mnemonics USMLE" },
      ],
    },
  },

  "Histology & Cell Biology": {
    mainVideos: [
      { channel: "Boards & Beyond", query: "Boards Beyond histology cell biology step 1 USMLE" },
      { channel: "Dr. Najeeb", query: "Dr Najeeb histology cell biology epithelium connective tissue" },
      { channel: "Ninja Nerd", query: "Ninja Nerd cell biology histology organelles step 1" },
    ],
    pathoma: {
      label: "Pathoma — Ch. 1: Cell Injury & Pathology",
      query: "Pathoma cell injury cellular pathology chapter 1",
    },
    subTopicVideos: {
      "Connective tissue": [
        { channel: "Ninja Nerd", query: "Ninja Nerd connective tissue disorders collagen Marfan Ehlers-Danlos step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan collagen synthesis connective tissue disorders" },
      ],
      "Cell cycle": [
        { channel: "Ninja Nerd", query: "Ninja Nerd cell cycle cancer biology oncogenes tumor suppressors step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan cell cycle checkpoints p53 Rb oncogenes" },
      ],
      "Organelle functions": [
        { channel: "Ninja Nerd", query: "Ninja Nerd organelle functions cell biology pathology step 1" },
        { channel: "Dr. Najeeb", query: "Dr Najeeb cell organelles mitochondria Golgi endoplasmic reticulum" },
      ],
      "Signal transduction": [
        { channel: "Ninja Nerd", query: "Ninja Nerd signal transduction receptor types G protein step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan signal transduction receptor pathways" },
      ],
    },
  },

  "Genetics": {
    mainVideos: [
      { channel: "Ninja Nerd", query: "Ninja Nerd genetics inheritance disorders chromosomal step 1 USMLE" },
      { channel: "Boards & Beyond", query: "Boards Beyond genetics inheritance patterns USMLE step 1" },
      { channel: "Armando Hasudungan", query: "Armando Hasudungan genetics chromosomal disorders inheritance" },
    ],
    subTopicVideos: {
      "Autosomal dominant": [
        { channel: "Ninja Nerd", query: "Ninja Nerd autosomal dominant Marfan Huntington ADPKD neurofibromatosis step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond autosomal dominant diseases inheritance step 1" },
      ],
      "Autosomal recessive": [
        { channel: "Ninja Nerd", query: "Ninja Nerd autosomal recessive CF PKU sickle cell thalassemia step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond autosomal recessive disorders step 1 USMLE" },
      ],
      "Chromosomal disorders": [
        { channel: "Ninja Nerd", query: "Ninja Nerd chromosomal disorders Down syndrome Turner Klinefelter step 1" },
        { channel: "Armando Hasudungan", query: "Armando Hasudungan chromosomal trisomy monosomy disorders" },
      ],
      "X-linked": [
        { channel: "Ninja Nerd", query: "Ninja Nerd X-linked disorders Duchenne Fabry G6PD hemophilia step 1" },
        { channel: "Boards & Beyond", query: "Boards Beyond X-linked inheritance disorders step 1" },
      ],
    },
  },
};

// ── Find matching sub-topic videos ────────────────────────────────────────
// Matches top sub-topics against bucket keywords (case-insensitive partial match)
function matchSubTopicVideos(category, topSubTopics) {
  const bucket = CONTENT_MAP[category];
  if (!bucket?.subTopicVideos || !topSubTopics?.length) return [];

  const matched = [];
  for (const sub of topSubTopics) {
    const topicText = typeof sub === 'string' ? sub : (sub.topic || '');
    // Strip parenthetical qualifiers for matching: "Diabetes mellitus (Type 1...)" → "Diabetes mellitus"
    const cleanTopic = topicText.split('(')[0].trim().toLowerCase();

    for (const [keyword, videos] of Object.entries(bucket.subTopicVideos)) {
      if (cleanTopic.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(cleanTopic)) {
        matched.push(...videos);
        break; // one match per sub-topic
      }
    }
    if (matched.length >= 3) break; // cap at 3 sub-topic video recommendations
  }
  return matched;
}

// ── Validation gate ───────────────────────────────────────────────────────
// Safety net: blocks any Sketchy or Pathoma recommendation outside their valid domains.
// Sketchy: ONLY Pharmacology or Microbiology & Immunology.
// Pathoma: ONLY Pathology discipline or path-specific topics.
const SKETCHY_ALLOWED_CATEGORIES = new Set(['Pharmacology', 'Microbiology & Immunology']);
const PATHOMA_ALLOWED_CATEGORIES = new Set([
  'Pathology', 'Multisystem Processes & Disorders',
  'Cardiovascular System', 'Gastrointestinal System',
  'Respiratory and Renal/Urinary Systems', 'Blood & Lymphoreticular/Immune Systems',
  'Musculoskeletal, Skin & Subcutaneous Tissue', 'Reproductive & Endocrine Systems',
  'Behavioral Health & Nervous Systems/Special Senses', 'Histology & Cell Biology',
]);

function validateRecommendation(resource, category) {
  const r = (resource || '').toLowerCase();
  if (r.includes('sketchy')) {
    return SKETCHY_ALLOWED_CATEGORIES.has(category);
  }
  if (r.includes('pathoma')) {
    return PATHOMA_ALLOWED_CATEGORIES.has(category);
  }
  return true;
}

// ── Main export ───────────────────────────────────────────────────────────
/**
 * Returns a structured study sequence for the given category and gap type.
 *
 * @param {string}   category    - NBME CBSSA category name
 * @param {string}   gapType     - "knowledge" | "application"
 * @param {string[]} resources   - student's selected resource IDs (from profile.resources)
 * @param {Array}    subTopics   - top sub-topic objects [{ topic, yield }]
 * @returns {{ gapType, sequence: Array<Step> }}
 */
export function getContentSequence(category, gapType, resources = [], subTopics = []) {
  const bucket = CONTENT_MAP[category];
  if (!bucket) return { gapType, sequence: [] };

  const hasPathoma  = resources.includes('pathoma')  && !!bucket.pathoma  && validateRecommendation('pathoma', category);
  const hasSketchy  = resources.includes('sketchy')  && !!bucket.sketchy  && validateRecommendation('sketchy', category);
  const hasBnb      = resources.includes('bnb');
  const hasPhyseo   = resources.includes('physeo');
  const hasFirstAid = resources.includes('firstaid');

  // Build the primary video recommendation (Pathoma/Sketchy override first)
  let primaryVideoStep;
  if (hasPathoma) {
    primaryVideoStep = {
      type: 'video',
      emoji: '🔬',
      label: bucket.pathoma.label,
      timeLabel: '~30 min',
      instruction: 'Watch this Pathoma chapter now — Hussain covers the high-yield concepts tested most frequently. Pause and annotate.',
      links: [{ channel: 'Pathoma', url: ytLink(bucket.pathoma.query), label: `Search: ${bucket.pathoma.query.slice(0, 50)}` }],
    };
  } else if (hasSketchy) {
    // Sketchy is ONLY valid for Pharmacology and Microbiology & Immunology.
    // It is a paid platform — never generate a YouTube link. Text-only recommendation.
    const isPharm = category === 'Pharmacology';
    const sketchyType = isPharm ? 'Pharm' : 'Micro';
    const topSubTopic = subTopics?.[0]?.topic?.split('(')[0]?.trim() || '';
    const sketchyLabel = topSubTopic
      ? `Sketchy ${sketchyType}: ${topSubTopic}`
      : bucket.sketchy.label;
    primaryVideoStep = {
      type: 'video',
      emoji: '🎨',
      label: sketchyLabel,
      timeLabel: '~30 min',
      instruction: `Open your Sketchy subscription and watch the Sketchy ${sketchyType} scene for this topic. Build the memory palace as you watch — draw the scene from memory afterward to test encoding.`,
      links: [], // Paid platform — student accesses via their own subscription. No YouTube link.
    };
  } else {
    // Build YouTube video list: sub-topic matches first, then fallback to main videos
    const subTopicMatches = matchSubTopicVideos(category, subTopics);
    const videoList = subTopicMatches.length > 0
      ? [...subTopicMatches, ...bucket.mainVideos].slice(0, 3)
      : bucket.mainVideos.slice(0, 3);

    // Filter preferred channels if student has B&B or Physeo
    const preferred = videoList.filter(v =>
      (hasBnb     && v.channel.toLowerCase().includes('boards')) ||
      (hasPhyseo  && v.channel.toLowerCase().includes('physeo'))
    );
    const finalList = preferred.length > 0
      ? [...preferred, ...videoList.filter(v => !preferred.includes(v))].slice(0, 3)
      : videoList.slice(0, 3);

    primaryVideoStep = {
      type: 'video',
      emoji: '▶️',
      label: `Video review: ${category}`,
      timeLabel: '~30–40 min',
      instruction: 'Watch 1–2 of these (not all three). Choose the channel whose style clicks best for you — then take notes, not screenshots.',
      links: finalList.map(v => ({
        channel: v.channel,
        url: ytLink(v.query),
        label: v.channel,
      })),
    };
  }

  // First Aid read step
  const firstAidStep = hasFirstAid ? {
    type: 'read',
    emoji: '📕',
    label: `First Aid — ${category}`,
    timeLabel: '~20–30 min',
    instruction: 'Read the relevant First Aid section. Annotate anything you learned from the video that isn\'t already in the book. Use the margins.',
    links: [],
  } : null;

  // Practice step (always present)
  const practiceStep = {
    type: 'practice',
    emoji: '🎯',
    label: 'Question practice',
    timeLabel: '~40–50 min',
    instruction: gapType === 'knowledge'
      ? 'Do 20–30 focused questions on this topic now that you\'ve built the framework. Read every explanation — both right and wrong answers.'
      : 'Do 20–30 focused questions. When you miss one, go back to the concept immediately — annotate your notes with the clinical reasoning.',
    links: [],
  };

  // Annotate step (for application gaps)
  const annotateStep = {
    type: 'annotate',
    emoji: '✏️',
    label: 'Annotate & consolidate',
    timeLabel: '~20–25 min',
    instruction: 'Go through every wrong answer from today\'s questions. For each one: find the concept in First Aid, annotate it, and add an Anki card if you don\'t have one already.',
    links: [],
  };

  // Build sequence based on gap type
  let sequence;
  if (gapType === 'knowledge') {
    // Knowledge gap: Watch → Read → Practice
    sequence = [
      primaryVideoStep,
      firstAidStep,
      { ...practiceStep, timeLabel: '~50 min', instruction: 'Now apply what you learned — do 20–30 focused Qs on this topic. Read every explanation thoroughly.' },
    ].filter(Boolean);
  } else {
    // Application gap: Practice → Targeted Watch → Annotate
    sequence = [
      { ...practiceStep, timeLabel: '~50 min', instruction: 'Start with questions — identify exactly which concepts are tripping you up before you review.' },
      { ...primaryVideoStep, timeLabel: '~25 min', instruction: hasPathoma || hasSketchy
          ? 'Watch the specific sections that match what you got wrong. Don\'t re-watch things you already know.'
          : 'Watch 1 targeted video for the concepts you missed. Don\'t re-watch material you already know.' },
      firstAidStep
        ? { ...annotateStep, instruction: 'Annotate First Aid with what you learned. Every wrong answer = an annotation or an Anki card.' }
        : annotateStep,
    ].filter(Boolean);
  }

  return { gapType, sequence };
}
