# 能力矩阵

本仓库的脚本用于验证文档和可复现的小型计算，不是完整麻将引擎。下表把可以直接依赖的能力和边界分开，避免将离线检查结果误写成平台裁定。

| 能力 | 状态 | 入口 | 说明 |
|---|:---:|---|---|
| 牌张解析、红5和四张上限 | 已实现 | `scripts/mahjong_checks.py` | 支持四麻、三麻牌张限制；暗杠的五字符展示约定由解析器折算为四张实体牌 |
| 标准形、七对子、国士及部分结构役 | 已实现 | `matches_kind()` | 用于文档案例的必要结构检查，不能替代完整判役 |
| 听牌／受入核对 | 已实现 | `waits()`、`validate_hand()` | 只对声明的结构和等待集合核对 |
| 符番基本点和常规支付 | 已实现 | `base_points()`、`payments()` | 覆盖文档中四麻／三麻、役满、拔北无自摸损等案例 |
| 本场、供托、多家荣和、流局结算 | 已实现 | `settlement()`、`noten()` | 用结构化结算案例验证守恒；不处理任意新规则组合 |
| 责任支付（包牌） | 已实现 | `settlement()` | 支持纯包牌、复合包牌和三麻自摸扣损案例 |
| 终局判断 | 文档级实现 | `references/topics/08-match-rules.md` | 校验器会执行文档中的 `judge()`，不读取实时客户端状态 |
| 第四杠行动时序 | 文档级实现 | `references/examples/gameplay.md` | 验证固定事件序列，不模拟完整牌局 |
| 立直效率、筋、壁、防守 | 部分实现 | `references/topics/10-12` | 主题提供规则和示例；脚本只核对有限的受入上限与防守表 |
| 古役、活动、国标完整判番 | 未实现 | `references/topics/14-17` | 文档和证据索引可供解释；版本化夹具只检查登记牌例的结构，不是完整判番器 |
| 当前服务器／客户端裁定 | 未实现 | — | 需要带版本的实战牌谱或客户端复现；离线测试不能证明此项 |
| 赤羽花猪流局支付 | 已修复并有回归夹具 | 关联 `majsoul_unity` 的 `calcFlowerPigDeltas()` | 修复全员未听时被外层条件跳过的问题；当前项目保留规则和夹具，关联项目负责运行时实现 |

## CLI

无需第三方依赖，在项目根目录运行：

```sh
python3 scripts/mahjong_cli.py score --fu 30 --han 4
python3 scripts/mahjong_cli.py payments --fu 30 --han 3 --players 4 --dealer 0 --winner 1 --loser 2
python3 scripts/mahjong_cli.py hand --state complete --hand '123m 456p 789s 111z 22m' --kind standard
python3 scripts/mahjong_cli.py flower-pig --huazhu true,false,false,false --huled false,false,false,false
```

命令输出 JSON，错误返回码为 2。`hand`、`score`、`payments` 和 `flower-pig` 都只调用本仓库已有的确定性检查；它们不会联网，也不会声称完成平台判定。
