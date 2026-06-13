#!/usr/bin/env node
/**
 * 04b-pc-examples-merge.mjs — Merge generated example sentences back into
 * data/enriched/L{n}.json, appending to the matching dict_a.meanings bucket.
 *
 *   node scripts/04b-pc-examples-merge.mjs --level 1 --in .tmp/ex-L1-out.json
 *
 * Input shape (from Haiku subagent):
 *   [{ id, ex: { "n.": ["sentence", ...], "v.": ["sentence"] } }, ...]
 *
 * For each declared POS slot we find (or create) the long-form meanings bucket
 * and append the new sentences (deduped, capped at 3 examples per bucket).
 * Marks each touched card with examples_c = { ok, fetched_at, source }.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const POS_FULL = { 'n.': 'noun', 'v.': 'verb', 'adj.': 'adjective', 'adv.': 'adverb',
                   'prep.': 'preposition', 'conj.': 'conjunction', 'pron.': 'pronoun',
                   'aux.': 'auxiliary', 'art.': 'article', 'int.': 'interjection' };
const CAP = 3;

const args = { level: null, in: null };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--level') args.level = parseInt(process.argv[++i], 10);
  else if (a === '--in') args.in = process.argv[++i];
}
if (!args.level || !args.in) {
  console.error('Usage: --level N --in FILE');
  process.exit(1);
}

const enrichedFile = path.join(process.cwd(), 'data', 'enriched', `L${args.level}.json`);
const cards = JSON.parse(await fs.readFile(enrichedFile, 'utf8'));
const gen = JSON.parse(await fs.readFile(args.in, 'utf8'));
const byId = new Map(cards.map(c => [c.id, c]));

const now = new Date().toISOString();
let merged = 0, missing = 0, malformed = 0, added = 0;
for (const g of gen) {
  const c = byId.get(g.id);
  if (!c) { missing++; continue; }
  if (!g.ex || typeof g.ex !== 'object') { malformed++; continue; }

  if (!c.dict_a) c.dict_a = { found: true, meanings: [] };
  if (!Array.isArray(c.dict_a.meanings)) c.dict_a.meanings = [];

  let cardAdded = 0;
  for (const [pos, sentences] of Object.entries(g.ex)) {
    if (!Array.isArray(sentences)) continue;
    const longPos = POS_FULL[pos] || pos;
    let bucket = c.dict_a.meanings.find(m => (m.pos || '').toLowerCase() === longPos);
    if (!bucket) {
      bucket = { pos: longPos, definitions: [], examples: [] };
      c.dict_a.meanings.push(bucket);
    }
    if (!Array.isArray(bucket.examples)) bucket.examples = [];
    const seen = new Set(bucket.examples.map(s => s.trim().toLowerCase()));
    for (const s of sentences) {
      if (typeof s !== 'string') continue;
      const t = s.trim();
      if (!t || seen.has(t.toLowerCase())) continue;
      if (bucket.examples.length >= CAP) break;
      bucket.examples.push(t);
      seen.add(t.toLowerCase());
      cardAdded++;
    }
  }
  if (cardAdded > 0) {
    c.examples_c = { ok: true, fetched_at: now, source: 'claude-haiku' };
    merged++; added += cardAdded;
  }
}

const tmp = enrichedFile + '.tmp';
await fs.writeFile(tmp, JSON.stringify(cards, null, 2));
await fs.rename(tmp, enrichedFile);
console.log(`L${args.level}: merged=${merged} sentencesAdded=${added} missing=${missing} malformed=${malformed}`);
