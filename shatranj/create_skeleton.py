#!/usr/bin/env python3
"""
create_skeleton.py – Create a blank analysis JSON skeleton for a shatranj game.

Usage:
    python create_skeleton.py \\
        --id    suli_muqtadir \\
        --name  "Al-Suli vs Al-Muqtadir" \\
        --moves "b2b3 b7b6 b3b4 ..." \\
        --output games/

    python create_skeleton.py \\
        --id    suli_muqtadir \\
        --name  "Al-Suli vs Al-Muqtadir" \\
        --moves-file moves.txt \\
        --output games/

The script writes games/<id>.json and updates games/index.json.
Pass --description to add a description line for the game selector.
"""

import argparse
import json
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(
        description="Create a blank shatranj game skeleton.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    ap.add_argument("--id",          required=True,
                    help="Game ID (used as filename and index key)")
    ap.add_argument("--name",        required=True,
                    help="Human-readable game name")
    ap.add_argument("--description", default="",
                    help="Short description shown in the game selector")
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument("--moves",
                       help="Space-separated UCI move list as a single string")
    group.add_argument("--moves-file",
                       help="Path to a text file containing space- or newline-separated moves")
    ap.add_argument("--output", default="games",
                    help="Output directory (default: games/)")
    args = ap.parse_args()

    # Parse moves
    if args.moves:
        move_list = args.moves.split()
    else:
        raw = Path(args.moves_file).read_text()
        move_list = raw.split()

    if not move_list:
        ap.error("No moves provided.")

    # Build skeleton
    positions = {
        str(ply): {move_list[ply]: {"eval": None, "wdl": None}}
        for ply in range(len(move_list))
    }

    skeleton = {
        "name": args.name,
        "moves": move_list,
        "positions": positions,
    }

    # Write game file
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)
    game_path = out_dir / f"{args.id}.json"
    with open(game_path, "w") as f:
        json.dump(skeleton, f, indent=2)
    print(f"Wrote {game_path}  ({len(move_list)} plies)")

    # Update index.json
    index_path = out_dir / "index.json"
    index = []
    if index_path.exists():
        try:
            index = json.loads(index_path.read_text())
        except Exception:
            pass

    entry = {"id": args.id, "name": args.name, "description": args.description}
    existing = next((i for i, g in enumerate(index) if g["id"] == args.id), None)
    if existing is not None:
        index[existing] = entry
        print(f"Updated existing entry '{args.id}' in {index_path}")
    else:
        index.append(entry)
        print(f"Added '{args.id}' to {index_path}")

    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)


if __name__ == "__main__":
    main()
