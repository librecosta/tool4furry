# V0.3-A — Visual Foundation & Design Tokens

Creative Studio 以暖白、深墨和清楚的控件状态为基础。常驻区域用 Flat Studio（表面和细边界），菜单、提示、通知、确认框及滚动球用 Floating Studio（柔和阴影）。本轮不重画首页或工作台，公共 Props、Base UI 焦点/模态/生命周期、文件规则、滚动算法和状态归属保持 V0.2-A/B 契约。

## 字体交付

`@fontsource-variable/dm-sans@5.3.0`、`@fontsource-variable/noto-sans-sc@5.3.0` 已精确锁定，仅由 `SiteLayout.astro` 静态导入正常 `wght.css`。没有升级 Astro/React/StyleX 或其他既有依赖。

字体栈唯一来源在 `global.css`：`--t4f-font-sans` 为 DM Sans Variable → Noto Sans SC Variable → system-ui / 系统 Sans 回退。普通文本及表单控件继承它；`--t4f-font-mono` 只给 code/pre/kbd/samp，使用 Cascadia Mono / SFMono-Regular / Consolas / 系统 Mono。没有字体管理器或全站 React。

Fontsource 保留 `font-display: swap`、可变字重及 unicode-range；不加载 italic，不预加载中文子集。当前 Vite 默认产物为 **100 个外置 WOFF2 + 3 个内嵌在本地 CSS 的小 WOFF2 子集**，都是本站静态交付；不是远程字体服务。未为此修改 Astro 配置或 assetsInlineLimit。

字体依赖均附 SIL Open Font License 1.1。原文复制至 `public/licenses/dm-sans-OFL.txt` 和 `noto-sans-sc-OFL.txt`，静态产物随附，项目根 BSD LICENSE 不变。没有额外发布字体下载包。

构建验收按页面汇总已链接 CSS 检查 StyleX，不再要求每份字体 CSS 自身带 StyleX。所有 CSS URL 必须为存在的本地资产，唯一内嵌例外是合法的 data:font/woff2；校验 WOFF2 文件头、normal/swap/variable/unicode-range 及授权副本。首页零 script/Island/JS preload、语言/canonical 和 Lab 隔离断言保留。

## Token 迁移

`src/styles/tokens.stylex.ts` 是视觉值唯一来源，没有保留旧名别名。`global.css` 只持有字体栈、reset/继承与全局焦点规则；SiteLayout 在 body 上将 StyleX focus 引用接入 `--t4f-focus`，不重复写颜色常量。

| 旧 Token | 新 Token / 值 | 使用规则 |
| --- | --- | --- |
| paper | page / #F7F5F0 | 页面背景 |
| surface、elevated | surface / #FFFEFB | 面板及浮层表面 |
| soft | surfaceMuted / #EAE4DA | 分组背景、次要按钮 Hover |
| ink | textPrimary / #303431 | 正文和标题 |
| muted | textSecondary / #686B65 | page/surface 上的辅助文字 |
| line | border / #DDD9D1 | 面板边界；输入/Checkbox 改用 controlBorder #898A82 |
| accent、accentHover | action #A6532C、actionHover #8E4324 | 主操作与交互强调；Pressed #7B381E |
| 无 | brand #C97849、sage #879C91 | 品牌/内容装饰，不充当普通白字按钮底色或 success |
| focus | focus / #A6532C | 2px 独立焦点环，2px offset |
| 无 | actionTint #FAEDE4、onAction #FFFEFB | 选中/拖入浅底、实心操作文字 |
| radius | radiusSm/Md/Lg/Xl / 6/8/12/16px | 小元素/控件/面板/确认框 |
| shadow | shadowNone、shadowSoft、shadowFloating | 常驻扁平；球轻阴影；弹层浮起 |
| 无 | space4/8/12/16/24/32 | 现有控件实际使用的间距 |
| 无 | durationFast / 140ms | 控件颜色与按压过渡；reduced-motion 为 0s |

danger/dangerHover、positive、warning、info 保留独立原值；layerDock/Toast/Backdrop/Sheet/Dialog/Floating/Tooltip 仍为 10/15/20/30/50/60/70。不添加尚无消费者的 durationNormal 或新主题机制。

旧 accent 已逐个审核：按钮/选择/滑块/进度环迁至 action；Canvas 的松绿/暖橙是演示内容配色，使用 sage/brand，交互选框仍用 action。Site 品牌箭头用 brand，链接用 action。Canvas 背景网点改用 border，未改变布局、格网尺寸或工具数据。

## 字重与状态

正文/输入 400，标签 500，按钮/区块/通知标题 600，Site 主标题与确认框标题 700。原有 550/650/750 按角色消除；没有普通控件使用 800。工作台正文 14px，辅助文字 13px，稀少标记 12px；首页沿用现有字号及空间布局。Slider 数值使用 tabular-nums，技术 JSON 使用 Mono。

Button/Input/Select 保留至少 44px 高、IconButton 至少 44×44px；Checkbox 可见框 20px、整行 44px，Slider 交互区 44px。Button/Input 圆角 8px，Checkbox/Select 项 6px，面板/Select/Toast/FileDropzone 12px，ConfirmDialog 16px，Tooltip 8px，ScrollDock 保留 48px 圆形。

- Hover 用表面/边界变化；Pressed 用深色与 1px transform，不影响文档布局。
- 键盘用独立 2px 暖橙焦点环；Select 高亮项也有边框，选中项有勾选图标及浅底；aria-pressed 按钮、当前 Lab 导航带下划线。
- Disabled 保持禁用语义及弱化外观；Loading 继续用原有隐藏内容占位和旋转图标，禁用操作，reduced-motion 停转。
- Error 保留边框、邻近文字与 ARIA 关联；Toast 四类各有图标及状态文字，沿用 Base UI 队列/计时。确认框的焦点、取消及 Escape 不变。
- FileDropzone 继续局部拖放和部分接受；本轮只改虚线/拖入/错误/禁用视觉。ScrollDock 只换配色与轻阴影，原来的媒体条件、25% 步进和清理不变。

### 对比度约束与例外

普通按钮文字 onAction/action 为 **5.35:1**；textPrimary/page **11.60:1**；textSecondary/page **4.97:1**、surface **5.37:1**、actionTint **4.72:1**；controlBorder/surface **3.46:1**。新增 Vitest 检查实际 Token 的文字、反馈、边界与焦点配对，保留所有旧功能断言。

冻结色板的 textSecondary/surfaceMuted 只有 **4.28:1**，因此浅砂区正文使用 textPrimary；文件区 Hover 使用 page、拖入使用更浅的 actionTint。onAction/brand 只有 **3.32:1**，所以 brand 不作普通白字按钮底色。弱化的禁用控件不作为可操作文字对比度达标声明；装饰 sage 不用于关键信息。

## 验收记录（2026-10-09）

A0：dev 基线 b460130，工作区干净，远端同提交 CI 成功。A1 首次构建暴露 Vite 内嵌小字体子集，精准兼容后两地区资源检查通过；未扩大配置改动。

冷缓存证据使用此前未访问的本地端口：CN 静态首页 4381、Global 静态首页 4382、开发 UI 4383。普通 Python 静态服务日志记录 CN **11** 个外置字体 GET 200（1 DM + 10 Noto），Global **2** 个（1 DM + 1 Noto；首页箭头等符号仍需回退子集），少于产物总数，符合 unicode-range 按需加载。字体 CSS 中无外部请求地址；首页零脚本。浏览器显示字体栈正确，document.fonts.status 为 loaded；中英文和混排可见，无方框字。

内置 Chromium 浏览器实际检查（视口模拟）：

| 场景 | 结果 |
| --- | --- |
| 1440×900 UI | 深暖橙主按钮 44px 高、600 字重；Tab 焦点环 2px/offset 2px；Loading 原位占位并禁用操作 |
| 375×812 / 390×844 UI | 无横向溢出；字段错误可读；Select 浮层边界正常，方向键选暖橙、Enter 后值更新；Checkbox 空格、Slider 方向键到 45 |
| 768×1024 UI | 无横向溢出；Tooltip 键盘聚焦可见；JSON 使用统一 Mono 栈 |
| 812×375 确认框 | 440px 弹窗未越界，初始聚焦取消，Escape 关闭；按钮均可达 |
| Toast | 成功/错误分别有独立颜色、图标与文字；顶部安全区内显示，无横向溢出 |
| Canvas | Bottom Sheet 内 Select 正常；改宽到桌面保留“Studio 混排 123”和暖橙；未改变布局断点 |
| Form / Batch | 手机 Form 输出 `✦ FURRY`；Batch 添加后两步推进至 `2 / 2` |
| Files | PNG/TXT 混合批次部分接受，Enter 重复选择同文件新增记录；375px 球隐藏，桌面圆环 action 色，点击 100% → 75%（1404px → 1053px 目标） |
| 最终静态产物 | 普通 HTTP 服务下 CN/Global 字形可读；暖白背景、正确字体栈、font status loaded；首页零 script/Island |

执行环境为 Windows PowerShell、Node 24.15.0、pnpm 12.8.1。停止 dev 后顺序执行：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功，无额外解析或既有依赖升级 |
| `pnpm check` | 54 文件；0 errors / 0 warnings / 0 hints |
| `pnpm test` | 7 文件、62 项全部通过；原 60 项完整保留 |
| `pnpm build:cn` | 成功；首页与 404 两页，中文/canonical 正确 |
| `pnpm build:global` | 成功；首页与 404 两页，英文/canonical 正确 |

两地区均通过 StyleX 提取、100 个外置 WOFF2 + 3 个内嵌子集、授权文件及本地资产检查；首页零脚本/Island/JS preload，生产无 Lab 路径/入口/演示实现。CI 配置保持 dev/main 的 push/PR 五项验证，无 CD。预览截图属于本次交付附件，不进入生产资源。

### 限制与后续阶段

内置 Chromium 的尺寸检查是视口模拟，不代表 iOS Safari / Android Chrome 真机。仍需人工复核软键盘、触摸、动态地址栏/safe-area、系统 reduced-motion、屏幕阅读器、不同系统字形及缩放。没有浏览器网络节流/阻断或 CLS 采集能力，本轮不声称完成弱网/字体失败回退/量化排版抖动测试。静态首页原本未提供 favicon，普通 HTTP 服务仍有浏览器自动 favicon 请求的 404，留到 Site 阶段处理。

V0.3-B 在当前 Token 上打磨 Workbench 顶部、两侧、中央、底栏及手机面板的构图和空间；V0.3-C 处理首页 Hero、目录、品牌呈现和站点资源。现有 Lab 两栏/自然流、工作台断点、18px 区块标题和首页 56/36px 大标题在 A 阶段保留，未按建议字号表重画层级。真实工具、TimePicker、暗色、SSR/后端/持久化均未实施。

字体接入参考 [Fontsource Variable Fonts](https://fontsource.org/docs/getting-started/variable) 与 [Fontsource Vite](https://fontsource.org/docs/guides/vite)；以锁定包与实际产物为准。

## V0.5-A — Graphite Studio（2026-10-20）

本节取代上方历史暖白/暖橙配色。只迁移视觉；字体、密度、布局、断点和控件行为保持原合同。附件不入库。

- Page `#101114`、新增实际用于 Canvas/透明预览的 workspace `#17191E`、surface `#1B1D22`、surfaceMuted / Elevated `#252830`、border `#34383F`。
- textPrimary `#F2F3F5`、textSecondary `#A8AFBA`、action / focus `#89CCFF`、actionHover `#A8DCFF`、actionPressed `#6FB7EB`、onAction `#101820`、actionTint `#223747`。controlBorder 调至 `#6B7684`，在 Surface / Elevated 上均达到 3:1。
- danger `#FF9BA4`、dangerHover `#FFB2B9`、positive `#83D6AE`、warning `#E7C47C`、info `#A8BEF5`。brand / sage 仍可用于 Lab 内容示例，不充当普通操作或成功反馈。
- 原生 color-scheme 为 dark；灰阶 Hover、冰蓝 Selected 与独立焦点轮廓分开。常驻 Inspector 无投影，Sheet/菜单/Select/Tooltip/Dialog/Toast 使用 Elevated 与轻阴影。透明棋盘用 workspace / surfaceMuted 两种中性灰。Logo 与首页插画仅协调颜色，图形不变。
- 本地 `pnpm check`：103 文件，0 errors / warnings / hints。定向 Vitest：visual-contrast、ui、workbench、converter-ui、file-dropzone、scroll-dock、tool-page-frame 共 7 文件、47 项通过；对比度测试扩展至 Workspace / Elevated，未放松阈值。
- 内置 Chromium 实看 `/`、`/tools/`、`/preview/image-converter/`、`/lab/ui`、`/lab/canvas`，覆盖桌面 1440px、390px 与 900px，Canvas 另查 901px；未发现横向溢出。检查了透明 PNG 原图/输出、格式选中、JPEG 字段错误、过期结果/禁用下载、危险确认框、嵌套 Select、Slider 方向键与 Escape 焦点返回。跨宽度参数值保留且输入 DOM 仅一份；控制台未见 error/warn。首页实际渲染的辅助正文/Page 对比度为 8.55:1。
- 本地未重复完整图像矩阵、全量测试或双地区构建；由 push 后现有 CI 验证。仍需维护者按实际显示器复核低亮度层次与透明图细节，以及手机真机软键盘/触摸体验。Image Converter 保持 draft，未改发布守卫、路由、SEO 或业务逻辑。
