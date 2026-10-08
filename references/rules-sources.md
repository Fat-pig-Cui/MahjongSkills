# 四麻段位规则与证据索引

默认玩法为雀魂四人麻将段位场。完整规则由下表指定的主题正文维护；本文件只维护适用范围、参数与证据归属。三麻的参数和差异见 [三麻索引](sanma-rules-sources.md)。自定义房选项不能覆盖段位默认。

## 平台参数

| 参数 | 四麻段位值 | 来源 |
|---|---|---|
| 玩家数／牌数 | 4／136 | 既有基线；正文见基本构成 |
| 原点／返点 | 25000／30000 | 2026-10-07用户确认，公开配置一致 |
| 赤牌 | 红5万、5筒、5索各一张 | 用户确认 |
| 开放断幺九 | 允许 | 用户确认；既有基线 |
| 头跳／一炮三响流局 | 不采用 | 用户确认多人和牌，一炮三响结算 |
| 切上满贯 | 不采用 | 用户确认／既有基线 |
| 累积役满 | 13番及以上固定单倍 | 用户确认／既有基线 |

## 规则归属

证据标签说明：**用户确认**表示本仓库采用的确认口径；**公开配置**表示取得可定位的公开资源内容；**既有基线**表示历史已采用，但当前未附独立原始证明。以上标签本身不表示服务器实测；**用户实际验证**表示用户明确报告已实际验证，并单独记录原始证据归档状态。

| 规则编号 | 正文唯一维护位置 | 已有证据 | 当前独立验证 |
|---|---|---|---|
| BASIC | [牌组、编码与和牌形](topics/01-basic-composition.md) | 既有基线、用户确认赤牌 | — |
| FLOW | [局数、本场与普通流局](topics/02-game-flow.md) | 用户确认、既有基线 | — |
| RIICHI-FURITEN | [立直与振听](topics/02-game-flow.md#riichi-furiten)；例外见规则边界 | 既有基线；暗杠限制用户确认 | — |
| YAKU | [役种与复合](topics/03-yaku-han.md) | 既有基线、用户确认累积役满 | — |
| SCORE | [符与基础支付](topics/04-scoring.md#base-scoring) | 既有基线；公式和实例离线复算 | — |
| HONBA-DEPOSITS | [本场、供托与多家荣和](topics/04-scoring.md#honba-deposits) | 用户确认 | — |
| NOTEN | [荒牌罚符](topics/04-scoring.md#honba-deposits) | 用户确认 | — |
| DORA | [表宝、里宝与赤宝](topics/05-special-rules.md#dora) | 既有基线、用户确认赤牌 | — |
| PAO | [责任范围、触发与支付](topics/05-special-rules.md#pao) | 用户实际验证；[本场来源、范围与验证确认](evidence/pao-confirmations-2026-10-09.md) | [已完成；原始证据待归档](pending-verification.md#v-pao) |
| MATCH-END | [共通终局算法及玩法参数](topics/08-match-rules.md#match-end) | [用户实际验证](evidence/completion-confirmations-2026-10-09.md)；原点／返点公开配置一致 | [已完成](pending-verification.md#v-end) |
| RANK | [排名、同点与终局供托](topics/08-match-rules.md#ranking) | 用户确认 | — |
| KAN-TIMING | [抢杠、补牌与翻宝牌时序](topics/09-call-kan-rules.md#kan-timing) | 用户确认 | — |
| FOUR-KAN | [第四杠行动优先级](topics/07-edge-cases.md#action-priority) | [用户实际验证](evidence/completion-confirmations-2026-10-09.md)；单家四杠例外既有基线 | [已完成](pending-verification.md#v-kan) |
| NAGASHI | [流局满贯成立与后续](topics/02-game-flow.md#nagashi) | 成立条件公开配置；[推进、不收本场与供托用户确认](evidence/completion-confirmations-2026-10-09.md) | — |
| STRATEGY | [牌效率](topics/10-shanten-efficiency.md)、[防守](topics/11-defense-danger.md)、[顺位](topics/12-strategy-placement.md) | 基础分析与牌张逻辑，不作为平台裁定 | — |

## 来源与维护

原始证据见 [2026-10-07核验记录](evidence/verification-2026-10-07.md)、[历史确认笔记](evidence/user-confirmations-2026-10-07.md) 和 [配置复现](evidence/reproduce-config.md)。后续更新先修改对应正文，再更新本索引的参数／证据和相关实例；当前任务只在 [待验证清单](pending-verification.md) 维护。历史记录保留当次事实。

如公开说明、客户端规则页与实际结算冲突，记录具体版本、玩法和可复现案例，再修订正文；不要自动把最新公开资源版本当作服务器规则版本。
