#!/usr/bin/env node
/**
 * pb-claude-split.mjs — Split a pending-cards JSON into chunks of ~N cards.
 *
 *   node scripts/pb-claude-split.mjs --in .tmp/pb-L2-all.json --chunk 250 --prefix .tmp/pb-L2-c
 *
 * Writes .tmp/pb-L2-c1.json, .tmp/pb-L2-c2.json, ...
 */
import fs from 'node:fs/promises';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--in') args.in = process.argv[++i];
  else if (a === '--chunk') args.chunk = parseInt(process.argv[++i], 10);
  else if (a === '--prefix') args.prefix = process.argv[++i];
}
if (!args.in || !args.chunk || !args.prefix) {
  console.error('Usage: --in FILE --chunk N --prefix PREFIX');
  process.exit(1);
}
const all = JSON.parse(await fs.readFile(args.in, 'utf8'));
const total = Math.ceil(all.length / args.chunk);
for (let i = 0; i < total; i++) {
  const slice = all.slice(i * args.chunk, (i + 1) * args.chunk);
  const f = `${args.prefix}${i + 1}.json`;
  await fs.writeFile(f, JSON.stringify(slice, null, 2));
  console.log(`${f}: ${slice.length} cards`);
}
