# B18 CSV / JSON 转换验收

## B18-D2 正式产物验收

Windows Chromium 156.0.8078.4 使用 CN 和 Global 的 Astro 正式构建产物。实测 CN 中文深色 1280 px 桌面、Global 英文浅色 390 px 手机模拟视口。两地检查了固定英文示例、UTF-8 导入、两个方向的转换、类型推断、嵌套对象展开、表格分页及列组、完整单元格、无效编码、取消转换和重新转换。反向转换通过复制、切换方向和粘贴完成，延续维护者验收后的工作区。

- [CN 深色桌面](d2-cn-desktop-dark.png) · [Global 浅色手机模拟](d2-global-mobile-light.png)
- [Chromium 操作、文件名及 MIME 记录](d2-chromium.json) · [12 个实际下载的独立复检及 SHA-256](d2-independent-file-checks.json)

测试固定同一时刻，按上海和纽约两个浏览器本地时区分别验证命名，并强制同毫秒连续点击。首次文件名如 `converted-20261126-225530-128.json`，第二次追加 `-2`。中文和 Emoji 基本名保留。实际 Blob 分别使用 JSON、CSV 和 TSV MIME。

Python `csv.reader` 与 `json.loads` 独立复检了全部下载。结果保留了前导零、引号字段内的 CRLF、Unicode、超长整数、小数尾零和科学计数字面量。CSV 为 CRLF，无 BOM。TSV 为 LF，包含所选 BOM、展开后的列及启用公式防护后的单元格。Windows 剪贴板换行归一后与下载 TSV 字节完全一致。

`pnpm check`、303 项定向与回归测试及双地区正式构建守卫通过。四个正式详情页包含完整双语 SEO，每地区有 48 个双语工具详情页。转换 Worker、局部样式及完整 Papa Parse MIT 通知随工具交付。共享 JSON 编辑语法不带入 JSON Formatter 专属资源。其余五款 Draft、QR 实验、DEV Lab 及 Fixture 继续隔离。

约 63 MiB CSV 与 32,224 条完整记录沿用下列 D1 独立复检证据。D2 未重跑该大文件压力测试。Firefox、Safari/WebKit、实体移动设备、Excel 实际打开文件，以及整个浏览器和 Worker 峰值内存仍待 L3 验证。

## B18-D1 历史记录

### Chromium 实际操作

Windows Chromium 156.0.8078.4 使用固定端口的 CN/Global DEV 页面。工具当时为 Draft，浏览器验收使用 DEV，正式构建验证资源隔离。

以下截图及操作记录基于 `d01d51f`。当前工作区通过顶部工具栏切换方向，截图中的居中交换按钮已移除。

- [CN 中文深色桌面 1280 px](cn-desktop-dark.png)、[Global 英文浅色手机模拟 390 px](global-mobile-light.png)、[CN 浅色较窄桌面 1024 px](cn-prototype-light.png)。
- 两个地区实测固定英文示例、类型设置、方向切换保留草稿、显式交换、选择与拖入文件、无效 UTF-8、真实剪贴板以及 JSON、CSV、带 BOM 的 TSV 下载。结果文件名沿用源文件名，记录了实际 Blob MIME。
- [表格截图](cn-desktop-table.png)使用 105 行、121 列数据。测试进入第二个 50 行页，查看第 100 行的完整单元格，并切为 200 行/页后浏览第 105 行。横向滚动留在表格内部，列组导航允许访问超宽表格的后续列。两种视口均无页面横向溢出或浏览器脚本异常。
- 实测同源工具 Worker。输入取消后下载立即失效，重新转换可生成完整结果。超过编辑器预览预算时，剪贴板和交换禁用，仍可下载完整文件。

### 大文件与独立复检

| 场景 | 实测 |
| --- | --- |
| CSV 导入 | 66,059,212 B（约 63.0 MiB），32,224 条数据记录 |
| 压缩二维数组 JSON | 66,220,321 B（约 63.2 MiB），约 1.17 秒从重新转换到下载可用 |
| 处理期间主线程 | 20 ms 间隔定时器触发 64 次，最大观测间隔约 39 ms，测试区间包含取消和重启 |
| 超过 64 MiB 的输出 | 同一源切换为四空格对象数组后明确拒绝，旧结果不可下载 |
| 输出独立复检 | Python csv.reader 与 json.load 校验双地区的六个小文件及完整大文件，逐条对比 32,224 行 |
| 原文字节 | 保留 CSV 字段内 CRLF、引号、中文和 Emoji，JSON 数字字面量在 CSV/TSV 保留。核对默认 CRLF、可选 LF、UTF-8 BOM、公式前缀和 Windows 剪贴板 CRLF 转换 |

[Chromium 记录](chromium.json) · [独立文件复检及 SHA-256](independent-file-checks.json)

耗时和定时器数据只反映单次本地 Chromium 运行，未测整个浏览器、Worker 或系统峰值内存。未验收 Firefox、Safari 或实体手机。本轮不包含 Excel 实际打开文件的兼容性验收。
