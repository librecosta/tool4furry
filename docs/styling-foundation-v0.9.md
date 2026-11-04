# V0.9 样式基础

最终选型为 Astro 7、React 19、SCSS Modules、原生 CSS Variables；必要交互继续使用 Base UI、Motion 与 dnd-kit。A 已迁移静态外壳，B 已迁移 React 公共外壳和 UI；29 款工具的业务与 8 Published / 21 Draft 资格不变。

## 所有权与主题

- `src/styles/tokens.scss` 定义完整 `--t4f-*` 变量：`:root` 为 Neutral Dark，`html[data-appearance='light']` 覆盖 Light。颜色、空间、圆角、阴影、层级和时长与保留的 `tokens.stylex.ts` 等值；定向测试检查每个字段，修改过渡期 Token 时必须同步两处。
- `global.scss` 负责 reset、字体、全局焦点、主题图标互斥与既有 View Transition 基础规则。B 阶段的层顺序为 reset → base → t4f-controls → t4f-ui → 旧 StyleX priority；Astro 展示模块继续使用原有局部类。React 基础控件与组件变体分层，旧工具覆盖不依赖 CSS Chunk 的先后顺序。
- Astro 组件从邻近 `.module.scss` 静态导入类名，CSS 由 Astro/Vite 构建交付。主题色使用运行时变量，不由 Sass 固化。目录控制器生成的分页与筛选标签共用 `ToolsCatalog.module.scss`。
- `appearance-controller.js` 仍是唯一偏好所有者，在 head 同步恢复 `data-appearance`，同时保留 StyleX 主题类供 React 与 Portal 使用。没有新增存储、Provider、Hydration 等待或运行时样式注入。

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

### C 阶段删除条件

`Button.xstyle` 仅调用 `stylex.props(xstyle)` 合并旧工具声明，基础视觉来自 SCSS。已审计的消费者属于 Converter、Resize/Crop、Palette、Compressor、Comic、Watermark、EXIF 和 PDF Merge。原子样式的 priority 层高于原生基础/变体，因此仍可覆盖背景、尺寸、边框和选中态。原生错误边框在组件层具有明确状态优先级，Wide Form 列也有确定优先级，不靠懒加载顺序或 `!important`。

`Field.legacy.ts` 和 `FileTaskList.legacy.ts` 维持原 `fieldStyles` / `fileTaskStyles` 导出（Resize 批量行仍直接使用后者）；`form-tool-layout.ts` 仍供 Converter 使用。公共组件自身不再通过这些导出渲染。29 款工具与隔离 Lab 的局部 StyleX、仍有消费者的 controls/motion/menu、旧 Token/主题类、Vite 插件和 DEV CSS 补丁保留。C 阶段迁移所有消费者后再删除兼容接口、无消费者旧样式和整个 StyleX 链路。

### B 阶段实际验证（2026-11-04）

`pnpm check` 检查 433 文件，零诊断；14 文件 / 140 项定向测试通过，覆盖 Workbench、UI/Base UI、PDF Merge、Converter、主题、导航、文件列表与构建资格。新增测试编译并检查公共模块类、层顺序和 Portal 状态，实际 SSR → Hydration 的窄屏 Canvas 无 recoverable error，参数 DOM 与草稿跨断点保留。

Chromium DEV：CN 中文 Dark / Global 英文 Light 的 PDF Merge 实际双向拖拽、键盘重排、删除、失效和下载正常；3 页下载的页面尺寸、方向和解码内容流与 B1/A1/A2 顺序逐项相等。Converter 的上传、质量 Slider、Checkbox、真实 WebP 输出和原图/结果 Dialog 正常；下载为 660 字节有效 WebP，浏览器完整解码为 80×48。隔离 Canvas Lab 检查 320px 桌面 Inspector、390px 手机 Sheet、嵌套 Select、Escape、焦点恢复和参数保留；Tooltip、Toast、确认 Dialog 与导航 Popover 的主题和层级正常。没有观测到 Hydration mismatch 警告。

CN/Global 正式构建与产物守卫通过，仍为各 27 页，8 Published / 21 Draft、许可/字体/Worker/WASM 和 Lab 隔离保持。正式预览再次完成 PDF 合并与实际下载，并检查 CN Dark、Global Light 的导航/操作区；桌面导航 64px、手机 56px，PDF 按钮 44px 高，390px 三按钮各 114px，无横向溢出，与 DEV 一致。产物守卫新增首屏 React 导航类和原生 UI 层的 CSS 链接检查，未新增工具预加载策略。

没有新增挂载动画、等待 Hydration 的隐藏方案或样式补丁。此次冷开/刷新、主题恢复和首次打开 Portal 未观察到明显阻断性跳变；正常工具懒加载占位切换仍存在。DEV 共享模块 HMR 仍可能触发页面刷新并重置内存草稿，保留 A 阶段的限制，不宣称完全消除开发期闪烁。没有进行逐帧慢网/慢 CPU 检查；Firefox、Safari、真实 iOS/Android 与触屏设备未测，手机结果仅为 Chromium 视口模拟。
