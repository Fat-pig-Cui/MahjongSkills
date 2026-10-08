import shutil
import subprocess
import struct
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import extract_config
import mahjong_checks as checks
import validate


class HandTests(unittest.TestCase):
    def test_red_five_shares_copy_limit(self):
        self.assertEqual(checks.tiles("0555p"), [13] * 4)
        with self.assertRaises(ValueError):
            checks.tiles("05555p")

    def test_invalid_honors_and_sanma_tiles(self):
        for hand, players in [("0z", 4), ("8z", 4), ("2m", 3), ("0m", 3)]:
            with self.subTest(hand=hand), self.assertRaises(ValueError):
                checks.tiles(hand, players)

    def test_fixed_kan_counts_four_physical_tiles(self):
        checks.validate_hand({"state": "complete", "hand": "[1111m] 222p 333s 555z 77p", "kind": "standard"})
        with self.assertRaises(ValueError):
            checks.validate_hand({"state": "complete", "hand": "[1111m] 11m 222p 333s 555z", "kind": "standard"})

    def test_original_pinfu_honor_pair_is_rejected(self):
        with self.assertRaises(ValueError):
            checks.validate_hand({"state": "tenpai", "hand": "123m 456p 789s 56s 77z", "win": "4s 7s", "kind": "pinfu"})

    def test_unlisted_third_wait_is_rejected(self):
        with self.assertRaises(ValueError):
            checks.validate_hand({"state": "tenpai", "hand": "123m 456p 234s 56s 88p", "win": "4s 7s", "kind": "pinfu"})

    def test_complete_hand_cannot_be_labelled_tenpai(self):
        with self.assertRaises(ValueError):
            checks.validate_hand({"state": "tenpai", "hand": "222m 555p 888s 111z 77m", "win": "7m", "kind": "suuankou"})

    def test_seven_pairs_needs_seven_distinct_types(self):
        with self.assertRaises(ValueError):
            checks.validate_hand({"state": "complete", "hand": "1111m 22m 33p 44p 55s 66s", "kind": "chiitoitsu"})


class PaymentTests(unittest.TestCase):
    def test_illegal_fu_method_combinations(self):
        for fu, han, tsumo in [(20, 2, False), (20, 1, True), (25, 2, True), (25, 1, False)]:
            with self.subTest(fu=fu, han=han, tsumo=tsumo), self.assertRaises(ValueError):
                checks.payments(fu, han, 4, 0, 1, tsumo, 2)

    def test_fixed_fu_and_rounding(self):
        self.assertEqual(checks.payments(20, 2, 4, 0, 1, True), [700, 0, 400, 400])
        self.assertEqual(checks.payments(25, 3, 4, 0, 1, True), [1600, 0, 800, 800])
        self.assertEqual(checks.payments(30, 4, 4, 0, 1, False, 2), [0, 0, 7700, 0])

    def test_kazoe_is_single_but_natural_yakuman_can_stack(self):
        self.assertEqual(checks.base_points(30, 26), 8000)
        self.assertEqual(checks.base_points(30, 1, yakuman=2), 16000)

    def test_sanma_loss_only_on_tsumo_pao(self):
        common = {"players": 3, "dealer": 2}
        self.assertEqual(checks.settlement({**common, "wins": [{"winner": 0, "tsumo": True, "yakuman": 1, "responsible": 1}]}), [24000, -24000, 0])
        self.assertEqual(checks.settlement({**common, "wins": [{"winner": 0, "tsumo": False, "loser": 2, "yakuman": 1, "responsible": 1}]}), [32000, -16000, -16000])

    def test_multi_ron_skips_nonwinner_and_conserves_deposits(self):
        result = checks.settlement({"players": 4, "dealer": 0, "honba": 2, "sticks": 3,
                                    "wins": [{"winner": 0, "loser": 1, "tsumo": False, "han": 5},
                                             {"winner": 3, "loser": 1, "tsumo": False, "fu": 30, "han": 3}]})
        self.assertEqual(result, [12000, -16500, 0, 7500])
        self.assertEqual(sum(result), 3000)

    def test_noten_all_counts_conserve_points(self):
        for players in (3, 4):
            for count in range(players + 1):
                result = checks.noten(players, list(range(count)))
                self.assertEqual(sum(result), 0)
                if count not in (0, players):
                    self.assertEqual(sum(n for n in result if n > 0), (players - 1) * 1000)
        with self.assertRaises(ValueError):
            checks.noten(3, [0, 0])

    def test_pure_and_mixed_pao_change_honba_payers(self):
        for players, pure, mixed in (
            (4, [32600, -32600, 0, 0], [64600, -40200, -16200, -8200]),
            (3, [24400, -24400, 0], [48400, -32200, -16200]),
        ):
            common = {"players": players, "dealer": 2, "honba": 2}
            event = {"winner": 0, "tsumo": True, "yakuman": 1, "responsible": 1}
            with self.subTest(players=players):
                self.assertEqual(checks.settlement({**common, "wins": [event]}), pure)
                self.assertEqual(checks.settlement({**common, "wins": [
                    {**event, "yakuman": 2, "pao_yakuman": 1}]}), mixed)

    def test_responsible_discarder_pays_both_halves_and_honba(self):
        for players, expected in ((4, [64600, -64600, 0, 0]), (3, [64400, -64400, 0])):
            with self.subTest(players=players):
                result = checks.settlement({"players": players, "dealer": 2, "honba": 2,
                                           "wins": [{"winner": 0, "tsumo": False, "loser": 1,
                                                     "yakuman": 2, "pao_yakuman": 1, "responsible": 1}]})
                self.assertEqual(result, expected)

    def test_partial_pao_does_not_redirect_other_yakuman(self):
        for players in (3, 4):
            for dealer in range(players):
                for responsible in range(1, players):
                    with self.subTest(players=players, dealer=dealer, responsible=responsible):
                        common = {"players": players, "dealer": dealer}
                        pure = checks.settlement({**common, "wins": [{"winner": 0, "tsumo": True,
                                                "yakuman": 2, "responsible": responsible}]})
                        ordinary = checks.settlement({**common, "wins": [{"winner": 0, "tsumo": True,
                                                    "yakuman": 1}]})
                        combined = checks.settlement({**common, "wins": [{"winner": 0, "tsumo": True,
                                                    "yakuman": 3, "pao_yakuman": 2,
                                                    "responsible": responsible}]})
                        self.assertEqual(combined, [a + b for a, b in zip(pure, ordinary)])
                        self.assertEqual(sum(combined), 0)

    def test_pao_ron_multiron_keeps_one_honba_and_deposit_award(self):
        result = checks.settlement({"players": 4, "dealer": 0, "honba": 2, "sticks": 3,
                                    "wins": [{"winner": 0, "tsumo": False, "loser": 2,
                                              "yakuman": 2, "pao_yakuman": 1, "responsible": 1},
                                             {"winner": 3, "tsumo": False, "loser": 2,
                                              "fu": 30, "han": 3}]})
        self.assertEqual(result, [96000, -24000, -76500, 7500])
        self.assertEqual(sum(result), 3000)

    def test_invalid_pao_portions_are_rejected(self):
        common = {"players": 3, "dealer": 2}
        event = {"winner": 0, "tsumo": True, "yakuman": 2, "responsible": 1}
        for portion in (0, -1, 3, 1.5):
            with self.subTest(portion=portion), self.assertRaises(ValueError):
                checks.settlement({**common, "wins": [{**event, "pao_yakuman": portion}]})
        with self.assertRaises(ValueError):
            checks.settlement({**common, "wins": [{"winner": 0, "tsumo": True,
                                                   "yakuman": 2, "pao_yakuman": 1}]})

    def test_nagashi_ignores_honba_and_keeps_deposits(self):
        for players in (3, 4):
            for no_loss in (False, True) if players == 3 else (False,):
                for winners in ([0], [1], [1, 2]):
                    common = {"players": players, "dealer": 0, "nagashi": True,
                              "no_loss": no_loss,
                              "wins": [{"winner": p, "tsumo": True, "han": 5} for p in winners]}
                    original = checks.settlement(common)
                    for honba, sticks in ((1, 0), (0, 2), (3, 2)):
                        with self.subTest(players=players, no_loss=no_loss, winners=winners,
                                          honba=honba, sticks=sticks):
                            actual = checks.settlement({**common, "honba": honba, "sticks": sticks})
                            self.assertEqual(actual, original)
                            self.assertEqual(sum(actual), 0)

    def test_no_loss_yakuman_and_kazoe_use_north_share(self):
        self.assertEqual(checks.payments(30, 1, 3, 2, 0, True, yakuman=1, no_loss=True),
                         [0, 12000, 20000])
        self.assertEqual(checks.payments(30, 1, 3, 0, 0, True, yakuman=2, no_loss=True),
                         [0, 48000, 48000])
        for han in (13, 26):
            self.assertEqual(checks.payments(30, han, 3, 2, 0, True, no_loss=True),
                             [0, 12000, 20000])
        # The room option changes tsumo only; ron keeps its full standard value.
        self.assertEqual(checks.payments(30, 1, 3, 2, 0, False, 2, 2, no_loss=True),
                         [0, 0, 64000])

    def test_no_loss_pao_redirects_only_responsible_portion(self):
        common = {"players": 3, "dealer": 2, "no_loss": True}
        event = {"winner": 0, "tsumo": True, "yakuman": 1, "responsible": 1}
        self.assertEqual(checks.settlement({**common, "wins": [event]}), [32000, -32000, 0])
        self.assertEqual(checks.settlement({**common, "wins": [
            {**event, "yakuman": 2, "pao_yakuman": 1}]}), [64000, -44000, -20000])
        self.assertEqual(checks.settlement({**common, "honba": 2, "sticks": 1,
                                           "wins": [event]}), [33400, -32400, 0])


class DocumentTests(unittest.TestCase):
    def test_full_package(self):
        result = validate.validate(ROOT)
        self.assertEqual(result["hands"], 19)
        self.assertEqual(result["settlements"], 58)
        self.assertEqual(result["match_cases"], 22)
        self.assertEqual(result["fourth_kan_cases"], 11)

    def test_threshold_tie_and_extension(self):
        judge = validate.documented_judge(ROOT)
        self.assertFalse(judge((2, 4), (2, 4), (3, 4), 30000, [30000, 30000, 20000, 20000], 0, 1, False))
        # Same tied score, but original east outranks south; the dealer is second.
        self.assertTrue(judge((2, 4), (2, 4), (3, 4), 30000, [30000, 30000, 20000, 20000], 1, 2, False))
        self.assertTrue(judge((3, 1), (2, 4), (3, 4), 30000, [25000, 35000, 20000, 20000], 0, 2, True))

    def test_invalid_table_edit_is_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "references/topics").mkdir(parents=True)
            target = root / "references/topics/04-scoring.md"
            source = (ROOT / "references/topics/04-scoring.md").read_text()
            target.write_text(source.replace("700 / 400", "800 / 400", 1))
            with self.assertRaises(ValueError):
                validate.check_score_table(root)

    def test_fourth_kan_timing_regressions_are_detected(self):
        source = (ROOT / "references/examples/gameplay.md").read_text()
        mutations = (
            ("切牌 → 翻指示牌 → 舍牌荣和", "切牌 → 舍牌荣和 → 翻指示牌"),
            ("翻指示牌 → 岭上摸牌 → 岭上自摸", "岭上摸牌 → 翻指示牌 → 岭上自摸"),
            ("| 加杠 | 岭上自摸 | 杠成立 → 岭上摸牌 → 岭上自摸 |",
             "| 加杠 | 岭上自摸 | 杠成立 → 翻指示牌 → 岭上摸牌 → 岭上自摸 |"),
            ("切牌 → 舍牌通过 → 四杠散了", "切牌 → 四杠散了"),
            ("| 加杠 | 抢杠荣和 | 抢杠荣和 |",
             "| 加杠 | 抢杠荣和 | 抢杠荣和 → 岭上摸牌 |"),
            ("岭上摸牌 → 切牌 → 翻指示牌", "岭上摸牌 → 拔北 → 切牌 → 翻指示牌"),
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "references/examples").mkdir(parents=True)
            target = root / "references/examples/gameplay.md"
            for old, new in mutations:
                with self.subTest(mutation=old):
                    self.assertIn(old, source)
                    target.write_text(source.replace(old, new, 1))
                    with self.assertRaises(ValueError):
                        validate.check_fourth_kans(root)

    def test_invalid_settlement_document_edit_is_detected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / "references/examples", root / "references/examples")
            target = root / "references/examples/scoring.md"
            target.write_text(target.read_text().replace("| +7500 |", "| +7400 |", 1))
            with self.assertRaises(ValueError):
                validate.check_settlements(root)

    def test_outside_package_link_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "SKILL.md").write_text("---\nname: demo\ndescription: demo\n---\n[bad](../outside.md)")
            with self.assertRaises(ValueError):
                validate.check_links(root)

    def test_pao_opponent_reallocation_is_detected_even_with_same_total(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / "references/examples", root / "references/examples")
            target = root / "references/examples/scoring.md"
            source = target.read_text()
            old = "| 48400 | -32200 | -16200 |"
            self.assertIn(old, source)
            target.write_text(source.replace(old, "| 48400 | -24200 | -24200 |", 1))
            with self.assertRaises(ValueError):
                validate.check_settlements(root)

    def test_shanpon_bound_regression_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(ROOT / "references/topics", root / "references/topics")
            target = root / "references/topics/10-shanten-efficiency.md"
            target.write_text(target.read_text().replace("| 双碰听 | 最多4枚", "| 双碰听 | 最多8枚"))
            with self.assertRaises(ValueError):
                validate.check_waits_and_defense(root)

    def test_packaged_copy_has_no_checkout_dependencies(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "riichi-mahjong"
            root.mkdir()
            shutil.copy(ROOT / "SKILL.md", root)
            for path in ("references", "scripts"):
                shutil.copytree(ROOT / path, root / path, ignore=shutil.ignore_patterns("__pycache__"))
            result = validate.validate(root)
            self.assertEqual(result["match_cases"], 22)
            self.assertEqual(result["fourth_kan_cases"], 11)
            subprocess.run([sys.executable, str(root / "scripts/validate.py")], cwd=root.parent,
                           check=True, capture_output=True, text=True)


def vint(value):
    result = bytearray()
    while value >= 128:
        result.append((value & 127) | 128)
        value >>= 7
    result.append(value)
    return bytes(result)


def field(number, value):
    if isinstance(value, int):
        return vint(number << 3) + vint(value)
    if isinstance(value, str):
        value = value.encode()
    return vint((number << 3) | 2) + vint(len(value)) + value


class ConfigDecoderTests(unittest.TestCase):
    def test_wire_all_supported_kinds(self):
        raw = field(1, 300) + field(2, "north") + vint((3 << 3) | 5) + struct.pack("<f", 1.5)
        self.assertEqual(extract_config.wire(raw)[1], [300])
        self.assertEqual(extract_config.wire(raw)[2], [b"north"])
        self.assertEqual(extract_config.decode_scalar(extract_config.wire(raw)[3][0], "float"), 1.5)

    def test_truncation_zero_tag_and_invalid_types(self):
        for raw in (b"\x80", b"\x12\x05ab", b"\x00", b"\x0b", b"\x09\x00", b"\x80" * 11):
            with self.subTest(raw=raw), self.assertRaises(ValueError):
                extract_config.wire(raw)

    def test_signed_and_utf8_values(self):
        self.assertEqual(extract_config.decode_scalar((1 << 64) - 1, "int32"), -1)
        self.assertEqual(extract_config.decode_scalar(3, "sint32"), -2)
        self.assertEqual(extract_config.decode_scalar("拔北".encode(), "string"), "拔北")
        with self.assertRaises(ValueError):
            extract_config.decode_scalar(b"packed", "uint32")

    def test_schema_driven_extraction(self):
        id_meta = field(1, "id") + field(3, "uint32") + field(4, 1)
        points_meta = field(1, "init_point") + field(3, "uint32") + field(4, 2)
        sheet_meta = field(1, "matchmode") + field(3, id_meta) + field(3, points_meta)
        schema = field(1, "desktop") + field(2, sheet_meta)
        row = field(1, 2) + field(2, 25000)
        data = field(1, "desktop") + field(2, "matchmode") + field(3, row)
        raw = field(1, "0.0.1") + field(3, schema) + field(4, data)
        with patch.object(extract_config, "SELECTED", {("desktop", "matchmode"): {2}}):
            result = extract_config.extract(raw, "0.11.252.w")
        self.assertEqual(result["tables"]["desktop.matchmode"], [{"id": 2, "init_point": 25000}])

    def test_resource_prefix_comes_from_manifest(self):
        with patch.object(extract_config, "download", return_value=b'{"res":{"res/config/lqc.lqbin":{"prefix":"v0.10.1.w"}}}'):
            url, _ = extract_config.resolve_config("0.11.252.w")
        self.assertEqual(url, "https://game.maj-soul.com/1/v0.10.1.w/res/config/lqc.lqbin")
        with self.assertRaises(ValueError):
            extract_config.resolve_config("../invalid")


if __name__ == "__main__":
    unittest.main()
