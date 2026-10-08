# 公开配置的获取与复现

此流程只读取雀魂官方公开静态资源，无须登录。它提取规则说明与房间参数，不执行服务器对局、不证明服务器当期裁定。2026-10-07资源版本为 `0.11.252.w`；旧快照与新的公开版本分别保留。

## 资源链

1. [version.json](https://game.maj-soul.com/1/version.json) 提供当前公开资源版本。
2. 对应 `resversion{version}.json` 资源清单给出 `res/config/lqc.lqbin` 的 `prefix`；不能假设每个资源都和入口版本相同。
3. 用该前缀构成配置URL。此次为 [lqc.lqbin](https://game.maj-soul.com/1/v0.11.252.w/res/config/lqc.lqbin)。
4. [官方配置结构](https://game.maj-soul.com/1/v0.10.1.w/res/proto/config.proto) 定义 `ConfigTables` 外层；其字段定义的本地副本见 [config.proto](config.proto)。二进制本身包含 `schemas`，行中的字段编号由 `pb_index` 对应 `field_name` 和 `pb_type`，不是直接将字节当作JSON或纯文本。

[extract_config.py](../../scripts/extract_config.py) 先解码外层字段3的表结构，再读取字段4中的各表行数据，只提取本次证据用到的列和ID。UTF-8只用于结构声明为字符串的值；变长整数、有符号整数和定长数值按各自类型处理。不支持的选中字段编码会报错，避免猜测。缺省标量按proto3默认值处理。

## 复现2026-10-07摘录

在仓库根目录运行，下列命令联网获取固定版本，并对比已保存摘录：

```sh
python3 scripts/extract_config.py --version 0.11.252.w --compare references/evidence/config-excerpt-2026-10-07.json --output .cache/config-reproduced.json
```

若已经下载二进制，可离线复现（把示例路径替换为实际文件）：

```sh
python3 scripts/extract_config.py --input /path/to/lqc.lqbin --version 0.11.252.w --compare references/evidence/config-excerpt-2026-10-07.json --output .cache/config-reproduced.json
```

脚本在固定版本下强制检查原二进制SHA-256，再核对 [选中行摘录](config-excerpt-2026-10-07.json)，不将未匹配的输入当成历史快照。原二进制约17MB，不提交仓库；保存URL、哈希、结构与选中数据即可复现本次提取。

查看当前公开资源时：

```sh
python3 scripts/extract_config.py --latest --output .cache/config-current.json
```

该命令重新读取版本和资源清单，新版本结果不覆盖历史摘录。公开版本、`ConfigTables.version` 和服务器裁定版本不是同一概念。`--input` 离线模式的资源版本由调用者声明，只有固定版本哈希能校验其历史身份。

## 摘录与证明范围

| 表与ID | 保存内容 | 证明范围 |
|---|---|---|
| `desktop.matchmode` 2、3、17至22 | 模式、原点、返点 | 选中段位房参数 |
| `str.str` 3、24、25、63 | 简体中文规则说明 | 四麻说明、三麻牌组／拔北／自摸损说明 |
| `fan.fan` 34 | 拔北宝牌的名称、番数与宝牌标记 | 基础拔北宝牌1番 |
| `fandesc.fandesc` 116、501 | 简体中文役说明 | 拔北宝牌描述与流局满贯成立条件 |

友人房高级设置中的选项名不证明段位房默认值；配置说明没有覆盖的终局细节、第四杠优先级与复杂包牌结算采用各自确认口径，本地包牌资料的房规范围见 [2026-10-09记录](pao-confirmations-2026-10-09.md)。原始证据归档状态见 [待验证清单](../pending-verification.md)，历史来源与用户确认见 [核验记录](verification-2026-10-07.md)。
