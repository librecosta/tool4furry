# B22-D1 UUID Generator

以 `11a2761f9497` 为起点实现。UUID Generator 保持 CN/Global Draft。每地区仍有 54 个正式工具详情页，全站共 29 款工具，其中 27 Published、2 Draft。

## 生成、解析与资源边界

- Quick 在浏览器初始化后通过 Web Crypto 生成 UUIDv4。v4 与 v7 提供 1、5、10、50 条快捷操作。首次使用 v7 才需要时间型生成模块。Advanced 独立加载，进入验证页签后才加载解析和位结构。
- 高级生成支持 v1、v3、v4、v5、v6、v7、Nil 和 Max。v1/v6 使用库的随机节点标识。v3/v5 保留名称中的空白、大小写和 Unicode 字符，提供 DNS、URL、OID、X.500 和自定义命名空间。哈希用于标准规定的确定性命名。
- 两个模式调用同一个无 options 的 v7 入口。uuid 14.0.3 的内部状态在同毫秒或时钟回拨时递增序列，32 位序列回绕时将逻辑时间推进 1 毫秒。顺序保证以当前浏览器中的工具状态为界。日期显示取自 UUID 的内嵌字段。
- 单个验证可区分编码有误、可解码的非 RFC 变体、DCE v2、未定义版本、有效 RFC 结构以及 Nil / Max。v8 识别版本位并显示自定义数据区。v1/v6 以 BigInt 解析 Gregorian 100 ns 计数并保留原始十进制值，v7 解析 48 位 Unix 毫秒。Base64 与 Base64URL 需要显式选择并通过严格往返校验。
- 普通批量生成、批量名称及批量验证上限均为 10,000 条。批量 UTF-8 输入和文本文件各上限 2 MiB，每个名称上限 4 KiB UTF-8，报告交付上限 16 MiB。处理每 256 条让出浏览器事件循环，结果列表和报告表格每页最多 50 行。

依据 [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html) 与 [uuid 14.0.3](https://github.com/uuidjs/uuid/tree/v14.0.3) 实现。上游完整 MIT 许可与来源随 [NOTICE](../../../src/tools/uuid-generator/uuid.NOTICE.txt) 保留。地区构建守卫检查 Draft 路由以及专属 JS、CSS、依赖和许可证的产物隔离。

## 文件交付契约

生成 TXT 支持换行、逗号或空格。JSON 为字符串数组，CSV 表头为 `uuid`，SQL 为经单引号转义的 UUID 列表。七种表示形式来自同一组 16 字节值，GUID 保持网络字节顺序。所有下载以 UTF-8 编码，文件名带浏览器当前本地毫秒时间戳。

验证报告按输入顺序保留行号和原文，以标准化字节值标识第二次及后续重复。一个末尾换行结束最后一行，中间空行作为无效记录。自动模式识别十六进制文本形式，Base64 输入模式对整批使用选定编码。

报告验证 UUID 结构并统计批内重复。标识符是否存在、是否在其他数据中重复以及相关访问权限，由业务系统判断。

- JSON 每行包含 `line`、`input`、`normalized`、`status`、`version`、`variant`、`duplicate` 和 `time`。缺失字段为 `null`。有效的时间对象包含 `ticks`、`unit`、`unixMs` 和 `utc`，原始时间戳和 Unix 毫秒使用十进制字符串。
- CSV 表头为 `line,input,normalized,status,version,variant,duplicate,timestamp_unit,timestamp_raw,unix_ms,utc`。缺失值写为空字段。对可能触发表格公式的输入附加单引号，JSON 保留未改动的原文。

## Chromium 验收

| 工作区 | 截图 |
| --- | --- |
| 中文快速模式 | [深色单条](cn-quick-dark.jpg) · [深色批量](cn-quick-batch.jpg) · [浅色单条](cn-quick-light.jpg) |
| 中文高级模式 | [批量生成](cn-advanced.jpg) · [命名空间](cn-namespace.jpg) · [验证与时间](cn-inspect.jpg) · [位结构](cn-structure.jpg) · [批量验证](cn-batch-validation.jpg) |
| 英文手机模拟视口 | [快速模式](global-mobile.jpg) · [验证结构](global-mobile-structure.jpg) |

在 CN 1280px 中文 Light/Dark 和 Global 390px 英文 Light 的 DEV 工具入口验收。浏览器自动生成及真实复制、模式切换及格式转换保留结果、快速与高级共用 v7 顺序，以及 390px UUID 完整单行展示均完成实测。10,000 条 v7 生成与 10,000 行验证的单次点击到结果分别为 269 ms 和 513 ms，每处页面渲染 50 行。生成批次样本未见重复。[浏览器记录](chromium.json)

使用 Python 的 UTF-8、`uuid`、`json` 和 `csv` 独立检查实际落盘的 TXT、JSON、CSV、SQL 及两种验证报告。校验了全量记录数、顺序、UUID 版本与变体、UTC 字段、重复标志和中文内容。[文件复检与哈希](exports.json)

定向测试复核 RFC 9562 附录 A 的六组样本、独立 MD5/SHA-1 对照、v7 同毫秒及回拨顺序、库计数回绕、边界与严格输入格式。Firefox、Safari、手机真机及峰值内存留待后续验收。
