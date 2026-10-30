# 历史归档

本目录保存阶段设计、当时限制、纠偏和验收事实，不是当前执行合同。2026-10-30 E1 从 D2 基线 `d0c248d27566e1de141d6a5e598e8c600187f0bf` 迁入完整原文；只增加历史状态提示、修复移动后的相对引用，并注明从旧 README 承接的独有实验说明。原测试数字、日期、失败和未验事项不改写。

## 文件迁移

原路径重新建立当前说明。表中五份历史均保留原全文；相对文件引用随目录深度调整，原文内同页锚点保持原义。

| 原路径 / 现行入口 | 历史全文 |
| --- | --- |
| [foundation.md](../foundation.md) | [foundation-v0.1.md](foundation-v0.1.md) |
| [site-homepage.md](../site-homepage.md) | [site-homepage-v0.3-v0.6.md](site-homepage-v0.3-v0.6.md) |
| [tool-platform-image-foundation.md](../tool-platform-image-foundation.md) | [tool-platform-image-foundation-v0.4.md](tool-platform-image-foundation-v0.4.md) |
| [workbench-appearance.md](../workbench-appearance.md) | [workbench-appearance-v0.3-v0.6.md](workbench-appearance-v0.3-v0.6.md) |
| [image-converter-implementation.md](../image-converter-implementation.md) | [image-converter-v0.4-v0.6.md](image-converter-v0.4-v0.6.md) |

Evidence JSON、Research 数据和正式测试夹具仍在原目录；索引见 [docs/README](../README.md)。旧记录中仓库外 `.validation` / artifacts 是当时机器的工作目录，不伪装成可从 Git 下载的资料。

## 关键约束承接

整理前先按职责建立下列映射，避免仅把仍有效的规则埋进 History。表内代码/测试是事实来源，说明和契约是读取入口。

| 原 AGENTS / 长文中的约束 | 当前权威入口 | 主要可执行来源 |
| --- | --- | --- |
| SSG、React 固定入口、无全站业务 Store | [architecture](../../.agents/architecture.md)、[foundation](../foundation.md) | Astro 配置、ToolRuntime、contracts.test |
| DEV Draft+Published / 生产地区 Published、Loader 投影、Lab/Fixture 排除 | [publication](../../contracts/publication.md) | registry / validate-registry / loaders、taxonomy / catalog-fixture、verify-build |
| Region/Locale 分离、同源语言、地区外链和 Canonical/hreflang | [compatibility](../../contracts/compatibility.md)、ADR-0001 | region / locale / language、language / discovery 测试 |
| 静态 H1/Intro/Guide、长文不进客户端、OG/发现文件、首页 JSON-LD | [工具平台](../tool-platform-image-foundation.md)、[站点说明](../site-homepage.md) | tool-content、SiteLayout、verify-build |
| 三段静态脚本、首页/目录精确例外、禁止 Island/preload | [站点说明](../site-homepage.md#脚本seo-与资源审计) | SiteLayout / 各增强脚本、verify-build |
| 首页精选/手工角色、无假工具、真实素材、既有布局/动效不顺带重做 | [站点说明](../site-homepage.md)、[目录](../site-tools.md) | homepage-showcase / roles / catalog、相关测试 |
| Master 路径/眼睛/字标、ICO/PNG、字体/OFL、审核素材 | [视觉说明](../visual-foundation.md)、[upstream](../../contracts/upstream.md) | brand-assets / theme / visual-contrast、verify-build |
| 单完整 StyleX 主题、静态提取、FOUC/HMR 补丁 | [upstream](../../contracts/upstream.md)、[foundation](../foundation.md) | tokens / theme / stylex-dev-css、对应测试 |
| Canvas 视口/Overlay、Inspector 单实例、Form/Batch 自然流、wide 显式 opt-in | [工作区](../workbench-appearance.md) | WorkbenchShell / useCompact / form-tool-layout、workbench 测试 |
| 受控 UI、Provider、FileDropzone 不读文件、ScrollDock 隔离 | [UI](../ui-primitives.md)、[文件交互](../file-interactions.md)、工作区 | src/ui / document-scroll、组件测试 |
| 真实格式/方向/动画拒绝、有界解析、默认隐私/作者版权 | [image-processing](../../contracts/image-processing.md)、ADR-0002 | inspect / metadata / authorship / browser-codec、相关测试 |
| FIFO、取消、旧结果、URL/Bitmap、稳定命名、ZIP 快照 | [Converter](../image-converter-implementation.md)、图片契约 | session / serial-jobs / resources / delivery / zip、批次/交付测试 |
| 原生优先、AVIF 懒加载/独立预算/Worker、依赖许可与旧二进制风险 | [upstream](../../contracts/upstream.md)、Converter | limits / presets / avif-encoder / worker、AVIF 测试与 NOTICE |
| 完整 L1/L2 七项/L3、顺序验证、开发服务停止、分支与无自动部署 | [AGENTS 原锚点](../../AGENTS.md#mvp-beta-release-policy-2026-10-10)、[playbook](../../.agents/playbook.md) | package.json、既有 CI、dev.mjs |

具体颜色、时间轴和额度不在多个新文件各维护一份。尚未能自动断言的视觉冻结、真实素材保留、真实移动设备与 CDN 待验边界仍在对应当前模块明确说明，不因归档而失去入口。

## 参考与采用边界

E1 实际阅读了 [GoFurry](https://github.com/gofurry/gofurry-nav-site) 的 AGENTS、架构/工作流、契约、docs/ADR 索引、README 和 CHANGELOG，以及 [Agent Engineering Template](https://github.com/librecosta/agent-engineering-template) 的对应文件、Foundation Skill 和 compatibility/data/upstream 示例。

采用的是入口路由、来源优先级、结构/约束/流程/历史分工、可执行验证和仅为重大选择建立 ADR。Tool4Furry 的 SSG、双地区双语、Registry、StyleX、浏览器本地处理、隐私、资源及 L1/L2/L3 是本项目已有约束；没有复制 Go、Nuxt、数据库、多服务运维或模板目录，没有引入 Make/Task，也未复制 Skill。参考中的 data 契约用于理解职责，当前没有持久数据系统，因此不创建该契约。

## E1 迁移验收（2026-10-30）

- 逐份比对五份归档与 D2 原文：除归档提示和相对链接重定位外，完整正文保留；另承接原 README 独有 HSN-1 段落。L1/L2 七项/L3 原文及原锚点完整保留。
- 全仓 36 份 Markdown 的 362 个内部文件/锚点引用检查通过；13 份 Evidence/Research 数据文件与基线哈希一致，未删除样本或实测记录。检查使用仓库外临时脚本，无新检查依赖。
- `git diff --check` 通过；`pnpm check` 检查 230 文件，0 errors / warnings / hints。应用代码、测试逻辑、依赖、构建脚本及 CI 未修改。
- 纯文档 L1 未重跑全量 Vitest、双地区构建、编解码实验或浏览器/真机矩阵；既有 GitHub Actions 随推送自然执行。真实部署与既有上游维护待办仍未完成，不属于本次新验收。
