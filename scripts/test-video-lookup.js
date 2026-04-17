#!/usr/bin/env node
// ── Video Lookup Integration Test ─────────────────────────────────────────
// Validates the videoLookup.js module logic using the raw JSON directly
// (bypasses ESM import restrictions by loading JSON via require).
// Run: node scripts/test-video-lookup.js

const videoLib = require('../src/data/video-library.json');

// ─── Replicate the core lookup logic (CommonJS version for testing) ────────

const CHANNEL_NAMES = {
  ninja_nerd:         'Ninja Nerd',
  dirty_medicine:     'Dirty Medicine',
  armando_hasudungan: 'Armando Hasudungan',
  randy_neil_md:      'Randy Neil MD',
  hyguru:             'HyGuru',
  pathoma:            'Pathoma',
  sketchy:            'Sketchy',
};

const CHANNEL_NAME_TO_KEY = Object.fromEntries(
  Object.entries(CHANNEL_NAMES).map(([k, v]) => [v.toLowerCase(), k])
);

function normalizeResource(resource) {
  if (resource.type === 'channel_reference') return null;
  const channelKey  = resource.channel;
  const channelName = CHANNEL_NAMES[channelKey] || channelKey;
  const directUrl   = resource.url && resource.url.includes('youtu') ? resource.url : null;
  const fallbackUrl = resource.channel_url || null;
  return {
    channel:     channelKey,
    channelName,
    title:       resource.title || channelName,
    url:         directUrl || fallbackUrl,
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
    } else if (val && typeof val === 'object') {
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
  // Plural stem: strip trailing 's'
  const qStem = q.replace(/s$/, '');
  if (qStem.length >= 4 && (s.includes(qStem) || qStem.includes(s))) return true;
  // First-word match for distinctive root words (>=6 chars)
  const qFirst = q.split(/\s+/)[0];
  const sFirst = s.split(/\s+/)[0];
  if (qFirst.length >= 6 && qFirst === sFirst) return true;
  return false;
}

function getAllEntries() {
  const entries = [];
  for (const sysData of Object.values(videoLib.videos_by_system || {})) {
    if (sysData.low_hanging_fruit) entries.push(...sysData.low_hanging_fruit);
    if (sysData.second_tier)       entries.push(...sysData.second_tier);
  }
  for (const discData of Object.values(videoLib.videos_by_discipline || {})) {
    entries.push(...collectEntries(discData));
  }
  // Filter out entries without a valid subtopic string
  return entries.filter(e => typeof e.subtopic === 'string' && e.subtopic.trim());
}

function getVideosForTopic(query, options = {}) {
  const { maxResults = 5, channelPreference = [] } = options;
  if (!query) return [];
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

function getVerifiedLink(channelDisplayName, subTopicQuery) {
  if (!channelDisplayName || !subTopicQuery) return { url: null, title: null, duration: null, verified: false };
  const channelKey = CHANNEL_NAME_TO_KEY[channelDisplayName.toLowerCase()];
  if (!channelKey) return { url: null, title: null, duration: null, verified: false };
  const candidates = getVideosForTopic(subTopicQuery, { maxResults: 10, channelPreference: [channelDisplayName] });
  const match = candidates.find(v => v.channel === channelKey);
  if (!match) return { url: null, title: null, duration: null, verified: false };
  return { url: match.url, title: match.title, duration: match.duration, verified: match.verified };
}

// ─── Tests ────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;

function test(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    pass++;
  } catch (e) {
    console.log(`  ❌ ${label}`);
    console.log(`     ${e.message}`);
    fail++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ── 1. Library loads correctly ─────────────────────────────────────────────
console.log('\n1. Library structure');
test('videoLib has required top-level keys', () => {
  const required = ['metadata', 'channels', 'videos_by_system', 'videos_by_discipline'];
  for (const k of required) assert(k in videoLib, `Missing key: ${k}`);
});

test('videos_by_system has expected system keys', () => {
  const expected = ['cardiovascular', 'respiratory', 'renal', 'gastrointestinal'];
  for (const k of expected) assert(k in videoLib.videos_by_system, `Missing system: ${k}`);
});

test('videos_by_discipline has expected discipline keys', () => {
  const expected = ['pathology', 'physiology', 'pharmacology'];
  for (const k of expected) assert(k in videoLib.videos_by_discipline, `Missing discipline: ${k}`);
});

// ── 2. Entry collection ────────────────────────────────────────────────────
console.log('\n2. Entry collection');
const allEntries = getAllEntries();

test('getAllEntries() returns 50+ entries', () => {
  assert(allEntries.length >= 50, `Only got ${allEntries.length} entries`);
  console.log(`     (got ${allEntries.length} total entries)`);
});

test('Every collected entry has a subtopic string (library filters out structural objects)', () => {
  const bad = allEntries.filter(e => typeof e.subtopic !== 'string' || !e.subtopic.trim());
  assert(bad.length === 0, `${bad.length} entries missing subtopic (library should filter these out)`);
});

test('Every entry has a resources array', () => {
  const bad = allEntries.filter(e => !Array.isArray(e.resources));
  assert(bad.length === 0, `${bad.length} entries missing resources array`);
});

// ── 3. Topic matching ──────────────────────────────────────────────────────
console.log('\n3. Topic matching');

test('"Heart failure" returns Ninja Nerd with direct URL', () => {
  const results = getVideosForTopic('Heart failure');
  assert(results.length > 0, 'No results returned');
  const nn = results.find(r => r.channel === 'ninja_nerd');
  assert(nn, 'No Ninja Nerd result');
  assert(nn.directUrl, `Ninja Nerd URL is not direct: ${nn.url}`);
  assert(nn.url && nn.url.includes('youtu'), `Bad URL: ${nn.url}`);
});

test('"Acid-base disorders" returns results', () => {
  const results = getVideosForTopic('Acid-base disorders');
  assert(results.length > 0, 'No results for acid-base');
});

test('"Arrhythmias" matches "Arrhythmias and ECG" subtopic', () => {
  const results = getVideosForTopic('Arrhythmias');
  assert(results.length > 0, 'No results for arrhythmias');
});

test('"Ischemic heart disease" returns results', () => {
  const results = getVideosForTopic('Ischemic heart disease');
  assert(results.length > 0, 'No results for ischemic heart disease');
});

test('"Diabetes mellitus" returns results', () => {
  const results = getVideosForTopic('Diabetes mellitus');
  assert(results.length > 0, 'No results');
});

test('"Anemias" matches "Anemia workup" via plural stem stripping', () => {
  const results = getVideosForTopic('Anemias');
  assert(results.length > 0, 'No results — "Anemias" should match "Anemia workup" via stem strip');
});

test('"nonexistent-topic-xyz" returns empty array', () => {
  const results = getVideosForTopic('nonexistent-topic-xyz');
  assert(results.length === 0, `Expected empty, got ${results.length}`);
});

test('Empty string returns empty array', () => {
  const results = getVideosForTopic('');
  assert(results.length === 0, 'Expected empty for blank query');
});

// ── 4. Channel preference & ordering ──────────────────────────────────────
console.log('\n4. Channel preference & ordering');

test('Direct URLs sort before channel URLs', () => {
  const results = getVideosForTopic('Heart failure', { maxResults: 5 });
  if (results.length < 2) return;
  const firstDirectIdx  = results.findIndex(r => r.directUrl);
  const firstChannelIdx = results.findIndex(r => !r.directUrl);
  if (firstDirectIdx !== -1 && firstChannelIdx !== -1) {
    assert(firstDirectIdx < firstChannelIdx, 'Channel URL sorted before direct URL');
  }
});

test('channelPreference floats preferred channel up', () => {
  const withPref    = getVideosForTopic('Heart failure', { maxResults: 5, channelPreference: ['Dirty Medicine'] });
  const withoutPref = getVideosForTopic('Heart failure', { maxResults: 5 });
  if (withPref.length === 0 || withoutPref.length === 0) return;
  // With preference, Dirty Medicine should appear (if it exists)
  const dm = withPref.find(r => r.channel === 'dirty_medicine');
  if (dm) {
    const dmIdx = withPref.indexOf(dm);
    const nnIdx = withPref.findIndex(r => r.channel === 'ninja_nerd');
    // DM should come before NN when DM preferred (both non-direct-URL)
    // (only if they're in same tier — skip if ninja_nerd has direct URL)
    if (dm.directUrl === (withPref[nnIdx]?.directUrl)) {
      assert(dmIdx <= nnIdx, 'Preferred channel not sorted above non-preferred');
    }
  }
});

// ── 5. getVerifiedLink ─────────────────────────────────────────────────────
console.log('\n5. getVerifiedLink (integration helper)');

test('"Ninja Nerd" + "Heart failure" → direct YouTube URL', () => {
  const result = getVerifiedLink('Ninja Nerd', 'Heart failure');
  assert(result.url && result.url.includes('youtu'), `Expected YouTube URL, got: ${result.url}`);
  assert(result.verified === true, 'Expected verified=true');
  console.log(`     URL: ${result.url} | duration: ${result.duration}`);
});

test('"Dirty Medicine" + "Heart failure" → some URL', () => {
  const result = getVerifiedLink('Dirty Medicine', 'Heart failure');
  assert(result.url !== null, 'Expected a URL (direct or channel)');
  console.log(`     URL: ${result.url} | title: ${result.title}`);
});

test('Unknown channel → null URL', () => {
  const result = getVerifiedLink('Unknown Channel', 'Heart failure');
  assert(result.url === null, `Expected null, got: ${result.url}`);
});

test('"Ninja Nerd" + unknown subtopic → null URL', () => {
  const result = getVerifiedLink('Ninja Nerd', 'xyz-no-such-topic');
  assert(result.url === null, `Expected null for unknown topic, got: ${result.url}`);
});

// ── 6. Spot-check a few more subtopics ────────────────────────────────────
console.log('\n6. Spot-check subtopics');

const spotChecks = [
  // These subtopics appear verbatim (or via stem-match) in the video library
  'Valvular disease and murmurs',    // cardiovascular LHF
  'Obstructive vs restrictive',      // respiratory LHF
  'Glomerular disease',              // renal LHF (library uses "Glomerular disease", not "Glomerulonephritis")
  'Leukemias and lymphomas',         // blood LHF
  'Thyroid disease',                 // endocrine LHF (library uses "Thyroid disease")
  'Coagulation disorders',           // blood LHF
  'Acid-base disorders',             // renal LHF
  'Diabetes',                        // endocrine LHF
];

for (const topic of spotChecks) {
  test(`"${topic}" returns ≥1 result`, () => {
    const results = getVideosForTopic(topic);
    assert(results.length > 0, `No results for "${topic}"`);
  });
}

// ── Summary ────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\n⚠️  Some tests failed — review output above.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed.');
}
