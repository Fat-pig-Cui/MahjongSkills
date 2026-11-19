// SPDX-License-Identifier: MIT

/**
 * Calculate 赤羽花猪 transfers for a single exhaustive draw.
 *
 * The matrix is indexed as [payer][recipient]. Flower pigs pay every other
 * unfinished, non-flower-pig player; payments between flower pigs cancel and
 * players who already won are excluded.
 *
 * Payment per recipient is `max(8000, 查大叫点数)`; this is the rule confirmed
 * by the project owner on 2026-11-04, replacing the earlier “fixed 8000” note.
 */
export const calcFlowerPigDeltas = (
    huazhu: boolean[],
    huled: boolean[],
    possiblePoints: number[],
): number[][] => {
    const size = huazhu.length;
    if (huled.length !== size || possiblePoints.length !== size)
        throw new Error('calcFlowerPigDeltas: player arrays must have equal length');
    const deltas = Array.from({length: size}, () => Array(size).fill(0));
    for (let payer = 0; payer < size; payer++) {
        if (!huazhu[payer] || huled[payer])
            continue;
        for (let recipient = 0; recipient < size; recipient++) {
            if (recipient === payer || huled[recipient] || huazhu[recipient])
                continue;
            const amount = Math.max(8000, possiblePoints[recipient]);
            deltas[payer][recipient] -= amount;
            deltas[recipient][payer] += amount;
        }
    }
    return deltas;
};
