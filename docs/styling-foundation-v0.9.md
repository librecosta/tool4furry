# V0.9 样式基础

最终选型为 Astro 7、React 19、SCSS Modules、原生 CSS Variables；必要交互继续使用 Base UI、Motion 与 dnd-kit。V0.9-A 只迁移静态外壳，29 款工具的业务与 8 Published / 21 Draft 资格不变。

## 所有权与主题

- `src/styles/tokens.scss` 定义完整 `--t4f-*` 变量：`:root` 为 Neutral Dark，`html[data-appearance='light']` 覆盖 Light。颜色、空间、圆角、阴影、层级和时长与保留的 `tokens.stylex.ts` 等值；定向测试检查每个字段，修改过渡期 Token 时必须同步两处。
- `global.scss` 负责 reset、字体、全局焦点、主题图标互斥与既有 View Transition 基础规则。层顺序仍为 reset → base → 旧 StyleX priority；组件 SCSS Modules 不带全局组件选择器，不与旧 React 类作用于同一元素。
- Astro 组件从邻近 `.module.scss` 静态导入类名，CSS 由 Astro/Vite 构建交付。主题色使用运行时变量，不由 Sass 固化。目录控制器生成的分页与筛选标签共用 `ToolsCatalog.module.scss`。
- `appearance-controller.js` 仍是唯一偏好所有者，在 head 同步恢复 `data-appearance`，同时保留 StyleX 主题类供 React 与 Portal 使用。没有新增存储、Provider、Hydration 等待或运行时样式注入。

## A 阶段范围

已迁移 SiteLayout、Brand、Astro 导航与控制区、全部首页 Astro 展示组件、目录/卡片/空状态、工具 Intro/Guide、信息页、Footer、像素滚动球及首页/404 编排样式。素材、结构、SEO、断点、Reveal 时间轴和控制器行为保持原有契约。已删除无消费者的五个静态 StyleX 模块。

B 阶段仍需迁移 React ToolPageFrame / Workbench、UI 原语、React 导航与 Portal 样式；工具 TSX 及其局部 StyleX 留在后续 B/C 范围。A 阶段必须保留 `tokens.stylex.ts`、`theme.ts`、`site.ts`、`navigation.ts`、`controls.ts`、StyleX 依赖/Vite 插件和 `stylex-dev-css.ts`，不能因静态页已迁移而提前删除。

## 验证与开发边界

2026-11-04：Chromium 检查 CN 中文 Dark、Global 英文 Light 的首页、身份导航、目录和 PDF Merge 外壳，覆盖 1280px 与 390px 视口；主题保存后刷新正确、无横向溢出，目录筛选/搜索和导航切换正常。CN 首页/目录的计算样式与迁移前记录对照；PDF Merge 导入 2 页和 1 页文件、合并并实际下载，输出可重新解析为 3 页。

`pnpm check`（430 文件，零诊断）、9 文件 / 110 项定向测试及 CN/Global 各一次正式构建与产物守卫通过。新增守卫验证原生主题变量，同时保留 StyleX 主题、字体、许可和 Draft/Lab 隔离检查。正式产物预览补验两地区根主题、Global 导航身份切换/目录动态标签及 PDF Merge 外壳，目录只显示 8 款 Published，且没有 DEV CSS 补丁。

SCSS 编译与热更新可用；本次编辑 Astro 依赖的 CSS Module 时观察到页面刷新，内存中的工具状态随之重置。没有为此增加自定义 HMR 或隐藏页面方案。StyleX DEV 兼容链路仍在，A 阶段不宣称彻底消除开发期闪烁。Firefox、Safari 和真实移动设备未测，390px 仅为桌面 Chromium 的视口模拟。
