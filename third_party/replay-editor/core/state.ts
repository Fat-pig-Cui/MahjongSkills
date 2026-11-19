// SPDX-License-Identifier: MIT
/**
 * @file: state.ts - 对局状态的生命周期重置
 *
 * 原来 `clearProject()`、`roundBegin()` 直接在各处散落重置共享单例。这里把“整份牌谱重置”
 * 和“单个小局重置”拆成两个显式函数，函数体仍只修改 data.ts 的兼容 `gameState`，
 * 因此不改变现有 API 或牌谱输出；后续阶段可以把 `GameState` 作为参数传入。
 */

import {gameState} from "./data";
import {
    get_chang_ju_ben_num, get_field_spell_mode, get_init_point, get_init_scores, get_liqi_need,
    is_chuanma, is_dora3, is_guobiao, is_muyu, is_tianming, no_liujumanguan, scale_points,
} from "./misc";
import {getTileNum} from "./utils";
import {clearSettlementLedger} from "./settlement";

/**
 * 重置整份牌谱的状态（原 `clearProject()` 的内容，另补上 `all_data.cur_actions` 清空）。
 *
 * 使用 `length = 0` 而不是重新赋数组，保持 `all_data.all_actions` / `cur_actions` 的引用稳定。
 */
export const resetReplayState = (): void => {
    const state = gameState;
    for (let seat = 0; seat < 4; seat++) {
        state.player_datas[seat] = {
            nickname: `电脑${seat}`,
            avatar_id: 400101,
            title: 600001,
            avatar_frame: 0,
            verified: 0,
            views: [],
        };
        state.begin_tiles[seat] = '';
        state.player_tiles[seat] = [];
        state.discard_tiles[seat] = [];
        state.deal_tiles[seat] = [];
        state.muyu.times[seat] = 1;
    }

    state.config.category = 1;
    state.config.meta = {mode_id: 0};
    state.config.mode = {mode: 1, detail_rule: {}};

    state.muyu.seats = '';
    state.paishan.length = 0;
    state.base_info.chang = state.base_info.ju = state.base_info.ben = 0;
    state.base_info.liqibang = state.base_info.benchangbang = state.base_info.lianzhuang_cnt = 0;
    state.base_info.liqi_need = state.base_info.draw_type = state.base_info.lst_draw_type = 1;
    state.base_info.baogang_seat = state.base_info.first_hu_seat = -1;
    state.base_info.base_point = 25000;
    state.base_info.all_tile_nums = {};

    state.all_data.all_actions.length = 0;
    state.all_data.xun.length = 0;
    // 旧 clearProject 漏掉这一项：复用同一模块实例时，上一份牌谱的未完成动作会残留。
    state.all_data.cur_actions.length = 0;
    state.all_data.player_datas = state.player_datas;
    state.all_data.config = state.config;
    state.all_data.players = [null, null];
    clearSettlementLedger();
};

/**
 * 重置单个小局的状态（原 `roundBegin()` 开头的重置块）。
 *
 * 调用前提：`gameBegin()` 已确定 `base_info.player_cnt` 与配置。
 */
export const resetRoundState = (): void => {
    const state = gameState;
    const playerCnt = state.base_info.player_cnt;
    const paiheEmpty = no_liujumanguan();

    for (let seat = 0; seat < playerCnt; seat++) {
        state.fulu[seat] = [];
        state.baopai[seat] = [];
        state.xun[seat] = [];
        state.shoumoqie[seat] = [];
        state.huled[seat] = false;
        state.sigang_bao[seat] = false;
        state.cuohu[seat] = false;
        state.zhenting.tongxun[0][seat] = false;
        state.zhenting.tongxun[1][seat] = false;
        state.zhenting.liqi[0][seat] = false;
        state.zhenting.liqi[1][seat] = false;
        state.zhenting.shezhang[seat] = false;
        state.zhenting.result[seat] = false;
        state.gaps[seat] = 0;
        state.delta_scores[seat] = 0;
        state.spell_hourglass[seat] = 0;
        state.muyu.times[seat] = 1;
        state.mingpais[seat] = {};
        state.paihe[seat] = {liujumanguan: !paiheEmpty, tiles: []};
        state.liqi_info[seat] = {liqi: 0, yifa: 1, kai: false};
        state.hunzhiyiji_info[seat] = {
            seat: seat as Seat,
            liqi: 0,
            continue_deal_count: 0,
            overload: false,
        };
        state.yongchang_data[seat] = {
            seat: seat as Seat,
            moqie_count: 0,
            moqie_bonus: 0,
            shouqie_count: 0,
            shouqie_bonus: 0,
        };
    }

    state.muyu_info.id = state.muyu_info.seat = state.muyu_info.count = 0;
    state.lst_liqi.valid = false;
    state.chuanma_gangs.over = [];
    state.chuanma_gangs.not_over = [];
    clearSettlementLedger();
    state.dora_cnt.cnt = state.dora_cnt.li_cnt = is_dora3() || is_muyu() ? 3 : 1;
    state.dora_cnt.lastype = state.dora_cnt.bonus = 0;
    state.hules_history.length = 0;
    state.base_info.first_hu_seat = -1;
    state.base_info.benchangbang = state.base_info.ben;
    state.base_info.lst_draw_type = state.base_info.draw_type = 1;
    state.base_info.baogang_seat = -1;
    state.awaiting_tiles.length = 0;
};

/**
 * 整份对局开始时的初始化（原 `gameBegin()` 的主体）。
 *
 * 只确定玩家数、初始点数、场/局/本和牌山数量；每个小局的清理由 `resetRoundState()` 负责。
 */
export const initializeReplayState = (): void => {
    const state = gameState;
    const mode = state.config.mode.mode;
    if (mode >= 20 && mode <= 29)
        state.base_info.player_cnt = 2;
    else if (mode >= 10 && mode <= 19)
        state.base_info.player_cnt = 3;
    else
        state.base_info.player_cnt = 4;

    state.all_data.config = state.config;
    state.player_datas.splice(state.base_info.player_cnt);
    state.all_data.player_datas = state.player_datas;

    if (state.base_info.player_cnt === 3 || state.base_info.player_cnt === 2) {
        const rule = state.config.mode.detail_rule;
        rule.wanxiangxiuluo_mode = rule.xuezhandaodi = rule.muyu_mode = rule.chuanma = false;
    }

    state.base_info.liqi_need = get_liqi_need();
    if (get_field_spell_mode(3) === 2)
        state.base_info.liqi_need = 2;

    [state.base_info.chang, state.base_info.ju, state.base_info.ben, state.base_info.liqibang] = get_chang_ju_ben_num();
    if (!state.base_info.liqibang)
        state.base_info.liqibang = 0;
    state.base_info.lianzhuang_cnt = 0;

    let initPoint = get_init_point();
    if (initPoint === -1) {
        if (state.base_info.player_cnt === 2)
            initPoint = 50000;
        else if (state.base_info.player_cnt === 3)
            initPoint = 35000;
        else if (is_guobiao())
            initPoint = 300 * scale_points();
        else if (is_chuanma() || is_tianming())
            initPoint = 50000;
        else if (is_muyu())
            initPoint = 40000;
        else if (is_dora3())
            initPoint = 35000;
        else
            initPoint = 25000;
    }
    state.scores.splice(state.base_info.player_cnt);
    for (let seat = 0; seat < state.base_info.player_cnt; seat++)
        state.scores[seat] = initPoint;

    state.base_info.base_point = state.scores[0];

    const initialScores = get_init_scores() as Players_Number;
    for (const seat of initialScores.keys())
        state.scores[seat] = initialScores[seat];

    state.base_info.all_tile_nums = getTileNum();
};
