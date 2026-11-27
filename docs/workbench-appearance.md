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

Batch File Renamer 当前使用内嵌文件名组合器，快速/高级共享名称及序号规则；高级仅展开起始值、位数与连接符，数字字段双列，宽面板通过 CSS Container Query 并排组织高级控件。切换显示模式不重置规则或使有效结果失效。文件区间距为 12px，列表使用克制的行填充或透明表面；不以厚重灰色整块替代清楚的文件层次。共享层只提供布局与视觉配方，不建立 Schema、FormEngine、Context 或文件框架。

Timestamp Workspace 在 Wide Form 中复用 `settingsPanel` 及分段控件，以均分双栏容纳短字段输入和可逐项复制的结果。≤900px 以同一 DOM 把输入放在结果前，保留各方向和高级模式的草稿。日期与时间使用共享选择组件，随 Timestamp Converter 的 CN/Global 正式源码按需交付。[时间戳格式和时区边界](general-toolbox-v0.8.md#timestamp-converter--v08-b12-d2-seo-与-beta-资格)

Video Frame Extractor 使用文件条、播放器与提取设置双栏、全宽帧画廊。窄屏顺序堆叠。播放器预览使用原始显示宽高比，时间轴与逐帧操作共享相对时间；帧画廊使用独立缩略图，并复用文件预览对话框。[视频工作区与资源边界](general-toolbox-v0.8.md#video-frame-extractor--v08-b17-d1)

Audio Trimmer 使用全宽时间轴的 Wide Form 例外布局。文件信息在上方，波形、选区和播放控件居中，裁切及导出设置位于下方。窄屏只堆叠设置区，时间轴保留内部滚动和同一播放状态。波形使用工具私有 WaveSurfer 并复用站点主题、分段控件及 Base UI Select。[音频工作区与资源边界](general-toolbox-v0.8.md#audio-trimmer--v08-b15-d1-波形与本地音频处理)

### 日期与时间输入

- 工具默认选用 [DatePickerField](../src/ui/date-time/DatePickerField.tsx) 和 [TimePickerField](../src/ui/date-time/TimePickerField.tsx)。它们可独立使用，沿用输入框与图标按钮，通过 Base UI Popover 交付站点自有日历和 24 小时分段面板。浮层随主题变化，按可用空间翻转或滚动。
- 日期值为 `YYYY-MM-DD`，支持 0001–9999 年和可选 min/max。日历按周一开始，支持方向键、PageUp/PageDown 和年份跳转。时间值为 `HH:mm:ss.SSS`，各段微调在其范围内停止。触控打开时间面板时焦点停在面板，选中某段后再进入文字输入。格式合法后提交，无效的直接输入草稿独立保留。调用方可通过 `draft` 与 `onDraftChange` 控制草稿并在编辑无效时暂停业务结果。
- 时区解释、DST、业务合法性由工具核心负责。共享选择器由实际使用者按需引用。TextField 的原生 date/time 类型保留给特殊或历史场景。[Base UI Popover](https://base-ui.com/react/components/popover) · [WAI-ARIA 日期网格](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)

QR Code Generator 在 Wide Form 中用同一预览区呈现二维成品与三维画布，左上切换 2D／3D，三维右上保留世界／二维码。单行输入与生成按钮合在画布上方中央，自动编码等待输入停顿。导出图标位于左下操作区。三维地貌选择居中，左侧另有复位和全屏，右侧为缩放。二维画布底部中央是三张图的可滑动风格选择，右侧是无标题的尺寸与纠错控件。窄屏沿用同一 DOM，加载失败或禁用 WebGL2 时可切换到二维模式。[地貌世界和三维二维码](general-toolbox-v0.8.md#qr-code-generator--v08-b13-b0-地貌沙盘与双状态工作区)

## 文本编辑工作区

大段普通文本、结构化文本和代码工具默认复用 [TextEditor](../src/ui/text-editor/TextEditor.tsx)、[TextEditorPane](../src/ui/text-editor/TextEditorPane.tsx) 与 [TextWorkbench](../src/ui/text-editor/TextWorkbench.tsx)。短设置、单行字段和简单备注可继续使用轻量表单控件。

内置默认示例、首次载入样例及 Load Sample 演示内容默认统一使用英文，CN/Global 的中英文界面均载入同一数据。示例标签、操作、帮助、错误与 SEO 仍按 locale 本地化。多语言、Emoji 和特殊字符用独立测试样本覆盖，用户输入继续支持 Unicode。明确以特定语言文本为处理对象的工具可在有充分理由时例外。

- TextWorkbench 上方放模式及必要规则，下方输入/结果等宽双栏；≤900px 按输入在前的同一 DOM 堆叠，不复制有状态编辑器。文本工作区不适用文件工具的 350px 设置栏。
- CSV / JSON Converter 使用上方转换工具栏和输入/结果双栏，窄屏按输入、结果堆叠。导入与拖放归输入侧，结果侧在只读源码和带行列分页的表格之间切换。[转换工作区](general-toolbox-v0.8.md#csv--json-converter--v08-b18-d1)
- Markdown Editor 使用单一外壳、统一工具栏与状态栏，以及与源文档联动的预览。局部 CodeMirror 组件复用既有主题 Token 和生命周期策略。桌面默认连续双栏，窄屏默认源码编辑，显式分栏沿上下方向显示并可调整。
- TextEditorPane 的中性灰外表面包含轻量标题、调用方操作插槽、编辑主体和次级统计；没有大工具栏或两层明显边框。主体可视高度由静态 SCSS 确定为 320–460px，窄屏 320px，长文内部滚动，初始化不依赖内容撑高页面。
- TextEditor 负责受控文档、行号、换行、键盘历史、选区、IME、只读和 View 生命周期。外部更新走事务，配置和语言扩展走 Compartment。工具可以用可选 `focusAt` 在用户明确触发时定位诊断，业务校验与标记仍归工具。
- 只读结果仍可聚焦、选择、Ctrl+A/C 和滚动，禁止输入修改。标题图标使用现有 IconButton/Tooltip；输入对应清空，结果对应复制/下载，失效结果禁用交付，不把业务写入编辑器内核。
- 外围尺寸、圆角、表面和 Purple Focus 属于 SCSS Modules。CodeMirror 自身无 Layer 的内部样式优先于分层 CSS，因此内部覆盖使用 scoped EditorView.theme 引用现有变量；不是全站 CSS-in-JS 或另一套主题。Dark/Light 切换不重建文档，Reduced Motion 遵循既有规则。
- Text Cleaner 快速模式保留行首缩进、清理行尾空白、合并连续空行并输出 LF；高级独立保留自定义空白/空行及 LF/CRLF 规则。编辑层统一文档为 LF，实际导出换行由纯函数明确生成，不提供虚假的“保留混合原始行尾”选项。

- JSON Formatter 上方使用紧凑导入条和快速/高级切换。下面复用等高输入和结果面板，校验状态及定位入口在左侧底部，格式化、压缩和高级视图设置在右侧底部。只读树放在同一结果面板主体，分支按页挂载，完整原值在节点详情查看，交付文本与代码视图一致。
- URL & Base64 上方依次放工作区模式、功能与方向、高级规则。输入左侧底部显示字符数，结果右侧底部显示状态及「反向查看」。选择器、图标和等高编辑区沿用既有配方，窄屏按输入到结果的顺序堆叠。工具启用 TextEditor 的 CR 保留选项，使已解码文本写回输入时保持原有换行字节；默认 LF 行为继续供其他工具使用。

正式构建中 Text Cleaner、Text Diff、Subtitle Tools、JSON Formatter 和 URL & Base64 按需复用同一份 CodeMirror 和完整 MIT NOTICE。JSON 语言及语法依赖的 MIT 通知跟随 JSON 工具入口。JSON Formatter 与 URL & Base64 各自按需交付专属 Worker，Markdown Editor 等 Draft 的私有资源继续隔离。见 [编辑器生命周期测试](../tests/text-editor.test.tsx)、[交付边界测试](../tests/text-editor-delivery.test.ts) 和 [通用工具说明](general-toolbox-v0.8.md#url--base64--v08-b11-d2-seo-与-beta-资格)。

## 代码分享图创作工作区

顶栏集中导入、语言、编辑与预览切换和文件交付。桌面左侧为作品画布，像素尺寸、缩放与全屏控制位于画布底部。右侧依次提供艺术预设、背景、窗口和排版，选项以按钮标签排列，数字设置使用共享 `NumberStepper`。窄屏设置自然移到画布下方，源码编辑器复用作品的语法高亮结果，在切换视图时继续保留编辑状态。导出菜单先选择格式与适用的倍率，再通过「导出图片」下载。

选用图片背景时，画布中央提供无边框选图按钮。画布与窗口分别通过共享素材选择器选用内置素材或导入本地图片。选择器在确认后应用素材，重新打开时恢复当前内置图片。自动尺寸遵循原图比例，手动设定的尺寸和比例仍可使用。两张图片可分别缩放、拖动或精确定位。窗口默认保留主题底色，图片叠在上面。底色与图片可独立开关和调节不透明度，代码、标题和标记保留各自的样式。窗口阴影开启时可调节横向和纵向偏移，预览和导出使用同一位置。

站点明暗主题适用于工作区控件。作品按自身设置绘制背景、代码窗口及语法配色，透明预览用棋盘格提示。艺术预设缩略图来自实际渲染。见 [B19 工作区与作品](evidence/b19-code-image/README.md)。

## SVG 转换工作区

顶部切换栅格化、矢量化及封装并保留各模式状态。栅格化使用连续源码与预览双栏，可拖动或用键盘调整分隔线。手机视口在源码和预览之间切换，输出设置保留在底部。透明、白色和深色预览背景专用于查看作品。位图模式在图片信息下方并列布置共享预览和设置，窄屏自然堆叠。矢量化支持拖动对比、并排、原图和结果等查看方式，两侧共用缩放和平移。[桌面与窄屏截图](evidence/b20-svg-converter/README.md)

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
