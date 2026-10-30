# 工作区布局 · 当前说明

公共工作区只提供布局，不持有工具参数、文件、输出或算法。当前唯一正式工具是 Form 模式 Image Converter；Canvas/Batch 等 Lab 用于验证公共能力，不是已发布产品。

## 导航与所有权

- [ToolPageFrame](../src/tools/ToolPageFrame.tsx) 拥有唯一产品级品牌和导航；正式工具 H1 来自 Astro Intro，Shell 的 header 只是工具局部插槽，不再复制整页导航。
- [WorkbenchShell](../src/workbench/WorkbenchShell.tsx) 管理可选 `header/left/right/bottom/children`、布局、面板可见性和焦点；没有内容就不渲染空面板。工具业务始终位于稳定的外层 React owner。
- [UiProvider](../src/ui/UiProvider.tsx) 仅在固定 Runtime 根；层级和 Portal 由现有 Token / Base UI 管理，不通过新的全站 Provider 或业务 Store 解决布局问题。

## Canvas

CanvasViewport 保持完整 `100dvh`，Overlay/Inspector/Dock 不参与宽高分配，不改变工具坐标、不因开关面板重建画布。空白 Overlay 不截获 pointer/wheel，真实控件恢复可交互；模态 Sheet 遮罩是明确例外。

桌面 Inspector 默认关闭，非模态。窄屏由 [useCompact](../src/workbench/useCompact.ts) 与同阈值 CSS 切换到 Base UI Bottom Sheet，保留单一 Portal 宿主、keepMounted 参数树及业务值；不能复制桌面/手机两份控件。跨断点、隐藏面板、嵌套 Select / Escape 顺序与焦点返回必须稳定，隐藏内容不能留在 Tab 顺序。

Canvas 后的 Footer 在正常文档流，可通过页面滚动到达；不能为容纳 Footer 缩小 Viewport 或固定覆盖操作。公共文档 ScrollDock 与所有 Lab/Canvas 隔离，内部画布/面板滚动不变。

## Form、Batch、Custom

默认 Form/Batch 自然文档滚动；Custom 不强加画布或两栏语义。现有尺寸和断点以 Shell/样式为准，不把一个工具的布局迁移强加给所有调用方。

`WorkbenchShell mode="form" formWidth="wide"` 显式启用居中 1400px 上限与原安全边距；带 right slot 时为自适应主列 + 350px 设置列，≤1050px 堆叠。

工具需要「导入 → 设置 → 结果」时，可选择 [form-tool-layout.ts](../src/workbench/form-tool-layout.ts) 的 `container/columns/split/leading/aside/main` StyleX recipe；紧凑态 960px，展开使用 wide 可用宽度。尾部弹性轨道吸收较高设置列，不强行拉伸导入/结果行。它只是布局配方，不是 Schema/文件框架；Converter 仅换 class，任务、参数、预览与结果不重挂载。

## 静态说明与 FAQ

[ToolGuide](../src/components/site/ToolGuide.astro) / [site.ts](../src/styles/site.ts) 的说明容器与 wide Form 共享 1400px 外框和安全起点。宽屏步骤/限制为顶部对齐 55:45，两者可独立省略；空间不足堆叠，不增加实体卡片。其他阅读正文仍使用独立 readable 宽度。

FAQ 标题左对齐，每个原生 details/summary 占整行，整行可点击/键盘开合，Chevron 靠右；答案文字单独限制阅读宽度，不把 FAQ 外框缩成居中窄栏。布局不改变实际业务或静态 SEO 文本。

## 预览与文件原语

[FileTaskList](../src/ui/FileTaskList.tsx) 仅持展示数据/回调/媒体槽，紧凑两行与真实进度，不持有 File/Blob/URL；[FilePreviewDialog](../src/ui/FilePreviewDialog.tsx) 负责模态、关闭、焦点、全屏/最大化及生命周期，不处理图像变换。图片 Viewport 由工具装配，URL owner 与列表共享时不能过早释放。接口见 [UI 原语](ui-primitives.md) / [文件交互](file-interactions.md)，安全约束见 [图片处理](../contracts/image-processing.md)。

验证入口：[workbench.test.tsx](../tests/workbench.test.tsx)、[tool-page-frame.test.tsx](../tests/tool-page-frame.test.tsx)、[file-preview-dialog.test.tsx](../tests/file-preview-dialog.test.tsx)、[image-preview.test.tsx](../tests/image-preview.test.tsx) 及 Converter UI 测试。视口模拟不能替代移动真机。

## 历史

[完整 V0.3–V0.6 工作区设计及验收](history/workbench-appearance-v0.3-v0.6.md) 保留旧布局、旧主题、阶段几何和测试结果。当前接口、主题值与行为以源码/测试及本页为准。
