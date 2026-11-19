# 离线牌谱生成核心

本目录是 majsoul-replay-editor 的离线源码快照，经权利人本次明确授权改为 MIT，许可全文见 LICENSE。当前副本供本项目的离线算番 CLI 和牌谱生成适配使用；源目录的主动维护和优化集中在关联 majsoul-unity 工程。

关联源码工程中的 `tools/convert_paipu.mjs` 及从本目录常量派生的 `client/core/custom_fans.json` 未复制到本仓库。保留来源与原作者署名；此授权不改变其他协议定义、包管理器依赖或游戏内容的权利。

来源项目：`https://github.com/Fat-pig-Cui/majsoul-replay-editor`。快照日期：2026-10-02。原 constants.ts SHA-256：`45d1ce63e8b1ff8166412f0ed29ae3354419e24f3d359da2d6cccfd357d037b0`。

本地改动：删除作者邮箱；不迁入 override.ts 的浏览器 UI/网络重写；新增 `types.d.ts` 与 `tsconfig.json`，构建前先运行 TypeScript 类型检查；`core.ts` 改用 `offline-adapter.ts` 的显式 `HostCapabilities`，不再读取 `view`/`editFunction` 全局变量；新增 `core/state.ts`（整份牌谱/小局初始化）与 `core/round.ts`（小局提交和场/局推进），配合 `data.ts` 的 `gameState` 兼容视图；新增 `core/settlement.ts` 逐笔结算台账，修复 JS-02/03/04/10 并确认 JS-12 的 `max(8000, 查大叫)` 金额语义，修复 JS-01/05/06/07/08/09/11；新增 `core/rng.ts`，洗牌改为可注入种子的 Fisher–Yates；`calcFan.ts` 按模式拆为 `calcFanChuanma.ts`/`calcFanGuobiao.ts`/`fanSearch.ts`，并新增 `rule-context.ts` 规则快照，保留原导入路径；`setConfig()` 改为复制配置，不再保留调用者引用；删除 `misc.ts` 中离线不可达的装扮池与桌布/牌背/牌面查询函数；`constants.ts` 的番种表函数改用本地对象，不再读取浏览器 `cfg`；`offline.ts` 只发布离线构造 API；修正 9201、9312 的对象 id 与索引不一致。其余生成与计分算法保持来源实现，不代表本项目已重新验证全部麻将规则。

本仓库使用 `node scripts/build_replay_editor.mjs` 将源码转译到 `.cache/replay-editor/`，生成物不进入 Git。关联工程使用的 `tools/.generated/`、测试与迁移文档路径不属于本仓库；历史修复记录中的这些路径保留作来源说明。不要从相邻工程加载 main.js，也不要在此加入游戏资源、真实牌谱或本机配置。
