#!/usr/bin/env node
/**
 * 02-pass-a-dict.mjs — Pass A: Free Dictionary API enrichment
 *
 * For each card in data/skeleton/L{1..6}.json, fetch dictionaryapi.dev and
 * extract: ipa_us, audio_url, english defs grouped by POS, english examples,
 * synonyms.
 *
 * Output: data/enriched/L{1..6}.json (skeleton fields + `dict_a` block)
 * Logs:   logs/passA.jsonl (one line per card, success or failure)
 *
 * Idempotent: re-running skips cards whose `dict_a.fetched_at` is already set.
 * Resume:     interrupted runs pick up from the last checkpoint.
 *
 * Usage:
 *   node scripts/02-pass-a-dict.mjs                # process all 6 levels
 *   node scripts/02-pass-a-dict.mjs --level 1      # only L1
 *   node scripts/02-pass-a-dict.mjs --limit 20     # first 20 cards per level (pilot)
 *   node scripts/02-pass-a-dict.mjs --concurrency 5
 *   node scripts/02-pass-a-dict.mjs --force        # ignore existing dict_a, refetch all
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const SKELETON_DIR = path.join(process.cwd(), 'data', 'skeleton');
const OUT_DIR = path.join(process.cwd(), 'data', 'enriched');
const LOG_FILE = path.join(process.cwd(), 'logs', 'passA.jsonl');

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const DEFAULT_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 800;        // 0.8s, 1.6s, 3.2s
const CHECKPOINT_EVERY = 25;       // flush enriched JSON every N cards

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const out = { level: null, limit: null, concurrency: DEFAULT_CONCURRENCY, force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--level') out.level = parseInt(argv[++i], 10);
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--concurrency') out.concurrency = parseInt(argv[++i], 10);
    else if (a === '--force') out.force = true;
  }
  if (!Number.isFinite(out.concurrency) || out.concurrency < 1 || out.concurrency > 20) {
    throw new Error(`--concurrency must be 1..20 (got ${out.concurrency})`);
  }
  if (out.level !== null && (out.level < 1 || out.level > 6)) {
    throw new Error(`--level must be 1..6 (got ${out.level})`);
  }
  if (out.limit !== null && (!Number.isFinite(out.limit) || out.limit < 1)) {
    throw new Error(`--limit must be a positive integer (got ${out.limit})`);
  }
  return out;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** Backoff helper with jitter. attempt is 1-indexed. */
function backoffMs(attempt, baseMs = RETRY_BASE_MS, factor = 1) {
  const base = baseMs * Math.pow(2, attempt - 1) * factor;
  const jitter = Math.random() * baseMs;  // up to +1 base ms of jitter
  return base + jitter;
}

/** Honor Retry-After header (seconds or HTTP-date). Returns ms or null. */
function parseRetryAfter(res) {
  const h = res.headers.get('retry-after');
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs)) return secs * 1000;
  const date = Date.parse(h);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return null;
}

/** Fetch one word with retry. Returns { ok, data, status, error }. */
async function fetchWord(slug) {
  const url = API_BASE + encodeURIComponent(slug);
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.status === 404) {
        return { ok: false, status: 404, error: 'not_found' };  // terminal
      }
      if (res.status === 429) {
        if (attempt >= MAX_RETRIES) {
          return { ok: false, status: 429, error: 'rate_limited' };
        }
        const wait = parseRetryAfter(res) ?? backoffMs(attempt, RETRY_BASE_MS, 2);
        await sleep(wait);
        continue;
      }
      if (res.status >= 500) {
        if (attempt >= MAX_RETRIES) {
          return { ok: false, status: res.status, error: `http_${res.status}` };
        }
        await sleep(backoffMs(attempt));
        continue;
      }
      if (!res.ok) {
        // Other 4xx (400/401/403/...) → terminal, do not retry
        return { ok: false, status: res.status, error: `http_${res.status}` };
      }
      const data = await res.json();
      return { ok: true, status: 200, data };
    } catch (err) {
      // Network / timeout → retryable
      const errName = err?.name === 'TimeoutError' ? 'timeout' : String(err?.message || err);
      if (attempt >= MAX_RETRIES) {
        return { ok: false, status: 0, error: errName };
      }
      await sleep(backoffMs(attempt));
      continue;
    }
  }
  return { ok: false, status: 0, error: 'exhausted' };
}

/** Pick the best US phonetic + audio from response.  */
function extractPhonetic(entries) {
  // entries is the raw array from dictionaryapi.dev
  let ipa_us = null;
  let audio_url = null;
  let ipa_any = null;
  let audio_any = null;

  for (const entry of entries) {
    const ph = entry.phonetics || [];
    for (const p of ph) {
      const text = p.text || null;
      const audio = p.audio || null;
      const isUs = audio && /-us\.mp3$/i.test(audio);
      if (isUs) {
        if (!ipa_us && text) ipa_us = text;
        if (!audio_url) audio_url = audio;
      }
      // Fallbacks (any region)
      if (!ipa_any && text) ipa_any = text;
      if (!audio_any && audio) audio_any = audio;
    }
    // Top-level phonetic on entry
    if (!ipa_any && entry.phonetic) ipa_any = entry.phonetic;
  }

  return {
    ipa_us: ipa_us || ipa_any || null,
    audio_url: audio_url || audio_any || null,
  };
}

function extractMeanings(entries) {
  // Group by partOfSpeech across all entries (same word may have multiple entries)
  const byPos = new Map();
  const allSynonyms = new Set();

  for (const entry of entries) {
    for (const meaning of entry.meanings || []) {
      const pos = meaning.partOfSpeech || 'unknown';
      if (!byPos.has(pos)) byPos.set(pos, { definitions: [], examples: [] });
      const bucket = byPos.get(pos);
      for (const def of meaning.definitions || []) {
        if (def.definition) bucket.definitions.push(def.definition);
        if (def.example) bucket.examples.push(def.example);
        for (const s of def.synonyms || []) allSynonyms.add(s);
      }
      for (const s of meaning.synonyms || []) allSynonyms.add(s);
    }
  }

  const meanings = [];
  for (const [pos, { definitions, examples }] of byPos.entries()) {
    meanings.push({
      pos,
      definitions: dedupe(definitions).slice(0, 5),
      examples: dedupe(examples).slice(0, 3),
    });
  }
  return { meanings, synonyms: Array.from(allSynonyms).slice(0, 10) };
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}

function buildDictA(slug, fetchResult) {
  const now = new Date().toISOString();
  if (!fetchResult.ok) {
    return {
      fetched_at: now,
      found: false,
      error: fetchResult.error,
      status: fetchResult.status,
    };
  }
  const entries = fetchResult.data;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { fetched_at: now, found: false, error: 'empty_response', status: 200 };
  }
  const { ipa_us, audio_url } = extractPhonetic(entries);
  const { meanings, synonyms } = extractMeanings(entries);
  return {
    fetched_at: now,
    found: true,
    ipa_us,
    audio_url,
    meanings,
    synonyms,
    source: 'dictionaryapi.dev',
    license: 'CC BY-SA 3.0',
  };
}

/** Simple promise pool — process items with bounded concurrency, preserving order.
 *  Throws aggregated error if any worker throws (caller decides how to react). */
async function pool(items, concurrency, worker) {
  if (!Array.isArray(items)) throw new TypeError('pool: items must be array');
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new RangeError(`pool: concurrency must be >=1, got ${concurrency}`);
  }
  if (items.length === 0) return [];

  const cap = Math.min(concurrency, items.length);
  const results = new Array(items.length);
  const errors = [];
  let nextIndex = 0;
  let inflight = 0;
  let resolveAll;
  const done = new Promise(r => { resolveAll = r; });

  function maybeFinish() {
    if (nextIndex >= items.length && inflight === 0) resolveAll();
  }

  function spawn() {
    while (inflight < cap && nextIndex < items.length) {
      const idx = nextIndex++;
      inflight++;
      Promise.resolve()
        .then(() => worker(items[idx], idx))
        .then(r => { results[idx] = r; })
        .catch(e => { errors.push({ idx, error: e }); })
        .finally(() => {
          inflight--;
          spawn();
          maybeFinish();
        });
    }
  }
  spawn();
  await done;
  if (errors.length) {
    const first = errors[0];
    const agg = new Error(`pool: ${errors.length} worker error(s); first at idx ${first.idx}: ${first.error?.message || first.error}`);
    agg.errors = errors;
    throw agg;
  }
  return results;
}

/** Determine if a card's existing dict_a is a "terminal" outcome that should NOT be re-fetched
 *  on a resumed run. Success and a confirmed 404 are terminal. Everything else is retryable. */
function isTerminalDictA(dict_a) {
  if (!dict_a || !dict_a.fetched_at) return false;
  if (dict_a.found) return true;
  if (dict_a.error === 'not_found') return true;
  // Treat other 4xx (non-404) as terminal too — won't help to retry the same URL.
  if (typeof dict_a.status === 'number' && dict_a.status >= 400 && dict_a.status < 500 && dict_a.status !== 429) {
    return true;
  }
  return false;
}

/** Atomic write: write to tmp file then rename. Avoids corrupt-on-crash. */
async function atomicWriteJson(file, obj) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

async function appendLog(line) {
  await fs.appendFile(LOG_FILE, JSON.stringify(line) + '\n', 'utf8');
}

async function loadEnriched(level) {
  const f = path.join(OUT_DIR, `L${level}.json`);
  let text;
  try {
    text = await fs.readFile(f, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // Don't silently restart — a corrupted checkpoint is a real problem the user must see.
    throw new Error(`Existing enriched file is invalid JSON: ${f} — ${err.message}. ` +
                    `If this is from a crashed run, delete the file (and its .tmp) and rerun.`);
  }
}

async function processLevel(level) {
  const skelFile = path.join(SKELETON_DIR, `L${level}.json`);
  const outFile = path.join(OUT_DIR, `L${level}.json`);
  const skeleton = JSON.parse(await fs.readFile(skelFile, 'utf8'));
  const existing = await loadEnriched(level);
  const existingMap = new Map((existing || []).map(c => [c.id, c]));

  // Merge: prefer skeleton structure, carry over existing dict_a if present
  let cards = skeleton.map(s => {
    const prev = existingMap.get(s.id);
    return prev ? { ...s, dict_a: prev.dict_a } : { ...s };
  });

  if (args.limit) cards = cards.slice(0, args.limit);

  // Decide which cards need work. Resume only skips TERMINAL outcomes (success or true 404).
  // Transient errors (timeout/429/5xx/network) are retried on resume.
  const todo = cards.filter(c => args.force || !isTerminalDictA(c.dict_a));
  const skipped = cards.length - todo.length;

  console.log(`L${level}: ${cards.length} cards, ${todo.length} to fetch (${skipped} cached)`);

  let done = 0;
  let foundCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  let sinceCheckpoint = 0;

  // Serialize flushes behind a mutex chain so concurrent triggers don't overlap.
  let flushChain = Promise.resolve();
  function scheduleFlush() {
    sinceCheckpoint = 0;
    // Snapshot card array at scheduling time (shallow copy — values are objects, but
    // mutations during stringify produce a self-consistent snapshot serialized to disk).
    const snapshot = cards.slice();
    flushChain = flushChain.then(() => atomicWriteJson(outFile, snapshot));
    return flushChain;
  }

  await pool(todo, args.concurrency, async (card) => {
    const result = await fetchWord(card.slug);
    card.dict_a = buildDictA(card.slug, result);
    done++;
    sinceCheckpoint++;
    if (card.dict_a.found) foundCount++;
    else if (card.dict_a.error === 'not_found') notFoundCount++;
    else errorCount++;

    await appendLog({
      pass: 'A',
      level,
      id: card.id,
      slug: card.slug,
      status: card.dict_a.found ? 'ok' : `fail:${card.dict_a.error}`,
      ts: card.dict_a.fetched_at,
    });

    if (sinceCheckpoint >= CHECKPOINT_EVERY) scheduleFlush();
    if (done % 50 === 0) {
      process.stdout.write(`  L${level} ${done}/${todo.length} (ok=${foundCount}, 404=${notFoundCount}, err=${errorCount})\n`);
    }
  });

  // Final flush, awaited so we surface any write error.
  await flushChain;
  await atomicWriteJson(outFile, cards);
  console.log(`  L${level} DONE: ok=${foundCount}, 404=${notFoundCount}, err=${errorCount} (of ${todo.length})`);
  return { foundCount, notFoundCount, errorCount, total: todo.length };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });

  const levels = args.level ? [args.level] : [1, 2, 3, 4, 5, 6];
  const stats = { ok: 0, notFound: 0, err: 0, total: 0 };
  const t0 = Date.now();

  for (const lv of levels) {
    const r = await processLevel(lv);
    stats.ok += r.foundCount;
    stats.notFound += r.notFoundCount;
    stats.err += r.errorCount;
    stats.total += r.total;
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== Pass A complete in ${secs}s ===`);
  console.log(`ok=${stats.ok}  404=${stats.notFound}  err=${stats.err}  total=${stats.total}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
