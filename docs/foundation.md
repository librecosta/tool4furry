# Foundation V0.1

本轮范围是 Site Shell 与 Workbench Architecture。首页可以没有已发布工具；Lab 用来验证布局与交互，不能当作正式产品。

## 分层契约

- **Site Shell**：Astro 页面、首页、404、品牌、元信息与工具路由。首页只读取轻量 registry 和文案，不导入工具实现、不 hydrate React 应用。
- **固定 React 入口**：Astro 静态导入 ToolRuntime / LabRuntime 后使用 `client:load`。ToolRuntime 内部按 toolId 懒加载，不能对动态 Astro 组件标签加 hydration 指令。
- **WorkbenchShell**：仅管理插槽、布局、面板可见性与焦点。支持 canvas/form/batch/custom；header/left/right/bottom 均可省略，children 为主工作区。无插槽时不输出对应面板。
- **Tool Module**：持有业务参数、输入、结果和算法。Lab 的三个 demo 也是各自持有状态；没有全站业务 Store。纯模拟逻辑在 `src/lab/demo-logic.ts`，不属于 Shell。

V0.3-B 将 Canvas 更新为完整视口 `CanvasViewport + OverlayLayer`，上/左/右/下插槽不参与画布宽高分配。桌面 Inspector 非模态、默认关闭；900px 及以下为底部 Dock 与 Base UI Dialog Bottom Sheet。参数 Portal 始终指向同一个宿主且 keepMounted，响应式不复制参数树。工具状态在外层，因此关闭面板、切换宽度不会丢值。Dialog 负责焦点约束、Escape 和返回触发按钮。普通页面不锁 body 滚动。

Form 是输入/设置/执行与输出的 Grid 自然流：无结果时合理宽度单列，有结果时约 55:45 双列；窄屏单列。Batch 队列为主、桌面设置列 320px，窄屏纵排。custom 不附加画布语义。Motion 只用于模拟标记反馈，useReducedMotion 将其时长设为零。

`ToolPageFrame` 在 ToolRuntime/WorkbenchLab 组合层提供唯一产品入口和身份；Shell 的 header 是工具局部插槽。工具身份由 Registry 的已发布地区元数据得到，工具箱复用相同过滤；Lab 仅有明确 DEMO 标识与独立调试菜单。详见 [V0.3-B 合同与最新验收](workbench-appearance.md)，下方 V0.1 验收表为历史基线。

## 路由与生产隔离

V0.2-A 新增 `src/ui/` 公共原语与 `/lab/ui` 画廊。状态继续由 Lab/工具持有；UiProvider 仅位于固定 LabRuntime / ToolRuntime React 根。组件 API、弹层层级和本轮验证记录见 [UI 原语说明](ui-primitives.md)。

V0.2-B 新增 `/lab/files`、FileDropzone 和仅在此长页挂载的 ScrollDock；文件列表由 FilesLab 持有，Shell 与 Provider 边界不变。API、校验策略及检查记录见 [文件交互说明](file-interactions.md)。

- `src/pages/lab/[mode].astro` 的 getStaticPaths：dev 返回 canvas/form/batch/ui/files，build 返回空列表。没有下划线目录，也不生成“加了 noindex 的生产 Lab”。
- LabRuntime 的 demo import 受 `import.meta.env.DEV` 保护；Lab 文案与正式文案分离。
- Astro 7 会扫描零路径页面的 hydration 入口，仍可能输出一个无用的 LabRuntime chunk。因此配置中有一个只在客户端 build 阶段运行的极小 Vite options hook，移除该入口。产物检查同时禁止 Lab 页面、Lab 命名资产和 demo 实现。
- `/tools/[slug]` 只从 `getPublishedTools(region)` 生成。当前 registry 为空，两地区均只生成首页与 404，没有假工具页，也没有 sitemap。
- Astro 仍可能输出未被页面引用的 React/ToolRuntime 公共资产；静态首页没有 script 或 astro-island，不会请求它们。

## StyleX Gate 与实际版本

2026-10-09 在 Windows PowerShell 验证：Node 24.15.0、pnpm 12.8.1、Astro 7.3.8、@astrojs/react 7.0.1、React 19.3.0、StyleX 0.19.1。CI 使用 Node 22 LTS；引擎最低 22.12。

与启动规格中的通用示例相比，有以下实际配置细节：

1. 当前 `astro check` 不支持 TypeScript 7.0；其诊断要求 TypeScript 6，故固定 6.0.3，不采用实验类型映射器。
2. React 集成使用当前默认 Oxc JSX 路径，无旧 Babel 集成选项。StyleX 使用官方 unplugin 在 Vite 的 pre transform 阶段编译。
3. `runtimeInjection: false`；Astro Layout 提供开发专用 `/virtual:stylex.css` link 和 `virtual:stylex:css-only` 模块。StyleX 0.19.1 必须配 `devMode: 'css-only'` 才注册该模块。
4. StyleX 从 TypeScript/TSX 文件编译；Astro 模板使用已编译样式的 `stylex.attrs`。global.css 仅含 reset、基础 HTML 和焦点样式。
5. `inlineStylesheets: 'never'` 保证生产 CSS 独立提取。边框使用 borderWidth/borderStyle/borderColor 等明确属性，避免已观察到的混合 border 简写丢失。
6. Vitest 使用 unplugin 的 Rollup 适配器编译同一 StyleX 语法，避免启用浏览器 CSS HMR 监听。

Gate 实验先于工作台实现：最小 React Island 点击计数从 0 到 1；背景从橙色改为绿色，浏览器无需刷新即更新且计数保持 1。生产 HTML 中静态标题与 Island 内容已存在，head 引用提取 CSS；加载后颜色与预期一致，点击仍工作，无生产 hydration 错误，没有 StyleX 运行时注入样式。

开发验证中曾在同一目录混跑 dev/check/build，观察到 Vite 依赖缓存失配与 React hydration 错误；停止并重启后恢复。验证应顺序运行，不将构建过程与正在操作的 dev 会话混用。

V0.5-B2.2（2026-10-20）修正 B2.1 的推测：冷启动 Converter 首次虚拟 CSS 为 200 / 22,264 B，重取响应哈希同为 `a97105e92a90`；首帧已有样式，旧 shim 改写活动 link 的 href 后，背景和面板内边距短暂丢失约 88ms。首页同样复现（两次均 10,159 B / `a31abb841a8d`）。因此本项目的整页 FOUC 是活动样式表重载造成的空窗，不是仅凭 [上游 #1919](https://github.com/facebook/stylex/issues/1919) 推断的懒模块缺规则。

开发 Layout 保留原有阻塞 CSS link，以 `src/styles/stylex-dev-css.ts` 替代 0.19.1 的 css-only 客户端 shim：收到同一 `stylex:css-update` 时创建替代 link，load 成功才移除旧表；失败保留旧表，连续请求仅接受最新响应。没有隐藏页面、水合等待或固定延迟，StyleX 配置和生产 CSS 提取不变。上游提供不撤下活动样式表的刷新实现后，可删除该兼容模块并恢复官方 shim。临时首帧/请求探针已移除；修复后首页和 Converter 各三次加载的前 120 帧均未采到无样式帧，16→24→16px 与 Token 热改均自动应用。Astro 对共享 TS 样式改动的原有 React 根重挂载行为已与旧 shim 对照，未改变其 HMR 策略。

定向验证：4 项兼容模块测试与 `pnpm check` 通过；`node scripts/verify-converter-fixture.mjs cn` 的真实工具静态装配及产物守卫通过，磁盘 draft/loader 未变。Chromium 两次加载静态 Converter 的前 60 帧均有完整样式，head 的提取 CSS 为 131,548 B；首页零 script / Island，生产页面及 JS 不含开发 shim。测试装配中的临时首帧探针也已还原，不部署该 fixture。

参考：[StyleX Vite](https://stylexjs.com/docs/learn/installation/vite/)、[unplugin 配置](https://stylexjs.com/docs/api/configuration/unplugin/)、[Astro React](https://docs.astro.build/en/guides/integrations-guide/react/)、[Hydration 指令](https://docs.astro.build/en/reference/directives-reference/)、[Base UI Dialog](https://base-ui.com/react/components/dialog)。

## 增加第一个真实工具

V0.4-A 补充的当前发布门：必须有合法 category/group、按需 audiences/contexts、目标地区 SEO 内容和 loader；完整目录 `/tools/` 覆盖所有已发布工具，首页只展示最多 9 项精选。静态简介通过 ToolRuntime 命名插槽组合，导航身份不再与正式工具 H1 重复。详细实施顺序与验收见 [Tool Platform & Image Foundation](tool-platform-image-foundation.md)；下面早期步骤及历史验收不代表首款真实图片工具已交付。

1. 在 `src/tools/<tool-id>/` 添加工具 React 根组件与独立 TypeScript 算法。组件接收 region，将自有 UI 通过插槽传给 WorkbenchShell；算法不依赖 Shell。
2. 在 registry 添加稳定 id、slug、分类、mode、regions、两种语言的标题/描述，先标记 draft。元信息文件不能静态导入实现。
3. 在 loaders 添加字面量 `() => import('./<tool-id>/Tool')`。无需修改 SiteLayout、WorkbenchShell 或工具路由。
4. 编写工具自己的验证，检查手机与桌面交互，再标记 published。首页和目标地区的静态工具路由随之生成。
5. 执行 README 中四条验证命令。未来复杂画布、Worker/WASM、请求时渲染或独立 API，均按真实工具需求另行设计。

本地默认 CN；构建时 SITE_REGION 集中选择域名、语言和文案。域名在 `src/config/region.ts`，两地区输出目录由 Astro 配置隔离。构建后脚本验收可移植静态资产；业务不依赖云厂商。

## 验证记录与人工验收

2026-10-09 已在内置 Chromium 浏览器执行（视口模拟，并非真机）：

| 场景 | 结果 |
| --- | --- |
| 1440×900 Canvas | 五区布局、主空间优先、参数和工具栏可收起 |
| 375×812 / 768×1024 Canvas | 底部工具栏、参数 Bottom Sheet、无横向溢出 |
| 375 → 768 → 1440 改宽 | 名称、颜色、模拟标记保留；参数输入 DOM 仅一份 |
| Escape 关闭手机参数 | 抽屉关闭，焦点返回打开参数按钮 |
| Form | 输入 furry 并转大写得到 ✦ FURRY；375px 无横向溢出 |
| Batch | 添加 WEBP 示例、两步推进至模拟完成、移除、清空均生效 |
| 普通 Python HTTP Server | CN/global 首页分别为中文/英文，canonical 正确、无脚本；Lab 与假工具地址返回 404 |

Vitest 覆盖发布/地区过滤、dev/build Lab 路径、空值校验、模拟状态推进、四种 mode 的空插槽、参数树及状态保留、Escape 焦点返回、Form/Batch 操作。构建验收覆盖语言、canonical、提取 CSS、首页零脚本、无 Lab 与无未列出工具页。

仍需人工真机复核：iOS Safari / Android Chrome 的软键盘、动态地址栏与 safe-area；触摸时抽屉焦点和内部滚动；横屏矮视口；系统“减少动态效果”；屏幕阅读器读序。这些不是本轮已完成的真机测试。

## 明确延期

未开发正式工具、真实文件处理、登录/收费、后端、数据库、持久化、无限画布引擎、Worker/WASM、SSR Adapter、完整 E2E 框架或 CD。没有部署，也没有合并 main。未来上线前再配置域名、404 主机映射及平台发布流程。
