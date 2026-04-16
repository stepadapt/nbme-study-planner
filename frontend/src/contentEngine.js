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
    // Pathoma Ch. 5 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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
    // Pathoma Ch. 12-13 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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
    // Pathoma Ch. 8 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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
    // Pathoma Ch. 4 & 11 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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
    // Pathoma Ch. 7 & 9 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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
    // Pathoma Ch. 14-15 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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
    // Pathoma Ch. 16-17 NOT recommended — use Ninja Nerd / Dirty Medicine for system-specific content
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

// ── First Aid section map ─────────────────────────────────────────────────
// Maps each category + sub-topic keyword → specific First Aid section name
// and a focus hint telling the student exactly what to look at on those pages.
// Sections reference chapter/section names (not page numbers — those change by edition).
// Matching: strip parenthetical suffix from sub-topic topic string, then case-insensitive includes.

const FIRST_AID_MAP = {
  "Cardiovascular System": {
    default: { section: "Cardiovascular — Overview & Physiology", focus: "Start with the cardiac cycle diagram and Frank-Starling curve before moving to pathology" },
    subTopics: {
      "Heart failure":           { section: "Cardiovascular — Heart Failure", focus: "Study the HFrEF vs HFpEF comparison table and the Frank-Starling curve; the treatment algorithm (ACE-I/ARB, beta-blocker, diuretic, digoxin) is highly tested" },
      "Ischemic heart disease":  { section: "Cardiovascular — Ischemic Heart Disease / MI", focus: "Memorize the MI timeline table (0–6h through >2mo cell changes) and the ECG change by coronary territory; cardiac enzyme timing (troponin peaks, CK-MB window) is a guaranteed question" },
      "Valvular":                { section: "Cardiovascular — Valvular Heart Disease", focus: "The murmur summary table is the single most tested page — know timing, location, radiation, and what Valsalva/squatting/standing does to each murmur" },
      "Cardiac pharmacology":    { section: "Cardiovascular — Antiarrhythmics (+ cross-ref Pharmacology chapter)", focus: "Vaughan-Williams table (Class I–IV): memorize mechanism, prototype drug, and key side effect for each class; note which classes prolong QT" },
      "Arrhythmias":             { section: "Cardiovascular — Arrhythmias & ECG", focus: "The ECG abnormalities table; SVT vs VT distinction; WPW delta wave; torsades de pointes causes and treatment" },
      "Congenital":              { section: "Cardiovascular — Congenital Heart Defects", focus: "Left-to-right vs right-to-left shunt table; which lesions cause cyanosis; PDA treatment (indomethacin vs PGE1 to keep it open)" },
      "Hypertension":            { section: "Cardiovascular — Hypertension", focus: "Secondary causes table (renal artery stenosis, Conn's, pheochromocytoma); hypertensive emergency first-line drugs" },
      "Shock":                   { section: "Cardiovascular — Shock", focus: "The 4-column shock table (CO, SVR, PCWP, mixed SvO2) — know how each type differs; septic shock is low SVR not high" },
      "Atherosclerosis":         { section: "Cardiovascular — Atherosclerosis & Arteriosclerosis", focus: "Foam cell formation pathway; risk factor weighting; fatty streak → fibrous plaque progression" },
      "Cardiac cycle":           { section: "Cardiovascular — Cardiac Physiology", focus: "Pressure-volume loop diagram: know where valves open/close; preload vs afterload effects on the loop shape" },
      "Aortic dissection":       { section: "Cardiovascular — Aortic Pathology", focus: "Stanford A vs B classification (A involves ascending — surgical; B = medical); Marfan and hypertension as risk factors" },
      "Pericardial":             { section: "Cardiovascular — Pericardial Disease", focus: "Beck's triad for tamponade; pulsus paradoxus; constrictive pericarditis vs cardiac tamponade comparison (Kussmaul's sign vs absent x-descent)" },
    },
  },

  "Respiratory and Renal/Urinary Systems": {
    default: { section: "Respiratory & Renal — Overview", focus: "Review the V/Q mismatch table and the nephron transport diagram as anchors for both systems" },
    subTopics: {
      "Acid-base":               { section: "Renal — Acid-Base Disorders", focus: "The ABG compensation formulas table is the highest-yield page; also master anion gap vs non-anion gap acidosis causes and the Winter's formula for metabolic acidosis" },
      "Obstructive lung":        { section: "Respiratory — Obstructive Lung Diseases", focus: "COPD vs asthma comparison table; obstructive PFT pattern (↓FEV1/FVC, ↑TLC, ↑RV); emphysema (centriacinar vs panacinar) vs chronic bronchitis distinction" },
      "Glomerulonephritis":      { section: "Renal — Glomerular Diseases", focus: "The nephrotic vs nephritic syndrome comparison; the glomerulonephritis table (IgA nephropathy, post-strep GN, RPGN, MPGN, membranous, minimal change) — EM findings are tested" },
      "Diuretics":               { section: "Pharmacology — Diuretics", focus: "The nephron segment diagram showing site of action for each class; electrolyte effects table; clinical uses (thiazides for nephrogenic DI is a classic reversal question)" },
      "Electrolyte":             { section: "Renal — Fluid & Electrolyte Disorders", focus: "Hyponatremia algorithm (iso/hypo/hyperosmolar → measure urine Na); hyperkalemia ECG changes (peaked T → wide QRS → sine wave); calcium disorders and PTH feedback" },
      "Pulmonary embolism":      { section: "Respiratory — Pulmonary Embolism & DVT", focus: "Wells criteria; saddle embolus anatomy; treatment algorithm (anticoagulation first, then IVC filter vs thrombolytics for massive PE)" },
      "Acute kidney injury":     { section: "Renal — Acute Kidney Injury", focus: "Pre-renal vs intrinsic vs post-renal table: BUN/Cr ratio, FeNa, urine osmolality, and urine casts by category — this table appears on every NBME" },
      "Lung cancer":             { section: "Respiratory — Lung Cancer", focus: "The 4-type comparison table (SCC, adenocarcinoma, SCLC, large cell): location, histology, and paraneoplastic syndrome column — paraneoplastic syndromes are extremely high yield" },
      "Restrictive lung":        { section: "Respiratory — Restrictive Lung Diseases", focus: "Intrinsic vs extrinsic causes; PFT pattern (↓FEV1 and ↓FVC but normal FEV1/FVC ratio); fibrosis vs weakness distinction" },
      "Renal tubular":           { section: "Renal — Renal Tubular Disorders", focus: "RTA type I, II, IV comparison table: urine pH, serum K+, and anion gap for each; Fanconi syndrome associations" },
    },
  },

  "Behavioral Health & Nervous Systems/Special Senses": {
    default: { section: "Neuroscience — Overview & Neuroanatomy", focus: "Master the vascular territory table and neurotransmitter pathways before jumping to specific pathologies" },
    subTopics: {
      "Stroke":                  { section: "Neurology — Cerebrovascular Disease", focus: "Vascular territory table (ACA, MCA, PCA, posterior circulation deficits) — know which specific deficits localize to each vessel; lacunar infarct locations (internal capsule, thalamus, pons)" },
      "Ethics":                  { section: "Behavioral Science — Medical Ethics", focus: "The 4 principles table (autonomy, beneficence, non-maleficence, justice); informed consent vs capacity vs competence distinction; when to override patient wishes" },
      "Neurotransmitters":       { section: "Neuroscience — Neurotransmitters & Receptors", focus: "Receptor type table (ionotropic vs metabotropic); pathology associations (↓DA in Parkinson's, ↓ACh in Alzheimer's, ↑DA in schizophrenia); drug mechanism MOA column" },
      "Mood disorders":          { section: "Psychiatry — Mood Disorders", focus: "MDD vs bipolar I vs II vs dysthymia diagnostic criteria; antidepressant mechanism table — SSRI vs TCA vs MAOI side effects; serotonin syndrome vs NMS comparison" },
      "Seizure":                 { section: "Neurology — Seizures & Epilepsy", focus: "Seizure classification table (focal vs generalized); antiepileptic drug MOA and key side effects (valproate teratogenicity, phenytoin gingival hyperplasia, carbamazepine SIADH)" },
      "Neurodegenerative":       { section: "Neurology — Neurodegenerative Diseases", focus: "Alzheimer's vs Parkinson's vs Huntington's vs ALS comparison table; histological findings (amyloid plaques, Lewy bodies, caudate atrophy); drug treatments and MOA" },
      "Cranial nerves":          { section: "Neuroscience — Cranial Nerves", focus: "The 12 CN table: function (motor/sensory/both), foramen, and classic lesion findings; CN III vs Horner syndrome for ptosis; CN VII upper vs lower motor neuron lesion" },
      "Biostatistics":           { section: "Behavioral Sciences — Biostatistics", focus: "The 2×2 table — practice calculating all 8 values from scratch; sensitivity vs specificity trade-off; PPV/NPV dependence on prevalence is almost always tested clinically" },
      "Sleep":                   { section: "Behavioral Sciences — Sleep Disorders", focus: "Sleep stage EEG patterns (alpha, theta, delta, sawtooth); REM vs NREM disorders; narcolepsy (cataplexy, sleep paralysis) and treatment" },
    },
  },

  "Blood & Lymphoreticular/Immune Systems": {
    default: { section: "Hematology & Immunology — Overview", focus: "The CBC interpretation algorithm and the basic lymphocyte development diagram are the anchors for this entire chapter" },
    subTopics: {
      "Anemias":                 { section: "Hematology — Anemias", focus: "The anemia algorithm (MCV → peripheral smear morphology → specific lab findings); memorize the distinguishing labs for iron deficiency vs thalassemia vs ACD vs B12/folate deficiency" },
      "Leukemias":               { section: "Hematology — Leukemias & Lymphomas", focus: "ALL vs AML vs CLL vs CML comparison table; cytogenetic associations (Philadelphia chromosome/BCR-ABL for CML, t(15;17) for AML-M3, t(8;14) for Burkitt) are guaranteed questions" },
      "Hypersensitivity":        { section: "Immunology — Hypersensitivity Reactions", focus: "Types I–IV table (mechanism, cells involved, timing, clinical examples, treatment); Type III immune complex disease examples (SLE, serum sickness, post-strep GN)" },
      "Coagulation":             { section: "Hematology — Coagulation Disorders", focus: "Coagulation cascade: intrinsic (PTT) vs extrinsic (PT) pathway; DIC vs TTP vs HUS vs ITP vs hemophilia comparison table; heparin vs warfarin MOA and monitoring" },
      "Immunodeficiency":        { section: "Immunology — Primary Immunodeficiencies", focus: "The immunodeficiency summary table — T-cell, B-cell, combined, phagocyte, complement deficiencies: key clinical features (recurrent infections types) and lab findings per disorder" },
      "Lymphomas":               { section: "Hematology — Lymphomas", focus: "Hodgkin vs non-Hodgkin comparison; Reed-Sternberg cells; NHL subtypes and cytogenetics; B symptoms (fever, night sweats, weight loss)" },
      "Platelet disorders":      { section: "Hematology — Platelet Disorders & Bleeding", focus: "Platelet plug formation; ITP vs TTP vs DIC comparison; von Willebrand disease types; bleeding time vs PT vs PTT in each disorder" },
    },
  },

  "Multisystem Processes & Disorders": {
    default: { section: "General Pathology — Cell Injury, Inflammation & Neoplasia", focus: "These are the foundational pathology chapters — master the mechanisms before tackling organ-system pathology" },
    subTopics: {
      "Neoplasia":               { section: "General Pathology — Neoplasia", focus: "Benign vs malignant features; tumor grading (differentiation) vs staging (spread); tumor marker table (AFP, CEA, PSA, CA-125, CA 19-9, β-HCG) — test yourself on which cancer each marker tracks" },
      "Inflammation":            { section: "General Pathology — Inflammation", focus: "Acute vs chronic: cell types (neutrophils early → macrophages/lymphocytes chronic); mediator table (histamine, prostaglandins, leukotrienes, complement, cytokines); granuloma types (caseating vs non-caseating with disease associations)" },
      "Hemodynamics":            { section: "General Pathology — Hemodynamics", focus: "Virchow's triad; edema mechanisms (hydrostatic vs oncotic vs lymphatic); shock classification table; infarction morphology by organ (white vs red infarcts)" },
      "Cell injury":             { section: "General Pathology — Cell Injury & Death", focus: "Reversible vs irreversible injury markers (Na/K pump failure → cell swelling; membrane rupture → irreversible); necrosis type table (coagulative, liquefactive, caseous, gangrenous, fat, fibrinoid) with clinical examples" },
      "Wound healing":           { section: "General Pathology — Wound Healing & Repair", focus: "Primary vs secondary intention; granulation tissue components; keloid vs hypertrophic scar; factors impairing healing (vitamin C deficiency → scurvy, zinc deficiency, corticosteroids)" },
    },
  },

  "Musculoskeletal, Skin & Subcutaneous Tissue": {
    default: { section: "MSK & Dermatology — Overview", focus: "The arthritis comparison table and the skin cancer tables are the highest-yield starting points in this chapter" },
    subTopics: {
      "Autoimmune joint":        { section: "Musculoskeletal — Arthritis & Rheumatologic Disorders", focus: "Rheumatoid vs OA vs gout vs pseudogout comparison; SLE diagnostic criteria (mnemonic) and ANA patterns; Sjögren's vs scleroderma (CREST) distinction" },
      "Skin pathology":          { section: "Dermatology — Skin Cancers & Inflammatory Disorders", focus: "Melanoma ABCDE criteria; BCC vs SCC vs melanoma comparison; blistering disease table (pemphigus vulgaris vs bullous pemphigoid — location of blister within epidermis vs at DEJ)" },
      "Bone disorders":          { section: "Musculoskeletal — Metabolic Bone Disease", focus: "Osteoporosis vs osteomalacia vs Paget's disease lab comparison (Ca, PO4, ALP, PTH) — this table appears every year; Paget's ↑ALP with normal Ca/PO4 is a classic presentation" },
      "Muscle diseases":         { section: "Neurology — Muscle & NMJ Disorders", focus: "Myasthenia gravis (anti-AChR, Lambert-Eaton anti-VGCC) comparison; Duchenne (frameshift) vs Becker (in-frame) dystrophin mutations; dermatomyositis vs polymyositis clinical distinction" },
    },
  },

  "Gastrointestinal System": {
    default: { section: "GI — Overview & GI Physiology", focus: "Review GI hormone table (gastrin, secretin, CCK, GIP, motilin) and the hepatitis serology table as anchors" },
    subTopics: {
      "Liver pathology":         { section: "GI — Hepatic Pathology & Hepatitis", focus: "The hepatitis serology table (HBsAg, HBsAb, HBeAg, IgM anti-HBc combinations for acute/chronic/carrier) is the most-tested table in GI; Wilson's vs hemochromatosis labs also very high yield" },
      "Inflammatory bowel":      { section: "GI — Inflammatory Bowel Disease", focus: "Crohn's vs UC comparison table: location (mouth-to-anus vs colon only), gross findings (cobblestoning vs pseudopolyps), complications (fistulas/strictures vs toxic megacolon), extraintestinal manifestations" },
      "GI cancers":              { section: "GI — GI Neoplasms", focus: "Colorectal cancer APC/KRAS/p53/DCC progression sequence; familial polyposis syndromes table (FAP, Gardner, Peutz-Jeghers, hereditary nonpolyposis); CEA as a monitoring marker (not screening)" },
      "Pancreatic":              { section: "GI — Pancreatic Pathology", focus: "Acute pancreatitis causes (ETOH + gallstones = 80%) and Ranson criteria; chronic pancreatitis triad (epigastric pain, steatorrhea, calcifications); pancreatic adenocarcinoma head-of-pancreas presentation" },
      "Bilirubin":               { section: "GI — Bilirubin Metabolism & Jaundice", focus: "The bilirubin metabolism pathway (unconjugated → conjugated → excreted); pre-hepatic vs hepatic vs post-hepatic jaundice: lab pattern for each (direct vs indirect bili, urine urobilinogen, stool color)" },
      "Peptic ulcer":            { section: "GI — Peptic Ulcer Disease", focus: "H. pylori association; gastric vs duodenal ulcer comparison (worse with vs relieved by eating); treatment (triple therapy); Zollinger-Ellison gastrinoma presentation" },
      "GI pharmacology":         { section: "Pharmacology — GI Drugs", focus: "PPI vs H2 blocker mechanism; misoprostol uses (ulcer protection, abortion, cervical ripening); ondansetron vs metoclopramide MOA; laxative classification" },
      "Esophageal":              { section: "GI — Esophageal Disorders", focus: "Achalasia (absent peristalsis, bird-beak on barium) vs diffuse esophageal spasm vs GERD; Barrett's esophagus → adenocarcinoma progression; Boerhaave vs Mallory-Weiss distinction" },
    },
  },

  "Reproductive & Endocrine Systems": {
    default: { section: "Endocrinology & Reproductive — Overview", focus: "The hormone feedback loop diagrams and the MEN syndrome table are the highest-yield anchors in this chapter" },
    subTopics: {
      "Diabetes mellitus":       { section: "Endocrinology — Diabetes Mellitus", focus: "Type 1 vs Type 2 comparison (autoimmune vs insulin resistance, C-peptide present/absent); DKA vs HHS table (anion gap, serum osmolality, pH); oral hypoglycemic drug mechanisms and side effects (especially metformin lactic acidosis contraindication)" },
      "Thyroid":                 { section: "Endocrinology — Thyroid Disorders", focus: "Hypothyroidism vs hyperthyroidism cause and lab table (TSH, free T4); Graves' disease clinical features (exophthalmos, pretibial myxedema); thyroid cancer types (papillary RET/BRAF, medullary calcitonin, follicular hematogenous spread)" },
      "Adrenal":                 { section: "Endocrinology — Adrenal Disorders", focus: "Cushing's disease vs syndrome vs ectopic ACTH: ACTH level distinguishes them; Addison's vs secondary AI: electrolytes and skin pigmentation; steroid synthesis pathway (21-hydroxylase deficiency → virilization + salt wasting)" },
      "Female reproductive":     { section: "Reproductive — Female Reproductive Pathology", focus: "PCOS diagnostic criteria (Rotterdam: 2 of 3); ovarian cancer types and markers (epithelial vs germ cell vs sex cord); endometriosis vs adenomyosis vs leiomyoma clinical distinction" },
      "Pituitary":               { section: "Endocrinology — Pituitary & Hypothalamic Disorders", focus: "Anterior vs posterior pituitary hormones table; prolactinoma (↑prolactin, ↓GnRH → amenorrhea/galactorrhea) vs acromegaly (↑IGF-1) presentations; SIADH vs central DI vs nephrogenic DI comparison" },
      "Parathyroid":             { section: "Endocrinology — Calcium & Phosphate Regulation", focus: "Primary vs secondary vs tertiary hyperparathyroidism: lab pattern (Ca, PO4, PTH, 1,25-D3); hypocalcemia causes (vitamin D deficiency, hypoparathyroidism, chronic kidney disease); MEN1 vs MEN2A vs MEN2B components" },
    },
  },

  "Pathology": {
    default: { section: "General Pathology — Cell Injury, Inflammation & Neoplasia", focus: "The cell injury and necrosis types chapter is the highest-yield page in general pathology — know each necrosis type with its clinical example" },
    subTopics: {
      "Inflammation":            { section: "General Pathology — Acute & Chronic Inflammation", focus: "Acute vs chronic inflammatory cell comparison; granuloma diseases table (TB, sarcoid, Crohn's, berylliosis, cat-scratch, fungal — which are caseating vs non-caseating)" },
      "Neoplasia":               { section: "General Pathology — Neoplasia", focus: "Oncogenes (gain-of-function: Ras, c-Myc, HER2/neu) vs tumor suppressors (loss-of-function: p53, Rb, BRCA1/2, APC, VHL); tumor marker table is a guaranteed test question" },
      "Cell injury":             { section: "General Pathology — Cell Injury & Death", focus: "Reversible vs irreversible markers; apoptosis vs necrosis distinction; necrosis type table — coagulative (ischemia), liquefactive (brain/abscess), caseous (TB/fungal), gangrenous, fat, fibrinoid" },
      "Hemodynamics":            { section: "General Pathology — Hemodynamics & Thrombosis", focus: "Virchow's triad (hypercoagulability, stasis, endothelial injury); arterial vs venous thrombosis distinction; red vs white infarcts by organ; fat embolism vs air embolism vs amniotic fluid embolism presentation" },
      "Lab findings":            { section: "Appendix — Laboratory Values & Formulas", focus: "Normal value ranges; CBC interpretation (neutrophilia vs eosinophilia vs lymphocytosis pattern); LFT interpretation (hepatocellular vs cholestatic vs mixed)" },
    },
  },

  "Physiology": {
    default: { section: "Physiology — Multi-system Review", focus: "Cross-reference the cardiovascular, renal, and pulmonary physiology chapters — these systems interact heavily on USMLE questions" },
    subTopics: {
      "Cardiac cycle":           { section: "Cardiovascular — Cardiac Physiology & Hemodynamics", focus: "Pressure-volume loop: effects of preload/afterload changes on loop shape; Starling forces at the capillary (oncotic vs hydrostatic); cardiac output determinants (HR × SV; Frank-Starling law)" },
      "Renal physiology":        { section: "Renal — Renal Physiology & Tubular Transport", focus: "Nephron segment transport table (PCT reabsorbs 67% Na/water; Loop concentrates; DCT fine-tunes); GFR calculation (Cockcroft-Gault); free water clearance calculation for polyuria workup" },
      "Pulmonary physiology":    { section: "Respiratory — Pulmonary Physiology", focus: "V/Q mismatch table (V/Q = 0 shunt, V/Q = ∞ dead space, normal = 0.8); A-a gradient calculation; oxygen-hemoglobin dissociation curve right-shift causes (HIGH: Heat, Increased H+, CO2, 2,3-BPG)" },
      "Endocrine feedback":      { section: "Endocrinology — Hypothalamic-Pituitary Axes", focus: "Pituitary axis diagrams: HPT, HPA, HPG axes; primary vs secondary endocrine failure lab distinction (↑TSH = primary hypothyroid; ↓TSH = secondary/central); ACTH stimulation test logic" },
      "Autonomic nervous system":{ section: "Neuroscience/Pharmacology — Autonomic Pharmacology", focus: "Sympathetic vs parasympathetic receptor effects on each organ; adrenergic receptor subtype table (α1 vasoconstriction, α2 feedback inhibition, β1 cardiac, β2 bronchodilation); fight-or-flight vs rest-and-digest mnemonic" },
    },
  },

  "Microbiology & Immunology": {
    default: { section: "Microbiology — Overview & Host Defenses", focus: "The encapsulated organism mnemonic and the innate vs adaptive immunity table are the starting anchors" },
    subTopics: {
      "Bacterial identification": { section: "Microbiology — Bacteriology (Gram Stain & Culture)", focus: "Gram-positive vs Gram-negative organism table; catalase-positive organisms; encapsulated bacteria (SHINE SKiS); culture/stain requirements (Thayer-Martin for GC, Bordet-Gengou for pertussis, etc.)" },
      "Antimicrobial":           { section: "Pharmacology — Antimicrobials", focus: "Cell wall synthesis inhibitors (penicillins, cephalosporins, vancomycin); 30S inhibitors (aminoglycosides, tetracyclines) vs 50S inhibitors (macrolides, chloramphenicol, clindamycin); adverse effects column is heavily tested" },
      "HIV":                     { section: "Microbiology — HIV/AIDS", focus: "HIV life cycle diagram (gp120 binds CD4, gp41 fusion); CD4 count threshold table for opportunistic infections (>500 normal, <200 PCP, <150 MAC, <100 toxo, <50 CMV retinitis) — this table is guaranteed" },
      "Hepatitis":               { section: "Microbiology — Hepatitis Viruses", focus: "The hepatitis serology table: HBsAg positive = active; HBsAb positive = immune; IgM anti-HBc = acute window; HBeAg = high infectivity; practice interpreting all 6 scenarios" },
      "Fungal infections":       { section: "Microbiology — Mycology", focus: "Dimorphic fungi table (geographic distribution: Histo = Ohio/Mississippi, Cocci = SW USA, Blasto = Great Lakes); mold at room temp, yeast at body temp; antifungal target (ergosterol)" },
      "Bacterial toxins":        { section: "Microbiology — Bacterial Virulence Factors", focus: "Exotoxin mechanisms table (cholera cAMP ↑, pertussis cAMP ↑, anthrax EF, TSST-1 superantigen, C. diff glucosylation); A-B toxin structure" },
      "STIs":                    { section: "Microbiology — Sexually Transmitted Infections", focus: "STI comparison table (syphilis painless ulcer/VDRL, chancroid painful ulcer/H. ducreyi, LGV/chlamydia, herpes recurrent/Tzanck, gonorrhea gram-negative diplococci); TORCH infections table" },
      "TB":                      { section: "Microbiology — Mycobacteria", focus: "TB vs atypical mycobacteria; Ghon complex and Ranke complex in primary vs secondary TB; Mantoux test interpretation; treatment regimen (RIPE — Rifampin, Isoniazid, Pyrazinamide, Ethambutol)" },
    },
  },

  "Gross Anatomy & Embryology": {
    default: { section: "Anatomy & Embryology — Overview", focus: "The peripheral nerve injury patterns and the embryological derivative tables are the highest-yield starting points" },
    subTopics: {
      "Cardiovascular embryology":  { section: "Embryology — Cardiovascular Development", focus: "Fetal circulation diagram (ductus arteriosus, foramen ovale, ductus venosus and what closes at birth and why); congenital heart defect embryological basis" },
      "Peripheral nerve":           { section: "Anatomy — Peripheral Nerve Injuries", focus: "Brachial plexus injury table (Erb's palsy C5-C6 vs Klumpke's C8-T1); specific nerve lesions (radial = wrist drop, median = ape hand, ulnar = claw hand, peroneal = foot drop); test for each nerve" },
      "Abdominal anatomy":          { section: "Anatomy — Abdomen & Retroperitoneum", focus: "Retroperitoneal structures mnemonic (SAD PUCKER: Suprarenal, Aorta, Duodenum, Pancreas, Ureters, Colon, Kidneys, Esophagus, Rectum); inguinal vs femoral hernia distinction (above vs below inguinal ligament)" },
      "Thorax anatomy":             { section: "Anatomy — Thorax & Mediastinum", focus: "Superior vs middle vs inferior mediastinal contents; lung lobe anatomy (RML vs lingula); pleural effusion radiograph interpretation; thoracic outlet syndrome structures" },
      "Neural tube defects":        { section: "Embryology — CNS Development", focus: "Neural tube defect table (spina bifida occulta → meningocele → myelomeningocele); AFP + ACHE in amniotic fluid for open defects; posterior fossa malformations (Chiari, Dandy-Walker)" },
      "Head & neck anatomy":        { section: "Anatomy — Head & Neck", focus: "Cranial nerve foramina table; parotid gland CN VII path; carotid triangle structures; pharyngeal arch derivatives (arch 1 = Meckel/muscles of mastication; arch 2 = stapes/facial expression)" },
    },
  },

  "Pharmacology": {
    default: { section: "Pharmacology — Pharmacokinetics & General Principles", focus: "Pharmacokinetics formulas (Vd = dose/plasma concentration; Cl = Vd × ke) and drug interaction mechanisms (CYP450 inducers/inhibitors) are always tested" },
    subTopics: {
      "Autonomic drugs":         { section: "Pharmacology — Autonomic Drugs", focus: "Adrenergic receptor effect table (α1, α2, β1, β2 — organ effects and prototypical agonist/antagonist); direct vs indirect sympathomimetics distinction; muscarinic vs nicotinic cholinergic effects" },
      "Cardiac drugs":           { section: "Pharmacology — Cardiovascular Drugs", focus: "Antiarrhythmic Vaughan-Williams table (Class Ia/Ib/Ic, II, III, IV — prototype, MOA, side effects); ACE-I vs ARB side effects (cough and angioedema for ACE-I — bradykinin based)" },
      "Antimicrobials":          { section: "Pharmacology — Antimicrobials", focus: "Cell wall synthesis table (β-lactams, glycopeptides); protein synthesis table (30S vs 50S inhibitors); adverse effects column is the most-tested aspect — aminoglycoside nephro/ototoxicity, tetracycline teeth/photosensitivity, chloramphenicol aplastic anemia" },
      "Drug metabolism":         { section: "Pharmacology — Pharmacokinetics", focus: "CYP450 inducers (CRAP GPS: Carbamazepine, Rifampin, Alcohol chronic, Phenytoin, Griseofulvin, Phenobarbital, St. John's Wort) vs inhibitors (OAKS: Omeprazole, Amiodarone, Ketoconazole, Sulfonamides); half-life and steady-state concept" },
      "CNS drugs":               { section: "Pharmacology — Psychiatry Drugs", focus: "Antidepressant comparison table (SSRI/SNRI, TCA, MAOI, atypicals); antipsychotic side effect profiles (typical = EPS + hyperprolactinemia; atypical = metabolic syndrome); lithium monitoring and toxicity signs" },
      "Anti-inflammatory":       { section: "Pharmacology — Anti-inflammatory & Immunosuppressive Drugs", focus: "NSAID MOA (COX-1 vs COX-2 selectivity and GI/renal/CV implications); corticosteroid synthesis pathway and side effects; biologic DMARD targets (anti-TNF, anti-IL-6, anti-CD20)" },
      "Anticoagulants":          { section: "Pharmacology — Anticoagulants & Antiplatelets", focus: "Heparin (activates antithrombin III, monitors PTT) vs warfarin (inhibits vitamin K epoxide reductase, monitors PT/INR) comparison; direct thrombin inhibitors (dabigatran) vs anti-Xa agents (rivaroxaban); reversal agents table" },
      "Antiepileptic":           { section: "Pharmacology — Antiepileptic Drugs", focus: "Drug and mechanism table; phenytoin side effects (gingival hyperplasia, teratogen); valproate teratogenicity (neural tube defects); carbamazepine (↑CYP450, SIADH, agranulocytosis); ethosuximide for absence only" },
    },
  },

  "Behavioral Sciences": {
    default: { section: "Behavioral Sciences — Biostatistics & Epidemiology", focus: "The 2×2 table and study design hierarchy are the anchors — every biostat question follows from these two concepts" },
    subTopics: {
      "Biostatistics":           { section: "Behavioral Sciences — Biostatistics", focus: "The 2×2 table: practice calculating sensitivity, specificity, PPV, NPV, LR+, LR- from scratch; understand why PPV/NPV change with prevalence while sensitivity/specificity do not" },
      "Study design":            { section: "Behavioral Sciences — Study Design", focus: "Study design hierarchy (RCT > cohort > case-control > cross-sectional > case report); bias types table (selection, information, confounding); intention-to-treat vs per-protocol analysis" },
      "Ethics":                  { section: "Behavioral Sciences — Medical Ethics & Law", focus: "Informed consent components; capacity vs competence (doctors assess capacity, courts determine competence); when to override (immediate life threat vs chronic risk); confidentiality exceptions (imminent harm to others, mandatory reporting)" },
      "Epidemiology":            { section: "Behavioral Sciences — Epidemiology", focus: "Incidence vs prevalence relationship (prevalence = incidence × duration); relative risk (RR) formula for cohort studies; odds ratio (OR) for case-control studies; absolute risk reduction (ARR) and NNT = 1/ARR" },
      "Bias":                    { section: "Behavioral Sciences — Bias & Study Design Flaws", focus: "Selection bias types (Berkson's, Neyman/prevalence-incidence); recall bias (case-control studies); lead time bias (screening); observer bias; ways to reduce each bias type" },
    },
  },

  "Biochemistry & Nutrition": {
    default: { section: "Biochemistry — Metabolism Overview", focus: "The metabolic pathway flowchart (glycolysis → TCA → ETC) and the enzyme deficiency diseases tables are the two highest-yield sections in biochemistry" },
    subTopics: {
      "Metabolic pathways":      { section: "Biochemistry — Carbohydrate Metabolism", focus: "Glycolysis enzyme table (rate-limiting steps: PFK-1, pyruvate kinase, hexokinase); TCA cycle intermediates and their significance (succinyl-CoA for heme synthesis); ETC complex table with inhibitors (cyanide, rotenone, CO)" },
      "Lysosomal storage":       { section: "Biochemistry — Lysosomal Storage Diseases", focus: "This table appears near-verbatim on Step 1 — memorize enzyme deficiency, accumulated substrate, and key clinical feature (Gaucher = glucocerebrosidase + bone crises; Tay-Sachs = Hex A + cherry-red spot; Fabry = α-galactosidase + X-linked + pain crises)" },
      "Vitamins":                { section: "Biochemistry — Vitamins & Nutrition", focus: "Fat-soluble (ADEK) vs water-soluble deficiency table; toxicity findings for fat-soluble vitamins (A teratogenicity, D hypercalcemia); B1 (thiamine) deficiency presentations (Wernicke's, wet beriberi, dry beriberi) are heavily tested" },
      "Amino acid":              { section: "Biochemistry — Amino Acid Metabolism Disorders", focus: "Phenylketonuria (phenylalanine hydroxylase deficiency → intellectual disability + musty odor); homocystinuria (cystathionine synthase → marfanoid + thrombosis + intellectual disability); maple syrup urine disease (BCAA → sweet urine + neurological)" },
      "Lipid metabolism":        { section: "Biochemistry — Lipid Metabolism & Transport", focus: "Lipoprotein classes table (chylomicrons, VLDL, IDL, LDL, HDL — origin, composition, function); familial hypercholesterolemia (absent LDL receptor → premature MI + tendon xanthomas); statin MOA (HMG-CoA reductase inhibition)" },
      "Glycogen storage":        { section: "Biochemistry — Glycogen Storage Diseases", focus: "The glycogen storage disease table — enzyme, organ involved, key clinical feature: von Gierke (glucose-6-phosphatase, liver, fasting hypoglycemia + lactic acidosis), Pompe (acid maltase, heart/muscle, cardiomegaly), McArdle (myophosphorylase, muscle, exercise intolerance + myoglobinuria)" },
    },
  },

  "Histology & Cell Biology": {
    default: { section: "Cell Biology — Organelles, Cell Cycle & Connective Tissue", focus: "The organelle pathology table and the collagen types table are the highest-yield starting points in cell biology" },
    subTopics: {
      "Connective tissue":       { section: "Biochemistry/MSK — Connective Tissue & Collagen Disorders", focus: "Collagen types table (Type I bone/tendon/skin, II cartilage, III vessels/uterus/fetal skin, IV basement membrane, VII anchoring fibrils at DEJ); Marfan (FBN1, fibrillin) vs Ehlers-Danlos (collagen synthesis) vs osteogenesis imperfecta (Type I collagen)" },
      "Cell cycle":              { section: "Cell Biology — Cell Cycle & Cancer Biology", focus: "G1/S/G2/M phase checkpoints; CDK-cyclin pairs by phase; p53 → G1 arrest or apoptosis; Rb → E2F release; oncogenes (constitutively active RAS, amplified c-Myc, HER2) vs tumor suppressors (loss-of-function p53, Rb, BRCA, APC)" },
      "Organelle functions":     { section: "Cell Biology — Organelles & Associated Pathologies", focus: "Organelle disease association table (Kartagener's dynein in cilia; I-cell disease — mannose-6-phosphate targeting failure → lysosomal enzyme secretion; Zellweger — peroxisome assembly disorder); rough ER for secreted proteins" },
      "Signal transduction":     { section: "Cell Biology — Cell Signaling Pathways", focus: "Receptor type table: GPCR (cAMP via Gs/Gi, IP3/DAG via Gq), RTK (JAK-STAT, RAS-MAPK), nuclear receptors (steroid/thyroid hormones); second messenger diseases (cholera Gs, pertussis Gi, McCune-Albright Gs)" },
    },
  },

  "Genetics": {
    default: { section: "Genetics — Inheritance Patterns & Chromosomal Disorders", focus: "The inheritance pattern table and the chromosomal disorder comparison are the two highest-yield sections in genetics" },
    subTopics: {
      "Autosomal dominant":      { section: "Genetics — Autosomal Dominant Disorders", focus: "AD mechanism table (gain-of-function vs dominant negative); key disorders: Marfan (FBN1), ADPKD (PKD1/2), Huntington (CAG repeat, anticipation), NF1 (Ras GTPase), NF2 (merlin), FAP (APC), Li-Fraumeni (p53), BRCA1/2" },
      "Autosomal recessive":     { section: "Genetics — Autosomal Recessive Disorders", focus: "AR enzyme deficiency table; cystic fibrosis (CFTR ΔF508 most common); sickle cell (HbS point mutation — glutamate → valine at position 6); thalassemia (α vs β gene deletion); lysosomal storage diseases (all AR except Fabry X-linked)" },
      "Chromosomal disorders":   { section: "Genetics — Chromosomal Abnormalities", focus: "Trisomy comparison table (21 = Down; 18 = Edwards — PRINCE Edwards; 13 = Patau — holoprosencephaly); Turner (45,XO — short, webbed neck, aortic coarctation, streak ovaries); Klinefelter (47,XXY — testicular atrophy, gynecomastia, tall)" },
      "X-linked":                { section: "Genetics — X-linked Disorders", focus: "X-linked recessive carrier mother table (50% sons affected); Duchenne (frameshift, complete absence dystrophin) vs Becker (in-frame, partially functional); hemophilia A (Factor VIII) vs B (Factor IX — Christmas disease); G6PD deficiency triggers" },
    },
  },
};

// ── First Aid section lookup ───────────────────────────────────────────────
// Matches the top sub-topic against FIRST_AID_MAP keywords.
// Falls back to category default if no sub-topic match.
export function getFirstAidRef(category, subTopics = []) {
  const map = FIRST_AID_MAP[category];
  if (!map) return { section: category, focus: 'Read the relevant section and annotate anything new from today\'s video.' };

  // Try to match top sub-topics against keyword map
  for (const sub of subTopics.slice(0, 3)) {
    const topicText = typeof sub === 'string' ? sub : (sub.topic || '');
    const cleanTopic = topicText.split('(')[0].trim().toLowerCase();

    for (const [keyword, ref] of Object.entries(map.subTopics || {})) {
      if (cleanTopic.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(cleanTopic)) {
        return ref;
      }
    }
  }

  return map.default;
}

// ── Validation gate ───────────────────────────────────────────────────────
// Safety net: blocks any Sketchy or Pathoma recommendation outside their valid domains.
// Sketchy: ONLY Pharmacology or Microbiology & Immunology.
// Pathoma: ONLY Ch. 1-3 topics — general pathology, inflammation, neoplasia, cell injury.
//   Allowed categories are those with a ch. 1-3 Pathoma entry: Pathology discipline,
//   Multisystem Processes (Ch. 1-3 explicitly), and Histology (Ch. 1 cell injury).
//   System-specific chapters (Ch. 4-17) are NOT recommended — use Ninja Nerd / Dirty Medicine.
const SKETCHY_ALLOWED_CATEGORIES = new Set(['Pharmacology', 'Microbiology & Immunology']);
const PATHOMA_ALLOWED_CATEGORIES = new Set([
  'Pathology',                          // Ch. 1-3 general pathology principles
  'Multisystem Processes & Disorders',  // Ch. 1-3 cell injury, inflammation, neoplasia
  'Histology & Cell Biology',           // Ch. 1 cell injury & pathology
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

  // Derive top sub-topic names for specificity in instructions
  const topSubNames = (subTopics || [])
    .slice(0, 3)
    .map(s => (typeof s === 'string' ? s : (s.topic || '')).split('(')[0].trim())
    .filter(Boolean);

  // Helper: shorten FA focus text to first clause only (before first semicolon), max 90 chars
  function shortFocus(raw) {
    const first = raw.split(';')[0].replace(/\(.*?\)/g, '').trim();
    return first.length > 90 ? first.substring(0, 87) + '…' : first;
  }

  // Build the primary video recommendation (Pathoma Ch.1-3 / Sketchy override first)
  let primaryVideoStep;
  if (hasPathoma) {
    // Pathoma ONLY for Ch. 1-3 topics (cell injury, inflammation, neoplasia)
    const pathomaLabel = bucket.pathoma.label.replace('Pathoma — ', '');
    primaryVideoStep = {
      type: 'video', emoji: '🔬',
      label: bucket.pathoma.label,
      action: 'WATCH', resource: 'Pathoma', topic: pathomaLabel,
      timeLabel: gapType === 'knowledge' ? '~25 min' : '~15 min',
      focus: topSubNames.length > 0 ? topSubNames.slice(0, 2).join(', ') : 'Cell injury, inflammation, neoplasia principles',
      skip: null,
      instruction: topSubNames.length > 0
        ? `Focus on: ${topSubNames.slice(0, 2).join(', ')}. Hussain is dense — pause and annotate as you go.`
        : 'Cover the core concepts. Hussain is dense — pause and annotate as you go.',
      links: [],
    };
  } else if (hasSketchy) {
    // Sketchy ONLY for Pharmacology and Microbiology & Immunology (paid platform, no YouTube link)
    const isPharm = category === 'Pharmacology';
    const sketchyType = isPharm ? 'Pharm' : 'Micro';
    const topSubTopic = subTopics?.[0]?.topic?.split('(')[0]?.trim() || '';
    primaryVideoStep = {
      type: 'video', emoji: '🎨',
      label: topSubTopic ? `Sketchy ${sketchyType}: ${topSubTopic}` : bucket.sketchy.label,
      action: 'WATCH', resource: `Sketchy ${sketchyType}`, topic: topSubTopic || category,
      timeLabel: gapType === 'knowledge' ? '~25 min' : '~15 min',
      focus: topSubNames.length > 0 ? topSubNames.slice(0, 2).join(', ') : 'Key scenes and mnemonics',
      skip: null,
      instruction: `Open Sketchy ${sketchyType}${topSubNames.length > 0 ? ` — scenes for: ${topSubNames.slice(0, 2).join(', ')}` : ''}. Build the memory palace as you watch. After finishing, close and draw the scene from memory to test encoding.`,
      links: [],
    };
  } else {
    // YouTube video list: sub-topic matches first, then fallback to main videos
    const subTopicMatches = matchSubTopicVideos(category, subTopics);
    const videoList = subTopicMatches.length > 0
      ? [...subTopicMatches, ...bucket.mainVideos].slice(0, 4)
      : bucket.mainVideos.slice(0, 4);

    // Application gap → prefer Dirty Medicine (recall/mnemonics)
    // Knowledge gap → prefer B&B or Physeo if student has them, then Ninja Nerd
    let finalList;
    if (gapType === 'application') {
      const dm = videoList.find(v => v.channel === 'Dirty Medicine');
      finalList = dm
        ? [dm, ...videoList.filter(v => v !== dm)].slice(0, 3)
        : videoList.slice(0, 3);
    } else {
      const preferred = videoList.filter(v =>
        (hasBnb    && v.channel.toLowerCase().includes('boards')) ||
        (hasPhyseo && v.channel.toLowerCase().includes('physeo'))
      );
      finalList = preferred.length > 0
        ? [...preferred, ...videoList.filter(v => !preferred.includes(v))].slice(0, 3)
        : videoList.slice(0, 3);
    }

    const primaryChannel = finalList[0]?.channel || 'Ninja Nerd';
    primaryVideoStep = {
      type: 'video', emoji: '▶️',
      label: `Video: ${topSubNames[0] || category}`,
      action: 'WATCH', resource: primaryChannel, topic: topSubNames[0] || category,
      timeLabel: gapType === 'knowledge' ? '~20 min' : '~15 min',
      focus: topSubNames.length > 0 ? topSubNames.slice(0, 2).join(', ') : category,
      skip: gapType === 'knowledge'
        ? 'Detailed treatment protocols — learn those from questions'
        : 'Deep mechanism explanations — focus on recall patterns',
      instruction: topSubNames.length > 0
        ? `Focus on: ${topSubNames.slice(0, 2).join(', ')}. Jump to those sections — you don't need to watch the full video. Take notes, not screenshots.`
        : 'Jump to the most relevant section — you don\'t need to watch the full video. Take notes, not screenshots.',
      links: finalList.map(v => ({ channel: v.channel, url: ytLink(v.query), label: v.channel })),
    };
  }

  // First Aid read step — section-specific reference
  const faRef = getFirstAidRef(category, subTopics);
  const firstAidStep = hasFirstAid ? {
    type: 'read', emoji: '📕',
    label: `First Aid: ${faRef.section}`,
    action: 'READ', resource: 'First Aid', topic: faRef.section,
    timeLabel: gapType === 'knowledge' ? '~15–20 min' : '~10–15 min',
    focus: shortFocus(faRef.focus),
    skip: null,
    instruction: `${faRef.focus}${topSubNames.length > 0 ? ` Focus on: ${topSubNames.slice(0, 2).join(' and ')}.` : ''} Annotate anything from today's video not already in the book.`,
    links: [],
  } : null;

  // Practice step — always last, references Block 3
  const practiceStep = {
    type: 'practice', emoji: '🎯',
    label: `40 Qs — ${category}, timed`,
    action: 'PRACTICE', resource: 'UWorld', topic: `40 Qs — ${category}, timed`,
    timeLabel: '~2–2.5 hrs',
    focus: 'Review every question — annotate First Aid for wrong answers',
    skip: null,
    instruction: gapType === 'knowledge'
      ? 'Now apply what you learned — 40 timed Qs on this system. Read every explanation thoroughly.'
      : '40 timed Qs on this system. When you miss one, go back immediately — annotate First Aid with the clinical reasoning.',
    links: [],
  };

  // Annotate step (application gaps without First Aid)
  const annotateStep = {
    type: 'annotate', emoji: '✏️',
    label: 'Wrong answer review',
    action: 'REVIEW', resource: 'Notes', topic: 'Wrong answer review',
    timeLabel: '~10 min',
    focus: 'Every wrong answer → annotate your notes or unsuspend the AnKing card',
    skip: null,
    instruction: 'Go through every wrong answer. Find the concept and annotate it. If you use AnKing, search the deck browser by keyword and unsuspend the existing card — do NOT make your own cards.',
    links: [],
  };

  // Unified sequence: WATCH → READ → PRACTICE (practice always last)
  // Gap type affects video resource choice and time allocations, not step order.
  const sequence = [
    primaryVideoStep,
    firstAidStep || (gapType === 'application' ? annotateStep : null),
    practiceStep,
  ].filter(Boolean);

  return { gapType, sequence };
}
