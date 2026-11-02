#!/usr/bin/env python3
"""Small dependency-free CLI for the documented MahjongSkills checks."""

import argparse
import json
import sys
from pathlib import Path

from mahjong_checks import (base_points, flower_pig_deltas, payments,
                            settlement, validate_hand)


def parser():
    root = argparse.ArgumentParser(description=__doc__)
    sub = root.add_subparsers(dest="command", required=True)

    hand = sub.add_parser("hand", help="validate a complete hand or exact waits")
    hand.add_argument("--state", choices=("tenpai", "complete"), required=True)
    hand.add_argument("--hand", required=True, help="compact tiles; fixed melds use [111m]")
    hand.add_argument("--kind", required=True, help="standard, pinfu, chiitoitsu, or supported structural kind")
    hand.add_argument("--win", help="space-separated expected winning tiles for tenpai")
    hand.add_argument("--players", type=int, choices=(3, 4), default=4)

    score = sub.add_parser("score", help="calculate base points")
    score.add_argument("--fu", type=int, required=True)
    score.add_argument("--han", type=int, required=True)
    score.add_argument("--yakuman", type=int, default=0)

    pay = sub.add_parser("payments", help="calculate per-player payment amounts")
    for name in ("fu", "han", "players", "dealer", "winner"):
        pay.add_argument("--" + name, type=int, required=True)
    pay.add_argument("--tsumo", action="store_true")
    pay.add_argument("--loser", type=int)
    pay.add_argument("--yakuman", type=int, default=0)
    pay.add_argument("--no-loss", action="store_true")

    settle = sub.add_parser("settlement", help="calculate a structured settlement JSON")
    source = settle.add_mutually_exclusive_group(required=True)
    source.add_argument("--json", dest="json_text")
    source.add_argument("--file", type=Path)

    pig = sub.add_parser("flower-pig", help="calculate 赤羽花猪 transfer matrix")
    pig.add_argument("--huazhu", required=True, help="comma-separated booleans, e.g. true,false,false,false")
    pig.add_argument("--huled", required=True, help="comma-separated booleans")
    pig.add_argument("--possible-points", default=None, help="comma-separated nonnegative point values")
    return root


def booleans(text):
    values = [value.strip().lower() for value in text.split(",")]
    if any(value not in {"true", "false"} for value in values):
        raise ValueError("boolean lists must contain only true or false")
    return [value == "true" for value in values]


def main(argv=None):
    args = parser().parse_args(argv)
    try:
        if args.command == "hand":
            fields = {"state": args.state, "hand": args.hand, "kind": args.kind,
                      "players": str(args.players)}
            if args.win is not None:
                fields["win"] = args.win
            validate_hand(fields)
            result = {"valid": True, "command": "hand"}
        elif args.command == "score":
            result = {"base_points": base_points(args.fu, args.han, args.yakuman)}
        elif args.command == "payments":
            result = {"payments": payments(args.fu, args.han, args.players, args.dealer,
                                             args.winner, args.tsumo, args.loser,
                                             args.yakuman, args.no_loss)}
        elif args.command == "settlement":
            text = args.json_text if args.json_text is not None else args.file.read_text()
            result = {"settlement": settlement(json.loads(text))}
        else:
            huazhu = booleans(args.huazhu)
            huled = booleans(args.huled)
            points = ([int(value) for value in args.possible_points.split(",")]
                      if args.possible_points is not None else None)
            matrix = flower_pig_deltas(huazhu, huled, points)
            result = {"deltas": matrix, "net": [sum(row) for row in matrix]}
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
