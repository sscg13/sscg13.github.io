#!/usr/bin/env python3
"""
generate_analysis.py – Analyse a shatranj game with a UCI engine.

For every ply in the game this script:
  1. Generates all legal shatranj moves from the current position.
  2. Sends each resulting position to a UCI engine and records eval + WDL.
  3. Writes the ply/move-indexed JSON consumed by the front-end.

Usage:
    python generate_analysis.py \\
        --engine  /path/to/engine  \\
        --input   games/suli_muqtadir.json \\
        --output  games/suli_muqtadir.json \\
        --nodes   50000 \\
        --workers 4
"""

import argparse
import json
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# ─── Shatranj piece constants ─────────────────────────────────────────────────
# Positive = white, negative = black.
# Encoding matches shatranj.js: 1 pawn · 2 alfil · 3 ferzan · 4 faras · 5 rukh · 6 shah
PAWN   = 1   # moves 1 forward, captures 1 diagonal, promotes to ferzan
ALFIL  = 2   # jumps exactly 2 squares diagonally (can leap over pieces)
FERZAN = 3   # steps exactly 1 square diagonally
FARAS  = 4   # standard knight leap
RUKH   = 5   # sliding rook
SHAH   = 6   # steps in all 8 directions (no castling)

# ─── Attack tables (direct translation of shatranj.js) ───────────────────────
#
# Each entry is a list of *rays*.  A ray is a list of (dx, dy) steps walked in
# order; the loop breaks when a piece is hit.  Jumping pieces (alfil, faras)
# have exactly one step per ray so the break logic is harmless.
#
# IMPORTANT: dy is always multiplied by the moving side's color (+1 / -1) at
# move-generation time, so all tables are defined from white's point of view.

_ray_N = [[0,  i] for i in range(1, 8)]
_ray_E = [[i,  0] for i in range(1, 8)]
_ray_S = [[0, -i] for i in range(1, 8)]
_ray_W = [[-i, 0] for i in range(1, 8)]

ATTACK_SLIDERS = [
    # PAWN  – diagonal capture squares only (forward push handled separately)
    [[[-1, 1]], [[1, 1]]],
    # ALFIL – four 2-step diagonal jumps
    [[[2, 2]], [[2, -2]], [[-2, -2]], [[-2, 2]]],
    # FERZAN – four 1-step diagonals
    [[[1, 1]], [[1, -1]], [[-1, -1]], [[-1, 1]]],
    # FARAS – eight knight leaps
    [[[-2, 1]], [[-1, 2]], [[1, 2]], [[2, 1]],
     [[2, -1]], [[1, -2]], [[-1, -2]], [[-2, -1]]],
    # RUKH – four sliding rays
    [_ray_N, _ray_E, _ray_S, _ray_W],
    # SHAH – eight one-step directions
    [[[-1, 1]], [[0, 1]], [[1, 1]], [[1,  0]],
     [[ 1,-1]], [[0,-1]], [[-1,-1]], [[-1, 0]]],
]

# Shatranj home row: a-h = rukh, faras, alfil, shah, ferzan, alfil, faras, rukh
_HOME_ROW = [RUKH, FARAS, ALFIL, SHAH, FERZAN, ALFIL, FARAS, RUKH]

_FILES = "abcdefgh"
_RANKS = "12345678"


def _sq(f: int, r: int) -> str:
    return _FILES[f] + _RANKS[r]


# ─── Board ────────────────────────────────────────────────────────────────────

class Board:
    """
    Shatranj board.  board[file][rank] with file 0=a and rank 0=1.
    Positive values = white pieces, negative = black.
    """

    __slots__ = ("board", "color")

    def __init__(self):
        self.board: list[list[int]] = [[0] * 8 for _ in range(8)]
        self.color: int = 1  # 1 = white to move, -1 = black

    def reset(self):
        self.color = 1
        for f in range(8):
            self.board[f][1] = PAWN
            self.board[f][6] = -PAWN
            self.board[f][0] = _HOME_ROW[f]
            self.board[f][7] = -_HOME_ROW[f]
            for r in range(2, 6):
                self.board[f][r] = 0

    def _blocked(self, x: int, y: int, color: int) -> bool:
        """True if (x,y) is out of bounds OR occupied by a friendly piece."""
        if x < 0 or x > 7 or y < 0 or y > 7:
            return True
        return self.board[x][y] * color > 0

    def _destinations(self, f: int, r: int) -> list[tuple[int, int]]:
        """Pseudo-legal destination squares for the piece at (f, r)."""
        piece = self.board[f][r]
        if piece == 0:
            return []
        color = 1 if piece > 0 else -1
        ap = abs(piece)
        targets: list[tuple[int, int]] = []

        for ray in ATTACK_SLIDERS[ap - 1]:
            for dx, dy in ray:
                nx, ny = f + dx, r + dy * color
                if self._blocked(nx, ny, color):
                    break  # friendly piece or out of bounds – stop ray
                if ap == PAWN:
                    # Pawn diagonal: only a valid move if capturing an enemy
                    if 0 <= nx <= 7 and 0 <= ny <= 7 and self.board[nx][ny] * color < 0:
                        targets.append((nx, ny))
                else:
                    targets.append((nx, ny))
                if self._blocked(nx, ny, -color):
                    break  # enemy piece captured – stop ray

        if ap == PAWN:
            # Forward non-capture (one step only – no double push in shatranj)
            fy = r + color
            if 0 <= fy <= 7 and self.board[f][fy] == 0:
                targets.append((f, fy))

        return targets

    def pseudolegal_moves(self) -> list[str]:
        moves: list[str] = []
        for f in range(8):
            for r in range(8):
                if self.board[f][r] * self.color <= 0:
                    continue
                for nf, nr in self._destinations(f, r):
                    promo = ""
                    if abs(self.board[f][r]) == PAWN and (nr == 0 or nr == 7):
                        promo = "q"   # promotes to ferzan (represented as queen)
                    moves.append(_sq(f, r) + _sq(nf, nr) + promo)
        return moves

    def make_move(self, m: str) -> tuple[int, int]:
        sf, sr = ord(m[0]) - 97, ord(m[1]) - 49
        ef, er = ord(m[2]) - 97, ord(m[3]) - 49
        sp = self.board[sf][sr]
        tp = self.board[ef][er]
        color = 1 if sp > 0 else -1
        self.board[ef][er] = color * FERZAN if len(m) > 4 else sp
        self.board[sf][sr] = 0
        self.color = -self.color
        return sp, tp

    def unmake_move(self, m: str, sp: int, tp: int):
        sf, sr = ord(m[0]) - 97, ord(m[1]) - 49
        ef, er = ord(m[2]) - 97, ord(m[3]) - 49
        self.board[sf][sr] = sp
        self.board[ef][er] = tp
        self.color = -self.color

    def _king_square(self, color: int) -> tuple[int, int]:
        for f in range(8):
            for r in range(8):
                if self.board[f][r] == SHAH * color:
                    return f, r
        return -1, -1   # king not on board (should not happen in a legal game)

    def in_check(self, color: int) -> bool:
        """True if the king of *color* is attacked by any enemy piece."""
        kf, kr = self._king_square(color)
        if kf < 0:
            return True
        for pt in range(1, 7):            # check each piece type as a potential attacker
            for ray in ATTACK_SLIDERS[pt - 1]:
                for dx, dy in ray:
                    nx, ny = kf + dx, kr + dy * color
                    if self._blocked(nx, ny, color):
                        break
                    # Does the square hold an enemy piece of type pt?
                    if self.board[nx][ny] + pt * color == 0:
                        return True
                    if self._blocked(nx, ny, -color):
                        break
        return False

    def legal_moves(self) -> list[str]:
        result: list[str] = []
        color = self.color
        for m in self.pseudolegal_moves():
            sp, tp = self.make_move(m)
            if not self.in_check(color):
                result.append(m)
            self.unmake_move(m, sp, tp)
        return result

    def clone(self) -> "Board":
        b = Board.__new__(Board)
        b.board = [col[:] for col in self.board]
        b.color = self.color
        return b


# ─── UCI engine wrapper ───────────────────────────────────────────────────────

class Engine:
    """Manages a single long-running UCI engine subprocess."""

    def __init__(self, path: str):
        self._path = path
        self._proc = subprocess.Popen(
            [path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._send("uci")
        self._wait_for("uciok")
        self._send("setoption name UCI_Variant value shatranj")
        self._ready()

    def _send(self, cmd: str):
        self._proc.stdin.write(cmd + "\n")
        self._proc.stdin.flush()

    def _wait_for(self, token: str) -> str:
        while True:
            line = self._proc.stdout.readline()
            if token in line:
                return line.strip()

    def _ready(self):
        self._send("isready")
        self._wait_for("readyok")

    def analyse(
        self, move_history: list[str], nodes: int
    ) -> tuple[int | None, list[int] | None]:
        """
        Analyse the position reached after playing *move_history* from startpos.

        Returns (eval_cp, [wins, draws, losses]) from the side-to-move's
        perspective, matching the UCI info line convention.  Either value is
        None if the engine did not report it.
        """
        self._send("ucinewgame")
        pos = ("position startpos moves " + " ".join(move_history)
               if move_history else "position startpos")
        self._send(pos)
        self._ready()
        self._send(f"go nodes {nodes}")

        eval_cp: int | None = None
        wdl: list[int] | None = None

        while True:
            line = self._proc.stdout.readline().strip()
            if not line:
                continue
            if line.startswith("bestmove"):
                break
            parts = line.split()
            if "score" in parts:
                si = parts.index("score")
                kind = parts[si + 1] if si + 1 < len(parts) else ""
                if kind == "cp" and si + 2 < len(parts):
                    eval_cp = int(parts[si + 2])
                elif kind == "mate" and si + 2 < len(parts):
                    mate_n = int(parts[si + 2])
                    eval_cp = 30000 if mate_n > 0 else -30000
            if "wdl" in parts:
                wi = parts.index("wdl")
                if wi + 3 < len(parts):
                    wdl = [int(parts[wi + 1]),
                           int(parts[wi + 2]),
                           int(parts[wi + 3])]

        return eval_cp, wdl

    def close(self):
        try:
            self._send("quit")
            self._proc.wait(timeout=5)
        except Exception:
            self._proc.kill()


# ─── Thread-local engine pool ─────────────────────────────────────────────────

_thread_local = threading.local()
_engines_lock  = threading.Lock()
_all_engines:  list[Engine] = []


def _get_engine(path: str) -> Engine:
    """Return the engine for this thread, creating it on first use."""
    if not hasattr(_thread_local, "engine"):
        eng = Engine(path)
        _thread_local.engine = eng
        with _engines_lock:
            _all_engines.append(eng)
    return _thread_local.engine


# ─── Job ──────────────────────────────────────────────────────────────────────

def _run_job(
    job: tuple[int, str, list[str]], engine_path: str, nodes: int
) -> tuple[int, str, int | None, list[int] | None]:
    """
    Analyse one (ply, candidate_move) pair.

    *job* = (ply, candidate_move, game_prefix)
    The engine sees: position startpos moves <game_prefix> <candidate_move>
    """
    ply, move, prefix = job
    eng = _get_engine(engine_path)
    eval_cp, wdl = eng.analyse(prefix + [move], nodes)
    return ply, move, eval_cp, wdl


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(
        description="Analyse a shatranj game with a UCI engine.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    ap.add_argument("--engine",  required=True,
                    help="Path to the UCI engine executable")
    ap.add_argument("--input",   required=True,
                    help="Input game JSON (must contain 'name' and 'moves')")
    ap.add_argument("--output",  required=True,
                    help="Output JSON path (may be the same as --input)")
    ap.add_argument("--nodes",   type=int, default=50_000,
                    help="Search nodes per position")
    ap.add_argument("--workers", type=int, default=4,
                    help="Parallel engine processes")
    ap.add_argument("--checkpoint", type=int, default=200,
                    help="Save progress every N completed positions")
    args = ap.parse_args()

    # ── Load game ──────────────────────────────────────────────────────────
    with open(args.input) as f:
        game = json.load(f)

    game_moves: list[str] = game["moves"]
    num_plies = len(game_moves)
    print(f"Game   : {game['name']}")
    print(f"Plies  : {num_plies}")

    # ── Build job list ─────────────────────────────────────────────────────
    # Walk the game to find legal moves at every ply.
    board = Board()
    board.reset()
    jobs: list[tuple[int, str, list[str]]] = []

    for ply in range(num_plies):
        prefix = game_moves[:ply]
        for m in board.legal_moves():
            jobs.append((ply, m, prefix))
        board.make_move(game_moves[ply])

    total = len(jobs)
    print(f"Jobs   : {total}  (workers={args.workers}, nodes={args.nodes})")

    # ── Seed output from existing data if present ──────────────────────────
    existing: dict = {}
    out_path = Path(args.output)
    if out_path.exists():
        try:
            with open(out_path) as f:
                prev = json.load(f)
            if "positions" in prev:
                existing = {
                    str(p): {
                        m: v for m, v in mv.items()
                        if isinstance(v, dict) and v.get("eval") is not None
                    }
                    for p, mv in prev["positions"].items()
                }
            already = sum(len(v) for v in existing.values())
            if already:
                print(f"Resuming: {already} positions already done")
        except Exception:
            pass

    positions: dict[str, dict] = {str(p): dict(existing.get(str(p), {}))
                                   for p in range(num_plies)}

    # Skip jobs already completed
    pending = [
        j for j in jobs
        if j[1] not in positions.get(str(j[0]), {})
    ]
    print(f"Pending: {len(pending)}")

    if not pending:
        print("Nothing to do.")
    else:
        # ── Run analysis ───────────────────────────────────────────────────
        def save():
            output = {"name": game["name"], "moves": game_moves,
                      "positions": positions}
            with open(out_path, "w") as fh:
                json.dump(output, fh, indent=2)

        completed = 0
        try:
            with ThreadPoolExecutor(max_workers=args.workers) as pool:
                futures = {
                    pool.submit(_run_job, job, args.engine, args.nodes): job
                    for job in pending
                }
                for fut in as_completed(futures):
                    try:
                        ply, move, eval_cp, wdl = fut.result()
                        positions[str(ply)][move] = {"eval": eval_cp, "wdl": wdl}
                    except Exception as e:
                        orig = futures[fut]
                        print(f"\n  Error ply={orig[0]} move={orig[1]}: {e}")
                        positions[str(orig[0])][orig[1]] = {"eval": None, "wdl": None}

                    completed += 1
                    print(f"  {completed}/{len(pending)}", end="\r", flush=True)

                    if completed % args.checkpoint == 0:
                        save()
                        print(f"\n  [checkpoint saved]")

        finally:
            print()
            for eng in _all_engines:
                eng.close()

        save()
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
