#!/usr/bin/env node
/**
 * 04a-pc-examples-extract.mjs — Extract cards that still need example sentences
 * into a compact batch for a Claude subagent to generate inline.
 *
 *   node scripts/04a-pc-examples-extract.mjs --level 1 --out .tmp/ex-L1.json
 *
 * Rule (mirrors how the front-end shows examples, per *declared* POS):
 *   - 1 declared POS  → that POS needs 2 examples
 *   - 2+ declared POS → each declared POS needs 1 example
 * A declared POS slot is matched to its dict_a.meanings bucket by long-form POS;
 * existing examples in that bucket count toward the quota.
 *
 * Output shape (only slots still short are emitted):
 *   [{ id, word, pos: "n./v.",
 *      need: [{ pos: "n.", def: "<hint>", have: ["<existing>"], n: 2 }, ...] }, ...]
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const POS_FULL = { 'n.': 'noun', 'v.': 'verb', 'adj.': 'adjective', 'adv.': 'adverb',
                   'prep.': 'preposition', 'conj.': 'conjunction', 'pron.': 'pronoun',
                   'aux.': 'auxiliary', 'art.': 'article', 'int.': 'interjection' };

const args = { level: null, out: null, limit: null };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--level') args.level = parseInt(process.argv[++i], 10);
  else if (a === '--out') args.out = process.argv[++i];
  else if (a === '--limit') args.limit = parseInt(process.argv[++i], 10);
}
if (!args.level || !args.out) {
  console.error('Usage: --level N --out FILE [--limit M]');
  process.exit(1);
}

const inFile = path.join(process.cwd(), 'data', 'enriched', `L${args.level}.json`);
const cards = JSON.parse(await fs.readFile(inFile, 'utf8'));

const batch = [];
for (const c of cards) {
  const declared = c.pos.split('/').map(s => s.trim()).filter(Boolean);
  if (declared.length === 0) continue;
  const quota = declared.length === 1 ? 2 : 1;
  const meanings = c.dict_a?.meanings || [];

  const need = [];
  for (const p of declared) {
    const longPos = POS_FULL[p] || p;
    const m = meanings.find(x => (x.pos || '').toLowerCase() === longPos);
    const have = (m?.examples || []).filter(Boolean);
    const gap = quota - have.length;
    if (gap > 0) {
      need.push({
        pos: p,
        def: (m?.definitions?.[0] || '').slice(0, 120),
        have: have.slice(0, 2),
        n: gap,
      });
    }
  }
  if (need.length > 0) batch.push({ id: c.id, word: c.word, pos: c.pos, need });
}

const out = args.limit ? batch.slice(0, args.limit) : batch;
await fs.mkdir(path.dirname(args.out), { recursive: true });
await fs.writeFile(args.out, JSON.stringify(out, null, 2));

const totalSentences = out.reduce((s, c) => s + c.need.reduce((a, x) => a + x.n, 0), 0);
console.log(`L${args.level}: ${out.length} cards need examples, ${totalSentences} sentences to generate → ${args.out}`);
