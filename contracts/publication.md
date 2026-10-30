# 发布与地区契约

## 状态含义

| 概念 | 含义 |
| --- | --- |
| Draft | 开发中的真实工具；只在 DEV 当前地区可访问，不进入正式站点 |
| Published | 维护者批准的源码功能资格，可以参与所登记地区的正式构建 |
| 正式构建 | 生成可独立托管的静态页面与所需资源，不执行上传或上线 |
| 实际部署 | 将产物发布到托管环境的独立操作，需要明确授权 |

当前 Image Converter 是首个且目前唯一的 Published 工具，登记 CN/Global；**两个地区均未部署**。这是当前事实，不是平台工具数上限，也不是另一个发布开关。

## 唯一可用性来源

- [registry.ts](../src/tools/registry.ts) 的工具定义、`status` 和 `regions` 决定可用性：DEV 为当前地区 Draft + Published，生产为当前地区 Published。
- [validate-registry.ts](../src/tools/validate-registry.ts) 检查 ID/Slug、分类关系、地区、双语内容与可用 Loader。没有有效实现和静态说明不能伪造 Published 工具。
- [loaders.ts](../src/tools/loaders.ts) 与 [Astro/Vite 配置](../astro.config.mjs) 只投影 Registry；编译期可用常量负责裁掉不可用实现，不是独立发布设置。不得增加发布 Store、开关、staging 或第二套路径。
- 正式工具自然进入当前地区路由、完整目录、适用的精选/手工角色/相关推荐与公开发现文件；精选排序或身份配置不能绕过发布门，也不强制所有工具出现在每个精选槽。

## 构建与部署隔离

- CN/Global 独立域名、缓存与 `dist/cn` / `dist/global`；同地区包含中英文，不把英文页面自动投向另一地区。
- Draft、Lab、目录 Fixture、实验代码及其专用资源不得泄漏到正式页面、发现文件或资源图。不可用工具的 Worker/WASM 也应排除；当前正式 Converter 所需资源则正常生成并按需请求。
- robots/Sitemap/llms 从实际公开页面生成，不用 robots 代替 Draft 隔离；不得用假页面、假链接填充空态。
- 构建产物不是上线证据，localhost HTTP 缓存不等于 CDN/公网 HTTPS 已验证。备案、DNS、CDN 和搜索平台操作均需独立授权。
- 未经维护者授权不修改发布分支、线上环境或部署服务，不自动合并、部署、创建 Release/Tag。

执行约束见 [playbook](../.agents/playbook.md)；资格审计保留 [L1/L2/L3 政策](../AGENTS.md#mvp-beta-release-policy-2026-10-10)，其中 L2 七项和维护者最终决定不能被状态字段替代。

权威验证：[Registry 测试](../tests/taxonomy.test.ts)、[地区/发现测试](../tests/discovery.test.mjs)、[夹具隔离测试](../tests/catalog-fixture.test.ts)、[实际静态产物守卫](../scripts/verify-build.mjs)。架构理由见 [ADR-0001](../docs/decisions/0001-static-regions-publication.md)。
