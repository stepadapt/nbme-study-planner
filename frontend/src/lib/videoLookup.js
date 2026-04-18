// ── Video Library Lookup ──────────────────────────────────────────────────
// Provides verified YouTube video URLs for NBME sub-topics.
// Data sourced from src/data/video-library.json (918 verified entries).
// This module is purely additive — it enriches existing link recommendations
// with direct URLs when available, falling back to search queries otherwise.

import videoLib from '../../../src/data/video-library.json';

// ── Channel key → display name ────────────────────────────────────────────
const CHANNEL_NAMES = {
  ninja_nerd:         'Ninja Nerd',
  dirty_medicine:     'Dirty Medicine',
  armando_hasudungan: 'Armando Hasudungan',
  randy_neil_md:      'Randy Neil MD',
  hyguru:             'HyGuru',
  pathoma:            'Pathoma',
  sketchy:            'Sketchy',
};

// ── Display name → channel key (for reverse lookup from contentEngine) ────
const CHANNEL_NAME_TO_KEY = Object.fromEntries(
  Object.entries(CHANNEL_NAMES).map(([k, v]) => [v.toLowerCase(), k])
);

// ── Channel key → search display name (for constructing YouTube search URLs) ──
// Used when the library has a title but no direct video URL.
const CHANNEL_SEARCH_NAME = {
  ninja_nerd:         'Ninja Nerd',
  dirty_medicine:     'Dirty Medicine',
  armando_hasudungan: 'Armando Hasudungan',
  randy_neil_md:      'Randy Neil MD',
  hyguru:             'HyGuru',
  pathoma:            'Pathoma',
  sketchy:            'Sketchy',
};

/** Build a YouTube search URL for a channel + title query. */
function buildSearchUrl(channelKey, title) {
  const chName = CHANNEL_SEARCH_NAME[channelKey] || channelKey;
  const query  = title ? `${chName} ${title}` : chName;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

// ── Normalize a resource entry → standard video object ────────────────────
// Returns null for channel_reference entries without a usable search string.
function normalizeResource(resource) {
  const channelKey  = resource.channel;
  const channelName = CHANNEL_NAMES[channelKey] || channelKey;

  // channel_reference: only usable if it carries a pre-built search string
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

  // When no direct video URL exists, build a YouTube search URL from channel + title.
  // This is always better than a channel homepage (which the library stores in channel_url).
  const url = directUrl || buildSearchUrl(channelKey, title);

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

// ── Collect all subtopic entries from a (possibly nested) structure ───────
// Handles: flat arrays, objects keyed by sub-section, and mixed shapes.
function collectEntries(structure) {
  if (!structure) return [];
  if (Array.isArray(structure)) return structure;

  const entries = [];
  for (const val of Object.values(structure)) {
    if (Array.isArray(val)) {
      entries.push(...val);
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      // One level deeper (e.g. physiology → { cardiovascular: [...] })
      for (const inner of Object.values(val)) {
        if (Array.isArray(inner)) entries.push(...inner);
      }
    }
  }
  return entries;
}

// ── Fuzzy match: does `query` match `subtopic`? ───────────────────────────
// Strips parenthetical qualifiers before comparing, case-insensitive.
// Also strips a trailing 's' to handle plurals (e.g. "Anemias" → "anemia").
// Falls back to first-word matching for short root words (e.g. "Thyroid disorders"
// matches "Thyroid disease" via the shared first word "thyroid").
function matchesTopic(query, subtopic) {
  if (!query || !subtopic) return false;

  // Normalise: strip parenthetical suffix, trim, lowercase
  const q = query.split('(')[0].trim().toLowerCase();
  const s = subtopic.split('(')[0].trim().toLowerCase();
  if (!q || !s) return false;

  // Direct includes match
  if (s.includes(q) || q.includes(s)) return true;

  // Plural stem: strip trailing 's' and try again
  const qStem = q.replace(/s$/, '');
  if (qStem.length >= 4 && (s.includes(qStem) || qStem.includes(s))) return true;

  // Rule 3: Word overlap — require ≥2 shared significant words, or 1 word of length ≥8
  const qWords = new Set(q.split(/\W+/).filter(w => w.length > 4));
  const sWords = new Set(s.split(/\W+/).filter(w => w.length > 4));
  const shared = [...qWords].filter(w => sWords.has(w));
  if (shared.length >= 2 || shared.some(w => w.length >= 8)) return true;

  return false;
}

// ── Build a deduplicated pool of all subtopic entries ────────────────────
// Runs once and is cached.
// Entries without a valid `subtopic` string are excluded — they're structural
// objects that the matching logic cannot use.
let _allEntries = null;
function getAllEntries() {
  if (_allEntries) return _allEntries;

  const entries = [];

  // Systems (low_hanging_fruit + second_tier)
  for (const sysData of Object.values(videoLib.videos_by_system || {})) {
    if (sysData.low_hanging_fruit) entries.push(...sysData.low_hanging_fruit);
    if (sysData.second_tier)       entries.push(...sysData.second_tier);
  }

  // Disciplines (varied structure — flatten all)
  for (const discData of Object.values(videoLib.videos_by_discipline || {})) {
    entries.push(...collectEntries(discData));
  }

  // Filter out entries that lack a usable subtopic string
  _allEntries = entries.filter(e => typeof e.subtopic === 'string' && e.subtopic.trim());
  return _allEntries;
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Get verified videos for a topic query.
 *
 * @param {string} query   - Sub-topic string (e.g. "Heart failure", "Acid-base disorders")
 *                           OR NBME category name (e.g. "Cardiovascular System").
 *                           Parenthetical suffixes are stripped before matching.
 * @param {object} options
 *   @param {number}   options.maxResults        - Max videos to return (default 5)
 *   @param {string[]} options.channelPreference - Channel display names to prioritise
 *                                                 (e.g. ['Ninja Nerd', 'Dirty Medicine'])
 * @returns {Array<{
 *   channel:     string,   // snake_case key  e.g. "ninja_nerd"
 *   channelName: string,   // display name    e.g. "Ninja Nerd"
 *   title:       string,   // video title
 *   url:         string|null, // direct video URL or channel URL
 *   directUrl:   boolean,  // true = links to a specific video (youtu.be/...)
 *   durationMin: number|null,
 *   duration:    string|null, // human-readable e.g. "14:10"
 *   verified:    boolean,
 *   note:        string|null,
 * }>}
 */
export function getVideosForTopic(query, options = {}) {
  const { maxResults = 5, channelPreference = [] } = options;
  if (!query) return [];

  const preferredKeys = channelPreference.map(n => CHANNEL_NAME_TO_KEY[n.toLowerCase()] || n.toLowerCase());

  const results = [];
  const seen    = new Set(); // deduplicate by channel+title

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

  // Sort: direct video URLs first, then by channelPreference order, then as-is
  results.sort((a, b) => {
    // Direct URL beats channel URL
    if (a.directUrl !== b.directUrl) return a.directUrl ? -1 : 1;

    // Preferred channels float up
    const ai = preferredKeys.indexOf(a.channel);
    const bi = preferredKeys.indexOf(b.channel);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;

    return 0;
  });

  return results.slice(0, maxResults);
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Parse a normalized video object's duration to whole minutes (rounded up).
 *
 * Handles all three formats found in video-library.json:
 *   durationMin (number)          → Ninja Nerd style, return directly
 *   duration (string "MM:SS")     → parse and convert to minutes
 *   duration (string "H:MM:SS")   → parse and convert to minutes
 *   neither present               → return 20 (D4 default)
 *
 * @param {object} video - Normalized video object from getVideosForTopic()
 * @returns {number} Duration in whole minutes
 */
export function parseVideoDurationToMinutes(video) {
  if (!video) return 20;
  // durationMin is already in minutes (Ninja Nerd entries)
  if (video.durationMin != null) return Math.round(video.durationMin);
  // duration is a "MM:SS" or "H:MM:SS" string (all other channels)
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
  return 20; // D4 default for entries with no duration data
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Calculate total content review block time in minutes.
 *
 * Applies approved decisions:
 *   D1: Use the longest video in the list (safe buffer — student never runs over)
 *   D2: Budget at 1x speed (1.5x tip is encouragement, not an assumption)
 *   D3: Add firstAidMinutes if First Aid is part of the block (pass 0 if not)
 *   D4: 20 min default for videos with no duration
 *
 * @param {Array}  videos          - Array of normalized video objects (from getVideosForTopic)
 * @param {number} firstAidMinutes - Time to add for FA read step (default 0; pass 20 if hasFirstAid)
 * @returns {number} Total block time in minutes
 */
export function calculateContentReviewMinutes(videos, firstAidMinutes = 0) {
  if (!videos || videos.length === 0) return 20 + firstAidMinutes;
  const durations = videos.map(v => parseVideoDurationToMinutes(v));
  const longestVideoMin = Math.max(...durations); // D1: longest
  return longestVideoMin + firstAidMinutes;        // D2: 1x, D3: add FA time
}

// ─────────────────────────────────────────────────────────────────────────
/**
 * Given a contentEngine channel display name and a sub-topic query,
 * return the best verified URL for that channel, or null if not found.
 *
 * Designed as the drop-in enrichment function for contentEngine.js links.
 *
 * @param {string} channelDisplayName  - e.g. "Ninja Nerd", "Dirty Medicine"
 * @param {string} subTopicQuery       - sub-topic string to look up
 * @returns {{ url: string|null, title: string|null, duration: string|null, verified: boolean }}
 */
export function getVerifiedLink(channelDisplayName, subTopicQuery) {
  if (!channelDisplayName || !subTopicQuery) return { url: null, title: null, duration: null, verified: false };

  const channelKey = CHANNEL_NAME_TO_KEY[channelDisplayName.toLowerCase()];
  // If the channel isn't in the library, bail immediately
  if (!channelKey) return { url: null, title: null, duration: null, verified: false };

  const candidates = getVideosForTopic(subTopicQuery, {
    maxResults: 10,
    channelPreference: [channelDisplayName],
  });

  const match = candidates.find(v => v.channel === channelKey);
  if (!match) return { url: null, title: null, duration: null, verified: false };

  return {
    url:      match.url,
    title:    match.title,
    duration: match.duration,
    verified: match.verified,
  };
}
