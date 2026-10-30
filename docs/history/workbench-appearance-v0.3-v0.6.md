> **历史归档（E1，2026-10-30）**：本页完整保留 D2 基线中的阶段设计和验收记录；下文“当前”、Draft、格式、主题、额度与脚本约定均以对应阶段为语境，不覆盖后续实现。现行入口见 [当前说明](../workbench-appearance.md)、[文档索引](../README.md) 和 [来源优先级](../../AGENTS.md#sources-of-truth)。仅调整移动后相对文件引用，不改写原始测试结论。原文中代码路径按仓库根目录理解，仓库外临时证据仍为当时本机路径。

# V0.6-B1 — Reusable Form Tool Layout

`WorkbenchShell mode="form" formWidth="wide"` now opts into a centered 1400px
maximum, including the existing responsive safe gutters. Default Form, Batch
and Canvas layouts are unchanged. With the existing `right` slot, wide Form
uses an adaptive main column + 350px aside, stacking at ≤1050px. No tool state
or file handling belongs to the shell.

For a tool with leading input, settings and results, import `formToolLayout`
from `src/workbench/form-tool-layout.ts`: apply `container` to the inner grid;
opt into `columns` + `split` when expanded, and apply `leading`, `aside`, `main`
to those three children. Keep DOM order input → settings → results. The stack
is capped at 960px; split uses the shell's available width. Its final flexible
track absorbs a tall aside without stretching the input/result rows. This is
an optional StyleX layout recipe, not a file/parameter schema or state owner.
Converter changes classes only; task IDs, inputs, preview and settings stay mounted.

Astro `ToolGuide` aligns instructions and FAQ with the wide Form shell at 1400px
including the same safe gutters. Steps + limitations share top-aligned 55:45 columns above 1050px;
a single supplied section uses the full width, and narrow screens stack.
FAQ uses that same outer alignment and full-width native summaries; answer
text alone caps at 820px. Other readable site content retains its 820px layout.

---

# Tool4Furry V0.3-B — Workbench Appearance & Responsive Architecture

> 0–8 节为随任务导入的原始冻结合同；当前实现与验收结果见第 9 节。

> **中文 Codex 总实施文档 · 设计冻结 / 待实施**\
> 建议仓库内路径：`docs/workbench-appearance.md`\
> 目标分支：`dev`；不要合并 `main`，不要部署。\
> 本文将此前已冻结的 **V0.3-B1/B2/B3/B4（设计阶段）** 整合为 **B0/B1/B2/B3（Codex 执行关口）**。两套编号意义不同，不能混淆。

---

## 0. 一页执行摘要

### 项目定位

**Tool-first Platform / Canvas-first Experience / One Tool Entry, Many Workspaces**。

Tool4Furry 是支持大量独立工具的平台，并非单一画布编辑器。所有工具统一产品导航、身份、字体、色彩和基础组件；Canvas、Form、Batch、Custom 分别选择合理的工作空间组织。

- **Canvas**：全视口画布为底层；品牌导航、工具模式、Inspector、底部操作全部是覆盖在画布之上的可选浮层，绝不通过三栏 Grid 挤占画布面积。
- **Form**：输入、设置、执行、结果形成自然操作流；简单工具单列，具有结果预览时双列；手机自然纵向阅读。
- **Batch**：队列及状态为主，统一设置为辅；桌面队列宽、参数窄，手机自然纵排。
- **全局工具入口**：产品层级，与画笔等工具内部模式分离；元信息仅来自已有 Tool Registry，不显示虚假的“已发布工具”。
- **工程原则**：只治理外观和空间，不重写工具业务状态、文件处理、Base UI 行为、StyleX 集成或静态站点构建。

### 成功标准

`pnpm dev` 可直观看到 Canvas、Form、Batch 三种成熟且统一的工作台外观；Canvas 打开 Inspector 前后其物理 Viewport 宽高不变；手机与桌面共用单份 Inspector 内容并能保留输入；全部旧功能和两地区静态构建仍通过。

**不以“首页改漂亮了”“新添了无限画布引擎”或“只通过 TypeScript 构建”代替本轮交付。**

---

## 1. 基线和必须先阅读的仓库文件

以 2026-10-09 已核实的 `gofurry/tool4furry` **`dev` 分支**为基线；开始实施前 Codex 必须重新检查当前分支和实际工作区，不得假设文件仍然一字未变。

| 位置 | 当前事实 / 实施影响 |
| --- | --- |
| `AGENTS.md` | 工程边界；必须优先遵循 |
| `docs/foundation.md` | Astro SSG、ToolRuntime/LabRuntime、Registry、WorkbenchShell 插槽合同 |
| `docs/ui-primitives.md`、`docs/file-interactions.md` | UI、文件、ScrollDock 的现有行为和 API |
| `docs/visual-foundation.md` | V0.3-A 已完成：DM Sans / Noto Sans SC、自托管字体与 StyleX 语义 Token |
| `src/workbench/WorkbenchShell.tsx` | `header/left/right/bottom/children` 均可选；Canvas 仍为三列 Grid，`minHeight: 540`；参数由 Base UI Dialog + Portal + `keepMounted` 管理 |
| `src/workbench/useCompact.ts` | `(max-width: 900px)`，务必与 StyleX 响应式规则保持一致 |
| `src/tools/types.ts` | `WorkspaceMode = 'canvas' \| 'form' \| 'batch' \| 'custom'`；ToolDefinition 含 id/slug/category/mode/status/regions/copy |
| `src/tools/registry.ts` | **当前 `tools = []`**；`getPublishedTools(region)` 过滤发布状态和地区 |
| `src/tools/loaders.ts` | 独立懒加载工具实现，仍为空 |
| `src/tools/ToolRuntime.tsx` | React Tool 入口，接收 toolId/region，内部有 UiProvider、lazy、Suspense、LoadBoundary |
| `src/pages/tools/[slug].astro` | Astro `getStaticPaths` 只生成已发布工具；静态传入 ToolRuntime |
| `src/lab/WorkbenchLab.tsx` | 当前五个 Lab 按钮占用顶部空间，需要与正式产品导航分离 |
| `src/lab/CanvasDemo.tsx` | 选择/戳章、文本、大小、颜色、计数/重置的纯模拟逻辑；无真正无限画布引擎 |
| `src/lab/FormDemo.tsx` | 验证输入、转换、错误与输出，状态由 Demo 自有 |
| `src/lab/BatchDemo.tsx` | 纯模拟任务：添加、推进、移除、清空；无真实文件批处理 |
| `tests/workbench.test.tsx`、`tests/contracts.test.ts` | 已有空插槽、单份 Inspector、跨断点保值、Escape/Select、Form/Batch 业务回归与地区过滤测试 |
| `scripts/verify-build.mjs` | 首页零 JS/Island、CN/Global、CSS/字体、禁止 Lab 产物与假工具页面的生产守卫 |
| `astro.config.mjs` | Astro 7 + React + StyleX 官方 unplugin 的特殊 HMR/构建配置，不属于本轮改造 |

现有 V0.3-A 配色继续使用：`tokens.page #F7F5F0`、`surface #FFFEFB`、`surfaceMuted #EAE4DA`、`textPrimary #303431`、`action #A6532C`、`brand #C97849`、`sage #879C91`；字体为 **DM Sans Variable + Noto Sans SC Variable**，不要替换。按钮/输入操作区域保持至少 44px 的可用尺寸。

### 不变的工程边界

- Astro SSG、React Islands、StyleX、Base UI、Phosphor Icons、Motion、pnpm；不引入额外 UI 框架。
- 首页不挂全站 React Provider，不增加不必要 JS、SSR adapter、后端、数据库、登录、持久化、全局业务 Store。
- 不将 Lab 注册为真实工具；生产构建必须排除所有五个 Lab 和示例实现。
- 不扩展 `WorkspaceMode`，不开发通用无限画布引擎、假缩放/撤销工具、真实批量转换器。
- 文件选择和约束、ScrollDock 的 document-scroll 语义、Toast 队列、Tooltip/Select/ConfirmDialog 行为保持不变。
- `main`、CD/部署、V0.3-C 首页重设计不属于此任务。

---

## 2. B1–B4 已冻结的产品与视觉合同

### 2.1 信息与导航层级

| 层级 | 所有者 | 作用 | 范围 |
| --- | --- | --- | --- |
| L0 Global Tool Entry | 共享产品入口 | 品牌、工具箱、工具切换 | 所有正式工具 |
| L1 Tool Identity | 共享页面身份 | 当前工具标题、必要类别/帮助 | 所有正式工具 |
| L2 Tool Modes | 工具自身 | 选择、移动、绘制、任务模式等 | 当前工具内部 |
| L3 Inspector / Context Actions | 工具自身提供内容，Shell 负责位置 | 属性、参数、上下文操作 | 当前工具内部 |

`Related Tools` 属于辅助发现，不是再加一条固定导航栏。**不得把全站工具箱和 Canvas 的本地工具模式混入同一个 Dock。**

全局品牌与工具箱是两个独立的可访问交互目标：品牌返回现有首页；工具箱打开统一 Tool Switcher；工具名称优先作为明确的文本身份，不是行为不确定的整块点击区域。桌面/移动位置和层次一致，显示形式可自适应。

### 2.2 Tool Page Frame：单一产品入口所有者

允许新增**极薄**的共享 `ToolPageFrame`（命名可在不扩大范围的前提下随仓库约定），由 ToolRuntime / 工具页面层组合：

1. 当前工具身份来自 **ToolDefinition 单一真源**。Astro 已获得 `tool`；可以通过最小序列化属性传入 ToolRuntime，或在工具端按 toolId 从元数据表解析，但不得另维护一份工具标题/导航列表。
2. 只有当前地区 `published` 工具能出现在正式 Tool Switcher：复用 `getPublishedTools(region)`；路由沿用 `/tools/:slug`，不要自动在路径中加类别。
3. 当前 Registry 为空：工具箱必须有诚实的空态与返回首页入口。可以用现有 Lab 的清晰 **DEMO** 身份验证外观，但不能伪造生产已发布工具或把 Lab 放进 Registry。
4. Canvas 中产品入口呈**左上角悬浮**；Form/Batch 中产品入口进入**普通自然流顶部**。不得因此渲染两套品牌导航。
5. `WorkbenchShell` 保留既有 `header/left/right/bottom/children` 可选插槽；`header` 为工具局部标题/控制区域，不能和 ToolPageFrame 重复输出全局品牌头。可通过轻量组合让产品导航与工具局部插槽保持清晰。
6. 不建立全站 Tool Store、不创建内容管理系统。搜索、收藏、最近使用及完整“工具市场”留到有真实工具时再决定。
7. 工具离开前的数据保护是**责任边界**：未来由工具声明是否存在未保存数据，产品导航发起跳转意图；B 轮既无正式工具，也不预建全局保存/导航拦截系统。不得宣称已解决刷新/关闭页面的数据恢复。

**最小 Tool Switcher 要真实可用**：按钮可聚焦，点击/键盘可打开与关闭，打开后显示当前区域已发布工具或真实空态，选中真实工具才导航。复用现有 Base UI 组件或其 primitives，不引入新的 UI 库。

### 2.3 Canvas：全视口叠层，而非三栏布局

建议采用以下**语义结构**（非必须逐字照搬的组件树）：

```tsx
<CanvasWorkspace>
  <CanvasViewport>
    <ToolOwnedCanvasContent />
  </CanvasViewport>

  <CanvasOverlayLayer>
    <ToolLocalHeader />
    <LeftToolDock />
    <Inspector />
    <BottomDock />
  </CanvasOverlayLayer>
</CanvasWorkspace>
```

这里 L0/L1 产品级入口由 ToolPageFrame 单独拥有，视觉上同样处于 Canvas 上方，**不能与 `ToolLocalHeader` 重复**。CanvasViewport 是 Tool 的内容宿主，并不意味着本轮要实现 React Flow、Canvas 2D、WebGL、真实平移/缩放、撤销历史。

**P0 几何约束：**

- CanvasViewport 始终铺满工作台可用视口；`header/left/right/bottom` 和 Inspector 都不参与它的宽高分配。
- 打开/关闭 Inspector、左侧 Dock、底部 Dock **不会改变** `CanvasViewport.getBoundingClientRect().width/height`。不得因 Shell 操作重建、自动居中或改动工具画布坐标。
- 将当前 Canvas 三列 Grid、中央额外 padding 和 `minHeight: 540` 从“画布尺寸所有者”里移除；用稳定的 viewport/overlay 定位完成沉浸布局。
- Overlay 的空白部分不得抢走画布 `pointer` / wheel / drag 事件：覆盖容器可 `pointer-events: none`；真正可交互的按钮、Dock、Panel、Menu 再 `pointer-events: auto`。打开 **模态** Bottom Sheet 时遮罩阻挡画布是允许且预期的例外。
- Canvas 宿主本身不要以整个 `document` 滚动来模拟画布平移；未来引擎的坐标系归工具所有。现有模拟舞台的点击与戳章必须继续生效。
- 不创建看起来能点击却没有真实功能的缩放、撤销、导出控件；演示工具仅显示当前确实存在的 select/stamp/Reset/参数行为。

**可选悬浮区及建议基线：**

| 区域 | 桌面位置 / 大小 | 规则 |
| --- | --- | --- |
| 产品级入口 | 左上，小型 48px 高浮层 | 工具箱和品牌各有独立点击目标 |
| 工具局部操作 | 右上或工具指定的上方空间 | 当前工具有真实动作才渲染 |
| Left Tool Dock | 左侧，约 56px 宽 | 一级功能为主，44×44 点击区；无 slot 则不生成 |
| Inspector | 右侧，约 300–320px 宽 | 非模态、可关闭、内部滚动；**桌面默认收起**，特定工具可显式配置初始展开 |
| Bottom Dock | 下方，约 48–56px 高 | 缩放/上下文/状态**仅按工具真实功能**提供，无内容不生成 |

安全边距在桌面约 16–20px；Panel/Dock 使用 V0.3-A 暖白实体表面、细边框、`shadowSoft` 或 `shadowFloating`。不要把毛玻璃、发光、渐变、巨大的胶囊/嵌套卡片变成新默认规范。

### 2.4 Inspector 的单实例和交互契约

- **桌面**：非模态浮动 Inspector，默认关闭；打开后不锁定画布、不通过关闭周边区域自动退出。允许按工具的真实需求显式覆盖初始展开值。
- **窄屏**：`<=900px` 时变为 Base UI **Bottom Sheet**；用遮罩、焦点约束、Escape 关闭、最终焦点返回触发器，保留安全区与内部滚动。
- **唯一内容实例**：现有 `Dialog.Portal`/`keepMounted` 的单份参数树与输入状态合同必须保留。不能用 `{compact ? <MobileInspector/> : <DesktopInspector/>}` 各创建一份业务控件。
- `Select` 等嵌套弹层打开时，首次 Escape 应先关闭最上层弹层，再允许下一次 Escape 关闭 Sheet；不能因焦点顺序改版退化。
- 当窗口跨 `901 → 900 → 901px`，业务值、当前模式、选择状态与已有对象的 React 身份不能丢；可按不同 UI 模态调整面板可见性，但不得重建业务表单。对已展开 Sheet 的跨断点处理需稳定且可说明。
- Inspector 关闭后，按钮的 `aria-expanded` 等状态与可见/可交互状态一致，隐藏内容不能被意外 Tab 导航到。

### 2.5 响应式交互

继续沿用 `src/workbench/useCompact.ts` 中已有的 **900px** 边界；CSS 与 JS 使用同一阈值，不另造互相冲突的状态系统。

| 场景 | 推荐 UI 行为 |
| --- | --- |
| 宽度 >900px | 左侧垂直 Tool Dock、右侧浮动 Inspector、可选下方 Dock |
| 宽度 <=900px | 画布仍全视口；工具动作合并成底部横向 Dock；参数打开 Bottom Sheet |
| 普通竖屏手机 | 顶部保留工具身份 + 工具箱；底部核心动作、更多、参数；最小可点击区域 44px |
| 横屏矮视口 | 不保留 540px 最小高度；顶部/底部入口、关闭按钮可达，Panel 可滚动 |
| 安全区/软键盘 | 使用 `env(safe-area-inset-*)` 与适当视口单位；不因键盘弹出销毁工具状态 |
| 触控/减少动态效果 | 不依赖 Hover；Reduced Motion 下移除非必要动效 |

移动端一次只展开一个主要操作面板，避免“更多功能”和 Inspector 双层 Sheet 遮挡。允许高级子模式打开局部菜单，但不要预建通用复杂工具树。

浮层必须避免和 Toast、Tooltip、Popover 错误叠加；沿用 `tokens.layerDock/Toast/Backdrop/Sheet/Dialog/Floating/Tooltip`。透明层不能挡住真实操作，Portal 不得因为祖先 `pointer-events: none` 而失去交互。

### 2.6 Form：Input → Action → Result

- 默认**自然文档流**，不是 Canvas 的 `100dvh + overflow:hidden`。
- 维持 `mode="form"`。无右侧结果 slot 时为居中合理宽度单列；有结果 slot 时自适应双列，最大工作宽度约 **1120px**，桌面可从 **55:45** 的主次关系起步（不当成固定像素合同）。
- 主操作跟随输入和参数，复制/下载跟随结果。减少层层卡片套卡片和冗余标题，不新增“开始使用”中间页。
- 手机阅读/DOM 顺序尽量保持 **输入 → 配置 → 执行 → 结果**；禁止复制两个表单节点以实现移动布局。
- 演示继续使用 `simulateText`；空白输入错误、`✦ FURRY`、状态与结果 `aria-live` 必须保留。

### 2.7 Batch：Queue → Settings → Completion

- 默认自然文档滚动。维持 `mode="batch"`，最大工作宽度约 **1280px**。
- 主队列占剩余主体宽度；有右侧统一设置时约 **300–320px**，没有设置区域时列表自然填满。优先使用可预测的 Grid，而不是任意 `flex-wrap` 自动比例。
- 队列内显示任务/文件的真实名称、状态和必要操作；配置区控制**当前批次**，不改变既有任务含义。
- 手机以队列为主纵向堆叠，参数可见、操作易找到；**可选 Sticky Action 预留到真实工具验证后**，本轮不强行实现。
- 当前 BatchDemo 是模拟任务队列，不是文件队列：保留 `advanceTasks`、添加/移除/清空、已完成计数；不得偷偷接入 FileDropzone 或创建异步 worker/持久化任务框架。

### 2.8 Custom 模式

保留原样的 escape hatch。共享产品级工具入口与字体/基础 UI，但不强制 Canvas overlay 或 Form/Batch 两栏。继续支持主内容单独渲染，无插槽时不产生额外面板、按钮、header/footer。

---

## 3. 推荐的最小实现路径与所有权

```text
Astro SiteLayout（静态外壳，不全站 hydrate）
└─ /tools/[slug] → ToolRuntime（一个固定 React Island）
   ├─ UiProvider（原样）
   ├─ ToolPageFrame / Global Tool Entry（轻量产品导航；工具身份来自 Registry）
   └─ Tool Module（懒加载；自有业务状态）
      └─ WorkbenchShell（mode + 可选 header/left/right/bottom/children）
         ├─ canvas: CanvasViewport + OverlayLayer（布局 / 面板可见性）
         ├─ form:  自然流单列/双列
         ├─ batch:  队列优先 Grid
         └─ custom: 工具决定结构
```

ToolPageFrame 的组合方式需与现有模块接口兼容：可以包在 Tool Module 之外，也可以通过一个最小的共享导航部件交给 Frame/Slot 注入；但**最终 DOM 只能有一个产品入口**，并且不可要求工具业务组件自行复制品牌与工具箱。`ToolRuntime` 的 lazy/load/fallback、`UiProvider` 边界及 Astro 固定 hydration 入口继续成立。

明确两个“不要”——**不要**让 WorkbenchShell 导入 Registry 并负责跨工具导航；**不要**把 Canvas 引擎的数据状态交给 ToolPageFrame。未来即使增加真实工具，只需登记元数据与 loader，并渲染自己的工作区。

本轮应优先修改或新增：

- `src/workbench/WorkbenchShell.tsx`、必要的局部样式/轻量布局部件；`src/workbench/useCompact.ts` 尽量保持阈值；
- `src/tools/ToolRuntime.tsx`、`src/pages/tools/[slug].astro` 的最小身份接线及必要的共享 `ToolPageFrame` / ToolSwitcher；
- `src/lab/WorkbenchLab.tsx`、`CanvasDemo.tsx`、`FormDemo.tsx`、`BatchDemo.tsx` 的展示与布局，保持 demo 业务；
- `src/lab/messages.ts` / `src/i18n/messages.ts` 的必要文案；
- `tests/workbench.test.tsx`、`tests/contracts.test.ts` 的必要增量；
- `docs/workbench-appearance.md`、`AGENTS.md` 和 README 的小范围说明更新。

必要时可以增加**少量单职责样式模块**，不需要为此建立多层 packages、Provider、全局状态或大规模可配置布局 DSL。

---

## 4. Codex 执行关口（与设计 B1–B4 区分）

### B0 — Baseline Audit & Guardrail（先审计，不先改外观）

1. 检查 `dev`、工作区状态、`AGENTS.md`、上述文档与文件；辨认当前 900px、Portal、空 Registry、静态构建条件。
2. 明确列出将保留的组件 props、Lab 业务行为和无插槽渲染合同；不要通过删除测试绕过现状。
3. 整理新增 UI 责任归属：产品入口在共享框架、画布操作在 Tool、覆盖布局在 Shell；避免重复 Header。
4. 记录基线 `pnpm check` / `pnpm test`，确认可启动 `/lab/canvas`、`/lab/form`、`/lab/batch`；后续若发现已有失败，先界定而非与本轮任务混淆。

**B0 Gate：** 现有接口和回归目标清楚，代码改动范围被控制，无新增依赖和假工具。

### B1 — Global Entry + Canvas Overlay Migration

1. 实现极薄的产品级入口/当前工具身份，支持品牌返回首页、工具箱菜单或空态；真实工具仅来自过滤后的 Registry，语言随 region。
2. 将 Lab 的五入口导航移入小型 **DEV-ONLY** 调试菜单，清晰标识 DEMO，避免大段工程导航占据正式工作台顶部。不要新增生产 Lab 链接。
3. Canvas 从三列 Grid 改为**全视口 Viewport + OverlayLayer**；CanvasDemo 的核心点击/状态逻辑原样保留。
4. 支持可选 header/left/right/bottom；将工具 Dock、操作、Inspector、底部区域独立定位；布局不存在时不制造空容器。
5. 桌面 Inspector 初始关闭，非模态。维持单份 Portal/参数内容；必要时新增极小可选的初始展开 prop，不复制 JSX 树。
6. 提供稳定、语义明确的 DOM 标记供浏览器验收（建议 `data-canvas-viewport`、`data-canvas-overlay`），不要依赖随机 StyleX class 名查询。

**B1 Gate：** 桌面画布真正填满视口；开关 Inspector 不改变 Viewport 宽高；浮层空白处画布可点击；唯一产品入口与空工具箱真实可用；已有 demo select/stamp/reset 没有回归。

### B2 — Responsive Overlay + Form/Batch Layout

1. 沿用 900px 阈值，窄屏把 Canvas 本地工具动作整合为底部 Dock，参数为 Base UI Bottom Sheet；修复矮视口和 safe-area，禁止通过复制 Inspector 实现两端布局。
2. 核对在手机 Sheet 里 Select、Tooltip/Toast 等层级、ESC、焦点回归；不调整底层 Base UI 行为 API。
3. Form/Batch 从随意 flex-wrap 调整到单列/双列、队列优先的稳定布局；主内容响应式堆叠，DOM/键盘阅读顺序合理。
4. 简化重复卡片、过大标题和多余说明；继续复用 V0.3-A 的 Token 与控件，不开始 V0.3-C 首页改造。
5. 小屏长标题、安全区、横屏矮高度和 Panel 内滚动均应可达；对 Page/Canvas 外部 ScrollDock 保持原语义。

**B2 Gate：** 901/900px 跨断点状态保留；390px 竖屏、812×375 横屏无重要操作被遮挡；Form/Batch 逻辑及输出正常；页面不存在意外横向溢出。

### B3 — Visual Contract, Tests & Handoff

1. 补充**结构/交互测试**，不删除、跳过或弱化历史功能断言。
2. 在**真实浏览器**验收布局几何与事件；jsdom 无 layout engine，不能把 jsdom 组件测试当像素验收。
3. 展示 CN 与 Global 文案的页面，检查当前语言/标题、工具箱空态、导航、视觉一致性；不能单靠中文截图推断英文不会溢出。
4. 检查 build 中首页零 JS/Island、静态 CSS 与 Fontsource、不包含 Lab 和伪造工具页、地区 canonical 正确；必要时仅补充针对新风险的守卫，**不放宽**既有脚本。
5. 更新 `docs/workbench-appearance.md` 记录实施决策、验收实测、未覆盖平台；README/AGENTS 只做必要的简短变更。
6. 完成提交并按既有合作流程推回 `dev`。不要合并 `main`、不要部署。

**B3 Gate：** CI 四项顺序通过 + 浏览器 P0 验收通过 + 人工可检查三种工作台；有环境限制就明确报告没有测到的项目，不许伪称全部通过。

---

## 5. 可自动验证的合同

### 5.1 React / Vitest 合同

在既有测试基础上增加或调整最小断言：

1. `canvas/form/batch/custom` 的 **main-only** 渲染不产生无意义 header/aside/footer/工具按钮；兼容现有 `WorkbenchShell` 可选插槽接口。
2. `Inspector` 默认关闭（按新设计修改旧测试对默认展开的假设），点击打开/关闭后**同一个 TextField DOM 实例**和已有值被保留，Select/Slider/画布状态不丢；桌面→窄屏→桌面不重复产生 Inspector 参数控件。
3. 选择/戳章、状态计数、Reset 行为保留；Form 空值校验、`✦ FURRY` 输出、Batch 添加 WEBP、推进至 `2 / 2`、移除和清空行为保留。
4. 工具入口过滤：只显示 `published` 且覆盖当前 region 的 ToolDefinition；当前空 Registry 呈现空态，不将 Lab 或 Draft 当正式工具。
5. 共享产品入口不会在一个工具页面重复出现；产品入口和当前工具模式按钮的可访问名称互不混淆。
6. 手机模态关闭的焦点返回、嵌套 Select 的先后 Escape、键盘 Tab、`aria-expanded`/`aria-controls`、禁用与可见状态匹配。
7. `useCompact` 与 StyleX 900px 断点一致；不需要建立第二套 resize Store。

**测试不能只验证源码字符串包含某个 class，也不能因此删掉旧测试或强行改模拟算法。**

### 5.2 真浏览器的几何与交互合同

必须使用真实浏览器渲染；如果当前 Codex 环境没有浏览器能力，请记录“未执行”，交付用户人工验收步骤，不能以 jsdom 输出代替。

| 场景 | 最低验收 |
| --- | --- |
| 1440×900 `/lab/canvas` | 画布铺满工作区；Panel 关闭/打开前后 `data-canvas-viewport` 的 `getBoundingClientRect()` 宽高一致；仍可在未遮挡区域点击模拟画布 |
| 1024×600 `/lab/canvas` | 左上、右上、左侧、Panel、底部操作不发生不可操作的碰撞；必要时允许非重要区域折叠 |
| 901 → 900 → 901px `/lab/canvas` | 分支切换前后内容和参数引用稳定，桌面与 Sheet 都可操作，Inspector 无两份输入框 |
| 768×1024 `/lab/canvas` | 工具动作在底部、参数以 Sheet 形式出现、Escape/焦点正确 |
| 390×844 `/lab/canvas` | 顶部名称截断、工具与参数入口可达，画布不因 Dock 被压缩，无遮罩时可点穿空白 Overlay |
| 812×375 `/lab/canvas` | 无 540px 最小高度回归；关闭按钮/控制可达，Sheet 内部滚动，安全区正确 |
| 1440×900 & 390×844 `/lab/form` | 双列/单列的输入→执行→输出流程清晰，错误与结果仍可读；无横向溢出 |
| 1440×900 & 390×844 `/lab/batch` | 队列为主要区域、参数次要，手机不重复任务列表，操作正常 |
| `/lab/ui`、`/lab/files` | 复核 Base UI、文件交互与 ScrollDock；ScrollDock 仍不是画布缩放或面板滚动控件 |
| CN / Global | 中文/英文标题、长字符串、菜单、工具箱空态和操作按钮合理布局 |

可以在浏览器控制台直接采样：

```js
const viewport = document.querySelector('[data-canvas-viewport]');
const rect = viewport?.getBoundingClientRect();
console.log({ width: rect?.width, height: rect?.height });
// 打开/关闭 Inspector 后重复采样，比较宽高（允许亚像素浮点误差）。
```

请留下每种模式至少一张桌面图与一张手机图，并给出检查记录；截图不进入正式静态站点资源。对于“iOS Safari/Android Chrome 真机”“软键盘”等未实测内容明确标记待人工复核。

### 5.3 生产与 CI Gate（顺序执行）

Windows/本地如曾启动 `pnpm dev`，**先停止 dev 服务**，避免已记录的 Vite 缓存冲突。项目原生脚本：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build:cn
pnpm build:global
```

构建必须继续满足：

- CN/Global 在 `dist/cn`、`dist/global` 分别输出，中文/英文和 canonical 正确。
- 首页不出现 React Island、script、JS preload，不为 ToolSwitcher 在首页追加 hydration。
- 未发布工具不生成 `/tools/:slug`；当前空注册表时仅生成首页及 404 等既有合法页面，不制造生产演示工具。
- 五个 `/lab/*` 路由、LabRuntime chunk、`CanvasDemo/FormDemo/BatchDemo/UILab/FilesLab` 实现不进入生产产物。
- StyleX 编译 CSS、Fontsource 自托管、授权文件、已有 Region 校验与 `scripts/verify-build.mjs` 均保持；无新的 CDN 字体、外部强依赖。
- CI 仍在 `dev/main` push/PR 时执行既有验证；本任务不修改 CD 和部署。

---

## 6. 验收等级与拒收标准

| 等级 | 内容 | 处理 |
| --- | --- | --- |
| **P0 必须通过** | Canvas 全视口/不挤压、Overlay 穿透、Inspector 单实例保值、跨断点交互、统一真实工具入口、Form/Batch 旧行为、生产 Lab 隔离、构建通过 | 任一不通过不得宣称 V0.3-B 完成 |
| **P1 应通过** | 高度合理、排版密度、长中英文、碰撞与 safe-area、无明显横向溢出、表单自然阅读顺序、Toast/Select 层级与键盘可用 | 未完成需列清单，并区分阻塞/非阻塞 |
| **P2 延后** | 真实无限画布、真正缩放/撤销、ToolSwitcher 搜索收藏、自动保存/导航拦截、可调 Inspector 宽度、Batch 引擎/Worker、暗色模式、首页改版 | 不作为 B 阶段必交，不擅自实现 |

以下情况直接视为**不满足实施合同**：

- 只是把三列 Grid 美化成卡片，却仍把 Canvas 挤成中间一块。
- 把 Canvas 和 Form/Batch 统一做成全屏悬浮编辑器。
- 工具箱中出现虚构的正式发布工具，或把 Lab 注册进 Registry。
- 移动端有两份分别维护的 Inspector/Form/Batch 业务 JSX 树；切换宽度丢状态。
- 将工具业务数据与跨工具逻辑搬进 WorkbenchShell、重写 Base UI/StyleX/Astro 基础、引入全局业务状态层。
- 为了测试通过删除、跳过或弱化现有行为断言/生产守卫。
- 新增无实际功能的“100% 缩放”“撤销”“导出”等装饰性假操作。
- 用 jsdom 或截图静态模拟宣称真浏览器几何、真实触摸、Safari 真机已经验证。

---

## 7. 最终交付要求

Codex 完成后在回复中提供：

1. **改造摘要**：B0/B1/B2/B3 分别做了什么，关键文件清单与架构决定；说明 `ToolPageFrame` 和 `WorkbenchShell` 的所有权边界。
2. **测试结论**：`pnpm check/test/build:cn/build:global` 的实际结果；新增测试覆盖；若通过 CI，附对应 run 链接。
3. **浏览器验收记录**：哪些分辨率实际测试、关键 `CanvasViewport` 尺寸对比、Sheet 的状态与焦点；哪项由于环境缺失未测。
4. **人工检查清单**：`/lab/canvas`、`/lab/form`、`/lab/batch`、`/lab/ui`、`/lab/files` 需要用户特别检查的界面。
5. **仍存限制**：尤其真实移动 Safari / Android 设备、软键盘、辅助技术测试、未来真实工具退出保护等。
6. **提交与分支**：按既有协作流程提交并推回 `dev`；不得自行合并 `main` 或部署。若权限/运行环境阻塞，报告原因而不是编造完成状态。

**完成标准不是“所有页面都变得极度华丽”，而是宏观结构正确、同一套控件在不同工作区一致、画布沉浸且无行为回归。** 微观美术细节在人工审核后继续迭代。

---

## 8. 交付后人工审核顺序

1. 首先打开 **`/lab/canvas` 桌面**：确认没有顶栏/左右列挤压，打开 Inspector 再关闭；亲自点击画布未覆盖区域、切换选择/戳章。
2. 将窗口缩到 **900px、390px**：确认底部 Dock/参数 Sheet、输入值不丢，点击其他位置没有透明遮罩意外阻挡。
3. 检查 **`/lab/form` 和 `/lab/batch` 桌面与手机**：读序、宽度、按钮逻辑及结果/队列状态。
4. 回归 **`/lab/ui` 和 `/lab/files`**：基础 UI、Select、Toast、文件拖放与 ScrollDock 不退化。
5. 最后核实两地区 build 和首页静态性能边界，确认 Lab 没有混入生产。

B 阶段合格后，才进入 **V0.3-C — Site Shell & Homepage**。不要在 B 阶段提前实现 C。

---

## 9. V0.3-B 实施记录（2026-10-09）

### B0：实际基线与合同导入

从干净的 `dev` / `origin/dev` `d3bb8e6` 开始。仓库原本缺少本文件；本次将随任务提供的完整合同导入，上方 0–8 节保留原始规格及设计阶段编号。本节记录执行关口 B0–B3 的实际实现。基线 `pnpm check` 为 54 文件、零诊断，`pnpm test` 为 7 文件 / 62 项通过；三个旧工作台在内置 Chromium 可打开。基线 CI 成功，Registry/loader 均为空。

### B1：产品入口与 Canvas 叠层

- 新增 `src/tools/ToolPageFrame.tsx`：组合层提供品牌首页链接、独立工具箱按钮、唯一 h1 身份及可选 debug 插槽。正式身份由 ToolRuntime 从 `getPublishedTools(region)` 找到的 ToolDefinition 提供；Switcher 复用该过滤并链接 `/tools/:slug`。空表只有“工具正在准备中 / Tools are on the way”和返回首页。没有新增 Registry 条目。
- ToolRuntime 保留 UiProvider、lazy、Suspense、LoadBoundary；加载/错误文字为 Canvas 入口留出空间。ToolPageFrame 不导入 Lab，WorkbenchShell 不导入 Registry，首页没有挂 Provider。
- `src/lab/LabMenu.tsx` 的五个链接在 DEV 调试菜单内；WorkbenchLab 显示 `DEMO · 当前预览`。工具模式按钮只切换选择/标记，不改变产品身份。两个菜单使用 [Base UI Menu](https://base-ui.com/react/components/menu) 的键盘、焦点与 LinkItem；共用的 `src/styles/menu.ts` 仅存 StyleX 外观。
- Canvas 的 `data-canvas-viewport` 是绝对定位完整 `100dvh` 内容宿主；`data-canvas-overlay` 为空时 `pointer-events:none`，实际浮层重新启用指针。没有中央 padding/三列布局/540px 最小高度，也没有给文档增加模拟平移滚动。Demo 全画布按钮接受点击，原选择、计数、大小、颜色及 Reset 状态仍由 CanvasDemo 持有。
- 默认关闭的桌面 Inspector 宽 320px、非模态，空插槽不渲染面板和按钮。左右 Dock、底部状态/重置使用既有 Floating Token 和图标；当前模式还有实心图标区分，不只依赖颜色。

### B2：响应式和自然流

`WorkbenchShellProps`、WorkspaceMode、原语 Props 均未扩展。header 是工具局部控制，产品头由 Frame 负责。`useCompact` 与 StyleX 保持 `max-width:900px`；窄屏把同一份左右操作整合到底部，参数采用 Base UI Bottom Sheet。

Inspector 仍使用一个 `Dialog.Portal keepMounted` 和稳定 `panelHost`；不复制业务 JSX。桌面/窄屏分别记忆开关状态，均初始关闭：第一次从已打开桌面跨到窄屏会收起，返回桌面恢复原开关状态。仅改变可见性和模态语义，名称、Select、Slider、模式与计数保留。关闭后的参数不可 Tab 到达。面板标题/关闭按钮在滚动内容之外，短屏内容滚动且 overscroll contained；上下/左右浮层间距考虑 safe-area。没有新过渡；原 Motion 仍服从 reduced-motion。

Form 无 right 时最大 760px 单列，有结果时最大 1120px / 11:9 Grid，<=900px 自然纵排；去掉重复“输入文字”标题及多余预览标记。Batch 最大 1280px，队列占剩余空间、设置列 320px，窄屏队列在前、设置在后。Form/Batch 状态与算法不变，custom 保留自然流，不强制 Canvas。没有改写文件接收、ScrollDock 或任何全局 CSS、字体、Token、Astro 配置。

### B3：实际浏览器证据

使用内置 Chromium 的真实浏览器布局和键盘交互，下面尺寸是视口模拟，**不是真实手机**。CN 验证名称 `Studio 参数保持 123`、大小 49、暖橙、标记模式及计数在开关/901→900→901 中保留；参数输入数量为 1，浏览器 DOM id 保持不变。Vitest 另外断言同一 TextField DOM 对象引用，不能用浏览器 id 或 jsdom 替代几何测量。

英文模式再次完整测量 `getBoundingClientRect()`，每次等待 Hydration 和面板可见后记录。两次测量均为下表宽高，没有横向溢出：

| 视口 | Inspector 关闭时 Viewport | 打开时 Viewport | 交互 |
| --- | --- | --- | --- |
| 1440×900 | 1440×900 | 1440×900 | 桌面非模态，未覆盖处点击标记 0→1 |
| 1024×600 | 1024×600 | 1024×600 | 320px 面板与 Dock 可达 |
| 901×600 | 901×600 | 901×600 | 桌面；900→901 返回后再次相等 |
| 900×600 | 900×600 | 900×600 | Bottom Sheet；Select 方向键/Enter 改暖橙 |
| 768×1024 | 768×1024 | 768×1024 | Sheet / Escape / 焦点返回 |
| 390×844 | 390×844 | 390×844 | 未覆盖空白点击计数 1→2；底部 Dock 可用 |
| 812×375 | 812×375 | 812×375 | 文档高 375；Sheet 高 300，内部 229px 滚动区承载约 325px 内容，关闭按钮可见 |

第一次 Escape 只关闭 Select、焦点回到 combobox；第二次关闭 Sheet、焦点回到“打开参数”。手机 Sheet 阻挡画布是预期模态行为。产品入口、Dock、Toast、Sheet 和菜单使用同一层级体系，Frame/Shell 不建立会困住 Sheet 的额外 stacking context。

最终鼠标复核发现并修复了 Portal 继承问题：Base UI 的嵌套 Select Portal 可能位于参数 Portal 内，继承 Overlay 的 `pointer-events:none`，键盘通过但鼠标点穿选项。只为 `Dialog.Portal` 的零高度包装层恢复 `pointer-events:auto`；host/空 Overlay 继续为 none。浏览器 `elementFromPoint` 实测命中选项，手机冷加载及桌面点击均可改值并正确返回焦点；参数 Portal 实测宽 390px、高 0，不新增画布遮挡。修复后桌面未覆盖区域点击仍增加计数、Viewport 仍 1440×900。未改动 Select、Dialog 的公共 API 或焦点机制。单元测试新增直接窄屏首次打开路径；CSS 指针继承必须另用真实浏览器验证，不能靠 jsdom 声称覆盖。

Form 在 1440×900 / 390×844 测到双列/纵排，无横向溢出；空输入有错误，受控 Checkbox 后生成 `✦ FURRY`，改变宽度保留输入/结果。Batch 的 WEBP 选择、加入 Demo 02、推进两次至 2 / 2、移除及清空均实际执行。UI 主按钮消息、确认框 Escape 和焦点返回正常；Files 用原生选择流程混入 PNG/TXT，合法项进入元信息列表、TXT 单独报告。桌面 ScrollDock 100%→75%，scrollY 1290→968（四舍五入后的 25% 步进），仍只控制文档。

英文实测 Toolbox 空态、DEV 菜单、Canvas 及手机 Form/Batch；英文 Form 同样输出 `✦ FURRY`。390px 的 Files 长标题实际内容宽 167px、可用宽 143px，使用 ellipsis，无横向溢出。菜单 Enter 打开、Escape 返回触发按钮，DEV 菜单可真实跳转。检查过的页面控制台无 error/warn。

截图和原始几何 JSON 放在工作区仓库外的 `../artifacts/workbench-v03b/`，不进入 Git 或生产：`canvas-desktop.jpg`、`canvas-phone.jpg`、`canvas-sheet-select.jpg`、`canvas-landscape.jpg`，以及 Form/Batch 各桌面和手机图；`global-toolbox-phone.jpg`、英文 Form/Batch 手机图，`geometry.json` / `global-geometry.json`。长页面截图为 full-page，图像尺寸可能因滚动条与文档高度不同于视口尺寸。

### 命令与生产验收

Windows PowerShell、Node 24.15.0、pnpm 12.8.1；先停止 dev，再顺序执行安装、检查、测试及两地区构建。最终样式复核后再次完成检查/测试和两地区构建：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功；锁文件未变，无依赖升级 |
| `pnpm check` | 58 文件；0 errors / 0 warnings / 0 hints |
| `pnpm test` | 8 文件、67 项全部通过，原 62 项保留并增强 |
| `pnpm build:cn` | 成功；中文首页与 404，共 2 页 |
| `pnpm build:global` | 成功；英文首页与 404，共 2 页 |

两地区均通过静态守卫：首页零 script / Astro Island / JS preload，正确语言及 canonical，StyleX CSS 提取、100 个外置本地 WOFF2 / 3 个内嵌子集与 OFL 授权完整。无 Lab 路由、Lab 入口或 Demo 实现；空 Registry 没有生成工具页。原守卫未削弱，额外禁止 `LabMenu` 资产和 `DEV ONLY` 代码泄漏。

新增测试验证中英工具箱空态、键盘打开/关闭及焦点、地区/发布过滤的真实函数、唯一产品身份与 DEV 菜单分离。原 Shell 测试只按合同将默认 Inspector 改为关闭、将图标触发器的焦点断言改为 aria-label；保留原名称/Select/计数/Escape/Form/Batch 断言，并增加同 DOM 引用、Slider 保值、工具栏开关、Reset/选择和 ARIA 关系验证。jsdom 的 Slider 测试使用键盘，不伪造不受支持的指针捕获或浏览器几何。

`.github/workflows/ci.yml` 未改动：dev/main 的 push/PR 依次安装、check、test、build:cn、build:global；Node 22、contents:read，无 CD。基线 CI 已通过；本次提交的 CI 链接和最终状态随交付报告提供。

### 尚需人工复核与后续

请按第 8 节审查 `/lab/canvas` 的浮层取舍、390px Dock、812×375 Sheet，以及 Form/Batch 的密度和读序，再检查 UI/Files。未执行 iOS Safari / Android Chrome 真机、软键盘/动态地址栏/真实安全区、触摸拖动、屏幕阅读器或系统 reduced-motion 体验；没有把 jsdom 的媒体模拟称为真机结果。OS 文件管理器拖放也未在本轮重测，原文件/滚动单元测试保留。

本轮不处理正式工具退出前保存、刷新恢复、真实无限画布/缩放/撤销、ToolSwitcher 搜索/收藏、Batch 引擎、可调面板宽度或暗色。首页与品牌的进一步空间设计留 V0.3-C；工具数据保护须由未来工具模块声明。没有修改 main、LICENSE、主要依赖或部署流程。
