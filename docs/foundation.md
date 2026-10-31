# 工程基础 · 当前说明

当前为 V0.6-D2 源码基线：唯一正式工具 Image Converter，CN/Global 双语静态构建就绪，均未部署。系统分层见 [架构](../.agents/architecture.md)，执行流程见 [playbook](../.agents/playbook.md)；本页只解释工程集成与验证入口。

## SSG 与交互边界

- Astro 静态输出路由、正文、SEO 和发现文件；工具交互通过固定 React ToolRuntime 入口，内部再按 Loader 懒加载。
- Lab 只在 DEV 返回路径；Astro 即使零路径也可能发现 hydration 入口，因此 [astro.config.mjs](../astro.config.mjs) 保留客户端构建阶段排除 LabRuntime 的 hook。正式页面、资源与实现文本均由守卫检查，不能只删除可见链接。
- Registry 是唯一发布门，Vite 编译常量只是它的资源投影。发布与部署分别见 [publication](../contracts/publication.md)。
- WorkbenchShell 不持有工具业务，Provider 不提升到 SiteLayout；具体边界见 [工具平台](tool-platform-image-foundation.md) 与 [工作区](workbench-appearance.md)。

DEV Lab 与正式工具分离：UI/文件/Canvas/Form/Batch 各自持有演示状态；`src/lab/hero-effects/` 仅保留 HSN-1 Canvas 2D 实验，不恢复已删除的 Orb/WebGL，也不接入正式首页。实验的固定种子水平曲面、屏幕空间采样、实际重绘节流（与 RAF 统计分开）、暂停/隐藏/离屏/Reduced Motion 及监听/数组释放由其源码和 `tests/hero-effects.test.tsx` 负责；旧 README 独有参数完整承接在首页历史末尾。

## StyleX 与字体

[astro.config.mjs](../astro.config.mjs) 使用官方 unplugin 的 Vite pre-transform、`devMode: 'css-only'`、`runtimeInjection: false`、独立生产 CSS；React 使用现有集成路径，不恢复旧 Babel 配置。生产 `cssInjectionTarget` 固定选择所有静态页引用的 SiteLayout CSS，防止工具局部 CSS 成为上游默认的首资产注入目标；不改变工具 CSS 的按需归属。样式在 TS/TSX 中定义，Astro 用 `stylex.attrs`，React 用 `stylex.props`。`global.css` 仅承载 reset、字体/继承与必要基础桥接，不能变成第二套组件样式系统。

原生 `defineVars/createTheme` 与 `resolveTheme` 选择一份完整主题；根 class/data/color-scheme 覆盖静态页面、Island 和 Portal。外观恢复与切换由既有受控脚本完成，不增加 React ThemeProvider。主题值、字体和品牌权威入口见 [视觉说明](visual-foundation.md)。

保留虚拟 CSS 阻塞 link 及本地 FOUC 兼容模块：新样式表加载后才替换旧表，失败仍保持旧表。移除条件、上游跟踪和回归检查见 [upstream](../contracts/upstream.md#stylex-开发兼容补丁)。不要通过隐藏页面掩盖样式时序。

## 可执行验证

| 边界 | 权威实现 / 检查 |
| --- | --- |
| 工程版本与命令 | [package.json](../package.json)、[锁文件](../pnpm-lock.yaml)、[CI](../.github/workflows/ci.yml) |
| Astro/React/StyleX | [配置](../astro.config.mjs)、[Vitest 配置](../vitest.config.ts)、[StyleX HMR 测试](../tests/stylex-dev-css.test.ts)、[主题测试](../tests/theme.test.ts) |
| 静态与资源隔离 | [verify-build.mjs](../scripts/verify-build.mjs)、[通用平台夹具](../scripts/verify-tool-fixture.mjs)、[contracts.test.ts](../tests/contracts.test.ts) |
| 路由、地区与发现 | [language.test.ts](../tests/language.test.ts)、[discovery.test.mjs](../tests/discovery.test.mjs)、[taxonomy.test.ts](../tests/taxonomy.test.ts) |

按 [L1/L2/L3](../AGENTS.md#mvp-beta-release-policy-2026-10-10) 选定向验证；停止两个 DEV 服务再运行 check/build，同地区缓存不混用。没有后端、数据库、SSR Adapter、全局业务 Store 或通用画布引擎；不因工程模板引入这些系统。

## 历史与证据

[Foundation 完整历史](history/foundation-v0.1.md) 保留 V0.1 Gate、早期验收、FOUC 原因纠正与实验事实；旧零工具、零脚本及版本数字不是当前契约。历史采用当时环境，不代表新增浏览器/真机覆盖。重大选择见 [ADR-0001](decisions/0001-static-regions-publication.md) / [ADR-0002](decisions/0002-browser-local-image-processing.md)。
