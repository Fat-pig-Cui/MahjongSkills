// SPDX-License-Identifier: MIT
/** 固定 34 格的牌面向量，供高频听牌计算复用。 */

import {Constants} from "./constants";
import {simplify} from "./baseUtils";

const TILE_INDEX = new Map<Tile, number>(Constants.TILE_NO_AKA.map((tile, index) => [tile, index]));

export type TileVector = number[] & {length: 34};

export const tileIndex = (tile: Tile): number => {
    const index = TILE_INDEX.get(simplify(tile));
    return index === undefined ? -1 : index;
};

export const countTileVector = (tiles: readonly Tile[]): TileVector => {
    const counts = Array(34).fill(0) as TileVector;
    for (const tile of tiles) {
        const index = tileIndex(tile);
        if (index >= 0)
            counts[index]++;
    }
    return counts;
};
