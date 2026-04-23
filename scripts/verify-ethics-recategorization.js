#!/usr/bin/env node
// Verify ethics & biostatistics recategorization in SUB_TOPICS (data.js).
// Reads data.js as text and checks topic placement without needing ESM import.

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../frontend/src/data.js');
const src = fs.readFileSync(dataPath, 'utf8');

// Extract the text of a named key's array from SUB_TOPICS.
// Crude but reliable for this static file structure.
function extractBlock(name) {
  const marker = `"${name}": [`;
  const start = src.indexOf(marker);
  if (start === -1) return '';
  let depth = 0;
  let i = src.indexOf('[', start);
  const begin = i;
  while (i < src.length) {
    if (src[i] === '[') depth++;
    if (src[i] === ']') { depth--; if (depth === 0) return src.slice(begin, i + 1); }
    i++;
  }
  return '';
}

const bhns  = extractBlock('Behavioral Health & Nervous Systems/Special Senses');
const bsci  = extractBlock('Behavioral Sciences');

let pass = 0;
let fail = 0;

function check(description, condition) {
  if (condition) {
    console.log(`  PASS  ${description}`);
    pass++;
  } else {
    console.log(`  FAIL  ${description}`);
    fail++;
  }
}

console.log('\n── Behavioral Sciences discipline ──');
check('Biostatistics IS in Behavioral Sciences',         bsci.includes('Biostatistics'));
check('Ethics IS in Behavioral Sciences',                bsci.includes('Ethics'));
check('Study design IS in Behavioral Sciences',          bsci.includes('Study design'));
check('Defense mechanisms IS in Behavioral Sciences',    bsci.includes('Defense mechanisms'));
check('Developmental milestones IS in Behavioral Sciences', bsci.includes('Developmental milestones'));
check('End-of-life care IS in Behavioral Sciences',      bsci.includes('End-of-life care'));
check('Communication skills IS in Behavioral Sciences',  bsci.includes('Communication skills'));
check('Healthcare law IS in Behavioral Sciences',        bsci.includes('Healthcare law'));
check('Patient safety IS in Behavioral Sciences',        bsci.includes('Patient safety'));

console.log('\n── BH&NS/SS system — removed topics ──');
check('Biostatistics NOT in BH&NS/SS',  !bhns.includes('"Biostatistics'));
check('Ethics NOT in BH&NS/SS',         !bhns.includes('"Ethics'));
check('Bias & confounding NOT in BH&NS/SS', !bhns.includes('"Bias & confounding'));

console.log('\n── BH&NS/SS system — must-stay topics ──');
check('Seizure disorders STILL in BH&NS/SS',       bhns.includes('Seizure disorders'));
check('Demyelinating diseases STILL in BH&NS/SS',  bhns.includes('Demyelinating diseases'));
check('Psychiatric disorders STILL in BH&NS/SS',   bhns.includes('Psychiatric disorders'));
check('Neurodegenerative STILL in BH&NS/SS',       bhns.includes('Neurodegenerative diseases'));
check('Stroke STILL in BH&NS/SS',                  bhns.includes('Stroke syndromes'));

console.log(`\n${'─'.repeat(40)}`);
console.log(`Result: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
