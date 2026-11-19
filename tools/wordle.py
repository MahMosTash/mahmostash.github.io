#!/usr/bin/env python3
"""Update assets/data/wordle.json from the NYT Wordle "Share" text.

Usage (after tapping Share on the NYT Wordle result screen, which copies the text):

    python3 tools/wordle.py                       # reads the clipboard (macOS pbpaste)
    python3 tools/wordle.py --played 212 --win 98 --streak 14 --max 41 --dist 0,6,48,92,51,11
    python3 tools/wordle.py --push                # also commit + push so the site updates

Stats flags are optional: copy them from the NYT Statistics screen whenever you like.
Wordle is a game by The New York Times; this only records my own results.
"""
import argparse, datetime, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data" / "wordle.json"
DAY0 = datetime.date(2021, 6, 19)  # Wordle #0
TILES = {"🟩": "g", "🟧": "g", "🟨": "y", "🟦": "y", "⬛": "b", "⬜": "b"}


def parse_share(text):
    m = re.search(r"Wordle\s+([\d,\.]+)\s+([1-6X])/6(\*?)", text)
    if not m:
        sys.exit("Couldn't find a line like 'Wordle 1,980 3/6' in the pasted text.")
    puzzle = int(re.sub(r"[,\.]", "", m.group(1)))
    rows = []
    for line in text.splitlines():
        row = "".join(TILES[ch] for ch in line if ch in TILES)
        if len(row) == 5:
            rows.append(row)
    if not rows:
        sys.exit("Found the header but no tile rows. Paste the full Share text.")
    solved = m.group(2) != "X"
    if solved and int(m.group(2)) != len(rows):
        sys.exit(f"Header says {m.group(2)}/6 but I found {len(rows)} rows.")
    return {
        "puzzle": puzzle,
        "date": (DAY0 + datetime.timedelta(days=puzzle)).isoformat(),
        "solved": solved,
        "hard": m.group(3) == "*",
        "rows": rows,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--text", help="share text (default: read the clipboard, or stdin if piped)")
    ap.add_argument("--played", type=int)
    ap.add_argument("--win", type=int, help="win percentage, e.g. 98")
    ap.add_argument("--streak", type=int, help="current streak")
    ap.add_argument("--max", type=int, help="max streak")
    ap.add_argument("--dist", help="guess distribution for 1..6, comma-separated, e.g. 0,6,48,92,51,11")
    ap.add_argument("--stats-only", action="store_true", help="only update stats, keep today's grid")
    ap.add_argument("--push", action="store_true", help="git commit + push after updating")
    a = ap.parse_args()

    data = json.loads(DATA.read_text()) if DATA.exists() else {"stats": {}}
    stats = data.setdefault("stats", {})

    if not a.stats_only:
        text = a.text
        if text is None:
            text = sys.stdin.read() if not sys.stdin.isatty() else subprocess.run(["pbpaste"], capture_output=True, text=True).stdout
        data["latest"] = parse_share(text)

    for key, val in (("played", a.played), ("winPct", a.win), ("currentStreak", a.streak), ("maxStreak", a.max)):
        if val is not None:
            stats[key] = val
    if a.dist:
        dist = [int(x) for x in a.dist.split(",")]
        if len(dist) != 6:
            sys.exit("--dist needs exactly 6 numbers (guesses 1..6).")
        stats["distribution"] = dist

    data["updated"] = datetime.date.today().isoformat()
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    l = data.get("latest") or {}
    if l:
        print(f"Wordle {l['puzzle']:,} ({l['date']}): {'%d/6' % len(l['rows']) if l['solved'] else 'X/6'}")
        for r in l["rows"]:
            print("  " + r.replace("g", "🟩").replace("y", "🟨").replace("b", "⬛"))
    print("stats:", {k: v for k, v in stats.items() if v not in (None, [])})

    if a.push:
        subprocess.run(["git", "-C", str(ROOT), "add", str(DATA)], check=True)
        subprocess.run(["git", "-C", str(ROOT), "commit", "-q", "-m", f"Wordle {l.get('puzzle', '')}".strip()], check=True)
        subprocess.run(["git", "-C", str(ROOT), "push", "-q"], check=True)
        print("pushed; the site updates in about a minute.")


if __name__ == "__main__":
    main()
