# 维护约定

## 唯一维护位置

根目录 `SKILL.md` 维护技能适用范围、任务路由和输出所需信息；17个主题在 `topics/` 维护完整规则与基础分析。四麻、三麻、古役与扩展规则索引维护正文归属、参数和证据状态，避免重复完整算法。`examples/` 维护具体输入与预期结果。`evidence/` 保留当次确认、资源摘录与复现说明，后续不覆盖历史事实。当前验证任务只写入 [待验证清单](pending-verification.md)。

新规则先确定归属主题，再更新正文、索引的证据／参数和受影响的实例。共通规则修改一个正文；三麻只维护例外和人数相关金额。稳定规则编号见索引，用于关联正文、实例和验证任务；不能把“用户确认”升级成“服务器实测”。

可选古役单独维护在第14主题与 [古役证据索引](guyi-rules-sources.md)，不得加入默认段位役表。官方文字与本地编辑器不一致时记录冲突，不以离线程序替代平台裁定；新增配置证据使用独立摘录，保留原段位快照。

可选房规、活动与国标分别在第15至17主题维护，来源与差异汇总于 [扩展规则证据](replay-editor-rules-sources.md)。国标另用起和、计番和支付体系；赤羽采用川麻体系。段位基线离线检查不代表已对这两种体系实现完整判番验证。新增正文首先明确规则范围和来源版本，不根据编辑器配置自动接受任意玩法组合。

## 验证

在仓库根目录运行：

```sh
python3 scripts/validate.py
python3 -m unittest discover -s tests
git diff --check
```

赤羽花猪流局支付的运行时修复位于关联源码仓库
`/Users/chubbypig/Programming/majsoul_unity/third_party/replay-editor/core/`，由构建步骤转译到生成目录；其回归测试为
`/Users/chubbypig/Programming/majsoul_unity/tools/tests/chuanma-draw.test.mjs`，可在关联仓库的 `tools/` 目录运行：

```sh
npm test -- --test-name-pattern='赤羽|flower'
```

当前项目的 `references/examples/chuanma-draw-2026-11.json` 是同一规则边界的独立、可读夹具；它只验证花猪转账矩阵和收支守恒，不声称完成服务器验证。

`third_party/replay-editor/` 是从关联仓库复制的 MIT 授权离线算番源码副本，保留 `LICENSE`、`NOTICE`、来源说明和已知问题记录。修改副本时先运行 `tsc -p third_party/replay-editor/tsconfig.json --noEmit`，再运行 `node scripts/build_replay_editor.mjs` 和 `node scripts/replay_editor_cli.mjs ...` 的固定案例；生成物只放在被忽略的 `.cache/`，不提交转译 JS。

校验器检查唯一技能入口、包内链接与锚点、参考材料可达性、牌例牌数和牌形、第13至17主题内联牌例、符番支付表、结算守恒、终局实例、第四杠事件序列、受入上限、筋／壁搭子关系及历史证据摘录。牌形检查只验证所标明的必要结构，不是完整判役引擎；平台边界见待验证清单。测试还包含无效牌、非法符番、损坏的二进制和文档改错后必须失败的案例。脚本能力边界统一见 [能力矩阵](capability-matrix.md)。

文档中的命名示例块和结构化用例是同一案例的两种表示；校验会检查其一致性。第13至17主题中超过四张的内联牌例须在 `scripts/validate.py` 的 `INLINE_HANDS` 登记其断言的牌形，古役举例表由 `check:guyi-examples` 标记；新增或修改这类牌例时同步登记，否则校验失败。新实例给出和牌前手牌／和牌张／副露、玩法、庄家及实际逐人收支，使用稳定案例编号。

公开配置提取的命令和证明范围见 [复现说明](evidence/reproduce-config.md)。新资源的版本与哈希必须进入新的证据记录，不覆盖2026-10-07快照；联网更新不属于离线CI。

## 目录迁移

旧的 `01-…/SKILL.md` 至 `13-sanma/SKILL.md` 已迁到 `references/topics/`，文件名前缀和章节编号保留。旧 `reference/SKILL.md` 改为 [参考索引](index.md)，三个例子迁到 `examples/`。旧 `ans.md` 保留为 [历史确认笔记](evidence/user-confirmations-2026-10-07.md)，旧 `temp.md` 的当前任务并入唯一待验证清单。旧汇总文件 [REPORT.md](REPORT.md) 仅作为兼容索引。

整个仓库可作为一个技能包复制到名为 `riichi-mahjong` 的目录；主题、实例、证据与脚本的引用均留在包内。根目录README用于仓库说明，主题不再具有独立技能frontmatter。
