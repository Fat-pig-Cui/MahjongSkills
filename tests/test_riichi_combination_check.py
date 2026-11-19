import importlib.util
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).parents[1]
SPEC = importlib.util.spec_from_file_location(
    "riichi_combination_check", ROOT / "scripts" / "riichi_combination_check.py"
)
CHECK = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = CHECK
SPEC.loader.exec_module(CHECK)


class RiichiCombinationCheckTests(unittest.TestCase):
    def test_report_tables_reconcile(self):
        result = CHECK.check_report()
        self.assertTrue(result["row_arithmetic"])
        self.assertTrue(result["matches_report"])
        self.assertTrue(result["set_arithmetic"])
        self.assertFalse(result["full_count_verified"])

    def test_published_high_han_certificates(self):
        result = CHECK.check_examples()
        self.assertEqual(result["menzen20"]["han"], 20)
        self.assertEqual(result["open17"]["han"], 17)
        self.assertFalse(result["menzen20"]["errors"])
        self.assertFalse(result["open17"]["errors"])
        self.assertIn("sanankou", result["menzen20"]["yaku"])
        self.assertIn("sanankou", result["open17"]["yaku"])

    def test_event_constraints_do_not_allow_double_riichi_and_riichi(self):
        event = CHECK.EventState(riichi=True, double_riichi=True)
        self.assertIn("double_riichi replaces riichi", event.errors(True))

    def test_score_order_uses_riichi_limit_tiers(self):
        for yaku, base in ((["chinitsu"], 3000),
                           (["chinitsu", "riichi", "ippatsu"], 4000),
                           (["chinitsu", "junchantaiyao", "double_riichi"], 6000)):
            with self.subTest(yaku=yaku):
                self.assertEqual(CHECK.score_key(CHECK.bitset(yaku), 30, True)[0], base)
        self.assertEqual(CHECK.score_key(CHECK.bitset(["honitsu", "riichi", "ippatsu"]), 30, True)[0], 2000)

    def test_pair_and_sequence_are_not_a_third_suit_triplet(self):
        groups = (CHECK.Group("triplet", (CHECK.sid("1m"),) * 3),
                  CHECK.Group("triplet", (CHECK.sid("1p"),) * 3),
                  CHECK.Group("seq", tuple(CHECK.sid(t) for t in ("1s", "2s", "3s"))),
                  CHECK.Group("seq", tuple(CHECK.sid(t) for t in ("4m", "5m", "6m"))))
        hand = CHECK.Decomp(groups, (CHECK.sid("1s"),) * 2)
        bits, _, _ = CHECK.evaluate(hand)
        self.assertNotIn("sanshoku_doukou", CHECK.names(bits))


if __name__ == "__main__":
    unittest.main()
