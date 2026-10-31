# 工具平台 · 当前说明

当前只有 Image Converter 一个 Published 工具；第二款 [Image Resize & Crop](image-resize-crop-implementation.md) 为真实单图 Draft，两者登记 CN/Global，均未部署。其他未实现工具不能被填充为真实入口。

## 元数据、发布与发现

- [ToolDefinition](../src/tools/types.ts) 定义稳定 ID/Slug、两级 category/group、角色、工作区模式、地区/状态及短文案；[taxonomy.ts](../src/site/taxonomy.ts) / [roles.ts](../src/site/roles.ts) 是分类与六身份的实际来源，旧 audiences/contexts 不增加目录第三筛选维度。
- [registry.ts](../src/tools/registry.ts) 只收集元数据，[validate-registry.ts](../src/tools/validate-registry.ts) 检查重复、非法关系、双语内容和当前地区 Loader；[loaders.ts](../src/tools/loaders.ts) 独立字面量懒加载实现。
- 首页、导航、完整目录和相关工具共享 `getAvailableTools(region, dev)`；生产仅本地区 Published，DEV 可见本地区 Draft。精选/手工角色顺序不改变可用性，不自动补假工具。
- 唯一正式路径为地区内本地化 `/tools/{slug}/`，不因分类变化改路径。地区/语言与静态资源投影见 [发布](../contracts/publication.md)、[兼容性](../contracts/compatibility.md) 和 [ADR-0001](decisions/0001-static-regions-publication.md)。

## 静态工具页

[src/pages/[...locale]/tools/[slug].astro](../src/pages/[...locale]/tools/[slug].astro) 组合唯一产品导航、Astro ToolIntro、一个 ToolRuntime 和 Island 外 ToolGuide/相关工具。

[tool-content.ts](../src/site/tool-content.ts) 与具体内容模块拥有 Title、Description、唯一 H1、Intro、步骤、限制及 FAQ；Registry 不放长文。说明不依赖 React 成功水合，不能被下载到工具客户端 JS。模式/输出格式不生成重复 SEO 页面；Canonical、同地区 hreflang、OG 与发现文件保持一致。

[ToolIntro](../src/components/site/ToolIntro.astro) / [ToolGuide](../src/components/site/ToolGuide.astro) 负责静态语义与有限强调。说明区的响应式和原生全行 FAQ 见 [工作区说明](workbench-appearance.md)。新增工具按真实需要提供内容，不强制所有工具都具有 Converter 的固定数量。

## 业务与公共层

工具自有设置、状态、算法、资源和错误恢复；`processing-state.ts` 是纯版本契约，不是全局 Store 或调度中心。参数 equality、推荐恢复、真实输出与过期资源由工具实现。公共 Workbench/UI 不依赖 Image Converter 编码器，不建立 UniversalImageSettings 或跨媒体引擎。

Quick/Advanced 的有效行为由各工具定义，不把早期原型规则凌驾于当前实现。Converter 的自动/手动处理、元数据策略和下载资格见 [当前模块](image-converter-implementation.md) / [图片处理契约](../contracts/image-processing.md)。新增工具不代表自动批准已有工具的裁剪/缩放等扩展。

## 新工具最小接入

1. 确认真实需求、已有 taxonomy/角色含义及稳定 slug；新增真实定义从 Draft 开始，不注册 Lab 或测试数据。
2. 编写独立业务模块、字面量 lazy Loader 和目标地区双语静态内容，复用可选工作区布局。
3. 验证相应业务、异常路径、实际输出和必要视口；维护者按 [Beta 政策](../AGENTS.md#mvp-beta-release-policy-2026-10-10) 决定是否提升 Published。
4. 发布状态自然投影到路由/资源/发现；不创建额外发布配置。构建就绪仍不授权部署。

验证入口：[taxonomy](../tests/taxonomy.test.ts)、[tool-content](../tests/tool-content.test.ts)、[processing-state](../tests/processing-state.test.ts)、[catalog](../tests/site-catalog.test.ts)、[静态守卫](../scripts/verify-build.mjs)。通用隔离夹具保留 0/多工具、Draft、地区过滤和非法数据能力，不污染真实 Registry。

## 历史

[V0.4-A 完整设计与验收](history/tool-platform-image-foundation-v0.4.md) 包含当时三工具候选、三格式、空 Registry 和跨浏览器门禁；这些不是已实现产品声明。当前格式/隐私以源码和图片契约为准，兼容性验证以现行 L1/L2/L3 为准。
