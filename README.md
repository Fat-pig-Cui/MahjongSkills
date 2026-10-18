# MahjongSkills

面向麻将规则解释、计分核对、流程裁定和立直基础策略分析的完整技能包。默认雀魂四人段位场；三麻差异、可选古役、房规、活动与编辑器国标模式分别标注。

[SKILL.md](SKILL.md) 是唯一技能入口。17个主题位于 [references/topics](references/index.md)，作为按需读取的参考文档；安装或复制时保留整个目录，不单独安装某个主题文件。技能目录名可使用 `riichi-mahjong`，与入口中的名称一致。

适合的请求例如：“三麻子家30符3番自摸，两本场，各家支付多少？”、“这次加杠被抢后是否翻新宝牌？”、“南四局结算后是否继续对局？”使用时提供手牌、和牌方式或局面信息；入口会指向相应规则和实例。

[雀魂古役专题](references/topics/14-guyi.md) 详细说明14个古役及判定边界，附分列手牌／副露／和牌张的牌例。古役须明确启用，段位场不使用；[证据索引](references/guyi-rules-sources.md) 区分官方公开说明、本地编辑器实现与尚未实测的细节。

[可选房规](references/topics/15-room-options.md) 覆盖友人房／比赛房设置与包杠；[活动专题](references/topics/16-event-modes.md) 说明修罗、赤羽等15种玩法；[国标专题](references/topics/17-guobiao.md) 独立说明8番起和、番种排除和支付。国标为来源编辑器参考雀渣的实现，不是雀魂官方玩法。原README覆盖范围与已知差异见 [扩展规则证据](references/replay-editor-rules-sources.md)。

## 目录职责

| 路径 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | 任务路由、适用规则与回答约束 |
| [references/index.md](references/index.md) | 17个主题、示例和证据的导航 |
| [references/rules-sources.md](references/rules-sources.md) | 四麻规则归属与证据索引 |
| [references/sanma-rules-sources.md](references/sanma-rules-sources.md) | 三麻差异与证据索引 |
| [references/guyi-rules-sources.md](references/guyi-rules-sources.md) | 可选古役的公开资料与证据边界 |
| [references/replay-editor-rules-sources.md](references/replay-editor-rules-sources.md) | 房规、活动与国标来源及版本差异 |
| [references/pending-verification.md](references/pending-verification.md) | 唯一验证状态与完成记录 |
| [references/evidence](references/evidence/verification-2026-10-07.md) | 历史确认、公开配置摘录和复现说明 |
| [scripts/validate.py](scripts/validate.py) | 本地格式、链接、牌例、计分与流程检查 |
| [scripts/extract_config.py](scripts/extract_config.py) | 获取或读取公开配置，按结构提取规则证据 |

## 验证和维护

使用 Python 3.10 或更新版本，无第三方依赖：

```sh
python3 scripts/validate.py
python3 -m unittest discover -s tests
```

CI 运行同样的离线检查。它们证明文档与所覆盖实例内部一致，不能单独证明服务器裁定。终局、第四杠与复杂包牌均已由用户确认经过实际验证，当前段位基线验证无未闭环项；这不包含新增可选古役、活动与国标的服务器验证。原始牌谱／日志可后续归档，状态见验证完成记录。

维护步骤、目录迁移与配置复现命令见 [维护约定](references/maintenance.md)。
