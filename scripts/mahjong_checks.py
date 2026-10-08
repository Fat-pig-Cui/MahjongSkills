"""Small deterministic checks for documented examples, not a full yaku engine."""

import re
from collections import Counter
from functools import lru_cache


def tiles(text, players=4):
    """Expand compact notation; red fives share the ordinary five's copy limit."""
    result = []
    for token in text.split():
        match = re.fullmatch(r"([0-9]+)([mpsz])", token)
        if not match:
            raise ValueError(f"Invalid tile notation: {token}")
        digits, suit = match.groups()
        for digit in digits:
            number = int(digit)
            if suit == "z" and not 1 <= number <= 7:
                raise ValueError("Honor tile must be 1z..7z")
            if number == 0:
                number = 5
            if players == 3 and suit == "m" and number not in (1, 9):
                raise ValueError("Sanma has no 2m..8m or red 5m")
            result.append("mpsz".index(suit) * 9 + number - 1)
    if any(count > 4 for count in Counter(result).values()):
        raise ValueError("More than four copies of one tile")
    return result


def split_hand(text, players=4):
    melds = [tiles(m, players) for m in re.findall(r"\[([^\]]+)\]", text)]
    concealed = tiles(re.sub(r"\[[^\]]+\]", "", text), players)
    if "[" in re.sub(r"\[[^\]]+\]", "", text) or len(melds) > 4:
        raise ValueError("Invalid fixed melds")
    for meld in melds:
        ordered = sorted(meld)
        triplet = len(meld) in (3, 4) and len(set(meld)) == 1
        sequence = (len(meld) == 3 and ordered[0] < 27
                    and ordered[-1] // 9 == ordered[0] // 9
                    and ordered == list(range(ordered[0], ordered[0] + 3)))
        if not (triplet or sequence):
            raise ValueError("Fixed meld is not a sequence, triplet or kan")
    all_tiles = concealed + [t for m in melds for t in m]
    if any(count > 4 for count in Counter(all_tiles).values()):
        raise ValueError("More than four copies across hand and fixed melds")
    return concealed, melds


@lru_cache(maxsize=4096)
def meld_decompositions(counts):
    if not any(counts):
        return ((),)
    first = next(i for i, n in enumerate(counts) if n)
    result = []
    if counts[first] >= 3:
        rest = list(counts)
        rest[first] -= 3
        result.extend(((first,) * 3,) + d for d in meld_decompositions(tuple(rest)))
    if first < 27 and first % 9 <= 6 and counts[first + 1] and counts[first + 2]:
        rest = list(counts)
        for i in range(first, first + 3):
            rest[i] -= 1
        result.extend((tuple(range(first, first + 3)),) + d
                      for d in meld_decompositions(tuple(rest)))
    return tuple(result)


def standard_shapes(concealed, fixed=0):
    if len(concealed) != (4 - fixed) * 3 + 2:
        return []
    counts = Counter(concealed)
    result = []
    for pair, count in sorted(counts.items()):
        if count < 2:
            continue
        rest = [counts[i] - (2 if i == pair else 0) for i in range(34)]
        for melds in meld_decompositions(tuple(rest)):
            result.append((pair, melds))
    return result


def matches_kind(concealed, melds, kind, win=None, seat=27, round_wind=27):
    counts = Counter(concealed)
    if kind == "chiitoitsu":
        return not melds and len(counts) == 7 and set(counts.values()) == {2}
    if kind == "kokushi":
        terminals = {0, 8, 9, 17, 18, 26, *range(27, 34)}
        return (not melds and len(concealed) == 14 and set(counts) == terminals
                and sorted(counts.values()) == [1] * 12 + [2])
    shapes = standard_shapes(concealed, len(melds))
    if kind == "standard":
        return bool(shapes)
    if kind == "tanyao":
        all_tiles = concealed + [t for m in melds for t in m]
        return bool(shapes) and all(t < 27 and t % 9 not in (0, 8) for t in all_tiles)
    if melds:
        return False
    for pair, groups in shapes:
        sequences = [g for g in groups if len(set(g)) == 3]
        if kind == "suuankou" and all(len(set(g)) == 1 for g in groups):
            # These examples assert tanki; ron on a triplet is not asserted here.
            if win == pair:
                return True
        if kind == "pinfu" and len(sequences) == 4 and pair not in {seat, round_wind, 31, 32, 33}:
            for group in sequences:
                if win == group[0] and group[0] % 9 < 6:
                    return True
                if win == group[-1] and group[0] % 9 > 0:
                    return True
        duplicates = Counter(sequences)
        if kind == "iipeikou" and any(n >= 2 for n in duplicates.values()):
            return True
        if kind == "ryanpeikou" and sum(n // 2 for n in duplicates.values()) == 2:
            return True
    if kind not in {"standard", "tanyao", "pinfu", "suuankou", "iipeikou", "ryanpeikou"}:
        raise ValueError(f"Unknown structural check: {kind}")
    return False


def validate_hand(fields):
    players = int(fields.get("players", "4"))
    if players not in (3, 4):
        raise ValueError("players must be 3 or 4")
    concealed, melds = split_hand(fields["hand"], players)
    state, kind = fields["state"], fields["kind"]
    required = (4 - len(melds)) * 3 + (1 if state == "tenpai" else 2)
    if state not in {"tenpai", "complete"} or len(concealed) != required:
        raise ValueError("Tile count does not match state/fixed melds")
    if state == "complete":
        if not matches_kind(concealed, melds, kind):
            raise ValueError("Complete hand does not satisfy the asserted structure")
        return
    expected = set(tiles(fields["win"], players))
    counts = Counter(concealed + [t for m in melds for t in m])
    actual = set()
    for tile in range(34):
        if players == 3 and tile < 9 and tile not in (0, 8):
            continue
        if counts[tile] < 4 and matches_kind(concealed + [tile], melds, kind, tile):
            actual.add(tile)
    if actual != expected:
        raise ValueError(f"Expected waits {sorted(expected)}, actual {sorted(actual)}")


def base_points(fu, han, yakuman=0):
    if yakuman:
        if yakuman < 1:
            raise ValueError("Invalid yakuman multiple")
        return 8000 * yakuman
    if fu not in {20, 25, *range(30, 111, 10)} or han < 1:
        raise ValueError("Invalid fu/han")
    if han >= 13:
        return 8000
    if han >= 11:
        return 6000
    if han >= 8:
        return 4000
    if han >= 6:
        return 3000
    return min(fu * 2 ** (han + 2), 2000)


def legal_fu_han(fu, han, tsumo):
    if fu == 20:
        return tsumo and han >= 2
    if fu == 25:
        return han >= (3 if tsumo else 2)
    return True


def round100(value):
    return (value + 99) // 100 * 100


def payments(fu, han, players, dealer, winner, tsumo, loser=None, yakuman=0, no_loss=False):
    if players not in (3, 4) or not 0 <= winner < players or not 0 <= dealer < players:
        raise ValueError("Invalid players/dealer/winner")
    if not yakuman and not legal_fu_han(fu, han, tsumo):
        raise ValueError("Fu/han cannot occur for this winning method")
    b = base_points(fu, han, yakuman)
    pay = [0] * players
    if tsumo:
        for p in range(players):
            if p != winner:
                pay[p] = round100(b * (2 if winner == dealer or p == dealer else 1))
        if players == 3 and no_loss:
            north = round100(b * (2 if winner == dealer else 1))
            for p in range(players):
                if p != winner:
                    pay[p] += north // 2
    else:
        if loser is None or loser == winner or not 0 <= loser < players:
            raise ValueError("Invalid discarder")
        pay[loser] = round100(b * (6 if winner == dealer else 4))
    return pay


def settlement(case):
    players = case["players"]
    dealer = case["dealer"]
    result = [0] * players
    honba = case.get("honba", 0)
    sticks = case.get("sticks", 0)
    events = case["wins"]
    if not events or honba < 0 or sticks < 0:
        raise ValueError("Expected wins and nonnegative honba/deposits")
    if len({event["winner"] for event in events}) != len(events):
        raise ValueError("Duplicate winners")
    for event in events:
        winner = event["winner"]
        if "pao_yakuman" in event and "responsible" not in event:
            raise ValueError("Pao portion requires a responsible player")
        pay = payments(event.get("fu", 30), event.get("han", 5), players, dealer,
                       winner, event["tsumo"], event.get("loser"), event.get("yakuman", 0),
                       no_loss=case.get("no_loss", False))
        if "responsible" in event:
            total_yakuman = event.get("yakuman", 0)
            pao_yakuman = event.get("pao_yakuman", total_yakuman)
            if (not isinstance(total_yakuman, int) or not isinstance(pao_yakuman, int)
                    or not 0 < pao_yakuman <= total_yakuman):
                raise ValueError("Invalid pao yakuman portion")
            responsible = event["responsible"]
            if responsible == winner or not 0 <= responsible < players:
                raise ValueError("Invalid responsible player")
            pao_pay = payments(30, 5, players, dealer, winner, event["tsumo"],
                               event.get("loser"), pao_yakuman,
                               no_loss=case.get("no_loss", False))
            amount = sum(pao_pay)
            pay = [ordinary - pao for ordinary, pao in zip(pay, pao_pay)]
            if event["tsumo"]:
                pay[responsible] += amount
            else:
                pay[responsible] += amount // 2
                pay[event["loser"]] += amount // 2
        for p, amount in enumerate(pay):
            result[p] -= amount
            result[winner] += amount
    if case.get("nagashi"):
        # Draw settlement pays no honba and leaves deposits on the table.
        # Updating the next hand's honba/dealer is handled by the flow rules.
        return result
    if len(events) == 1 and events[0]["tsumo"]:
        event = events[0]
        winner = event["winner"]
        if ("responsible" in event
                and event.get("pao_yakuman", event["yakuman"]) == event["yakuman"]):
            result[event["responsible"]] -= (players - 1) * 100 * honba
            result[winner] += (players - 1) * 100 * honba
        else:
            for p in range(players):
                if p != winner:
                    result[p] -= 100 * honba
                    result[winner] += 100 * honba
    else:
        if any(e["tsumo"] for e in events):
            raise ValueError("Multiple ordinary wins must be ron")
        losers = {e["loser"] for e in events}
        if len(losers) != 1:
            raise ValueError("Multiple ron must share one discarder")
        loser = next(iter(losers))
        winner = min((e["winner"] for e in events), key=lambda p: (p - loser) % players)
        result[loser] -= (players - 1) * 100 * honba
        result[winner] += (players - 1) * 100 * honba
    result[winner] += 1000 * sticks
    return result


def noten(players, tenpai):
    if (players not in (3, 4) or any(p not in range(players) for p in tenpai)
            or len(set(tenpai)) != len(tenpai)):
        raise ValueError("Invalid noten case")
    count = len(tenpai)
    if count in (0, players):
        return [0] * players
    total = (players - 1) * 1000
    return [total // count if p in tenpai else -total // (players - count)
            for p in range(players)]


MODES = {
    "四人东": ((1, 4), (2, 4), 30000),
    "四人南": ((2, 4), (3, 4), 30000),
    "三麻东": ((1, 3), (2, 3), 40000),
    "三麻南": ((2, 3), (3, 3), 40000),
}
