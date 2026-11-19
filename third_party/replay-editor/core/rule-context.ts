// SPDX-License-Identifier: MIT
/**
 * @file: rule-context.ts - 显式规则上下文
 *
 * 迁移期先提供当前配置的快照，供拆分后的 `calcFan` 入口显式携带规则开关；
 * 旧的 `is_*()` 调用点仍保留，后续逐步改为从参数读取。
 */

import {base_info} from "./data";
import {
    get_field_spell_mode, is_beishuizhizhan, is_chuanma, is_guobiao, is_guyi, is_hunzhiyiji,
    is_qingtianjing, is_sigangbaopai, is_wanxiangxiuluo, is_xuezhandaodi, is_yifanjieguyi,
    is_yongchang, no_composite_yakuman, no_zimosun,
} from "./misc";

/** 一次和牌判定相关的规则开关快照。 */
export type RuleContext = {
    playerCount: number;
    noZimosun: boolean;
    guyi: boolean;
    yifanjieguyi: boolean;
    chuanma: boolean;
    guobiao: boolean;
    qingtianjing: boolean;
    xuezhandaodi: boolean;
    wanxiangxiuluo: boolean;
    beishuizhizhan: boolean;
    hunzhiyiji: boolean;
    yongchang: boolean;
    sigangbaopai: boolean;
    noCompositeYakuman: boolean;
    /** 幻境传说庄家卡编号（1-5，0 表示未启用）。 */
    dealerCard: number;
};

/** 读取当前全局配置生成规则上下文。 */
export const currentRuleContext = (): RuleContext => ({
    playerCount: base_info.player_cnt,
    noZimosun: no_zimosun(),
    guyi: is_guyi(),
    yifanjieguyi: is_yifanjieguyi(),
    chuanma: is_chuanma(),
    guobiao: is_guobiao(),
    qingtianjing: is_qingtianjing(),
    xuezhandaodi: is_xuezhandaodi(),
    wanxiangxiuluo: is_wanxiangxiuluo(),
    beishuizhizhan: is_beishuizhizhan(),
    hunzhiyiji: is_hunzhiyiji(),
    yongchang: is_yongchang(),
    sigangbaopai: is_sigangbaopai(),
    noCompositeYakuman: no_composite_yakuman(),
    dealerCard: get_field_spell_mode(1),
});
