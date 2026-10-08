#!/usr/bin/env python3
"""Offline validation of the complete skill package and documented examples."""

import argparse
import ast
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote

from mahjong_checks import MODES, base_points, legal_fu_han, noten, round100, settlement, tiles, validate_hand


def markdown_files(root):
    return sorted(p for p in root.rglob("*.md")
                  if not any(part.startswith(".") for part in p.relative_to(root).parts))


def anchors(text):
    result = set(re.findall(r'<a\s+id="([^"]+)"\s*>', text))
    counts = {}
    for heading in re.findall(r"^#{1,6}\s+(.+)$", text, re.M):
        slug = re.sub(r"[^\w\s-]", "", heading.lower().replace("`", ""))
        slug = re.sub(r"\s", "-", slug)
        suffix = counts.get(slug, 0)
        counts[slug] = suffix + 1
        result.add(slug + (f"-{suffix}" if suffix else ""))
    return result


def check_links(root):
    documents = markdown_files(root)
    adjacency = {}
    count = 0
    for doc in documents:
        text = doc.read_text()
        for number, line in enumerate(text.splitlines(), 1):
            if line.endswith("\t") or (line.endswith(" ") and not line.endswith("  ")):
                raise ValueError(f"Trailing whitespace: {doc}:{number}")
        if doc != root / "SKILL.md" and text.startswith("---\nname:"):
            raise ValueError(f"Reference still has skill frontmatter: {doc}")
        if text.count("```") % 2:
            raise ValueError(f"Unclosed code fence: {doc}")
        targets = []
        for href in re.findall(r"\[[^\]\n]*\]\(([^)]+)\)", text):
            if re.match(r"^[a-z]+://", href):
                continue
            path, _, anchor = unquote(href.strip("<>")).partition("#")
            target = (doc.parent / path).resolve() if path else doc
            if not target.is_relative_to(root) or not target.is_file():
                raise ValueError(f"Missing or outside-package link in {doc}: {href}")
            if anchor and (target.suffix != ".md" or anchor not in anchors(target.read_text())):
                raise ValueError(f"Missing anchor in {doc}: {href}")
            targets.append(target)
            count += 1
        adjacency[doc] = targets
    entrypoints = [p for p in documents if p.name == "SKILL.md"]
    if entrypoints != [root / "SKILL.md"]:
        raise ValueError("Package must have exactly one root SKILL.md")
    text = (root / "SKILL.md").read_text()
    match = re.match(r"^---\nname: ([a-z0-9-]+)\ndescription: ([^\n]+)\n---", text)
    if not match or len(match[1]) > 64 or len(match[2]) > 1024:
        raise ValueError("Invalid root skill frontmatter")
    seen, pending = set(), [root / "SKILL.md"]
    while pending:
        doc = pending.pop()
        if doc in seen:
            continue
        seen.add(doc)
        pending.extend(p for p in adjacency.get(doc, []) if p.suffix == ".md")
    unreachable = [p for p in documents if p.is_relative_to(root / "references") and p not in seen]
    if unreachable:
        raise ValueError(f"Unreachable reference documents: {unreachable}")
    return count


def hand_blocks(text):
    blocks = []
    for name, body in re.findall(r"```mahjong ([\w-]+)\n(.*?)\n```", text, re.S):
        fields = {}
        for line in body.splitlines():
            key, separator, value = line.partition(":")
            if not separator or key in fields:
                raise ValueError(f"Malformed fields in hand {name}")
            fields[key] = value.strip()
        blocks.append((name, fields))
    if len({name for name, _ in blocks}) != len(blocks):
        raise ValueError("Duplicate hand IDs")
    return blocks


def check_hands(root):
    blocks = hand_blocks((root / "references/examples/hands.md").read_text())
    if not blocks:
        raise ValueError("No machine-readable hand examples")
    for name, fields in blocks:
        try:
            validate_hand(fields)
        except (ValueError, KeyError) as error:
            raise ValueError(f"Hand {name}: {error}") from error
    return len(blocks)


def table_rows(text):
    return [[cell.strip() for cell in line.strip().strip("|").split("|")]
            for line in text.splitlines() if line.startswith("|")
            and not re.match(r"^\|[\s:|-]+\|$", line)]


def named_table(text, name):
    marker = f"<!-- check:{name} -->"
    if text.count(marker) != 1:
        raise ValueError(f"Expected one table marker: {name}")
    part = text.split(marker, 1)[1].lstrip()
    lines = []
    for line in part.splitlines():
        if not line.startswith("|"):
            break
        lines.append(line)
    rows = table_rows("\n".join(lines))
    if len(rows) < 2:
        raise ValueError(f"No data rows in {name}")
    return rows[1:]


def check_score_table(root):
    text = (root / "references/topics/04-scoring.md").read_text()
    count = 0
    for row in table_rows(text):
        match = re.fullmatch(r"(\d+)符(\d+)番", row[0])
        if not match:
            continue
        fu, han = map(int, match.groups())
        b = base_points(fu, han)
        expected = [str(round100(b * 4)), f"{round100(b * 2)} / {round100(b)}",
                    str(round100(b * 6)), f"{round100(b * 2)} all"]
        for index, (actual, value) in enumerate(zip(row[1:], expected)):
            valid = legal_fu_han(fu, han, index in (1, 3))
            if not valid:
                value = "—"
            elif b == 2000 and actual == "满贯":
                value = "满贯"
            if actual != value:
                raise ValueError(f"Payment table {fu}fu {han}han column {index}: {actual}, expected {value}")
            count += 1
    if not count:
        raise ValueError("Missing payment table")
    return count


def check_settlements(root):
    cases = json.loads((root / "references/examples/settlement-cases.json").read_text())["cases"]
    text = (root / "references/examples/scoring.md").read_text()
    if not cases or len({c["id"] for c in cases}) != len(cases):
        raise ValueError("Missing/duplicate settlement IDs")
    for case in cases:
        actual = noten(case["players"], case["tenpai"]) if "tenpai" in case else settlement(case)
        deposit_award = 0 if case.get("nagashi") else case.get("sticks", 0) * 1000
        if actual != case["expected"] or sum(actual) != deposit_award:
            raise ValueError(f"Settlement {case['id']}: {actual}, expected {case['expected']}")
        table = named_table(text, case["table"])
        numbers = [int(table[row][column]) for row in case["rows"] for column in case["columns"]]
        expected = [max(actual)] if case.get("total_only") else actual
        if numbers != expected:
            raise ValueError(f"Document table {case['id']}: {numbers}, expected {expected}")
        # Also check numeric opponent payments rather than only winner totals.
        if case["table"] == "sanma-honba":
            row = table[case["rows"][0]]
            if [int(row[i]) for i in (1, 2, 3)] != [-actual[0], -actual[1], case.get("sticks", 0) * 1000]:
                raise ValueError(f"Opponent/deposit cells disagree: {case['id']}")
        if case["table"] == "sanma-nagashi":
            row = table[case["rows"][0]]
            if [int(row[i]) for i in (1, 2)] != [-actual[0], -actual[1]]:
                raise ValueError(f"Nagashi opponent cells disagree: {case['id']}")
        if case["table"] == "no-loss":
            row = table[case["rows"][0]]
            if [int(row[i]) for i in (4, 5)] != [-actual[0], -actual[1]]:
                raise ValueError(f"No-loss opponent cells disagree: {case['id']}")
        if case["table"] == "sanma-pao-tsumo":
            row = table[case["rows"][0]]
            if [int(row[i]) for i in (3, 4, 5)] != [-actual[1], actual[0], -actual[2]]:
                raise ValueError(f"Pao cells disagree: {case['id']}")
    return len(cases)


def documented_judge(root):
    text = (root / "references/topics/08-match-rules.md").read_text()
    code = re.search(r"```python\n(.*?)\n```", text, re.S)
    if not code:
        raise ValueError("No documented end-condition function")
    tree = ast.parse(code[1])
    allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.If, ast.Return,
               ast.Compare, ast.Call, ast.Name, ast.Constant, ast.Subscript, ast.BoolOp,
               ast.And, ast.Load, ast.Lt, ast.GtE, ast.Eq)
    for node in ast.walk(tree):
        if not isinstance(node, allowed):
            raise ValueError(f"Unsupported end-condition syntax: {type(node).__name__}")
        if isinstance(node, ast.Call) and not (isinstance(node.func, ast.Name) and node.func.id in {"min", "max"}):
            raise ValueError("Only min/max calls allowed in documented judge")
    if len(tree.body) != 1 or not isinstance(tree.body[0], ast.FunctionDef) or tree.body[0].name != "judge":
        raise ValueError("Expected exactly one judge function")
    namespace = {"__builtins__": {"min": min, "max": max}}
    exec(compile(tree, "documented_judge", "exec"), namespace)
    return namespace["judge"]


def check_matches(root):
    judge = documented_judge(root)
    rows = named_table((root / "references/examples/gameplay.md").read_text(), "match")
    covered = set()
    for mode, phase, dealer, score_text, rotates, expected, _ in rows:
        last, extension, threshold = MODES[mode]
        players = 3 if mode.startswith("三麻") else 4
        scores = [int(n) for n in score_text.split(",")]
        dealer = int(dealer)
        current = ("东南西".index(phase[0]) + 1, int(phase[1:]))
        if len(scores) != players or dealer != current[1] - 1:
            raise ValueError(f"Invalid player/dealer inputs in {mode} {phase}")
        if rotates not in {"是", "否"} or expected not in {"true", "false"}:
            raise ValueError("Invalid match boolean")
        rank = sorted(range(players), key=lambda p: (-scores[p], p)).index(dealer) + 1
        actual = judge(current, last, extension, threshold, scores, dealer, rank, rotates == "是")
        if actual != (expected == "true"):
            raise ValueError(f"Match {mode} {phase} {scores}: {actual}, expected {expected}")
        covered.add(mode)
    if covered != set(MODES):
        raise ValueError("End examples do not cover all four ranked modes")
    return len(rows)


def check_fourth_kans(root):
    rows = named_table((root / "references/examples/gameplay.md").read_text(), "fourth-kan")
    kinds = {"暗杠", "大明杠", "加杠"}
    endings = {"岭上自摸", "舍牌荣和", "四杠散了"}
    required = {(kind, ending) for kind in kinds for ending in endings}
    required |= {("暗杠", "抢杠荣和"), ("加杠", "抢杠荣和")}
    seen = set()
    for kind, ending, sequence in rows:
        key = (kind, ending)
        if key not in required or key in seen:
            raise ValueError(f"Invalid/duplicate fourth-kan branch: {key}")
        seen.add(key)
        events = [event.strip() for event in sequence.split("→")]
        if ending == "抢杠荣和":
            if events != [ending]:
                raise ValueError("Robbed fourth kan cannot flip, draw or abort")
            continue
        expected = ["杠成立", "岭上摸牌"]
        if ending != "岭上自摸":
            expected.append("切牌")
            if ending == "四杠散了":
                expected.append("舍牌通过")
        expected.append(ending)
        # Closed kan flips before the draw; open/added kan flips immediately
        # after discarding, even if that discard is subsequently won by ron.
        if kind == "暗杠":
            expected.insert(expected.index("岭上摸牌"), "翻指示牌")
        elif ending != "岭上自摸":
            expected.insert(expected.index("切牌") + 1, "翻指示牌")
        if events != expected:
            raise ValueError(f"Fourth-kan sequence {key}: {events}, expected {expected}")
    if seen != required:
        raise ValueError("Fourth-kan examples do not cover all response branches")
    return len(rows)


def check_waits_and_defense(root):
    text = (root / "references/topics/10-shanten-efficiency.md").read_text()
    # Upper bounds derive from the copies already held in a single waiting shape.
    upper = {"两面听": 2 * 4, "双碰听": 2 * (4 - 2), "嵌张听": 4,
             "边张听": 4, "单骑听": 4 - 1}
    found = set()
    for row in table_rows(text):
        if row[0] in upper:
            if row[1] != f"最多{upper[row[0]]}枚":
                raise ValueError(f"Waiting-shape copy bound incorrect: {row[0]}")
            found.add(row[0])
    if found != set(upper):
        raise ValueError("Waiting-shape table incomplete")
    defense = named_table((root / "references/topics/11-defense-danger.md").read_text(), "defense")
    four_man = tiles("4m")[0]
    for pair_text, wait_text, furiten, possible in defense:
        pair = tiles(pair_text)
        waits = {t for t in range(9) if sorted(pair + [t]) == list(range(min(pair + [t]), min(pair + [t]) + 3))}
        if len(pair) != 2 or set(tiles(wait_text)) != waits:
            raise ValueError(f"Wrong sequence waits: {pair_text}")
        if (furiten == "是") != (four_man in waits) or (possible == "是") != (four_man not in pair):
            raise ValueError(f"Wrong suji/wall implication: {pair_text}")
    return len(upper) + len(defense)


def check_evidence(root):
    from extract_config import PINNED_SHA256, PINNED_VERSION, SELECTED
    evidence = json.loads((root / "references/evidence/config-excerpt-2026-10-07.json").read_text())
    if evidence["sha256"] != PINNED_SHA256 or evidence["resource_version"] != PINNED_VERSION:
        raise ValueError("Historical excerpt identity differs from pinned resource")
    count = 0
    for key, ids in SELECTED.items():
        rows = evidence["tables"][".".join(key)]
        if {row["id"] for row in rows} != ids or len(rows) != len(ids):
            raise ValueError(f"Historical excerpt has missing/duplicate rows: {key}")
        count += len(rows)
    for row in evidence["tables"]["desktop.matchmode"]:
        expected = (25000, 30000) if row["mode"] in (1, 2) else (35000, 40000)
        if (row["init_point"], row["back_point"]) != expected:
            raise ValueError("Historical match points disagree with documented baseline")
    north = evidence["tables"]["fan.fan"][0]
    if [north[key] for key in ("xuanshang", "fan_menqing", "fan_fulu")] != [1, 1, 1]:
        raise ValueError("Historical north-dora excerpt differs")
    return count


def validate(root):
    root = root.resolve()
    return {"links": check_links(root), "hands": check_hands(root),
            "payment_cells": check_score_table(root), "settlements": check_settlements(root),
            "match_cases": check_matches(root), "fourth_kan_cases": check_fourth_kans(root),
            "wait_defense_cases": check_waits_and_defense(root),
            "evidence_rows": check_evidence(root)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        result = validate(args.root)
    except (ValueError, KeyError, IndexError, OSError, SyntaxError) as error:
        print(f"FAIL: {error}", file=sys.stderr)
        return 1
    print("PASS: " + ", ".join(f"{key}={value}" for key, value in result.items()))
    print("Scope: offline document consistency; not server behavior or exhaustive yaku validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
