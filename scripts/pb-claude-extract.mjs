#!/usr/bin/env node
/**
 * pb-claude-extract.mjs — Extract pending Pass B cards into a compact batch
 * for Claude (this session) to translate inline.
 *
 *   node scripts/pb-claude-extract.mjs --level 1 --limit 300 --out tmp.json
 *
 * Output JSON shape: [{ id, word, pos, hints: { "adj.": "Easy to use.", ... } }, ...]
 *   - `pos` = declared POS string (authoritative — only translate these)
 *   - `hints` = English def per *declared* POS (first def from dict_a.meanings)
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const args = { level: null, limit: null, out: null };
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--level') args.level = parseInt(process.argv[++i], 10);
  else if (a === '--limit') args.limit = parseInt(process.argv[++i], 10);
  else if (a === '--out') args.out = process.argv[++i];
}
if (!args.level || !args.out) {
  console.error('Usage: --level N --out FILE [--limit M]');
  process.exit(1);
}

const POS_FULL = { 'n.': 'noun', 'v.': 'verb', 'adj.': 'adjective', 'adv.': 'adverb',
                   'prep.': 'preposition', 'conj.': 'conjunction', 'pron.': 'pronoun' };

const inFile = path.join(process.cwd(), 'data', 'enriched', `L${args.level}.json`);
const cards = JSON.parse(await fs.readFile(inFile, 'utf8'));
const pending = cards.filter(c => !c.zh_b?.ok);

const batch = (args.limit ? pending.slice(0, args.limit) : pending).map(c => {
  const declaredPos = c.pos.split('/').map(s => s.trim()).filter(Boolean);
  const meanings = c.dict_a?.meanings || [];
  const hints = {};
  for (const p of declaredPos) {
    const longPos = POS_FULL[p] || p;
    const m = meanings.find(x => (x.pos || '').toLowerCase() === longPos);
    hints[p] = (m?.definitions?.[0] || '').slice(0, 120);
  }
  return { id: c.id, word: c.word, pos: c.pos, hints };
});

await fs.writeFile(args.out, JSON.stringify(batch, null, 2));
console.log(`L${args.level}: ${pending.length} pending, wrote ${batch.length} to ${args.out}`);
