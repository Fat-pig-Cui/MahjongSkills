// SPDX-License-Identifier: MIT
/**
 * @file: rng.ts - 可注入的可复现随机数
 *
 * 离线核心不再直接调用全局 `Math.random()`。worker 在运行可信脚本前用 CLI 种子调用
 * `seedRng()`；洗牌使用 Fisher–Yates，替代依赖引擎排序实现的 `sort(randomCmp)`。
 * 为了让仍直接使用 `Math.random()` 的旧自制脚本保持确定性，worker 会把 `Math.random`
 * 指向同一个 `random()` 函数；核心自身只使用本模块。
 */

/** 与 tools/convert_paipu.mjs 默认种子一致。 */
export const DEFAULT_SEED = 0x6d2b79f5;

let state = DEFAULT_SEED >>> 0;

/** 用整数种子重置随机序列；非法值回退到默认种子。 */
export const seedRng = (seed: number): void => {
    state = (Number.isFinite(seed) ? seed : DEFAULT_SEED) >>> 0;
};

/** 当前随机序列状态（只读诊断用途）。 */
export const rngState = (): number => state;

/** mulberry32 变体；worker 原实现保持同一算法，便于对照旧输出。 */
export const random = (): number => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
};

/** 原地 Fisher–Yates 洗牌并返回同一数组。 */
export const shuffle = <T>(items: T[]): T[] => {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
};

/** 兼容旧代码的随机比较函数；新代码应使用 `shuffle()`。 */
export const randomCmp = (): number => random() - 0.5;
