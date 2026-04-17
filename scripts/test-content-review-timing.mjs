/**
 * Verifies duration parsing and block time calculation for real topics.
 * Run from repo root: node scripts/test-content-review-timing.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const libPath = join(__dir, '..', 'src', 'data', 'video-library.json');
const videoLib = JSON.parse(readFileSync(libPath, 'utf8'));

// ── Inline implementations matching videoLookup.js ────────────────────────
// (Can't import ESM with JSON import assertion in this Node version easily,
//  so we duplicate the logic here for the test script.)

function parseVideoDurationToMinutes(video) {
  if (!video) return 20;
  if (video.durationMin != null) return Math.round(video.durationMin);
  if (video.duration) {
    const parts = video.duration.split(':').map(Number);
    let totalSec;
    if (parts.length === 3) {
      totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      totalSec = parts[0] * 60 + parts[1];
    } else {
      return 20;
    }
    return Math.ceil(totalSec / 60);
  }
  return 20;
}

function calculateContentReviewMinutes(videos, firstAidMinutes = 0) {
  if (!videos || videos.length === 0) return 20 + firstAidMinutes;
  const durations = videos.map(v => parseVideoDurationToMinutes(v));
  const longestVideoMin = Math.max(...durations);
  return longestVideoMin + firstAidMinutes;
}

// ── Inline unit tests for parseVideoDurationToMinutes ─────────────────────
const assert = (label, got, expected) => {
  if (got !== expected) {
    console.error(`  FAIL [${label}]: expected ${expected}, got ${got}`);
    process.exitCode = 1;
  } else {
    console.log(`  PASS [${label}]: ${got}`);
  }
};

console.log('\n=== Unit tests: parseVideoDurationToMinutes ===');
assert('duration_min: 36', parseVideoDurationToMinutes({ durationMin: 36 }), 36);
assert('duration "14:10" → 15', parseVideoDurationToMinutes({ duration: '14:10' }), 15);
assert('duration "1:04:34" → 65', parseVideoDurationToMinutes({ duration: '1:04:34' }), 65);
assert('duration "7:30" → 8', parseVideoDurationToMinutes({ duration: '7:30' }), 8);
assert('no duration → 20', parseVideoDurationToMinutes({}), 20);
assert('null → 20', parseVideoDurationToMinutes(null), 20);

// ── Minimal getVideosForTopic implementation for testing ──────────────────
const CHANNEL_NAMES = {
  ninja_nerd: 'Ninja Nerd', dirty_medicine: 'Dirty Medicine',
  armando_hasudungan: 'Armando Hasudungan', randy_neil_md: 'Randy Neil MD',
  hyguru: 'HyGuru', pathoma: 'Pathoma', sketchy: 'Sketchy',
};

function normalizeResource(resource) {
  const channelKey = resource.channel;
  const channelName = CHANNEL_NAMES[channelKey] || channelKey;
  if (resource.type === 'channel_reference') return null;
  return {
    channel: channelKey, channelName,
    title: resource.title || channelName,
    durationMin: resource.duration_min || null,
    duration: resource.duration || (resource.duration_min ? `${resource.duration_min} min` : null),
  };
}

function collectEntries(structure) {
  if (!structure) return [];
  if (Array.isArray(structure)) return structure;
  const entries = [];
  for (const val of Object.values(structure)) {
    if (Array.isArray(val)) entries.push(...val);
    else if (val && typeof val === 'object') {
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
  const qFirst = q.split(/\s+/)[0];
  const sFirst = s.split(/\s+/)[0];
  if (qFirst.length >= 6 && qFirst === sFirst) return true;
  return false;
}

let _allEntries = null;
function getAllEntries() {
  if (_allEntries) return _allEntries;
  const entries = [];
  for (const sysData of Object.values(videoLib.videos_by_system || {})) {
    if (sysData.low_hanging_fruit) entries.push(...sysData.low_hanging_fruit);
    if (sysData.second_tier)       entries.push(...sysData.second_tier);
  }
  for (const discData of Object.values(videoLib.videos_by_discipline || {})) {
    entries.push(...collectEntries(discData));
  }
  _allEntries = entries.filter(e => typeof e.subtopic === 'string' && e.subtopic.trim());
  return _allEntries;
}

function getVideosForTopic(query, { maxResults = 5 } = {}) {
  if (!query) return [];
  const results = [];
  const seen = new Set();
  for (const entry of getAllEntries()) {
    if (!matchesTopic(query, entry.subtopic)) continue;
    for (const resource of (entry.resources || [])) {
      const normalized = normalizeResource(resource);
      if (!normalized) continue;
      const key = `${normalized.channel}::${normalized.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(normalized);
    }
  }
  results.sort((a, b) => (b.durationMin != null) - (a.durationMin != null));
  return results.slice(0, maxResults);
}

// ── Integration tests: real topics ────────────────────────────────────────
const FA_MINS = 20; // D3: First Aid included (20 min upper bound)
const testTopics = [
  'Heart failure',
  'Diabetes mellitus',
  'Acid-base disorders',
  'Biostatistics',
  'nonexistent_topic_xyz',
];

console.log('\n=== Integration tests: topic → videos → block time ===');
let allPassed = true;

for (const topic of testTopics) {
  const videos = getVideosForTopic(topic, { maxResults: 5 });
  const blockMin = calculateContentReviewMinutes(videos, FA_MINS);
  const blockHrs = (Math.ceil(blockMin / 15) * 15 / 60).toFixed(2);

  console.log(`\n--- ${topic} ---`);
  console.log(`Videos found: ${videos.length}`);
  videos.forEach(v => {
    const min = parseVideoDurationToMinutes(v);
    const src = v.durationMin != null ? 'duration_min' : v.duration ? 'duration string' : 'default';
    console.log(`  [${v.channelName}] "${v.title.slice(0, 50)}" → ${min} min (${src})`);
  });
  console.log(`Content review block: ${blockMin} min → ${blockHrs} hr slot`);

  // Validation checks
  if (topic === 'nonexistent_topic_xyz') {
    if (videos.length !== 0) { console.error('  FAIL: expected 0 videos'); allPassed = false; }
    else console.log('  PASS: 0 videos, fallback to default');
    if (blockMin !== 20 + FA_MINS) { console.error(`  FAIL: expected ${20 + FA_MINS} min fallback, got ${blockMin}`); allPassed = false; }
    else console.log(`  PASS: fallback time = ${blockMin} min`);
  } else {
    if (videos.length === 0) { console.error('  FAIL: expected >0 videos'); allPassed = false; }
    if (blockMin < 10 || blockMin > 200) { console.error(`  FAIL: ${blockMin} min out of reasonable range`); allPassed = false; }
    else console.log(`  PASS: block time in reasonable range (10–200 min)`);
  }
}

console.log(`\n=== ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'} ===\n`);
if (!allPassed) process.exit(1);
