"""Generate self-hosted pronunciation MP3s: docs/audio/<card id>.mp3.

Uses edge-tts (unofficial Microsoft Edge online TTS) so pronunciation never
depends on device speechSynthesis or a third-party host at runtime.
Resumable: existing non-empty files are skipped.

Usage:
  python -X utf8 scripts/11-gen-audio.py --dry-run   # print spoken text for non-plain words
  python -X utf8 scripts/11-gen-audio.py             # generate missing files
"""
import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'docs' / 'data'
OUT = ROOT / 'docs' / 'audio'
VOICE = 'en-US-AriaNeural'
CONCURRENCY = 6
RETRIES = 3
REQUEST_TIMEOUT_S = 30


SUFFIXES = {'s', 'ment'}           # 'shoe(s)', 'achieve(ment)'
FRAGMENTS = {'man', 'woman', 'ess'}  # 'salesperson/man/woman', 'steward/ess'


def letters(s: str) -> str:
    return re.sub(r'[^a-z]', '', s.lower())


def spoken_text(word: str) -> str:
    """Turn a headword like 'accomplish(ment)' or 'April/Apr.' into what to say."""
    w = re.sub(r'\s*\(\d+\)$', '', word.strip())  # homograph marker: 'account (1)'
    parts = []
    for alt in re.split(r'/(?![^()]*\))', w):     # split on '/' outside parentheses
        alt = alt.strip()
        m = re.fullmatch(r'([^()]+?)\s*\(([^)]+)\)', alt)
        if not m:
            if alt in FRAGMENTS and parts:
                stem = re.sub(r'(person|woman|man)$', '', parts[0])
                parts.append((parts[0] if alt == 'ess' else stem) + alt)
            else:
                parts.append(alt)
            continue
        base = m.group(1).strip()
        parts.append(base)
        for p in m.group(2).split('/'):
            p = p.strip()
            if p in SUFFIXES:
                parts.append(base + p)
            elif p[:3].lower() == base[:3].lower():  # full form: 'argue(argument)'
                parts.append(p)
            # anything else is a sense note ('ring(jewelry)') and is not spoken
    # Drop an abbreviation when its spelled-out form is present ('January/Jan.')
    parts = [p for p in parts if not (p.endswith('.') and any(
        q != p and letters(q).startswith(letters(p)) and len(letters(q)) > len(letters(p))
        for q in parts))]
    seen, out = set(), []
    for p in parts:
        if letters(p) not in seen:
            seen.add(letters(p))
            out.append(p)
    return ', '.join(out)


def load_cards():
    cards = []
    for path in sorted(DATA.glob('L[0-9].json')):
        d = json.loads(path.read_text(encoding='utf-8'))
        cards += d if isinstance(d, list) else d['cards']
    return cards


async def synth(card, sem, failures):
    dest = OUT / f"{card['id']}.mp3"
    if dest.exists() and dest.stat().st_size > 0:
        return
    text = spoken_text(card['word'])
    tmp = dest.with_suffix('.part')
    async with sem:
        for attempt in range(1, RETRIES + 1):
            try:
                # edge-tts has no timeout of its own; a stalled socket would hang the batch
                await asyncio.wait_for(edge_tts.Communicate(text, VOICE).save(str(tmp)), REQUEST_TIMEOUT_S)
                tmp.replace(dest)
                return
            except Exception as e:  # network hiccups / throttling / timeout
                tmp.unlink(missing_ok=True)
                if attempt == RETRIES:
                    failures.append((card['id'], repr(e)))
                else:
                    await asyncio.sleep(2 * attempt)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    cards = load_cards()
    bad_ids = [c['id'] for c in cards if not re.fullmatch(r'[A-Za-z0-9._-]+', str(c['id']))]
    if bad_ids:
        sys.exit(f'unsafe card ids for filenames: {bad_ids[:10]}')

    if args.dry_run:
        for c in cards:
            if not re.fullmatch(r'[A-Za-z]+', c['word']):
                print(f"{c['word']!r:40} -> {spoken_text(c['word'])}")
        return

    OUT.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    failures = []
    tasks = [synth(c, sem, failures) for c in cards]
    for i in range(0, len(tasks), 200):
        await asyncio.gather(*tasks[i:i + 200])
        print(f'{min(i + 200, len(tasks))}/{len(tasks)}', flush=True)
    for cid, err in failures:
        print('FAIL', cid, err)
    print(f'done, failures={len(failures)}')


if __name__ == '__main__':
    asyncio.run(main())
