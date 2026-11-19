// SPDX-License-Identifier: MIT
/**
 * @file: shortFunction.ts - 一些要 export 的比较简短的函数
 * @author: Fat-pig-Cui
 * @github: https://github.com/Fat-pig-Cui/majsoul-replay-editor
 */

import {paishan, config, deal_tiles, discard_tiles, base_info, scores} from "./data";
import {separate, separateWithMoqie} from "./exportedUtils";
import {roundBegin} from "./core";

/**
 * 设置对局的模式。
 *
 * 复制 `meta` 和 `mode`（含 `detail_rule`）而不是直接保存调用者对象的引用，
 * 避免脚本在 `setConfig()` 后修改入参时悄悄改变内部配置。其余顶层键保持浅复制。
 */
export const setConfig = (c: Config): void => {
    const target = config as unknown as Record<string, unknown>;
    const source = c as unknown as Record<string, unknown>;
    for (const key of Object.keys(c)) {
        const value = source[key];
        if (key === 'meta' && value && typeof value === 'object')
            target[key] = {...(value as Record<string, unknown>)};
        else if (key === 'mode' && value && typeof value === 'object') {
            const mode = value as { detail_rule?: Record<string, unknown> };
            target[key] = {
                ...(value as Record<string, unknown>),
                detail_rule: mode.detail_rule ? {...mode.detail_rule} : mode.detail_rule,
            };
        } else
            target[key] = value;
    }
};

/**
 * 设置玩家的切牌集合
 */
export const setDiscardTiles = (tiles: Players_String): void => {
    for (const seat of Object.keys(tiles))
        discard_tiles[seat] = separateWithMoqie(tiles[seat]);
};

/**
 * 设置玩家的摸牌集合
 */
export const setDealTiles = (tiles: Players_String): void => {
    for (const seat of Object.keys(tiles))
        deal_tiles[seat] = separateWithMoqie(tiles[seat]);
};

/**
 * 手动设置牌山(参数不含起手)
 */
export const setPaishan = (ps: string): void => {
    paishan.push(...separate(ps));
    roundBegin();
};

/**
 * 跳转局数
 * @param chang - 场, 0,1,2,3 分别表示 东,南,西,北 场
 * @param ju - 局, seat 为 ju 坐庄
 * @param ben - 本, 本场数
 */
export const setRound = (chang: Seat, ju: Seat, ben: number): void => {
    [base_info.chang, base_info.ju, base_info.ben] = [chang, ju, ben];
};

/**
 * 设置玩家的实时点数
 */
export const setScores = (s: Players_Number): void => {
    for (let i = 0; i < base_info.player_cnt; i++)
        scores[i] = s[i];
};
