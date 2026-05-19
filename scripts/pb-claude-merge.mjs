#!/usr/bin/env node
/**
 * pb-claude-merge.mjs — Merge translations back into data/enriched/L{n}.json
 *
 *   node scripts/pb-claude-merge.mjs --level 1 --in trans.json
 *
 * Input shape: [{ id, zh_by_pos: {"n.":"...", "v.":"..."}, zh_main: "..." }, ...]
 */
import fs from 'node:fs/promises';
import path from 'node:path';

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
const trans = JSON.parse(await fs.readFile(args.in, 'utf8'));
const byId = new Map(cards.map(c => [c.id, c]));

const now = new Date().toISOString();
let merged = 0, missing = 0, malformed = 0;
for (const t of trans) {
  const c = byId.get(t.id);
  if (!c) { missing++; continue; }
  if (!t.zh_by_pos || typeof t.zh_by_pos !== 'object' || !t.zh_main) {
    malformed++; continue;
  }
  c.zh_b = {
    fetched_at: now,
    ok: true,
    zh_by_pos: t.zh_by_pos,
    zh_main: t.zh_main,
    source: 'claude-inline',
  };
  merged++;
}

// Atomic write
const tmp = enrichedFile + '.tmp';
await fs.writeFile(tmp, JSON.stringify(cards, null, 2));
await fs.rename(tmp, enrichedFile);
console.log(`L${args.level}: merged=${merged} missing=${missing} malformed=${malformed}`);
