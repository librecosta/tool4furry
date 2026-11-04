# V0.9 样式基础

最终选型为 Astro 7、React 19、SCSS Modules、原生 CSS Variables；必要交互继续使用 Base UI、Motion 与 dnd-kit。A 迁移静态外壳，B 迁移 React 公共外壳和 UI，C 完成工具/Lab 迁移与 StyleX 退役；29 款工具的业务与 8 Published / 21 Draft 资格不变。

## 所有权与主题

- `src/styles/tokens.scss` 是完整 67 项 `--t4f-*` 主题值的唯一来源；默认 Neutral Dark，`html[data-appearance='light']` 覆盖 Light。保留已批准的紫色主操作、辅助色与全部几何值；测试读取编译后的 SCSS 验证指纹和对比度。
- `global.scss` 负责 reset、字体、全局焦点、主题图标与既有 View Transition。正式层顺序：reset → base → t4f-controls → t4f-ui → t4f-tools；Astro 展示模块仍使用既有局部类。跨模块布局覆盖使用明确的选择器优先级，不依赖 Chunk 顺序。
- Astro、React 公共 UI、29 款工具与 DEV Lab 各自拥有 SCSS Modules；动态几何（画廊拖拽、预览位移/尺寸等）保留必要的 inline style。素材、业务、路由与发布资格不变。
- `appearance-controller.js` 仍是唯一偏好所有者，在 Head 同步恢复 `data-appearance`；Portal 从 html 继承变量。没有 StyleX Theme Class、新 Provider、等待 Hydration 或运行时 CSS 注入。

## A 阶段范围

已迁移 SiteLayout、Brand、Astro 导航与控制区、全部首页 Astro 展示组件、目录/卡片/空状态、工具 Intro/Guide、信息页、Footer、像素滚动球及首页/404 编排样式。素材、结构、SEO、断点、Reveal 时间轴和控制器行为保持原有契约。已删除无消费者的五个静态 StyleX 模块。

A 阶段保留了 React 所需的 StyleX Token、主题类、共享样式、依赖/Vite 插件与 `stylex-dev-css.ts`。B 阶段后的实际兼容边界见下文；A 阶段验证记录保留其当时范围。

## 验证与开发边界

2026-11-04：Chromium 检查 CN 中文 Dark、Global 英文 Light 的首页、身份导航、目录和 PDF Merge 外壳，覆盖 1280px 与 390px 视口；主题保存后刷新正确、无横向溢出，目录筛选/搜索和导航切换正常。CN 首页/目录的计算样式与迁移前记录对照；PDF Merge 导入 2 页和 1 页文件、合并并实际下载，输出可重新解析为 3 页。

`pnpm check`（430 文件，零诊断）、9 文件 / 110 项定向测试及 CN/Global 各一次正式构建与产物守卫通过。新增守卫验证原生主题变量，同时保留 StyleX 主题、字体、许可和 Draft/Lab 隔离检查。正式产物预览补验两地区根主题、Global 导航身份切换/目录动态标签及 PDF Merge 外壳，目录只显示 8 款 Published，且没有 DEV CSS 补丁。

SCSS 编译与热更新可用；本次编辑 Astro 依赖的 CSS Module 时观察到页面刷新，内存中的工具状态随之重置。没有为此增加自定义 HMR 或隐藏页面方案。StyleX DEV 兼容链路仍在，A 阶段不宣称彻底消除开发期闪烁。Firefox、Safari 和真实移动设备未测，390px 仅为桌面 Chromium 的视口模拟。

## B 阶段：React 公共样式与渲染稳定性

- ToolPageFrame、ToolRuntime 状态、WorkbenchShell 及 Wide Form 列布局使用所有权内的 SCSS Modules。Form/Batch/Custom 的宽度与断点不变；React 导航直接使用 Astro 的 Brand、NavigationControls、ToolboxDisclosure、SiteLayout 和 ToolIntro 样式资产。原生 details 的增强脚本与筛选数据源不变。
- Button/IconButton、Field/TextField/TextAreaField、Select、Checkbox、Slider、FileDropzone、FileTaskList、FilePreviewDialog、ConfirmDialog、Tooltip/HelpPopover、Toast 和 ScrollDock 主体已迁移。共用基础控件在 `ui/controls.module.scss`，普通动画在 `styles/motion.module.scss`；主题仍由根 `data-appearance` 决定，没有新 Provider 或运行时 CSS 注入。
- Base UI 1.8.0 的 Select 使用实际 `data-selected/highlighted/disabled` 属性；Toast 使用 `data-limited`，Dialog 保留 `data-starting-style/ending-style` 与原有 300ms/Reduced Motion。Popup、Positioner、Backdrop、Viewport 自带模块类，从 html 继承颜色与层级，保留 `--anchor-width`、`--available-height`、Escape 与焦点恢复。
- Canvas 的结构、宽度、定位、工具栏和 Sheet 展示交给媒体查询。`useCompact` 只决定真实 modal、焦点和开关语义；SSR 快照与首次 Hydration 均为关闭状态。Backdrop 不再条件挂载，参数内容始终只有一棵树，桌面与手机各自记住面板开关。Canvas Frame 局部固定到视口，避免宿主 Footer/恢复的文档滚动把画布带走；不修改 body 或普通文档工具滚动。

### B 阶段临时兼容边界（C 已全部移除）

以下保留 B 阶段交付时的事实，当前实现以 C 阶段结果为准。

`Button.xstyle` 仅调用 `stylex.props(xstyle)` 合并旧工具声明，基础视觉来自 SCSS。已审计的消费者属于 Converter、Resize/Crop、Palette、Compressor、Comic、Watermark、EXIF 和 PDF Merge。原子样式的 priority 层高于原生基础/变体，因此仍可覆盖背景、尺寸、边框和选中态。原生错误边框在组件层具有明确状态优先级，Wide Form 列也有确定优先级，不靠懒加载顺序或 `!important`。

`Field.legacy.ts` 和 `FileTaskList.legacy.ts` 维持原 `fieldStyles` / `fileTaskStyles` 导出（Resize 批量行仍直接使用后者）；`form-tool-layout.ts` 仍供 Converter 使用。公共组件自身不再通过这些导出渲染。29 款工具与隔离 Lab 的局部 StyleX、仍有消费者的 controls/motion/menu、旧 Token/主题类、Vite 插件和 DEV CSS 补丁保留。C 阶段迁移所有消费者后再删除兼容接口、无消费者旧样式和整个 StyleX 链路。

### B 阶段实际验证（2026-11-04）

`pnpm check` 检查 433 文件，零诊断；14 文件 / 140 项定向测试通过，覆盖 Workbench、UI/Base UI、PDF Merge、Converter、主题、导航、文件列表与构建资格。新增测试编译并检查公共模块类、层顺序和 Portal 状态，实际 SSR → Hydration 的窄屏 Canvas 无 recoverable error，参数 DOM 与草稿跨断点保留。

Chromium DEV：CN 中文 Dark / Global 英文 Light 的 PDF Merge 实际双向拖拽、键盘重排、删除、失效和下载正常；3 页下载的页面尺寸、方向和解码内容流与 B1/A1/A2 顺序逐项相等。Converter 的上传、质量 Slider、Checkbox、真实 WebP 输出和原图/结果 Dialog 正常；下载为 660 字节有效 WebP，浏览器完整解码为 80×48。隔离 Canvas Lab 检查 320px 桌面 Inspector、390px 手机 Sheet、嵌套 Select、Escape、焦点恢复和参数保留；Tooltip、Toast、确认 Dialog 与导航 Popover 的主题和层级正常。没有观测到 Hydration mismatch 警告。

CN/Global 正式构建与产物守卫通过，仍为各 27 页，8 Published / 21 Draft、许可/字体/Worker/WASM 和 Lab 隔离保持。正式预览再次完成 PDF 合并与实际下载，并检查 CN Dark、Global Light 的导航/操作区；桌面导航 64px、手机 56px，PDF 按钮 44px 高，390px 三按钮各 114px，无横向溢出，与 DEV 一致。产物守卫新增首屏 React 导航类和原生 UI 层的 CSS 链接检查，未新增工具预加载策略。

没有新增挂载动画、等待 Hydration 的隐藏方案或样式补丁。此次冷开/刷新、主题恢复和首次打开 Portal 未观察到明显阻断性跳变；正常工具懒加载占位切换仍存在。DEV 共享模块 HMR 仍可能触发页面刷新并重置内存草稿，保留 A 阶段的限制，不宣称完全消除开发期闪烁。没有进行逐帧慢网/慢 CPU 检查；Firefox、Safari、真实 iOS/Android 与触屏设备未测，手机结果仅为 Chromium 视口模拟。

## C 阶段：工具迁移与 StyleX 退役

- 七款图片工具、PDF Merge、其余 21 款 Draft 工具及六类 Lab 均使用原生模块样式。通用工具直接共享 `tools/general/ui.module.scss`；图片预览/缩略图各自拥有模块，Converter 与 Resize 共用完整 `form-tool-layout.module.scss`。本阶段新增 20 个样式模块，保留业务、几何算法与发布状态。
- 工具局部样式位于 t4f-tools，明确覆盖公共控件；同模块变体按原覆盖关系排序，跨模块布局使用有限的明确选择器优先级。PDF Merge 的紫色、无边框、44px 等宽三按钮与 dnd-kit 交互不变。Canvas 外壳层级设为 1，修复宿主 Footer 内定位链接叠到画布上的问题；仍低于 Portal。
- 删除 Button.xstyle、Field/FileTaskList Legacy 导出、旧布局 TS、工具 StyleX 定义、旧 controls/motion/menu/site/navigation、tokens.stylex.ts、刷新器及其专属测试；Astro/Vitest 插件、虚拟 CSS 和两个 StyleX 依赖一并移除。`theme.ts` 仅保留主题参数校验，Head 控制器只设置 data-appearance 与 color-scheme，存储/地区传递/View Transition 行为保持。
- Base UI 继续管理 Dialog/Popover/Select/Tooltip/Toast 的状态、Portal 和焦点；Motion 仅保留既有必要交互，dnd-kit 继续排序。React Crop 局部 CSS、作用域 react-colorful、Markdown 内容样式、Checkerboard 与 Wavefield 保留，所有许可和 Worker/WASM 归属不变。

### C 阶段验证（2026-11-04）

`pnpm check`：413 文件零诊断。完整 `pnpm test`：96 文件、1141 项通过。主题测试直接读取编译后的 SCSS，覆盖两主题全部 67 项值的指纹、紫色操作与实际叠层对比度；公共组件/全部模块引用、Portal、Hydration、工具行为测试保留。

Chromium DEV 逐一打开 29 款工具（1280px Global 英文 Light、390px CN 中文 Dark），主要控件正常、无横向溢出。六类 Lab 均加载；Canvas 手机 Sheet/嵌套 Select/Escape 与桌面 Inspector 正常，跨断点保留参数草稿。PDF Merge 实际拖拽/键盘排序、删除、清空、旧下载失效；下载 3 页 PDF 的尺寸、方向与解码内容流严格等于 B1/A1/A2。Converter Slider/Checkbox、原图与结果 Dialog 及真实 80×48 WebP 下载正常。Palette 编辑/Popover/Select 和 1200×1200 PNG 分享图有效；Comic 拖拽、选中、预览与 ZIP 下载，解压页序和原图字节逐项相等。另抽查 PDF Split 的 A2 下载、ZIP 提取、约 0.5 秒有效 PCM WAV 与 Markdown 实时预览/复制/下载。

CN/Global 正式构建均生成 27 页，原生 CSS、字体、许可、Worker/WASM、8 Published / 21 Draft 及 Lab 隔离守卫通过。CN 的首轮构建守卫误把压缩器合法合并后的 Layer 声明视为缺失；改为验证实际首次声明顺序后，对同一产物复验通过。Global 构建及守卫一次通过。没有删除有效的资源检查。

正式 Chromium 预览完成 CN Dark 的真实 PDF 合并/下载，3 页尺寸、方向与解码内容流严格等于 A1/A2/B1。两地区首页身份筛选与目录均正常，目录各 8 款；Global Light 刷新恢复主题、Converter 原图/结果 Dialog 与 Palette 首次 Select 弹层正常。桌面导航 64px、手机 56px，PDF 操作按钮 44px 高且等宽，390px 无横向溢出，与 DEV 一致；没有观测到 Hydration 警告。验收后恢复原固定双地区 DEV 服务。

DEV 修改工具 CSS Module 后，Vite 热更新能应用新规则，无手工注入链路；Canvas 普通草稿保留，但 Converter 的资源 Effect 在 React Fast Refresh 时重新执行，会清空导入队列。普通断点切换不丢状态。这是开发态限制，未通过改写工具业务或隐藏页面掩盖。工具正常懒加载占位仍存在；未观察到 Hydration mismatch 或可复现的阻断性样式闪现。未做逐帧慢网/慢 CPU、Firefox/Safari、真实 iOS/Android 与触屏设备验证，390px 仅为桌面 Chromium 视口模拟。

## 字体刷新专项复检（2026-11-04）

此前样式验收没有覆盖逐帧字体替换，不能据此推断刷新时没有 FOUT。本次使用 Windows / Chrome 156.0.8078.76、1280×900，对 DEV 中文及 CN 生产预览中英文的首页、目录、PDF Merge 记录 rAF 文字/导航边界、LayoutShift、字体事件、资源时序和 CDP Rendered Fonts。条件包括禁用缓存的冷加载、正常缓存后的浏览器 reload（F5 等价）、阻止全部 WOFF2，以及仅将 WOFF2 延迟 800ms；修复前后使用相同条件，没有 CPU/全网限速。

- Fontsource 5.3.0 的两个变量字体均为 normal / swap，并使用 unicode-range 按需选择分片；Noto Sans SC 有约百个 WOFF2 分片，另有少量内联子集。实际拉丁文字使用 DM Sans，中文使用 Noto Sans SC；阻止字体时原来的 system-ui 在该 Windows 环境实际选中 Microsoft YaHei UI（包括拉丁文字），宽度与目标字体不同。
- 修复前生产中文首页的 CSS 在 29.7/40.5ms 交付、FCP 284ms，首轮字体 loadingdone 为 314.7ms；目录为 CSS 18.1–27.9ms、FCP 148ms、字体 217.2ms。PDF Merge 的外壳 CSS 在 26.7–54ms，字体替换发生在 FCP 后；之后的工具懒加载 CSS 属于正常模块交付。屏蔽 WOFF2 后对应布局变化消失，证据支持字体替换是本次文字跳动主因，未复现静态外壳先无样式后补 CSS。
- 修复仅增加 DM Sans Latin variable 的单份 36,932 字节预加载，复用 Fontsource CSS 的同一 URL / CORS 模式。DEV 使用 `?url`，避免 `?no-inline` 与 Fontsource 原 URL 不同而重复请求；中文分片仍按需加载，原 font-display 和最终字体不变。
- `font-fallbacks.scss` 使用 local-only、限定脚本范围的 Segoe UI / Microsoft YaHei UI 别名，匹配 size-adjust 与垂直度量。1000px Canvas 实测 DM Sans ascent/descent 为 992/310，Noto 为 1160/288；中文全宽字 advance 同为 1em。拉丁宽度样本为 `Tool4Furry PDF Merge Download Clear Featured Tools Images Files Search All tools Local browser processing`，分别测量 400/500/600/700 后配置系数。没有这些本地字体的平台继续使用原系统回退，不宣称系数跨平台通用。

| 相同条件下的观察 | 修复前 | 修复后 |
| --- | --- | --- |
| DEV 中文三页，冷加载/缓存刷新，品牌文字最大宽度变化 | 最高 4.11px | 0px |
| 生产预览中英文三页，正常冷加载/缓存刷新 CLS | 最高 0.005686 | 均为 0 |
| 生产英文 PDF Merge，限制文本换行带动后续 FAQ | 27px 位移 | 未再出现 |
| 字体延迟 800ms，品牌文字最大宽度变化 | 4.11px | 0.17px |
| 字体延迟 800ms，生产英文 PDF Merge CLS | 0.005686 | 0.0000805 |

生产中文三页的 Latin 请求起点分别由 48.7/40.8/67.0ms 提前至 17.7/10.0/10.2ms；中文首页首轮 loadingdone 由 314.7ms 变为 294.8ms。缓存刷新实测字体 HTTP 304、约 300B 响应头，而非再次传输完整字体；即使命中缓存，旧实现仍可能在字体激活前显示回退字形。单次 FCP 有波动（中文首页 284→360ms），本次结论是布局稳定性改善，不是首屏速度基准提升。

首页 Hero 原有 opacity/translateY 入场在阻止字体后仍执行（介绍文字 12px 位移），属于既有 Reveal，不是字体/CSS 布局重排；未修改。Logo SVG Mask 在采样中先于文字首次绘制完成，且预留 32×32，未复现独立问题，未修改 Logo。

`pnpm check`：414 文件零诊断；字体交付、主题、SCSS/React 样式和对比度共 5 文件 / 37 项定向测试通过；CN/Global 构建及产物守卫通过。守卫保留真实字体、子集与许可检查，新增单份 Latin 预加载 URL 复用及本地回退约束。8 Published / 21 Draft 不变。延迟字体时仍有少量字宽差异，没有隐藏页面或等待 fonts.ready；其他操作系统、本次未覆盖的视口、慢 CPU、Firefox/Safari 与真实移动设备未验证，不承诺所有环境零位移。
