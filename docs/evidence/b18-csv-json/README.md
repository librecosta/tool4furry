# B18-D1 CSV / JSON 转换验收

## Chromium 实际操作

Windows Chromium 156.0.8078.4 使用固定端口的 CN/Global DEV 页面。工具仍为 Draft，浏览器验收使用 DEV；正式构建验证资源隔离。

以下截图及操作记录基于 `d01d51f`。当前工作区通过顶部工具栏切换方向，截图中的居中交换按钮已移除。

- [CN 中文深色桌面 1280 px](cn-desktop-dark.png)、[Global 英文浅色手机模拟 390 px](global-mobile-light.png)、[CN 浅色较窄桌面 1024 px](cn-prototype-light.png)。
- 两个地区实测固定英文示例、类型设置、方向切换保留草稿、显式交换、选择与拖入文件、无效 UTF-8、真实剪贴板以及 JSON、CSV、带 BOM 的 TSV 下载。结果文件名沿用源文件名，记录了实际 Blob MIME。
- [表格截图](cn-desktop-table.png)使用 105 行、121 列数据。测试进入第二个 50 行页，查看第 100 行的完整单元格，并切为 200 行/页后浏览第 105 行。横向滚动留在表格内部，列组导航允许访问超宽表格的后续列。两种视口均无页面横向溢出或浏览器脚本异常。
- 实测同源工具 Worker。输入取消后下载立即失效，重新转换可生成完整结果。超过编辑器预览预算时，剪贴板和交换禁用，仍可下载完整文件。

## 大文件与独立复检

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
