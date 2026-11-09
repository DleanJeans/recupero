#!/usr/bin/env node
/**
 * Builds src/data/emoji-kitchen-index.json, the compact list of every Emoji Kitchen pair, from the community
 * metadata at https://github.com/xsalazar/emoji-kitchen-backend (app/metadata.json, ~100 MB).
 *
 *   node scripts/build-emoji-kitchen-index.mjs [path/to/metadata.json]
 *
 * With no path the metadata is downloaded. Re-run when Google ships new mixes.
 *
 * Output: { d: release dates, e: emoji codepoints ("1f355", "2764-fe0f"), p: one string per emoji }.
 * p[i] holds 3 characters per partner: the partner's index in `e` (2 base-92 digits), then one base-92 digit of
 * `dateIndex * 2 + (emoji i is the left half of the URL ? 1 : 0)`. See src/utils/emoji-kitchen-utils.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const METADATA_URL = 'https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json';
// Printable ASCII from '#' to '~' without '\', so the strings need no JSON escaping.
const ALPHABET = Array.from({ length: 0x7e - 0x23 + 1 }, (_, i) => String.fromCharCode(0x23 + i))
  .filter(c => c !== '\\')
  .join('');
const BASE = ALPHABET.length;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/data/emoji-kitchen-index.json');

const source = process.argv[2];
const metadata = source ? JSON.parse(readFileSync(source, 'utf8')) : await (await fetch(METADATA_URL)).json();

const pairs = new Map();
const dateSet = new Set();
for (const entry of Object.values(metadata.data)) {
  for (const list of Object.values(entry.combinations)) {
    for (const combo of list) {
      if (!combo.isLatest) continue;
      const left = combo.leftEmojiCodepoint;
      const right = combo.rightEmojiCodepoint;
      const expected = `https://www.gstatic.com/android/keyboard/emojikitchen/${combo.date}/u${left.replaceAll('-', '-u')}/u${left.replaceAll('-', '-u')}_u${right.replaceAll('-', '-u')}.png`;
      if (combo.gStaticUrl !== expected) throw new Error(`Unexpected URL shape: ${combo.gStaticUrl}`);
      dateSet.add(combo.date);
      pairs.set([left, right].sort().join(' '), { left, right, date: combo.date });
    }
  }
}

const dates = [...dateSet].sort();
const emoji = [...new Set([...pairs.values()].flatMap(p => [p.left, p.right]))].sort();
if (emoji.length > BASE * BASE || dates.length * 2 > BASE) throw new Error('Index outgrew the encoding');
const index = new Map(emoji.map((cp, i) => [cp, i]));
const digit = n => ALPHABET[n];
const partners = emoji.map(() => []);
for (const { left, right, date } of pairs.values()) {
  const d = dates.indexOf(date);
  const add = (self, other, isLeft) => {
    const o = index.get(other);
    partners[index.get(self)].push(digit(Math.floor(o / BASE)) + digit(o % BASE) + digit(d * 2 + (isLeft ? 1 : 0)));
  };
  add(left, right, true);
  if (left !== right) add(right, left, false);
}

writeFileSync(out, `${JSON.stringify({ d: dates, e: emoji, p: partners.map(list => list.sort().join('')) })}\n`);
console.log(`${emoji.length} emoji, ${pairs.size} pairs, ${dates.length} dates -> ${out}`);
