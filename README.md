# MahjongSkills

面向立直麻将规则解释、计分核对、流程裁定和基础策略分析的完整技能包。默认雀魂四人段位场；三麻差异、友人房选项与证据边界分别标注。

[SKILL.md](SKILL.md) 是唯一技能入口。原13个主题现在位于 [references/topics](references/index.md)，作为按需读取的参考文档；安装或复制时保留整个目录，不单独安装某个主题文件。技能目录名可使用 `riichi-mahjong`，与入口中的名称一致。

适合的请求例如：“三麻子家30符3番自摸，两本场，各家支付多少？”、“这次加杠被抢后是否翻新宝牌？”、“南四局结算后是否继续对局？”使用时提供手牌、和牌方式或局面信息；入口会指向相应规则和实例。

## 目录职责

| 路径 | 用途 |
|---|---|
| [SKILL.md](SKILL.md) | 任务路由、适用规则与回答约束 |
| [references/index.md](references/index.md) | 13个主题、示例和证据的导航 |
| [references/rules-sources.md](references/rules-sources.md) | 四麻规则归属与证据索引 |
| [references/sanma-rules-sources.md](references/sanma-rules-sources.md) | 三麻差异与证据索引 |
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

CI 运行同样的离线检查。它们证明文档与实例内部一致，不能单独证明服务器裁定。终局、第四杠与复杂包牌均已由用户确认经过实际验证，当前规则验证无未闭环项。原始牌谱／日志可后续归档，状态见验证完成记录。

维护步骤、目录迁移与配置复现命令见 [维护约定](references/maintenance.md)。
