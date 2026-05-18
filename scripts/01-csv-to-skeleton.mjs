#!/usr/bin/env node
/**
 * 01-csv-to-skeleton.mjs
 *
 * Read L1Clean.csv ~ L6Clean.csv, produce data/skeleton/L{1..6}.json.
 *
 * Per user decisions (Q1-A, Q2-A, Q3-A):
 *   - Multi-POS words → keep as 1 card, all POS in same field.
 *   - Word family with parens (accomplish(ment)) → keep original display, slug strips parens.
 *   - Same (word, level) appearing multiple times → MERGE POS, output 1 card.
 *   - Same word at DIFFERENT levels → keep as separate cards (truly different meanings).
 *
 * Output schema (per card):
 *   {
 *     id:     "abandon-L4"        // slug + level for uniqueness
 *     word:   "abandon"            // display word, may contain parens
 *     slug:   "abandon"            // normalized for dict API lookup
 *     pos:    "v."                 // canonical POS, slash-separated, deduped
 *     level:  4
 *   }
 *
 * Run: node scripts/01-csv-to-skeleton.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SRC_DIR = 'C:/HansDB/My notes/ENG Learning Card';
const OUT_DIR = path.join(process.cwd(), 'data', 'skeleton');
const LEVELS = [1, 2, 3, 4, 5, 6];

const POS_ORDER = ['n.', 'v.', 'adj.', 'adv.', 'pron.', 'prep.', 'conj.', 'aux.', 'art.', 'int.'];

function stripBOM(s) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function parseLine(line) {
  // CSV is simple: 3 fields, no quoted commas in observed data.
  // But `account (1),n.,3` has spaces — keep them.
  const parts = line.split(',');
  if (parts.length < 3) return null;
  const word = parts[0].trim();
  const pos = parts[1].trim();
  const level = parseInt(parts[2].trim(), 10);
  if (!word || !pos || Number.isNaN(level)) return null;
  return { word, pos, level };
}

/** Normalize a POS string like "n./v." → ["n.","v."], dedupe, reorder. */
function splitPos(pos) {
  return pos.split('/').map(s => s.trim()).filter(Boolean);
}

function mergePos(posList) {
  const seen = new Set();
  const all = [];
  for (const p of posList) {
    for (const piece of splitPos(p)) {
      if (!seen.has(piece)) {
        seen.add(piece);
        all.push(piece);
      }
    }
  }
  // Sort by canonical order; unknown POS goes to end keeping original order
  all.sort((a, b) => {
    const ia = POS_ORDER.indexOf(a);
    const ib = POS_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return all.join('/');
}

/** Slug for dict API. Normalize to the FIRST canonical form that Free Dictionary can find.
 *  - "account (1)"            → "account"
 *  - "accomplish(ment)"       → "accomplish"
 *  - "actor/actress"          → "actor"
 *  - "December/Dec."          → "december"
 *  - "aunt/auntie/aunty"      → "aunt"
 *  Display word keeps the original; only the slug is normalized for lookup. */
function makeSlug(word) {
  return word
    .replace(/\([^)]*\)/g, '')   // remove parenthetical content
    .split('/')[0]                // take first variant of slash-separated alternatives
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function makeId(slug, level, dupIndex) {
  const base = slug.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return dupIndex > 0 ? `${base}-L${level}-${dupIndex}` : `${base}-L${level}`;
}

async function processLevel(level) {
  const file = path.join(SRC_DIR, `L${level}Clean.csv`);
  const raw = stripBOM(await fs.readFile(file, 'utf8'));
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  // Group by word (case-insensitive). Same-word entries within same level get merged POS.
  const groups = new Map(); // key: lowercased original word → { word, posList[] }
  let parseFails = 0;

  for (const line of lines) {
    const row = parseLine(line);
    if (!row) { parseFails++; continue; }
    if (row.level !== level) {
      console.warn(`  [warn] L${level} file has row with level=${row.level}: ${line}`);
    }
    const key = row.word.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { word: row.word, posList: [] });
    }
    groups.get(key).posList.push(row.pos);
  }

  // Build card list. Multiple groups may still share a slug (e.g. `account (1)` & `account (2)`),
  // so we assign dup index by slug ordering.
  const slugCount = new Map();
  const cards = [];
  for (const { word, posList } of groups.values()) {
    const slug = makeSlug(word);
    const idx = slugCount.get(slug) ?? 0;
    slugCount.set(slug, idx + 1);
    const id = makeId(slug, level, idx);
    cards.push({
      id,
      word,
      slug,
      pos: mergePos(posList),
      level,
    });
  }

  // Sort alphabetically by slug, then by word (so account (1) < account (2))
  cards.sort((a, b) => a.slug.localeCompare(b.slug) || a.word.localeCompare(b.word));

  return { cards, rawLines: lines.length, parseFails, mergedDown: lines.length - cards.length };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const summary = {
    generated_at: new Date().toISOString(),
    levels: {},
    total_cards: 0,
    total_raw_lines: 0,
  };

  for (const level of LEVELS) {
    process.stdout.write(`L${level}: `);
    const { cards, rawLines, parseFails, mergedDown } = await processLevel(level);
    const outFile = path.join(OUT_DIR, `L${level}.json`);
    await fs.writeFile(outFile, JSON.stringify(cards, null, 2), 'utf8');
    summary.levels[`L${level}`] = {
      raw_lines: rawLines,
      cards: cards.length,
      merged_down: mergedDown,
      parse_fails: parseFails,
    };
    summary.total_cards += cards.length;
    summary.total_raw_lines += rawLines;
    console.log(`${cards.length} cards (${rawLines} raw → merged ${mergedDown})`);
  }

  await fs.writeFile(
    path.join(OUT_DIR, '_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8'
  );

  console.log(`\nTotal: ${summary.total_cards} cards from ${summary.total_raw_lines} raw lines`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
