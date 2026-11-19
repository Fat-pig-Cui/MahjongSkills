// SPDX-License-Identifier: MIT
/**
 * @file: wildcard.ts - 百搭（万象修罗）代表牌的选择
 *
 * JS-11 要求：候选代表牌评分时排除里宝，代表牌确定后再按正常结算计入里宝；
 * 同分候选应随机选择。这里把评分和候选顺序抽成可测试的纯函数。
 */

import {Constants} from "./constants";
import {shuffle} from "./rng";
import {calcSudian} from "./utils";

/** 候选评分：排除里宝 id33，避免里宝影响代表牌选择。 */
export const selectionSudian = (candidate: CalcFanRet): number =>
    calcSudian({
        ...candidate,
        fans: candidate.fans.filter(fan => fan.id !== 33),
    }, 1);

/** 当前候选是否严格优于已保存候选；同分保留先遇到的结果（顺序已随机）。 */
export const isBetterCandidate = (current: CalcFanRet, next: CalcFanRet): boolean =>
    selectionSudian(current) < selectionSudian(next);

/** 返回随机顺序的全部候选牌；同分时由 Fisher–Yates 顺序决定，等价于随机选择。 */
export const candidateTiles = (): Tile[] => shuffle(Constants.TILE_NO_AKA.slice() as Tile[]);
