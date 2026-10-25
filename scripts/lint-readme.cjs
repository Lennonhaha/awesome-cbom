#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Dependency-free structural lint for this list's README.
//
// This is intentionally NOT awesome-lint: that enforces badge / TOC / GitHub
// topic conventions which belong to the upstream list, so it reports a dozen
// errors on content this fork does not own. What this checks instead is what a
// fork can actually keep green: encoding, line endings, heading shape, link
// scheme and duplicate entries.
'use strict';

const fs = require('fs');

const target = process.argv[2] || 'README.md';
const errors = [];

if (!fs.existsSync(target)) {
  console.error(`missing ${target}`);
  process.exit(1);
}

const buf = fs.readFileSync(target);
const txt = buf.toString('utf8');

if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) errors.push('contains a UTF-8 BOM');
if (txt.includes('\uFFFD')) errors.push('contains U+FFFD (invalid UTF-8 sequence)');
if (buf.includes(0)) errors.push('contains NUL bytes');
if (/\r\n/.test(txt)) errors.push('uses CRLF line endings');

const lines = txt.split(/\r?\n/);
const h1 = lines.filter((l) => /^#\s+\S/.test(l));
if (h1.length !== 1) errors.push(`expected exactly one level-1 heading, found ${h1.length}`);

const seen = new Map();
let entries = 0;

lines.forEach((line, i) => {
  const n = i + 1;
  if (/[ \t]+$/.test(line)) errors.push(`L${n}: trailing whitespace`);

  const m = line.match(/^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)/);
  if (!m) return;

  const [, name, url] = m;
  if (url.startsWith('#')) return;

  if (!/^https:\/\//.test(url)) errors.push(`L${n}: external link is not https (${url})`);
  if (!name.trim()) errors.push(`L${n}: empty link text`);
  if (seen.has(url)) errors.push(`L${n}: duplicate URL, first listed at L${seen.get(url)} (${url})`);
  else {
    seen.set(url, n);
    entries += 1;
  }
});

console.log(`${target}: ${buf.length} bytes, ${entries} external entries, ${errors.length} problem(s)`);
for (const e of errors) console.log(`  - ${e}`);

process.exit(errors.length === 0 ? 0 : 1);
