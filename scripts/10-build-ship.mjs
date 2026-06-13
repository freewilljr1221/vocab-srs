#!/usr/bin/env node
/**
 * 10-build-ship.mjs
 *
 * Copy data/enriched/L{1..6}.json → src/data/L{1..6}.json so the PWA in src/
 * has its data file alongside index.html. Also strips internal log fields
 * (`fetched_at`, `error`, `retryable`, etc.) to keep the shipped payload lean.
 *
 * Run AFTER Pass A (and ideally Pass B) for the levels you want to ship.
 * Idempotent — safe to re-run.
 *
 *   node scripts/10-build-ship.mjs              # all levels
 *   node scripts/10-build-ship.mjs --level 1    # only L1
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'data', 'enriched');
const DST = path.join(process.cwd(), 'docs', 'data');

const args = { level: null };
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--level') args.level = parseInt(process.argv[++i], 10);
}

const POS_LONG = { 'n.': 'noun', 'v.': 'verb', 'adj.': 'adjective', 'adv.': 'adverb',
                   'prep.': 'preposition', 'conj.': 'conjunction', 'pron.': 'pronoun' };

function slimCard(c) {
  const out = {
    id: c.id, word: c.word, pos: c.pos, level: c.level,
  };
  const d = c.dict_a || {};
  // Trim each POS bucket to 2 defs + 2 examples to keep payload lean.
  // Ship meanings whenever present — incl. dict-404 cards that still got
  // generated examples (renderBack reads meanings regardless of `found`).
  const meanings = (d.meanings || []).map(m => ({
    pos: m.pos,
    definitions: (m.definitions || []).slice(0, 2),
    examples: (m.examples || []).slice(0, 2),
  }));
  if (d.found || meanings.length > 0) {
    out.dict_a = {
      found: !!d.found,
      ipa_us: d.ipa_us || null,
      audio_url: d.audio_url || null,
      meanings,
      synonyms: (d.synonyms || []).slice(0, 5),
    };
  } else {
    out.dict_a = { found: false };
  }
  if (c.zh_b?.ok) {
    out.zh_b = {
      ok: true,
      zh_by_pos: c.zh_b.zh_by_pos,
      zh_main: c.zh_b.zh_main,
    };
  } else if (c.zh_b?.zh_by_pos && Object.keys(c.zh_b.zh_by_pos).length > 0) {
    // Partial coverage — ship what we have
    out.zh_b = {
      ok: false,
      zh_by_pos: c.zh_b.zh_by_pos,
      zh_main: c.zh_b.zh_main,
      missing_pos: c.zh_b.missing_pos,
    };
  }
  return out;
}

async function buildLevel(level) {
  const inFile = path.join(SRC, `L${level}.json`);
  const outFile = path.join(DST, `L${level}.json`);
  let raw;
  try {
    raw = JSON.parse(await fs.readFile(inFile, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`L${level}: SKIP (no enriched data yet)`);
      return null;
    }
    throw err;
  }
  const slim = raw.map(slimCard);
  await fs.writeFile(outFile, JSON.stringify(slim), 'utf8');

  const stats = {
    level,
    cards: slim.length,
    with_dict: slim.filter(c => c.dict_a.found).length,
    with_zh: slim.filter(c => c.zh_b?.ok).length,
    with_partial_zh: slim.filter(c => c.zh_b && !c.zh_b.ok).length,
    bytes: (await fs.stat(outFile)).size,
  };
  console.log(`L${level}: ${stats.cards} cards | dict=${stats.with_dict} | zh_ok=${stats.with_zh} | zh_partial=${stats.with_partial_zh} | ${(stats.bytes/1024).toFixed(1)} KB`);
  return stats;
}

async function main() {
  await fs.mkdir(DST, { recursive: true });
  const levels = args.level ? [args.level] : [1, 2, 3, 4, 5, 6];
  const results = [];
  for (const lv of levels) {
    const r = await buildLevel(lv);
    if (r) results.push(r);
  }
  // Write a small index for the app
  const index = {
    built_at: new Date().toISOString(),
    levels: results,
  };
  await fs.writeFile(path.join(DST, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`\nBuilt: ${DST}`);
}

main().catch(err => { console.error(err); process.exit(1); });
