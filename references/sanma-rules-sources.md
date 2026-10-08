# 三麻段位差异与证据索引

默认适用雀魂三人麻将段位场。[三麻正文](topics/13-sanma.md) 维护差异，四麻共通定义使用 [四麻索引](rules-sources.md) 指定的正文；涉及人数、牌组、拔北和支付时读取三麻差异。友人房“无自摸损”只在显式启用的对照中适用。

## 三麻参数

| 参数 | 段位场值 | 证据 |
|---|---|---|
| 玩家数／牌数 | 3／108，万子仅1、9 | 公开说明、既有基线 |
| 原点／返点 | 35000／40000 | 用户确认、公开配置一致 |
| 赤牌 | 红5筒、5索各一张 | 既有基线、用户确认；当次公开说明只确认总计两张 |
| 吃／岭上牌 | 禁止吃／8张岭上牌 | 公开说明 |
| 自摸 | 有自摸损 | 用户确认、公开说明 |
| 万子宝牌循环 | 1万与9万相互指示 | 公开说明 |
| 北风役牌 | 客风，北刻子本身不提供役 | 公开说明 |

## 差异与共通规则归属

证据类型沿用四麻索引的定义；“用户确认”“公开配置”“既有基线”均不表示服务器实测。

| 规则编号 | 差异的唯一维护位置 | 已有证据 | 当前独立验证 |
|---|---|---|---|
| SANMA-TILES | [牌组和役种差异](topics/13-sanma.md#sanma-tiles) | 公开说明、既有基线 | — |
| SANMA-NORTH | [拔北、抢北和立直后限制](topics/13-sanma.md#north) | 流程公开说明；时序、刚摸牌限制用户确认 | — |
| SANMA-DORA | [拔北宝牌与表里宝](topics/13-sanma.md#north-dora) | 基础1番公开配置；叠加用户确认 | — |
| SANMA-PAY | [自摸损与友人房对照](topics/13-sanma.md#sanma-scoring) | 用户确认、公开说明；[无自摸损役满补充确认](evidence/completion-confirmations-2026-10-09.md)；实例离线复算 | — |
| PAO | [共通包牌规则](topics/05-special-rules.md#pao)；[三麻金额](topics/13-sanma.md#sanma-scoring) | 用户实际验证；[本场来源、三麻适配与验证确认](evidence/pao-confirmations-2026-10-09.md) | [已完成；原始证据待归档](pending-verification.md#v-pao) |
| MATCH-END | [共通终局算法与三麻参数](topics/08-match-rules.md#match-end) | [用户实际验证](evidence/completion-confirmations-2026-10-09.md)；原点／返点公开配置一致 | [已完成](pending-verification.md#v-end) |
| HONBA-DEPOSITS／NOTEN | [共通人数公式](topics/04-scoring.md#honba-deposits)；[三麻金额](topics/13-sanma.md#sanma-scoring) | 用户确认 | — |
| RANK | [固定起家同点顺序](topics/08-match-rules.md#ranking)；三麻仅东南西 | 用户确认 | — |
| FLOW | [三麻流局和局数推进](topics/13-sanma.md#sanma-scoring) | 用户确认 | — |
| NAGASHI | [共通成立与推进](topics/02-game-flow.md#nagashi)；[三麻支付差异](topics/13-sanma.md#sanma-scoring) | 成立条件公开配置；三麻适用、拔北不算牌河、多家支付及不收本场／供托用户确认 | — |
| KAN-TIMING | [共通杠时序](topics/09-call-kan-rules.md#kan-timing) | 用户确认同四麻 | — |
| FOUR-KAN | [共通第四杠优先级](topics/07-edge-cases.md#action-priority) | [用户实际验证](evidence/completion-confirmations-2026-10-09.md)；单家四杠例外既有基线 | [已完成](pending-verification.md#v-kan) |
| YAKU | [共通役种](topics/03-yaku-han.md)；[三麻差异](topics/13-sanma.md#sanma-yaku) | 用户确认累积役满、切上满贯同四麻 | — |

来源定位见 [核验记录](evidence/verification-2026-10-07.md) 和 [配置复现](evidence/reproduce-config.md)。改变共通规则时修改四麻对应正文；改变三麻差异时修改三麻正文，并更新参数、证据和实例。独立验证只维护 [统一清单](pending-verification.md)。
