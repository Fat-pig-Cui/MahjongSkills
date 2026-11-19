# replay-editor 算法副本

本仓库的 `third_party/replay-editor/` 是从
`/Users/chubbypig/Programming/majsoul_unity/third_party/replay-editor/`
复制的离线 TypeScript 源码副本。副本保留原目录的 `LICENSE`、`NOTICE`、作者署名、来源说明和 `KNOWN_RULE_ISSUES.md`，不包含浏览器 UI、网络重写、游戏资源、账号数据或生成物。

2026-11-08 对照源目录当前工作树后，同步了 `core/core.ts`、`core/exportedUtils.ts`、`core/fanSearch.ts`、`core/settlement.ts` 和新增的 `core/tile-vector.ts`。这些修改覆盖错和赔打、临时结算向量、听牌缓存、固定牌面向量和无序／红5顺子中间牌处理。源目录这些改动仍未提交，因此本记录以文件内容为同步依据，不宣称对应某个新的源提交号。

## 覆盖范围

- `core/calcFan.ts`：立直、古役和活动规则的普通算番路径。
- `core/calcFanChuanma.ts`：赤羽之战算番与查大叫路径。
- `core/calcFanGuobiao.ts`：国标番种、排除关系和计番路径。
- `core/fanSearch.ts`：手牌划分、符数与等待相关辅助。
- `core/chuanmaSettlement.ts`、`core/settlement.ts`：赤羽花猪和逐笔台账辅助。
- `core/wildcard.ts`：百搭候选评分与可复现顺序。

当前仓库新增 `scripts/build_replay_editor.mjs` 和
`scripts/replay_editor_cli.mjs`。构建结果写入 `.cache/replay-editor`；CLI
支持 `ranked`、`guyi`、`activity`、`chuanma` 和 `guobiao` 模式，并可通过
`--detail-rule` 传入活动规则开关。

## 离线验收

```sh
tsc -p third_party/replay-editor/tsconfig.json --noEmit
node scripts/build_replay_editor.mjs
node --test tests/replay_editor_runtime.test.mjs
```

固定合成案例覆盖国标九莲、古役大车轮、活动百搭开关和赤羽算番入口。上述结果证明副本可构建并执行，不替代当前客户端或服务器牌谱验证。
