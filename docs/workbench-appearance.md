# 工作区布局 · 当前说明

公共工作区只提供布局，不持有工具参数、文件、输出或算法。Image Converter、Batch File Renamer 与 ZIP Manager 是标准文件表单的当前实例；Canvas/Batch 等 Lab 用于验证公共能力，不是已发布产品。

## 导航与所有权

- [ToolPageFrame](../src/tools/ToolPageFrame.tsx) 拥有唯一产品级品牌和导航；正式工具 H1 来自 Astro Intro，Shell 的 header 只是工具局部插槽，不再复制整页导航。
- [WorkbenchShell](../src/workbench/WorkbenchShell.tsx) 管理可选 `header/left/right/bottom/children`、布局、面板可见性和焦点；没有内容就不渲染空面板。工具业务始终位于稳定的外层 React owner。
- [UiProvider](../src/ui/UiProvider.tsx) 仅在固定 Runtime 根；层级和 Portal 由现有 Token / Base UI 管理，不通过新的全站 Provider 或业务 Store 解决布局问题。

## Canvas

CanvasViewport 保持完整 `100dvh`，Overlay/Inspector/Dock 不参与宽高分配，不改变工具坐标、不因开关面板重建画布。空白 Overlay 不截获 pointer/wheel，真实控件恢复可交互；模态 Sheet 遮罩是明确例外。

桌面 Inspector 默认关闭，非模态。窄屏由 [useCompact](../src/workbench/useCompact.ts) 与同阈值 CSS 切换到 Base UI Bottom Sheet，保留单一 Portal 宿主、keepMounted 参数树及业务值；不能复制桌面/手机两份控件。跨断点、隐藏面板、嵌套 Select / Escape 顺序与焦点返回必须稳定，隐藏内容不能留在 Tab 顺序。

Canvas 后的 Footer 在正常文档流，可通过页面滚动到达；不能为容纳 Footer 缩小 Viewport 或固定覆盖操作。公共文档 ScrollDock 与所有 Lab/Canvas 隔离，内部画布/面板滚动不变。

## Form、Batch、Custom

默认 Form/Batch 自然文档滚动。具备文件导入、文件列表及参数或操作面板时，默认使用左侧 File Workspace、右侧 Settings / Actions；不再为同类工具各写一套相反方向的双栏。Custom、Canvas、单一输入及其他不适用场景可以例外，但须有明确理由。本次不批量改造其他工具。

`WorkbenchShell mode="form" formWidth="wide"` 显式启用居中 1400px 上限与原安全边距；带 right slot 时为自适应主列 + 350px 设置列，≤1050px 堆叠。

默认复用 [form-tool-layout.module.scss](../src/workbench/form-tool-layout.module.scss)，布局不持有业务状态：

- **Empty**：`container/fileForm` 保持 960px 紧凑上限；Expanded 上传区和实际参数/操作自然排布，不渲染巨大的空列表或固定高度空面板。
- **Split**：有文件后附加 `columns/expanded`，使用 Wide 外框的可用宽度；左主列、右 350px 设置列，沿用同一间距和 1050px 断点。上传区改为 Compact，参数及文件 owner 不重挂载。
- **Left File Workspace**：`fileWorkspace` 包含导入、追加/更换、统计、文件列表、预览及单项操作。列表按工具需要有界滚动；文件、Blob、URL 及任务仍归具体工具。
- **Right Settings / Actions**：`settingsPanel` 包含标题、实际参数、模式、状态与操作，背景完整包住整个区域。复用 Image Converter 的 `surface-panel`、16px 内边距/主要间距、`radius-lg` 圆角，无边框、无阴影，自然高度。`settingsHeader/settingsTitle` 提供可换行标题行及 18px/600 标题；`segmented/segment/segmentSelected` 提供 `input-surface` 上的嵌入式模式切换、44px 点击高度、280ms 克制过渡及 Reduced Motion。
- **Actions**：`actions/action` 提供面板内三个等宽、44px 高的紧凑操作位，颜色与状态由现有 Button 和工具局部样式管理。ZIP Manager 没有创建参数，右侧只保留标题、模式与真实操作，不制造填空控件。仅复用左右列、将控件散放在页面背景上不算符合标准。
- **Responsive Stack**：≤1050px 使用同一个 DOM 的单列，顺序为导入、文件/预览、参数和操作。键盘及屏幕阅读器顺序与此一致，不通过 matchMedia 复制或搬移有状态组件。

Image Converter 已有的 `container/columns/split/leading/aside/main` 配方继续保留，导入与结果合成左列、设置在右列；尾部弹性轨道吸收较高设置列，不强行拉伸导入/结果行。三款工具直接共享 `fileWorkspace/settingsPanel`、标题及模式视觉；`fileIntake/compactIntake` 保持空态纵排、有文件时上传和添加文件夹同行。原有图片工具对这些样式的调用一并改为公共类引用；仅替换 class 绑定，保持业务、DOM 和外观，不复制面板值或保留跨 SCSS 的组合层。

Batch File Renamer 的普通文本字段在窄设置栏中单列、数字字段双列；宽空态由 CSS Container Query 将命名/编号分组及适合的字段并排，减少长表单高度。字段树和焦点顺序始终不变。文件区间距为 12px，列表使用克制的行填充或透明表面；不以厚重灰色整块替代清楚的文件层次。共享层只提供布局与视觉配方，不建立 Schema、FormEngine、Context 或文件框架。

## 静态说明与 FAQ

[ToolGuide](../src/components/site/ToolGuide.astro) / [ToolGuide.module.scss](../src/components/site/ToolGuide.module.scss) 的说明容器与 wide Form 共享 1400px 外框和安全起点。宽屏步骤/限制为顶部对齐 55:45，两者可独立省略；空间不足堆叠，不增加实体卡片。其他阅读正文仍使用独立 readable 宽度。

FAQ 标题左对齐，每个原生 details/summary 占整行，整行可点击/键盘开合，Chevron 靠右；答案文字单独限制阅读宽度，不把 FAQ 外框缩成居中窄栏。布局不改变实际业务或静态 SEO 文本。

## 预览与文件原语

[FileTaskList](../src/ui/FileTaskList.tsx) 仅持展示数据/回调/媒体槽，紧凑两行与真实进度，不持有 File/Blob/URL；[FilePreviewDialog](../src/ui/FilePreviewDialog.tsx) 负责模态、关闭、焦点、全屏/最大化及生命周期，不处理图像变换。图片 Viewport 由工具装配，URL owner 与列表共享时不能过早释放。接口见 [UI 原语](ui-primitives.md) / [文件交互](file-interactions.md)，安全约束见 [图片处理](../contracts/image-processing.md)。

验证入口：[workbench.test.tsx](../tests/workbench.test.tsx)、[tool-page-frame.test.tsx](../tests/tool-page-frame.test.tsx)、[file-preview-dialog.test.tsx](../tests/file-preview-dialog.test.tsx)、[image-preview.test.tsx](../tests/image-preview.test.tsx) 及 Converter UI 测试。视口模拟不能替代移动真机。

文件表单契约另见 [共享布局测试](../tests/form-file-layout.test.ts)、[Renamer UI](../tests/batch-file-renamer-ui.test.tsx)、[真实重命名 ZIP](../tests/batch-file-renamer-core.test.ts) 和 [ZIP Manager UI](../tests/zip-manager-ui.test.tsx)。B5-A 在 Chromium 156 中复核 CN 中文 Dark / 1280px、Global 英文 Light / 390px，验证实时预览、目录选择、模式隔离、取消、输入失效及跨宽度状态保留；14 次实际下载由 Python zipfile 独立比对路径、CRC 和原始字节。Image Converter 原布局及状态不变，`pnpm check`、定向测试、CN/Global 构建与资源守卫通过，ZIP Manager 正式预览通过。Firefox、Safari 和真实移动设备未测。

B5-B 在同一 Chromium 156 / Light / 1280px 对照三款工具的八种空态及有文件状态截图：设置面板均为 16px 内边距/间距、14px 圆角、18px/600 标题，Image Converter 有文件截图与提取前逐像素一致。另复核 CN 中文 Dark 桌面、Global 英文 Light / 390px 的真实操作，14 个下载 ZIP 的路径、CRC 和原始字节正确；模式恢复、参数实时预览、无效输入与迟到结果保护保持正常。现有四款图片工具的共享模式样式复查通过。`pnpm check`、相关定向测试及两地区正式构建/资源守卫通过；正式产物中 ZIP Manager 与 Image Converter 的桌面/390px 面板与控件正常，无横向溢出或 Hydration 错误。发布资格仍为 11 Published / 18 Draft；未扩展 Firefox、Safari、真实移动设备或极限资源验收。

## 历史

[完整 V0.3–V0.6 工作区设计及验收](history/workbench-appearance-v0.3-v0.6.md) 保留旧布局、旧主题、阶段几何和测试结果。当前接口、主题值与行为以源码/测试及本页为准。
