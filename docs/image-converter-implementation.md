# Image Converter · 当前实现

**V0.6-D2：首个且目前唯一的 Published 工具。CN/Global 均构建就绪，两个地区均未部署。** 真实状态见 [definition.ts](../src/tools/image-converter/definition.ts)；源码资格不等于部署授权。

| 地区 | 默认语言 | 另一语言 |
| --- | --- | --- |
| CN | `/tools/image-converter/`（中文） | `/en/tools/image-converter/` |
| Global | `/tools/image-converter/`（English） | `/zh/tools/image-converter/` |

## 已实现能力与边界

PNG/JPEG/WebP/受限静态 AVIF 双向转换；Quick 推荐自动执行与 Advanced 手动执行；多图/文件夹追加、独立预览/重试/移除/下载、稳定命名及 ZIP。用户文件在浏览器本地处理，不上传或持久保存。

不支持动画、GIF/BMP/HEIC/TIFF/SVG、裁剪缩放、专业色彩或完整元数据保全。AVIF 为经验证静态 8-bit SDR 子集，拒绝不能可靠判断的结构/方向/HDR/高位深；输出仅受支持桌面 profile，不以视口宽度判定设备。当前限额与参数引用下面源码，不从旧研究候选数值推定。

## 模块、参数与资源权威来源

| 模块 | 职责 / 权威代码 |
| --- | --- |
| 导入与设备预算 | [intake.ts](../src/tools/image-converter/intake.ts)、[limits.ts](../src/tools/image/limits.ts)；现有任务和本批均计入，不整批预解码 |
| 格式与方向检查 | [inspect-image.ts](../src/tools/image/inspect-image.ts)、[inspect-avif.ts](../src/tools/image/inspect-avif.ts)、[avif-sequence.ts](../src/tools/image/avif-sequence.ts)、[types.ts](../src/tools/image/types.ts) |
| 原生与输出复检 | [browser-codec.ts](../src/tools/image/browser-codec.ts)；真实能力检测、JPEG 背景、格式/尺寸/完整回解码 |
| 隐私与白名单 | [metadata.ts](../src/tools/image/metadata.ts)、[authorship.ts](../src/tools/image/authorship.ts)；有界无损清理与受控字段写回 |
| AVIF | [avif-encoder.ts](../src/tools/image/avif-encoder.ts)、[avif.worker.ts](../src/tools/image/avif.worker.ts)；固定 ST encoder、独立哈希资源、Transferable、超时/取消/空闲/高水位回收 |
| 任务与推荐 | [session.ts](../src/tools/image-converter/session.ts)、[serial-jobs.ts](../src/tools/image-converter/serial-jobs.ts)、[presets.ts](../src/tools/image-converter/presets.ts)；FIFO、任务/设置/请求版本及模式偏好 |
| 交付 | [delivery.ts](../src/tools/image-converter/delivery.ts)、[zip.ts](../src/tools/image-converter/zip.ts)、[file-naming.ts](../src/tools/file-naming.ts)；有效结果、快照、命名、打包预算 |
| 资源与预览 | [resources.ts](../src/tools/image/resources.ts)、[use-owned-url.ts](../src/tools/image-converter/use-owned-url.ts)、[ConverterTaskRow](../src/tools/image-converter/ConverterTaskRow.tsx)；每任务 URL/Bitmap/Canvas 所有权 |
| UI 与文案 | [ImageConverter](../src/tools/image-converter/ImageConverter.tsx)、[messages.ts](../src/tools/image-converter/messages.ts)、[静态 SEO 内容](../src/site/image-converter-content.ts)；不将长文导入客户端 |

`limits.ts` 是桌面/移动、原生/AVIF、输入累计预算的数值来源；`presets.ts`、Worker 固定设置与测试是质量/速度/色度/Alpha 的来源。UI、编码前、Worker 和输出检查共享这些约束，不复制另一份数字配置，不自动缩小/换格式凑成功。

## 核心不变量

- [图片处理契约](../contracts/image-processing.md) 定义真实输出、方向一次、默认 `privacy-v1`、受限 `author-rights-v1` 及不支持边界。
- PNG/JPEG/WebP Quick 同格式经验证后直通或无损清理，无法安全理解则拒绝，允许主动 Advanced；AVIF 同格式仍重编码。默认移除常见来源隐私信息，不承诺全部隐私或像素信息清除。
- 作者/版权仅 JPEG 来源到 JPEG/PNG/WebP 的 Artist/Copyright 白名单，标准编码与长度受限；保留时仍按实际质量编码、清理、写回、最终复检，不复制 GPS/设备/时间/旧 Orientation。
- 实际元数据策略、AVIF 色度、质量/背景等参与有效设置与结果契约；切换策略或编码设置立即失效，名称编辑不编码。无有效策略变化的普通模式切换不产生多余编码。
- 单通道串行；原生操作不可硬取消时保持占用至结束，Worker 超时/取消真实终止并重建。删除/清空/跨批次晚到结果只清理，不能复活任务。
- 每项 ready 下载独立，不被其他任务导入/处理中暂时禁用；ZIP 只包含全部任务已终结时的有效成功结果，允许明确部分失败，不空打包、不混入旧版本。打包中修改批次/参数/标签使快照失效。
- 缩略图只反映原图，按需打开预览；关闭不能撤销仍被列表使用的源 URL。移除/清空/卸载及时释放，公共列表和预览外壳不管理资源业务。

布局入口见 [工作区说明](workbench-appearance.md)：未导入紧凑 Form，导入后显式 wide；只切换 class，不重置任务/参数/结果。静态 4 步骤、4 限制、6 FAQ 与 SEO 为已审核内容，不在普通重构中重新拟稿。

## 验证与安全维护

- 容器/方向/限额：[image-inspector](../tests/image-inspector.test.ts)、[avif-inspector](../tests/avif-inspector.test.ts)、[image-limits](../tests/image-limits.test.ts)。
- 默认清理与作者：[image-metadata](../tests/image-metadata.test.ts)、[image-authorship](../tests/image-authorship.test.ts)、[converter-authorship](../tests/converter-authorship.test.ts)、[metadata-delivery](../tests/converter-metadata-delivery.test.ts)。
- 编码/任务/交付：browser-codec、avif-worker/encoder/session、converter-session/batch/intake/delivery、ZIP/UI/预览等现有测试。
- 静态发布形态：[verify-build.mjs](../scripts/verify-build.mjs) 检查两地区本地化页面、完整静态 4/4/6、Canonical/hreflang/OG/Sitemap、客户端长文隔离、唯一 ST 资源与 NOTICE。旧 Converter CN-only 发布模拟脚本已退役，通用 Registry/工具夹具仍保留。

固定 jSquash 及旧底层二进制的安全/许可边界见 [upstream](../contracts/upstream.md)。D2 没有确认当前编码路径的严重阻断，不等于全量安全证明；构建依赖告警的原结论保留在历史审计，本轮不升级依赖或重测编码器。

## 已入库证据与待验事项

- [D2 资格审计全文](history/image-converter-v0.4-v0.6.md#v06-d2--beta-资格审计) / [结构化证据](evidence/image-converter-d2.json)：真实两地区静态站及 Chromium 导航、格式转换、隐私、预览、下载与 ZIP；非公网验收。
- [C2-C](evidence/image-avif-c2c.json) / [C2-D](evidence/image-avif-c2d.json)：四格式组合、宽幅预算、方向、作者/版权、Worker 取消和受控高分辨率研究；高额度候选不自动获准。
- [C2-B](evidence/image-metadata-c2b.json)、[C2-A 研究](research/image-codec-c2a.md)、[C1 研究](research/image-codec-evaluation.md)：默认清理及原始选型事实，不改写当时结论。

未完成实际部署、备案/DNS/CDN/HTTPS、搜索平台提交/收录、Firefox/Safari 与 iOS/Android 真机完整兼容性及可靠进程总峰值内存评估。本地 HTTP 缓存不等于真实 CDN 缓存；Chromium 手机视口不等于移动 AVIF 安全。按 [L3](../AGENTS.md#mvp-beta-release-policy-2026-10-10) 跟进，不借文档治理扩展格式或提升额度。

[完整 V0.4–V0.6 历史](history/image-converter-v0.4-v0.6.md) 保留各阶段设计、数值、失败、证据和验收记录；新工作不以旧 Draft/CN-only/三格式描述覆盖当前源码。
