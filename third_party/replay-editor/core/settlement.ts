// SPDX-License-Identifier: MIT
/**
 * @file: settlement.ts - 逐笔点数结算台账
 *
 * 所有“从某家转给某家”的点数变动都记录为一条 `SettlementEntry`，统一由本模块写入
 * `delta_scores`。规则函数不再直接对 `delta_scores` 做加减（历史遗留路径除外），
 * 这样可以在测试里检查整数金额、逐笔收支和回滚。
 */

import {delta_scores} from "./data";

/** 结算原因；`other` 用于本阶段尚未分类的历史路径。 */
export type SettlementReason =
    | 'ron'
    | 'tsumo'
    | 'bao'
    | 'gang'
    | 'noten'
    | 'flowerPig'
    | 'honba'
    | 'riichi'
    | 'penalty'
    | 'other';

/**
 * 一条结算记录。
 *
 * `from === -1` 表示点数来自牌桌（立直棒/供托），不是某位玩家支付；这类记录不参与
 * “玩家之间转账总额为 0”的检查。
 */
export type SettlementEntry = {
    from: Seat | -1;
    to: Seat;
    amount: number;
    reason: SettlementReason;
};

const ledger: SettlementEntry[] = [];

/** 当前结算台账（只读用途；规则代码应通过 recordTransfer/recordAward 写入）。 */
export const settlementLedger: readonly SettlementEntry[] = ledger;

/** 清空台账；在整份牌谱或小局重置时调用。 */
export const clearSettlementLedger = (): void => {
    ledger.length = 0;
};

/** 供回滚使用：把台账截断到之前记录的长度。 */
export const truncateSettlementLedger = (length: number): void => {
    ledger.length = length;
};

/** 记录一笔玩家之间的转账并写入 delta_scores。 */
export const recordTransfer = (
    amount: number,
    from: Seat,
    to: Seat,
    reason: SettlementReason = 'other',
): void => {
    recordTransferTo(delta_scores, amount, from, to, reason);
};

/** 记录一笔转账到指定的临时结算向量，并同步写入台账。 */
export const recordTransferTo = (
    target: Players_Number,
    amount: number,
    from: Seat,
    to: Seat,
    reason: SettlementReason = 'other',
): void => {
    if (!Number.isFinite(amount))
        throw new Error(`结算金额不是有限数: ${amount} (${reason})`);
    if (amount === 0)
        return;
    ledger.push({from, to, amount, reason});
    target[from] -= amount;
    target[to] += amount;
};

/** 记录一笔来自牌桌的点数（立直棒/供托）并写入 delta_scores。 */
export const recordAward = (amount: number, to: Seat, reason: SettlementReason = 'riichi'): void => {
    if (!Number.isFinite(amount))
        throw new Error(`结算金额不是有限数: ${amount} (${reason})`);
    if (amount === 0)
        return;
    ledger.push({from: -1, to, amount, reason});
    delta_scores[to] += amount;
};

/** 按玩家汇总的转账净额；正常情况下应为 0。 */
export const transferNet = (): number => {
    const net = new Map<Seat, number>();
    for (const entry of ledger) {
        if (entry.from === -1)
            continue;
        net.set(entry.from, (net.get(entry.from) ?? 0) - entry.amount);
        net.set(entry.to, (net.get(entry.to) ?? 0) + entry.amount);
    }
    let total = 0;
    for (const value of net.values())
        total += value;
    return total;
};

/** 牌桌奖励总额；与 delta_scores 的总和一致。 */
export const awardTotal = (): number =>
    ledger.reduce((sum, entry) => entry.from === -1 ? sum + entry.amount : sum, 0);
