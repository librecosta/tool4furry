# 发布与地区契约

## 状态含义

| 概念 | 含义 |
| --- | --- |
| Draft | 开发中的真实工具；只在 DEV 当前地区可访问，不进入正式站点 |
| Published | 维护者批准的源码功能资格，可以参与所登记地区的正式构建 |
| 正式构建 | 生成可独立托管的静态页面与所需资源，不执行上传或上线 |
| 实际部署 | 将产物发布到托管环境的独立操作，需要明确授权 |

当前 Image Converter 是首个且目前唯一的 Published 工具，登记 CN/Global；**两个地区均未部署**。这是当前事实，不是平台工具数上限，也不是另一个发布开关。

Image Resize & Crop (`image-resize-crop`) 登记 CN/Global，保持 Draft；仅两地区 DEV 双语页面可访问，生产不得包含其页面、实现、裁剪 CSS 和专属许可资产。

## 唯一可用性来源

- [registry.ts](../src/tools/registry.ts) 的工具定义、`status` 和 `regions` 决定可用性：DEV 为当前地区 Draft + Published，生产为当前地区 Published。
- [validate-registry.ts](../src/tools/validate-registry.ts) 检查 ID/Slug、分类关系、地区、双语内容与可用 Loader。没有有效实现和静态说明不能伪造 Published 工具。
- [Astro/Vite 配置](../astro.config.mjs) 读取纯 Registry，由 [build-availability.ts](../src/tools/build-availability.ts) 为每个合法 ID 生成 `import.meta.env.T4F_TOOL_<ID 大写、连字符转下划线>_AVAILABLE`。值仅为 `published && regions.includes(region)` 的静态布尔投影；非法 ID、重复常量或非法发布配置会失败，不是独立发布设置。
- [loaders.ts](../src/tools/loaders.ts) 在每个字面量动态 import 前直接使用对应常量（DEV 保留开发入口），让 Vite 在依赖发现前消除不可用分支；不得改成运行时 flags 索引、动态路径或全量 glob 扫描。配置读取 Loader AST 检查每个显式分支对应自身 ID，防止复制错资格常量；不生成或改写 Loader。当前地区 Published 缺 Loader、双语短文案或静态内容必须失败；未登记的 Loader 也必须失败。不得增加发布 Store、开关、staging 或第二套路径。
- 正式工具自然进入当前地区路由、完整目录、适用的精选/手工角色/相关推荐与公开发现文件；精选排序或身份配置不能绕过发布门，也不强制所有工具出现在每个精选槽。

## 构建与部署隔离

- CN/Global 独立域名、缓存与 `dist/cn` / `dist/global`；同地区包含中英文，不把英文页面自动投向另一地区。
- Draft、Lab、目录 Fixture、实验代码及其专用资源不得泄漏到正式页面、发现文件或资源图。不可用工具的 Worker/WASM 也应排除；当前正式 Converter 所需资源则正常生成并按需请求。
- 私有依赖应通过可分析的源码导入链进入构建图，不放入会无条件复制的 `public/`。被合法 Published 工具实际使用的共享模块可以保留；不能只凭库名出现判定 Draft 泄漏。既有正式品牌、字体和授权文件不受此规则要求迁移。
- robots/Sitemap/llms 从实际公开页面生成，不用 robots 代替 Draft 隔离；不得用假页面、假链接填充空态。
- 构建产物不是上线证据，localhost HTTP 缓存不等于 CDN/公网 HTTPS 已验证。备案、DNS、CDN 和搜索平台操作均需独立授权。
- 未经维护者授权不修改发布分支、线上环境或部署服务，不自动合并、部署、创建 Release/Tag。

执行约束见 [playbook](../.agents/playbook.md)；资格审计保留 [L1/L2/L3 政策](../AGENTS.md#mvp-beta-release-policy-2026-10-10)，其中 L2 七项和维护者最终决定不能被状态字段替代。

权威验证：[静态资格/Loader 契约测试](../tests/build-availability.test.ts)、[Registry 测试](../tests/taxonomy.test.ts)、[地区/发现测试](../tests/discovery.test.mjs)、[夹具隔离测试](../tests/catalog-fixture.test.ts)、[实际静态产物守卫](../scripts/verify-build.mjs)。架构理由见 [ADR-0001](../docs/decisions/0001-static-regions-publication.md)。

多工具机制变更时，按需执行 `node scripts/verify-tool-fixture.mjs cn` / `global`：在仓库外 `../.validation/multi-tool-*` 复制源码，让配置与编译共用测试 Registry，验证地区组合、Draft/Published 转换、缺 Loader/内容失败、共享模块与真实 JS/CSS/Worker/WASM 链。普通工具文案、UI 或参数修改不要求重复这些构建；不新增 CI 矩阵，也不将夹具注册到真实产品。

## 构建图归属

- 固定 ToolRuntime 通过显式动态 Loader 到达工具入口，其静态依赖闭包不得包含工具实现。普通静态页面的增强脚本（含动态依赖）不得到达工具 Runtime 或实现；工具页仍只有一个 `client:load` 根。
- [专项夹具](../scripts/verify-tool-fixture.mjs) 使用 [测试专用探针](../tests/fixtures/build-graph.mjs) 记录 Vite 的输出模块、Chunk 导入及 CSS/资源信息；逐项核对工具 ID → 实际 Loader → 动态入口，不能仅靠资源总数判断 Loader 是否正确绑定。合法共享模块可以复用。
- Client 与 Worker 分别采集输出图；Worker URL 和 Worker 内的 WASM 引用必须与实际发出的文件对应。图与归属证据仅写在隔离验证目录，不进入真实配置或生产产物。它不替代浏览器执行、任意运行时拼接 URL 的追踪或移动端兼容验证。
- 专项反例先确认构建及原有静态守卫成功，再明确验证目标归属失败：提前静态引入 Published 实现、共享入口引入 Draft 依赖、互换两个 Published Loader（两套资源仍齐全）。保留升降级与地区私有资源排除检查，不关闭既有约束。
