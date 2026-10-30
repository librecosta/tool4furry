# 上游依赖契约

只记录实际影响兼容性和维护的边界；版本以 [package.json](../package.json) / [pnpm-lock.yaml](../pnpm-lock.yaml) 为准，不复制整份依赖表。

| 上游 | 实际依赖与假设 | 验证入口 |
| --- | --- | --- |
| 浏览器原生编解码 | PNG/JPEG/WebP 原生优先；能显示不等于能编码，非空 toBlob 不等于所请求格式；检查实际输出和能力失败 | `browser-codec.ts`、`inspect-image.ts`、`inspect-avif.ts` 及真实浏览器证据 |
| Astro / React | SSG 正文与固定 Island 边界；无 SSR 服务，动态工具在 ToolRuntime 内懒加载 | `astro.config.mjs`、`ToolRuntime.tsx`、静态产物守卫 |
| StyleX unplugin | 原生 defineVars/createTheme，完整主题覆盖，生产静态 CSS，关闭运行时注入；Astro 使用编译样式 | `src/styles/`、主题与 StyleX 测试、产物 CSS |
| jSquash AVIF | 固定单线程 encoder 与独立哈希 WASM，只接受受限 RGBA/参数；不分发包内 decoder 或多线程变体 | `avif-encoder.ts`、`avif.worker.ts`、AVIF 检查/测试与 NOTICE |
| Base UI / fflate | 弹层键盘/焦点/Portal 与按需 ZIP；资源和快照责任仍归工具，不由库替代业务校验 | UI、预览、ZIP 相关测试 |

## StyleX 开发兼容补丁

保留 `devMode: 'css-only'`、`runtimeInjection: false`、Layout 的阻塞虚拟 CSS link 与 [stylex-dev-css.ts](../src/styles/stylex-dev-css.ts)。现有证据定位为活动样式表重载空窗：替代表 load 成功才移除旧表，失败保留旧表，连续更新只接受最新响应。不可只凭上游 Issue 推断当前根因，不通过隐藏整页或延迟显示掩盖 FOUC。

由 [Tool4Furry #1](https://github.com/librecosta/tool4furry/issues/1) 跟踪。仅在上游等价修复经冷启动首帧、HMR 与生产提取验证后，才考虑移除本地兼容模块；不在普通视觉任务中顺带升级 StyleX。原始证据见 [历史基础记录](../docs/history/foundation-v0.1.md)。

## 许可与安全维护

- 项目自有代码采用 [BSD-3-Clause](../LICENSE)；第三方组件保持各自条款，不能用项目许可证替代。
- 自托管字体授权保留于 [DM Sans OFL](../public/licenses/dm-sans-OFL.txt)、[Noto Sans SC OFL](../public/licenses/noto-sans-sc-OFL.txt)；滚动参考许可见 [gopher-atlas.txt](../public/licenses/gopher-atlas.txt)。
- AVIF [avif.NOTICE.txt](../src/tools/image/avif.NOTICE.txt) 保留 wrapper 的 Apache-2.0、libavif/libaom 许可与专利声明，随实际资源交付。Wavefield 来源/修改及 BSD 通知见 [NOTICE](../src/visuals/wavefield/NOTICE.md)。品牌及正式素材来源见 [视觉说明](../docs/visual-foundation.md)。
- Wavefield NOTICE 同时保留参考场景/设计授权尚未独立确认的来源边界；自有代码的 BSD 和 Motion 包的 MIT 不能被描述为替第三方设计授权。文档整理不将该既有待核验事项改写为已解决。
- 已固定的 AVIF 二进制包含旧底层编码组件；npm audit 不覆盖 WASM 内 C++。D2 没有确认当前受限单帧编码入口可达的严重阻断路径，**不等于无漏洞证明**。新通告须结合 wrapper、启用参数、二进制版本和可达路径评估；明确可触发的严重问题阻止交付。
- D2 对构建依赖审计的告警和当时判断保留于 [历史审计](../docs/history/image-converter-v0.4-v0.6.md)；本文不把该次检查称作持续有效的全量安全结论，也不自行升级依赖。

## 升级与部署假设

重要依赖升级先检查上游变更/许可与实际适配边界，再验证受影响真实输出、取消/失败、内存/缓存和静态资源隔离；主题/框架升级验证首帧、Portal 与 HMR。重大依赖方向变化才考虑 ADR。

当前资源以静态 URL 交付，加载失败明确报错且不无限重试或偷偷换格式。不增加 COOP/COEP、多线程或缓存系统作为隐含要求。本地 HTTP MIME/哈希/304 证据不能推导 EdgeOne/Cloudflare 等 CDN 已通过；真实 CDN、HTTPS、缓存与托管单文件限制待部署时独立确认。
