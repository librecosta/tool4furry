# ADR-0001 — Static Regions & Publication

## Status

Accepted。2026-10-30 整理既有决策，非最初作出全部选择的日期。

## Context

Tool4Furry 的页面和说明适合静态交付，交互工具在浏览器运行。中国站和国际站有独立域名及发布范围，但语言不是地区：两站均需中英文，切换语言不应误跳另一部署。开发工具需要可验收，又不能泄漏到正式路由。D2 批准首款工具源码 Published，但两站均未部署，因此不能把源码资格与公网操作绑定。

## Decision

- Astro SSG 为唯一页面生成机制，CN/Global 独立构建，产物与缓存分开。
- 每地区包含双语，默认语言无前缀，另一语言按 Locale 配置；同地区互链，地区入口单独处理。
- Registry 的 `status` + `regions` 是唯一工具发布来源。路由、Loader/Vite、目录/精选/相关工具和发现文件都从它投影，不创建第二套发布开关。
- DEV 允许本地区 Draft；生产排除 Draft、Lab、Fixture 及其专用资源。
- Published 表示源码资格；构建生成产物；部署需要维护者单独授权。当前 CN/Global 均未部署。

## Alternatives Considered

- **将 CN=中文、Global=英文绑定**：实现较少，但同地区无法双语，且语言跳转会跨域。
- **全站 SSR/后端管理可用性**：可做动态发布，但当前无运行时后端需求，增加服务、运维和状态来源。
- **独立预览路径、发布开关或 staging 配置**：容易让发现、路由和资源各自判断，造成 Draft 泄漏与验收不一致。
- **Published 必须同步部署**：无法表达当前已批准功能、备案/托管另行安排的真实状态。

## Consequences

静态产物可独立托管，无 SSR 服务；地区内语言和工具可用性可用统一配置与构建测试验证。新增工具只接入已有元数据、Loader 和内容边界。代价是两个地区都要在边界变化时检查产物，发布变化需要重建；本地构建无法证明真实 DNS/CDN/HTTPS 或部署已完成。

落实位置：[region](../../src/config/region.ts)、[locale](../../src/i18n/locale.ts)、[Registry](../../src/tools/registry.ts)、[Astro 配置](../../astro.config.mjs)、[publication 契约](../../contracts/publication.md)、[构建守卫](../../scripts/verify-build.mjs)。
