# B16 Markdown Editor 验收

## B16-D1 初版记录

### 工作区截图

Chromium 156.0.8078.4，Windows。按原型核对单一外壳、紧凑图标工具栏、文件名标题条、连续双栏、中央拖柄和底部状态栏。右侧渲染真实文档，显示任务列表、引用、代码和表格。390 px 手机模拟视口默认进入编辑模式，操作集中到 More 菜单，编辑、预览和分栏均无页面横向溢出。

- [CN 中文 Dark，1280 px](cn-dark-1280.png)
- [Global 英文 Light，820 px 原型参考宽度](reference-light-820.png)
- [Global 英文 Light，390 px 编辑模式](global-light-390-editor.png)
- [Global 英文 Light，390 px 预览模式](global-light-390-preview.png)
- [下载的 HTML 在离线 Chromium 中打开](offline-html.png)

### 操作与交付

- 操作了标题、粗体快捷键、撤销重做、查找替换、主题切换和全屏 Escape。切换到预览再回到分栏后保留原选区。拖动分隔线后用键盘微调，按 Enter 恢复等宽。
- 两侧按段落、长代码块和表格形成的锚点同步。预览定位到样本第 633 行的标题时，源码滚动到第 633 行。关闭同步后，预览滚动不再驱动源码。
- 剪贴板读取了 Markdown、清洗后的 HTML 和单个代码块。Windows 剪贴板把多行纯文本转换成 CRLF。实际 Markdown 下载保留编辑器的 LF 内容，逐字节与样本核对。测试了文件选择、覆盖确认以及拖放。
- 初版默认图片请求为零。明确许可后只加载样本中一张合法的 Markdown 图片，测试通过拦截提供响应。原始 HTML 图片、事件处理器、脚本和危险链接均未激活。下载的 HTML 在断网状态显示行内和块级 MathML，脚本和 HTTP 请求均为零。预览的默认设置后来更新，当前行为见下文的 D2 记录。
- 通过 Chromium DevTools Protocol 提交了真实浏览器合成输入 `你好`，从剪贴板确认结果。系统输入法候选窗、Firefox、Safari、实体手机和不同系统剪贴板行为尚未验证。

### 长文档与正式产物

- 程序化样本为 1,346,400 个 UTF‑16 代码单元、15,301 行。文件选择至自动预览暂停提示用时 489 ms。滚动到末尾只挂载 25 条源码行，追加中英文后实际下载 1,438,215 字节，逐字节一致。耗时仅代表本次机器和样本。
- HTML 离线导出内联文章样式并使用原生 MathML。较长文章超过 HTML 预算时仍可编辑、复制和下载源码。
- `pnpm check` 零错误、零警告，九个定向测试文件合计 67 项通过，包含共享 CodeMirror 及发布契约回归。
- Markdown Editor 仍为 Draft。CN 和 Global 的正式产物守卫排除了 Draft 页面、编辑器专属脚本和样式、KaTeX 字体及 NOTICE。总数 29，Published 21，Draft 8。

浏览器版本、锚点位置、文件长度及 SHA-256 见 [Chromium 验收数据](chromium.json)。

## B16-D2 正式产物验收

- CN 与 Global 静态构建各生成 44 个工具详情页。Markdown Editor 的四条详情路由输出本地化 Title、Description、唯一 H1、专属像素图标、四项步骤、六项限制和四组 FAQ，并纳入目录、Sitemap 及 llms.txt。其余七款 Draft、QR 实验、DEV Lab 和 Fixture 由正式构建守卫排除。
- `pnpm check` 检查 556 个文件，零错误、零警告。Markdown、共享 CodeMirror、发布、发现和 PDF 预览时序复核共 16 个测试文件、178 项通过。
- KaTeX 渲染器、样式和字体由公式预览按需加载。HTML 导出动态使用 KaTeX 的 MathML 输出。完整 Markdown 依赖和 CodeMirror 核心 NOTICE 随编辑器交付，可通过两个 `rel="license"` 链接访问，浏览器中核对了实际响应与源码字节。
- CN 中文深色桌面复核了固定英文示例、标题和粗体快捷键、撤销重做、视图切换保留选区、查找替换、分隔线、双向锚点同步、全屏 Escape、亮暗切换和 Chromium 合成输入。真实文件选择触发覆盖确认，新文件名用于 Markdown 和 HTML 下载。
- 安全样本触发了一次合法 Markdown 图片请求，无 Referer。浏览器请求被测试路由截获并提供本地图像响应。关闭远程图片后更换为未请求过的地址，预览仍显示占位且未发出新请求。原始 HTML 图片及脚本未激活，危险链接无可导航地址。
- 核对 Markdown、HTML 和代码块的真实剪贴板内容。实际 Markdown 下载为 UTF-8 和 LF，与编辑器源码逐字节匹配。HTML 文件含正文、内联样式和行内及块级 MathML，在 Chromium 离线打开时无 HTTP 请求。浏览器验收包含编辑后重命名和实际文件名、后缀、MIME 及 SHA-256 检查。
- 1,346,400 UTF-16 单元样本超过自动及手动渲染预算。自动预览暂停，旧内容不可交互，手动刷新和 HTML 交付明确报预算错误。滚动和继续编辑后，实际 Markdown 下载仍逐字节一致。
- Global 英文浅色 390 px 触摸模拟验证了默认编辑模式、预览和分栏切换、查找、拖放导入、重命名、真实剪贴板及两种下载。页面没有横向溢出。两地区的 URL & Base64 都未请求 Markdown 或 KaTeX 资源。

复核使用 Chromium 156.0.8078.4（Windows）。[正式构建验收数据](d2-chromium.json)包含四个静态页面的元数据、请求记录和下载校验值。

- [CN 中文 Dark，1280 px](d2-cn-dark-1280.png)
- [Global 英文 Light，390 px 编辑模式](d2-global-light-390-editor.png)
- [Global 英文 Light，390 px 预览模式](d2-global-light-390-preview.png)
- [实际下载的 HTML 在离线 Chromium 中打开](d2-offline-html.png)

[参考基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45412489898)通过。[最新开发基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45413950211)失败于 PDF 预览测试的图像加载时序。本轮让该测试在初始化提交后派发模拟加载事件，保留真实尺寸、缩放和资源释放断言。新发布提交的 CI 以其对应运行结果为准。

Firefox、Safari/WebKit、真实 iOS/Android、系统 IME 候选窗口、不同系统剪贴板和更高资源压力留待 L3。390 px 为 Chromium 触摸模拟。
