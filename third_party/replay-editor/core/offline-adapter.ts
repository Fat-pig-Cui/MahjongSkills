// SPDX-License-Identifier: MIT
/**
 * 宿主适配层：离线核心不直接读取浏览器全局变量。
 *
 * 旧实现通过 `globalThis.editFunction`、`globalThis.view` 判断宿主能力。现在改为显式的
 * `HostCapabilities`：默认值与旧离线 worker 的行为一致（编辑功能开启、桌面 UI 不活动），
 * 其他宿主通过 `configureHost()` 设置，不需要注入全局变量。
 */

/** 核心运行所需的宿主能力。 */
export interface HostCapabilities {
    /** 启用国标补花、强制拔北、二麻拔西和错和赔打等编辑功能。 */
    editFunction: boolean;
    /** 宿主正在显示牌谱界面；离线生成始终为 false。 */
    desktopActive: boolean;
}

/** 当前宿主能力；字段含义见 HostCapabilities。 */
export const host: HostCapabilities = {
    editFunction: true,
    desktopActive: false,
};

/** 显式配置宿主能力，只覆盖传入的字段。 */
export const configureHost = (capabilities: Partial<HostCapabilities>): void => {
    Object.assign(host, capabilities);
};

/** 离线宿主适配：保留牌谱结果，不安装浏览器 UI 或网络钩子。 */
export const editOffline = (): void => {};
