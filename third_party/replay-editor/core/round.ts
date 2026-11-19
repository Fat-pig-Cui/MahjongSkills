// SPDX-License-Identifier: MIT
/**
 * @file: round.ts - 小局结束时的状态推进
 *
 * 原 `roundEnd()` 同时负责“保存本局动作/清空单局临时状态”和“推进场/局/本”。
 * 这里拆成两个显式步骤；终局界面由 core.ts 的 `gameEnd()` 负责。
 */

import {gameState} from "./data";
import {is_chuanma} from "./misc";

/** 保存已完成小局的动作，并清空下一局不再使用的临时状态。 */
export const commitFinishedRound = (): void => {
    const state = gameState;
    state.all_data.all_actions.push(state.all_data.cur_actions.slice());
    state.all_data.xun.push(state.xun.slice() as Players_NumberArray);

    for (let seat = 0; seat < state.base_info.player_cnt; seat++) {
        state.begin_tiles[seat] = '';
        state.discard_tiles[seat] = [];
        state.deal_tiles[seat] = [];
        state.xun[seat] = [];
    }
    state.muyu.seats = '';
    state.paishan.length = 0;
    state.all_data.cur_actions.length = 0;
};

/** 推进场/局/本；川麻荒牌流局按首个和牌者决定下一局庄家。 */
export const advanceRoundNumber = (): void => {
    const state = gameState;
    if (is_chuanma() && state.base_info.first_hu_seat !== -1)
        state.base_info.ju = state.base_info.first_hu_seat;
    if (state.base_info.ju === state.base_info.player_cnt) {
        state.base_info.chang++;
        state.base_info.ju = 0;
    }
    state.base_info.chang %= state.base_info.player_cnt;
};
