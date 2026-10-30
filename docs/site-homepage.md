# 首页与站点外壳 · 当前说明

当前静态首页、目录、信息页和工具页共用地区/语言/主题与品牌机制。Image Converter 已 Published，CN/Global 均构建就绪但均未部署；没有填充产品、伪造素材或对公网服务的声明。

## 模块与内容所有权

| 入口 | 所有者 |
| --- | --- |
| [首页模板](../src/pages/[...locale]/index.astro) | 五区 Astro 编排，不成为全站 React 应用 |
| [components/home](../src/components/home/) | Hero、精选、角色、社群/理念/图文故事及技术终章 |
| [catalog.ts](../src/site/catalog.ts) / [homepage-showcase.ts](../src/site/homepage-showcase.ts) | 精选顺序与展示投影 / 手工角色 toolIds、可替换本地素材与有效媒体检查 |
| [i18n/messages.ts](../src/i18n/messages.ts) | 已审核双语首页正文；不借重构自行改写 |
| [home-community.ts](../src/site/home-community.ts) | Region 决定真实社群/支持平台，Locale 决定文案 |
| [homepage.ts](../src/styles/homepage.ts)、`home-pillars.ts`、`home-community.ts` | 当前几何、局部样式与既有动效时间轴 |

首页保留 `section#tools` 兼容锚点，Hero CTA 始终进入本地区/语言 `/tools/`。首页最多四项真实精选；导航沿用同一精选排序与自己的上限，不另造工具表。六角色手工 toolIds 经地区/状态过滤、去重并限量，不自动按分类分配或补足虚构项。角色插画有真实素材才显示，3:4、底对齐、手机隐藏；工具列表独立从左上按行排列，身份 Icon 与简介左缘一致。精选可选左侧插画是正常 Grid 列，不用绝对定位/负偏移制造空白列。

## 品牌、Header、Footer 与主题

- 已审核 [双兽首 Master](../public/brand/tool4furry-symbol.svg) 保留路径、两眼与负空间；Header/Footer/React 导航使用一个图形和一份字标，不重绘、不重复名称。正式横向字标为路径，Favicon 使用 ICO/PNG。源稿、正式 OG、字体和授权见 [视觉说明](visual-foundation.md)。
- Astro 静态导航与 React ToolPageFrame 共用样式/控制语义，普通工具只出现一个产品导航；Canvas 保留浮动入口。移动端保留非交互账户位，隐藏顶部 GitHub；不伪造登录。
- 精选面板保持原生 details、真实工具链接、Hover/Click/键盘与安全退出；现有面板/Chevron/主题揭幕时长以导航样式和控制脚本为准，不为文档治理改动。
- Footer 是静态三段品牌/GitHub、真实分组链接、法务/许可/版权。合规行位于最终版权行上方，CN ICP/公安左右展示与窄屏换行由 [compliance.ts](../src/config/compliance.ts) 控制；仅 CN DEV 可显示明确位置提示，生产只显示真实配置，Global 不继承中国备案。不编造许可或不存在的页面。
- 根主题为现有 Neutral Light / GoFurry Dark，完整原生 StyleX 主题、默认 Dark，head 同步恢复手动偏好。当前语言/外观状态与实际一致，存储不可用仍可本页切换，跨标签同步。语言同源，Footer 地区外链才携带受控一次性主题信息；无全局 React Provider。
- 全站双侧 CSS 点阵固定在视口而非随文档移动；Canvas/沉浸 Lab 排除，Hero/导航/Footer 保留自身背景，不随局部任务重做。

Footer 唯一例外是 [目录工作台](site-tools.md)：固定视口，无 Footer/合规行/文档滚动球。Canvas 保留完整视口，Footer 位于其后正常文档流。

## 五区视觉与渐进增强

1. **Hero**：审核文案/五层 CSS Reveal、固定 Tag Wavefield v1.0.0 移植与真实 AVIF poster。GPU 首帧成功才淡入；不支持、初始化失败/丢设备、Reduced Motion/Save-Data 等按既有策略静态降级。静态/动态裁切共锚点，手机最小尺度后裁切；每次完整进入一个安全随机 Seed，resize/主题/恢复不重抽，提交有上限。`src/visuals/wavefield/` 与旧 HSN-1 Lab 无依赖。
2. **精选与角色**：Phosphor Regular、真实 Registry 条目，无封面带、假工具或无意义几何占位；素材槽未来替换能力保留。
3. **社群与理念**：CN 的 QQ/Telegram/GoFurry 爱发电，Global 的 Discord/Telegram/GoFurry Ko-fi；使用批准的 QR/Logo 原文件和真实链接。三栏标题嵌入封顶线，01/02/03、环绕图标正文、桌面斜线/单列隐藏，不新增账户/支付功能。
4. **图文故事**：两张 Luminous 5:4 原始 AVIF，柔边矩形且不可原生拖动；大屏并排共享标题/正文/链接基线，中屏交错，手机文字优先。双语文案与链接由维护者冻结。
5. **技术与工程**：现有顶部对齐 35:65 双栏、英文标题局部字号、中文英文副标题、两段正文及唯一 GitHub 链接；桌面链接在左，手机「标题→正文→链接」。局部实/虚线角标及现有 Reveal 保持，不恢复旧占位图或三个链接。

具体像素/时间以源码与测试为准；历史中未覆盖后续微调的数值不能当作当前指令。Pillars、Stories、Principles 的一次性 IO 分别负责自己的区域：成功注册后才将视口下方内容 pending，进入后解除观察；静态/无 JS/不支持/Reduced Motion/已可见恢复直接显示，提前焦点、异常或 pagehide 收束。不能等待 JS 才生成文本或用隐藏整页掩盖初始化。

## 脚本、SEO 与资源审计

普通静态页只有三个精确审核的执行脚本：head `t4f-appearance`，body `t4f-navigation`、`t4f-document-scroll`。首页仅额外允许三个独立 Reveal 内联脚本 `t4f-home-pillars` / `t4f-home-stories` / `t4f-home-principles` 和一个独立 Wavefield 增强模块；目录单独允许一个 route-local controller 替代文档滚动增强。精确数量、顺序、源码与页面例外以 [verify-build.mjs](../scripts/verify-build.mjs) 为准，不删除守卫放行新脚本。无首页 Island、无无关 JS bundle/preload。

`application/ld+json` 为静态数据：仅各地区默认语言根首页一个最小 WebSite，URL 从 Region 生成；不放进执行脚本计数，也不扩大到软件/评分/FAQ 等类型。可索引页用同地区 self-canonical、双语绝对 hreflang、真实页面 Title/Description 的 OG 及品牌 PNG；noindex 不推广。robots、Sitemap、security、llms 由 [discovery.ts](../src/site/discovery.ts) 等现有静态端点生成，仅列公开页面。

DocumentScrollDock 只控制根文档，复用 `scroll-metrics.js`；Footer 可见/模态打开时让位，Canvas/Lab/目录排除。内部滚动条与原生滚轮/键盘/触控不改成画布控制。

验证入口：[homepage-showcase](../tests/homepage-showcase.test.ts)、[home-community](../tests/home-community.test.ts)、[appearance-controller](../tests/appearance-controller.test.mjs)、[navigation-disclosure](../tests/navigation-disclosure.test.mjs)、三个 Reveal 测试、主题/对比度/品牌/合规/发现测试，以及实际产物守卫。该入口不代表本轮重新执行所有验收。

## 历史与未验项

[完整 V0.3–V0.6 历史](history/site-homepage-v0.3-v0.6.md) 保留设计纠偏、审核来源、当时动效/素材参数、浏览器验收和旧 SEO/零脚本状态。当前搜索平台、真实域名 HTTPS/CDN、外部邀请/二维码实际加入及移动/跨浏览器覆盖不能从本地静态构建推定，仍需对应环境人工确认。
