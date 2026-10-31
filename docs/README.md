# 文档导航

当前状态：V0.7-A1-D2 已完成 Image Resize & Crop Beta 资格审计，A1 首版收尾。Image Converter 与 Image Resize & Crop 均为 Published；CN/Global 均可生成双语静态站点，**两个地区均未线上部署**。

来源优先级统一见 [AGENTS — Sources of Truth](../AGENTS.md#sources-of-truth)。当前源码与行为测试优先于说明；历史中的 Draft、三格式、旧配色和零工具结论不能覆盖后续实现。按任务范围阅读，不需要通读所有历史。

## Current · 当前说明

- [架构](../.agents/architecture.md)：系统分层、依赖方向与非目标。
- [工作流](../.agents/playbook.md)：实际 pnpm 命令、风险分级验证、提交边界。
- [工程基础](foundation.md)：StyleX 集成、静态页面与构建审计入口。
- [工具平台](tool-platform-image-foundation.md)：Registry、Loader、静态工具内容与新增工具边界。
- [工作区](workbench-appearance.md)：Canvas/Form/Batch 布局及状态所有权。
- [首页与站点外壳](site-homepage.md)：静态首页、导航、品牌、主题与受控增强。
- [Image Converter](image-converter-implementation.md)：正式工具分层、隐私、任务、资源及证据入口。
- [Palette Extractor](palette-extractor.md)：第三款双语 Draft 的有界提色、编辑、分享模板与验收边界。
- [Image Resize & Crop](image-resize-crop-implementation.md)：逐文件单图草稿、批量规则、串行导出、ZIP、D2 Beta 资格与人工验收入口。
- [工具目录](site-tools.md)：当前目录筛选、URL、分页及显式 DEV 夹具。
- [UI 原语](ui-primitives.md)：受控组件接口；附早期验收记录。
- [文件交互](file-interactions.md)：FileDropzone 与滚动原语边界；附历史验收。
- [视觉基础](visual-foundation.md)：当前主题/品牌入口与历代视觉变更；色值以源码为准。

## Contracts · 稳定约束

- [兼容性](../contracts/compatibility.md)：路径、地区语言和可观察行为。
- [发布](../contracts/publication.md)：Draft、Published、正式构建与部署的边界。
- [图片处理](../contracts/image-processing.md)：本地处理、输出真实性、隐私和资源责任。
- [上游](../contracts/upstream.md)：浏览器、框架、编解码依赖与许可维护。

## Decisions · 架构决策

[ADR 索引与写作规则](decisions/README.md)：仅记录长期架构选择及权衡，当前整理两条已确立决策。

## Research · 研究

- [原生能力研究](image-processing-capabilities.md)：V0.4 时期的实测与兼容性待办，不代表当前发布状态。
- [编解码器评估](research/image-codec-evaluation.md) / [原始数据](research/image-codec-evaluation.data.json)：C1 原生与 WASM 对照。
- [AVIF 质量与元数据](research/image-codec-c2a.md) / [原始数据](research/image-codec-c2a.data.json)：C2-A 研究，后续落地见当前 Converter 说明。
- [浏览器图形研究](research/webgpu-3dgs-browser-graphics-2026-10.md)：技术储备，不能据此宣称已实现产品功能。

## Evidence · 实测与验收证据

- [Palette A2-B](evidence/palette-a2b.json)：Draft 的有界提色、分享 PNG 下载、Chromium 交互及双地区资源隔离；真机触控与系统分享投递尚未验证。
- [D2 正式资格审计](evidence/image-converter-d2.json)：两地区本地产物、真实 Chromium 用户路径和下载核验。
- [C2-D](evidence/image-avif-c2d.json)、[C2-C](evidence/image-avif-c2c.json)、[C2-B](evidence/image-metadata-c2b.json)：AVIF、作者版权和默认隐私的阶段实测。
- [早期原生能力](evidence/image-capabilities-chromium.json)、[V0.4-B 原始记录目录](evidence/converter-v04b/)：保留当时条件和结论。
- [正式测试夹具说明](../tests/fixtures/images/README.md)：可入库的小型样本及来源，不能当作公开工具。

证据只证明记录中的环境与用例。仓库外 `.validation` / artifacts 的原始文件可能仅在原测试机器存在；不承诺全新检出即可复现实验环境，不将视口模拟当作手机真机。

## History · 归档与迁移

[历史索引及约束承接表](history/README.md) 保留完整阶段设计、当时数值和验收事实。原路径继续提供简洁的当前说明：

| 原路径 / 新的当前说明 | 完整历史归档 | 当前承接重点 |
| --- | --- | --- |
| [foundation.md](foundation.md) | [foundation-v0.1.md](history/foundation-v0.1.md) | SSG/StyleX 与验证入口 |
| [site-homepage.md](site-homepage.md) | [site-homepage-v0.3-v0.6.md](history/site-homepage-v0.3-v0.6.md) | 品牌、首页与脚本审计 |
| [tool-platform-image-foundation.md](tool-platform-image-foundation.md) | [tool-platform-image-foundation-v0.4.md](history/tool-platform-image-foundation-v0.4.md) | 发布、内容和工具依赖边界 |
| [workbench-appearance.md](workbench-appearance.md) | [workbench-appearance-v0.3-v0.6.md](history/workbench-appearance-v0.3-v0.6.md) | 可选工作区布局与单实例状态 |
| [image-converter-implementation.md](image-converter-implementation.md) | [image-converter-v0.4-v0.6.md](history/image-converter-v0.4-v0.6.md) | 图片安全、任务、元数据与 D2 证据 |

主要变更见 [CHANGELOG](../CHANGELOG.md)；Git 保留逐次修改历史。
