# Changelog

记录重要功能、公开行为、兼容性与工程能力变化，不代替 Git 历史。普通文案、局部样式或测试夹具小修不要求逐条记录；重大架构取舍另见 [ADRs](docs/decisions/README.md)。

截至 2026-10-30，仓库没有 Git Tag 或 GitHub Release。`package.json` 的包版本和内部 V0.x 阶段名不是正式产品发布记录；源码 Published、静态构建就绪与实际部署分别管理。当前 CN/Global 均未部署，已有成果统一放在 Unreleased；今后依据真实 Tag/Release 整理版本段落，不追溯编造版本号或发布日期。

## Unreleased

### Added

- Astro SSG 双地区双语浏览器工具平台、静态信息页与统一主题/产品外壳。
- 首个且目前唯一源码 Published 的 Image Converter：PNG/JPEG/WebP/受限静态 AVIF 互转，批量/文件夹导入、预览、逐项下载和 ZIP。
- AVIF 单线程编码按需加载、独立预算与 Worker 生命周期；默认常见隐私元数据清理，受限 JPEG 作者/版权白名单保留。
- 真实 Registry 驱动的首页/导航/工具目录，以及双语 SEO、OG、Canonical/hreflang、Sitemap 和静态发现/安全文件。

### Changed

- E2-C 明确 Contract、Unit/Component、Build Artifact 与 Browser Smoke 的职责；专项夹具采集真实构建图并核对 Loader/资源归属，以成功构建后的反例识别提前加载、Draft 依赖泄漏和 Loader 互换，保持日常单 Job CI 不变。
- E2-B 将逐工具编译期资格统一由 Registry 生成，保留显式 Loader 与单一发布来源；隔离源码夹具验证多工具/多地区、私有 JS/Worker/WASM/CSS 排除、共享依赖和发布状态回退，构建守卫按真实地区 Registry 核对路由与目录。
- 完成 D2 源码资格审计，两地区正式静态产物与所需资源可构建；未执行线上部署。
- E1 将 README/AGENTS 整理为简洁入口，建立架构/工作流、四项稳定契约、两条既有决策 ADR 与统一文档索引；五份阶段长文完整归档，保留原路径当前说明和全部研究/验收数据。
