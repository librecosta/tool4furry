# B16-D1 Markdown Editor 验收

## 工作区截图

Chromium 156.0.8078.4，Windows。按原型核对单一外壳、紧凑图标工具栏、文件名标题条、连续双栏、中央拖柄和底部状态栏。右侧渲染真实文档，显示任务列表、引用、代码和表格。390 px 手机模拟视口默认进入编辑模式，操作集中到 More 菜单，编辑、预览和分栏均无页面横向溢出。

- [CN 中文 Dark，1280 px](cn-dark-1280.png)
- [Global 英文 Light，820 px 原型参考宽度](reference-light-820.png)
- [Global 英文 Light，390 px 编辑模式](global-light-390-editor.png)
- [Global 英文 Light，390 px 预览模式](global-light-390-preview.png)
- [下载的 HTML 在离线 Chromium 中打开](offline-html.png)

## 操作与交付

- 操作了标题、粗体快捷键、撤销重做、查找替换、主题切换和全屏 Escape。切换到预览再回到分栏后保留原选区。拖动分隔线后用键盘微调，按 Enter 恢复等宽。
- 两侧按段落、长代码块和表格形成的锚点同步。预览定位到样本第 633 行的标题时，源码滚动到第 633 行。关闭同步后，预览滚动不再驱动源码。
- 剪贴板读取了 Markdown、清洗后的 HTML 和单个代码块。Windows 剪贴板把多行纯文本转换成 CRLF。实际 Markdown 下载保留编辑器的 LF 内容，逐字节与样本核对。测试了文件选择、覆盖确认以及拖放。
- 默认图片请求为零。明确许可后只加载样本中一张合法的 Markdown 图片，测试通过拦截提供响应；原始 HTML 图片、事件处理器、脚本和危险链接均未激活。下载的 HTML 在断网状态显示行内和块级 MathML，脚本和 HTTP 请求均为零。
- 通过 Chromium DevTools Protocol 提交了真实浏览器合成输入 `你好`，从剪贴板确认结果。系统输入法候选窗、Firefox、Safari、实体手机和不同系统剪贴板行为尚未验证。

## 长文档与正式产物

- 程序化样本为 1,346,400 个 UTF‑16 代码单元、15,301 行。文件选择至自动预览暂停提示用时 489 ms。滚动到末尾只挂载 25 条源码行，追加中英文后实际下载 1,438,215 字节，逐字节一致。耗时仅代表本次机器和样本。
- HTML 离线导出内联文章样式并使用原生 MathML。较长文章超过 HTML 预算时仍可编辑、复制和下载源码。
- `pnpm check` 零错误、零警告，九个定向测试文件合计 67 项通过，包含共享 CodeMirror 及发布契约回归。
- Markdown Editor 仍为 Draft。CN 和 Global 的正式产物守卫排除了 Draft 页面、编辑器专属脚本和样式、KaTeX 字体及 NOTICE。总数 29，Published 21，Draft 8。

浏览器版本、锚点位置、文件长度及 SHA-256 见 [Chromium 验收数据](chromium.json)。
