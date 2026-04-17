// Test script: verifies that every video URL returned by getVideosForTopic
// is either a direct video URL or a YouTube search URL — never a channel homepage.
// Run with: node scripts/test-video-urls.js

const { createRequire } = require('module');
const path = require('path');

// ── Inline the lookup logic (CJS version) ────────────────────────────────
const videoLib = require('../src/data/video-library.json');

const CHANNEL_NAMES = {
  ninja_nerd: 'Ninja Nerd', dirty_medicine: 'Dirty Medicine',
  armando_hasudungan: 'Armando Hasudungan', randy_neil_md: 'Randy Neil MD',
  hyguru: 'HyGuru', pathoma: 'Pathoma', sketchy: 'Sketchy',
};
const CHANNEL_SEARCH_NAME = CHANNEL_NAMES;
const CHANNEL_NAME_TO_KEY = Object.fromEntries(
  Object.entries(CHANNEL_NAMES).map(([k, v]) => [v.toLowerCase(), k])
);

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
    return { channel: channelKey, channelName, title: resource.search,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(resource.search)}`,
      directUrl: false, durationMin: null, duration: null, verified: false, note: resource.note || null };
  }
  const directUrl = resource.url && resource.url.includes('youtu') ? resource.url : null;
  const title     = resource.title || channelName;
  const url       = directUrl || buildSearchUrl(channelKey, title);
  return { channel: channelKey, channelName, title, url, directUrl: !!directUrl,
    durationMin: resource.duration_min || null, duration: resource.duration || null,
    verified: !!(resource.verified || resource.verified_title), note: resource.note || null };
}

function collectEntries(structure) {
  if (!structure) return [];
  if (Array.isArray(structure)) return structure;
  const entries = [];
  for (const val of Object.values(structure)) {
    if (Array.isArray(val)) entries.push(...val);
    else if (val && typeof val === 'object') {
      for (const inner of Object.values(val)) { if (Array.isArray(inner)) entries.push(...inner); }
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

function getVideosForTopic(query, options = {}) {
  const { maxResults = 5, channelPreference = [] } = options;
  if (!query) return [];
  const preferredKeys = channelPreference.map(n => CHANNEL_NAME_TO_KEY[n.toLowerCase()] || n.toLowerCase());
  const results = [], seen = new Set();
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
    const ai = preferredKeys.indexOf(a.channel), bi = preferredKeys.indexOf(b.channel);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1; if (bi !== -1) return 1;
    return 0;
  });
  return results.slice(0, maxResults);
}

// ── Tests ─────────────────────────────────────────────────────────────────
const TEST_TOPICS = [
  'Heart failure', 'Diabetes mellitus', 'Thyroid disorders',
  'Anemias', 'Glomerular disease', 'Stroke syndromes',
  'Acid-base disorders', 'Ischemic heart disease',
];

let passed = 0, failed = 0;
const channelHomePattern = /youtube\.com\/@/;
const validUrlPattern = /^https:\/\/(youtu\.be\/|www\.youtube\.com\/(watch|results))/;

console.log('\n=== Video URL Test ===\n');

for (const topic of TEST_TOPICS) {
  const videos = getVideosForTopic(topic, { maxResults: 3 });
  if (videos.length === 0) {
    console.log(`  SKIP  ${topic} — no videos found in library`);
    continue;
  }
  for (const v of videos) {
    const isChannelHome = channelHomePattern.test(v.url);
    const isValid = validUrlPattern.test(v.url);
    const ok = !isChannelHome && isValid;
    if (ok) {
      console.log(`  PASS  [${v.directUrl ? 'direct' : 'search'}] ${topic} / ${v.channelName}`);
      console.log(`        ${v.url}`);
      passed++;
    } else {
      console.log(`  FAIL  ${topic} / ${v.channelName}`);
      console.log(`        ${v.url}`);
      failed++;
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
