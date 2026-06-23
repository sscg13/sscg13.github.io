#!/usr/bin/env python3
"""
generate_ratings.py - Convert Ordo ratings.txt/matchup.txt output into the
JSON consumed by the ratings front-end (main.html / engine.html).

Usage:
    python generate_ratings.py \\
        --ratings  /path/to/ratings.txt \\
        --matchup  /path/to/matchup.txt \\
        --output   data.json
"""

import argparse
import json
import re

RATINGS_LINE = re.compile(
    r"^\s*\d+\s+(?P<name>.+?)\s*:\s*(?P<rating>\S+)\s+(?P<error>\S+)\s+"
    r"(?P<points>[\d.]+)\s+(?P<played>\d+)\s+(?P<pct>\d+)\s*$"
)
WHITE_ADV = re.compile(r"White advantage\s*=\s*([+-]?[\d.]+)\s*\+/-\s*([\d.]+)")
DRAW_RATE = re.compile(r"Draw rate.*?=\s*([\d.]+)\s*%\s*\+/-\s*([\d.]+)")

HEADER_LINE = re.compile(
    r"^\s*(?P<rank>\d+)\)\s.*?:\s*(?P<played>\d+)\s*"
    r"\(\+(?P<wins>\d+),=(?P<draws>\d+),-(?P<losses>\d+)\),\s*(?P<pct>[\d.]+)\s*%"
)
VS_LINE = re.compile(
    r"^\s*(?P<name>.*\S)\s{2,}:\s*(?P<games>\d+)\s*"
    r"\(\s*(?P<wins>\d+),\s*(?P<draws>\d+),\s*(?P<losses>\d+)\),\s*(?P<pct>[\d.]+)\s*:\s*"
    r"(?P<diff>[+-][\d.]+),\s*(?P<sd>[\d.]+),\s*(?P<cfs>[\d.]+)\s*$"
)


def parse_ratings(path):
    engines = []
    white_adv = None
    draw_rate = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            m = RATINGS_LINE.match(line)
            if m:
                error = m["error"]
                engines.append({
                    "rank": len(engines) + 1,
                    "name": m["name"].strip(),
                    "rating": float(m["rating"]),
                    "error": None if error == "----" else float(error),
                    "points": float(m["points"]),
                    "played": int(m["played"]),
                    "pct": int(m["pct"]),
                })
                continue
            wa = WHITE_ADV.search(line)
            if wa:
                white_adv = {"value": float(wa.group(1)), "error": float(wa.group(2))}
            dr = DRAW_RATE.search(line)
            if dr:
                draw_rate = {"value": float(dr.group(1)), "error": float(dr.group(2))}
    return engines, white_adv, draw_rate


def parse_matchup(path):
    opponents_by_rank = {}
    current = None
    with open(path, encoding="utf-8") as f:
        for line in f:
            h = HEADER_LINE.match(line)
            if h:
                current = int(h["rank"])
                opponents_by_rank[current] = []
                continue
            if current is None or line.strip().startswith("vs.") or not line.strip():
                continue
            v = VS_LINE.match(line)
            if v:
                opponents_by_rank[current].append({
                    "name": v["name"].strip(),
                    "games": int(v["games"]),
                    "wins": int(v["wins"]),
                    "draws": int(v["draws"]),
                    "losses": int(v["losses"]),
                    "pct": float(v["pct"]),
                    "diff": float(v["diff"]),
                    "sd": float(v["sd"]),
                    "cfs": float(v["cfs"]),
                })
    return opponents_by_rank


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ratings", required=True, help="Path to Ordo ratings.txt")
    ap.add_argument("--matchup", required=True, help="Path to Ordo matchup.txt")
    ap.add_argument("--output", default="data.json", help="Output JSON path")
    args = ap.parse_args()

    engines, white_adv, draw_rate = parse_ratings(args.ratings)
    opponents_by_rank = parse_matchup(args.matchup)

    for engine in engines:
        engine["opponents"] = opponents_by_rank.get(engine["rank"], [])
        record = {"wins": 0, "draws": 0, "losses": 0}
        for opp in engine["opponents"]:
            record["wins"] += opp["wins"]
            record["draws"] += opp["draws"]
            record["losses"] += opp["losses"]
        engine["record"] = record

    missing = [e["name"] for e in engines if not e["opponents"]]
    if missing:
        print(f"Warning: no matchup data found for: {', '.join(missing)}")

    output = {
        "white_advantage": white_adv,
        "draw_rate": draw_rate,
        "engines": engines,
    }
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    print(f"Wrote {len(engines)} engines to {args.output}")


if __name__ == "__main__":
    main()
