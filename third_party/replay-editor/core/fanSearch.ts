// SPDX-License-Identifier: MIT
/**
 * @file: fanSearch.ts - 从 calcFan.ts 拆出的手牌划分 DFS 与符数辅助函数。
 */

import {base_info} from "./data";
import {no_lianfengsifu} from "./misc";
import {errRoundInfo, simplify} from "./baseUtils";
import {isEqualTile, judgeTile} from "./exportedUtils";
import {Constants} from "./constants";

// DFS 中允许的同牌数量。放在模块级避免每次搜索都重新分配临时数组。
const DFS_COUNTS = [0, 2, 3, 5, 6, 8, 9, 11, 12, 14] as const;

// 深度优先搜索, 对手牌和副露进行划分, 搜索到尽头划分数量达到5或7时, 开始算番
export const dfs = (tile: Tile, partition: Partition, cnt: TileNum, lastile: Tile, zimo: boolean, updateRet: (x: CalcFanRet) => void, calc0: (tingpaifu: 0 | 2, partition_tmp: Partition) => CalcFanRet): void => {
    const dfs0 = (tile: Tile, partition: Partition, cnt: TileNum): void => {
        if (tile === Constants.DFS_END_TILE) {
            if (partition.length === 5 || partition.length === 7)
                calc(partition.slice(), lastile, zimo, updateRet, calc0);
            return;
        }
        if (cnt[tile] === 0) {
            dfs0(nextTile(tile), partition, cnt);
            return;
        }
        for (const num of DFS_COUNTS) {
            if (cnt[tile] < num)
                continue;
            cnt[tile] -= num;
            const cnt0 = cnt[tile];
            if (num % 3 === 2) { // 有对子
                const kezi_num = (num - 2) / 3;
                for (let i = 0; i < kezi_num; i++)
                    partition.push({type: 6, tile: [tile, tile, tile]});
                partition.push({type: 7, tile: [tile, tile]});
                dfs0(tile, partition, cnt);
            } else if (num % 3 === 0) // 3 的倍数, 全是当成刻子
                for (let i = 0; i < num / 3; i++)
                    partition.push({type: 6, tile: [tile, tile, tile]});

            if (cnt[Constants.NXT2[tile]] >= cnt0 && cnt[Constants.NXT2[Constants.NXT2[tile]]] >= cnt0) {
                cnt[tile] -= cnt0;
                cnt[Constants.NXT2[tile]] -= cnt0;
                cnt[Constants.NXT2[Constants.NXT2[tile]]] -= cnt0;
                for (let i = 0; i < cnt0; i++)
                    partition.push({
                        type: 5,
                        tile: [tile, Constants.NXT2[tile], Constants.NXT2[Constants.NXT2[tile]]],
                    });
                dfs0(nextTile(tile), partition, cnt);
                cnt[tile] += cnt0;
                cnt[Constants.NXT2[tile]] += cnt0;
                cnt[Constants.NXT2[Constants.NXT2[tile]]] += cnt0;
                for (let i = 0; i < cnt0; i++)
                    partition.pop();
            }
            for (let i = 0; i < Math.floor((num + 1) / 3); i++)
                partition.pop();
            cnt[tile] += num;
        }
    };

    dfs0(tile, partition, cnt);
};

// 根据 lastile 的情况, 确定听牌符并调用 calc0 开始算番
export const calc = (partition_tmp: Partition, lastile: Tile, zimo: boolean, updateRet: (x: CalcFanRet) => void, calc0: (tingpaifu: 0 | 2, partition_tmp: Partition) => CalcFanRet): void => {
    for (const p of partition_tmp) {
        const p_tiles = p.tile, type = p.type;
        if (type === 5 && (isEqualTile(p_tiles[0], lastile) || isEqualTile(p_tiles[1], lastile) || isEqualTile(p_tiles[2], lastile))) {
            if (!zimo)
                p.type = 0;
            const mid_tile = shunziMidTile(p_tiles);
            if (isEqualTile(mid_tile, lastile))
                updateRet(calc0(2, partition_tmp)); // 坎张听符
            else if (parseInt(simplify(lastile)) === 3 && parseInt(mid_tile) === 2)
                updateRet(calc0(2, partition_tmp)); // 边张听符
            else if (parseInt(simplify(lastile)) === 7 && parseInt(mid_tile) === 8)
                updateRet(calc0(2, partition_tmp)); // 边张听符
            else
                updateRet(calc0(0, partition_tmp));
            p.type = 5;
        }
        if (type === 6 && isEqualTile(p_tiles[0], lastile)) {
            if (!zimo)
                p.type = 1;
            updateRet(calc0(0, partition_tmp));
            p.type = 6;
        }
        if (type === 7 && isEqualTile(p_tiles[0], lastile))
            updateRet(calc0(2, partition_tmp)); // 单骑符
        if (type === 8)
            updateRet(calc0(0, partition_tmp)); // 组合龙
    }
};

// 计算牌的符数, 在川麻和国标模式中仍会调用, 但没什么用
export const calcFu = (tingpaifu: 0 | 2, duizi_num: number, pinghu: boolean, type_cnt: TypeCnt, seat: Seat, zimo: boolean, menqing: boolean, fulu_cnt: number): number => {
    if (duizi_num === 7) // 七对子固定符数
        return 25;

    let fu = 20; // 符底
    if (!pinghu)
        fu += tingpaifu; // 听牌型符
    for (const tile of Constants.TILE_NO_AKA) {
        // 刻子符(幺九/中张, 明刻明杠, 暗杠暗刻)
        if (judgeTile(tile, 'Y')) {
            fu += type_cnt[tile][1] * 4;
            fu += type_cnt[tile][2] * 16;
            fu += type_cnt[tile][3] * 32;
            fu += type_cnt[tile][6] * 8;
        } else {
            fu += type_cnt[tile][1] * 2;
            fu += type_cnt[tile][2] * 8;
            fu += type_cnt[tile][3] * 16;
            fu += type_cnt[tile][6] * 4;
        }
        if (type_cnt[tile][7] === 1) {
            // 雀头符, 雀头是自风, 场风, 三元
            if (no_lianfengsifu()) {
                if (tile === ((seat - base_info.ju + base_info.player_cnt) % base_info.player_cnt + 1 + 'z') || tile === base_info.chang + 1 + 'z')
                    fu += 2;
            } else {
                if (tile === ((seat - base_info.ju + base_info.player_cnt) % base_info.player_cnt + 1 + 'z'))
                    fu += 2;
                if (tile === base_info.chang + 1 + 'z')
                    fu += 2;
            }
            if (tile[1] === 'z' && parseInt(tile) >= 5 && parseInt(tile) <= 7)
                fu += 2;
        }
    }
    if (zimo && !pinghu)
        fu += 2; // 自摸符
    if (!zimo && menqing)
        fu += 10; // 门前清荣和符
    fu = Math.ceil(fu / 10) * 10;
    if (fulu_cnt !== 0 && fu === 20)
        fu = 30;
    return fu;
};

/**
 * 按照排序返回 tile 的下一张牌, 忽略红宝牌
 */
export const nextTile = (tile: Tile): Tile => {
    tile = simplify(tile);
    if (tile === '7z')
        return Constants.DFS_END_TILE;
    const group = ['m', 'p', 's', 'z'];
    const cur_index = group.indexOf(tile[1]);
    if (tile[0] === '9')
        return '1' + group[cur_index + 1] as Tile;
    return (parseInt(tile) + 1) + tile[1] as Tile;
};

/**
 * 给定牌顺子给出中间的牌
 */
export const shunziMidTile = (tiles: Tile[]): Tile => {
    if (tiles.length !== 3)
        throw new Error(errRoundInfo() + `shunziMidTile: 输入牌数量不为3: ${tiles}`);
    const first = parseInt(simplify(tiles[0])[0]);
    const second = parseInt(simplify(tiles[1])[0]);
    const third = parseInt(simplify(tiles[2])[0]);
    // 三个数字的中位数 = 总和 - 最小值 - 最大值；避免创建数组并排序。
    const middle = first + second + third - Math.min(first, second, third) - Math.max(first, second, third);
    return middle + tiles[0][1] as Tile;
};
