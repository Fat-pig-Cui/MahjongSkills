---
name: riichi-mahjong
description: 解释和裁定麻将规则，核对役种、计分、对局流程与终局，并分析立直牌效率、攻守和顺位；默认雀魂四人段位场，另按需处理三麻、雀魂古役、友人房与比赛房选项、活动玩法及牌谱编辑器的国标模式。
---

# 立直麻将与扩展玩法规则体系

本目录是一个完整技能包，只有本文件是技能入口；主题文档按需读取。默认采用雀魂四人麻将段位规则。三麻、友人房选项、比赛房及其他平台必须明确标注，不能混用人数、牌组与支付规则。

## 处理问题

先确认用户的问题属于判役、算分、行动裁定、终局还是策略。用户已提供的玩法与规则持续有效；只对影响答案的缺失信息提问。玩法不明时说明四麻段位默认，三麻问题同时读取三麻差异。

| 请求 | 必要材料 | 按需补充 |
|---|---|---|
| 牌种、编码、面子与和牌形 | [基本构成](references/topics/01-basic-composition.md) | [术语](references/topics/06-terminology.md) |
| 判役、门清和役种复合 | [役种](references/topics/03-yaku-han.md) | [宝牌](references/topics/05-special-rules.md#dora)、[牌例](references/examples/hands.md) |
| 算符番与支付 | [计分](references/topics/04-scoring.md) | [责任支付](references/topics/05-special-rules.md#pao)、[计分实例](references/examples/scoring.md) |
| 摸打、立直、振听与流局 | [流程](references/topics/02-game-flow.md) | [规则边界](references/topics/07-edge-cases.md)、[流程示例](references/examples/gameplay.md) |
| 吃碰杠、抢杠与翻宝牌时点 | [鸣牌与杠](references/topics/09-call-kan-rules.md) | [优先级](references/topics/07-edge-cases.md#action-priority) |
| 延长、飞人、同点与终局 | [赛制](references/topics/08-match-rules.md#match-end) | [终局实例](references/examples/gameplay.md#match-examples) |
| 弃牌、受入、防守与顺位策略 | [牌效率](references/topics/10-shanten-efficiency.md)、[防守](references/topics/11-defense-danger.md)、[顺位策略](references/topics/12-strategy-placement.md) | 涉及终局时读取赛制 |
| 三麻问题 | [三麻差异](references/topics/13-sanma.md)和上述对应主题 | [三麻证据索引](references/sanma-rules-sources.md) |
| 雀魂古役、乱斗之间或古役房规 | [雀魂古役](references/topics/14-guyi.md)和通常役种 | [古役证据索引](references/guyi-rules-sources.md) |
| 友人房、比赛房设置或包杠 | [可选房规](references/topics/15-room-options.md)和被改变的基础主题 | [扩展规则证据](references/replay-editor-rules-sources.md) |
| 修罗、赤羽或其他雀魂活动 | [活动专题](references/topics/16-event-modes.md) | 先确认活动，再读取适用的共通规则；川麻不套立直符番 |
| 国标番种、8番起和或国标编辑器 | [国标专题](references/topics/17-guobiao.md) | [版本与实现差异](references/replay-editor-rules-sources.md) |

判役需要和牌前手牌、和牌张、已副露／杠的面子、和牌方式、场风和自风；宝牌另列。算分还需要亲子身份、本场、供托及责任支付情况。不要用14张和牌后的牌形直接表示13张听牌手牌；杠子按实际四张检查牌数。

算分按“成立的役 → 符及例外 → 基本点与等级 → 各家支付 → 本场和供托”说明；无役不能仅靠宝牌和牌。终局必须先完成本局结算，用刚结束小局的庄家判断，再决定是否轮庄。策略建议注明所依赖的牌张信息与假设，不将筋、壁或经验排序当成保证。

古役仅在明确启用时参与判役，默认段位场不使用。不要把雀魂古役、其他地方古役与编辑器的一番街扩展混为一套；涉及开局、杠后、立直宣言或最后一张牌的古役，必须检查行动时点，不能只检查和牌形。

用户明确指定活动或国标时使用对应专题，不能退回默认段位计分。活动倍率、奖励番、公共供托与即时支付分别记录；不因手牌公开而判副露。国标先检查不含花牌的8番资格和番种排除，再计算支付，不使用立直符番。编辑器国标与雀渣平台附加番另标来源，不描述为雀魂官方玩法。未明确启用的房规不加入默认规则，也不假设多个活动可以任意叠加。

## 规则与证据

完整规则只在主题正文维护。四麻 [规则索引](references/rules-sources.md)和 [三麻索引](references/sanma-rules-sources.md)记录适用范围、正文归属和证据；需要来源或遇到平台差异时读取。用户确认、公开配置核验、计算核对与服务器实测是不同证据，不能互相替代。

当前段位基线验证状态与完成结论集中在 [验证记录](references/pending-verification.md)。三项边界验证已由用户报告实际完成；如后续新增未完成项，在该记录中维护。可选古役的公开配置、本地实现和未实测边界另见古役证据索引。回答需要来源时区分用户实际验证与维护助手执行的离线检查，不凭当前资源版本推断服务器裁定。历史记录按需读取，不覆盖当前正文。

可选房规、活动与国标的资料覆盖及实现冲突见扩展规则证据；它们不继承段位基线的服务器验证状态。旧编辑器支持不等于当前客户端可用，公开活动配置存在也不等于活动当前开放。

全部主题、示例和核验工具见 [参考索引](references/index.md)；修改本技能包时遵循 [维护约定](references/maintenance.md)。
