# B19-D1 代码分享图验收

在仓库运行 `pnpm dev` 后打开 [CN 中文](http://127.0.0.1:4321/tools/code-image-generator/) 或 [Global 英文](http://127.0.0.1:4322/tools/code-image-generator/)。工具保持 Draft。

## 工作区与作品

| Chromium 场景 | 工作区截图 |
| --- | --- |
| CN 中文 Dark，1280 × 1000 | [桌面](cn-desktop-dark.png) |
| Global 英文 Light，390 × 844 | [手机模拟视口](global-mobile-light.png) |
| CN 中文 Light，920 × 850 | [窄桌面](cn-narrow-light.png) |

- [八套艺术预设](art-presets.png) 由 Midnight、Glacier、Sunset、Forest、Paper、Aurora、Monochrome 和 Lavender 的实际 PNG 下载组成。工作区缩略图使用这些真实输出的 WebP 缩图。
- [十二套语法主题](syntax-themes.png) 使用相同内容和背景，便于对照代码本身的着色。[三种窗口装饰](window-styles.png) 展示 macOS、Windows 和 Minimal。
- [中文、Emoji、Tab、换行与差异标记](unicode-lines.png)、[透明背景](transparent.png) 和 [本地图片背景](local-background.png) 均来自实际下载。

## 交互和实际输出

Chromium 156.0.8078.4 覆盖两个 DEV 地区。三个视口均无整页横向溢出和页面脚本异常。实测编辑区切换后撤销、双击进入编辑、适应画布、100% 查看、全屏、文件导入、主题与字体切换、标记及输出。中文文件名导入后仍用于下载。超出画布预算的 1,800 行、超过 20,000 代码单元的源码仍可整段复制。

| 项目 | 实际验收 |
| --- | --- |
| 位图 | PNG、JPEG、WebP 均可独立解码，默认 2× 为 972 × 734。测试了 PNG 透明通道、JPEG 白底，以及 640 × 420 自定义画布按 4× 输出 2560 × 1680。实际导出 8000 × 5000 的 40 MP PNG。 |
| SVG | XML 可独立解析，默认逻辑尺寸为 486 × 367，保留文字和几何。含尖括号、引号和脚本字样的源码按文字显示。三种内嵌字体的 SVG 均在离线 Chromium 中绘制，按 2× 与对应 PNG 对比，RGBA 平均每通道差值约 0.13–0.14（0–255）。本地图像示例仅将背景图内嵌为位图。 |
| 预览与复制 | 默认 2× 预览 Canvas 的 PNG 字节与下载一致。剪贴板可读取并解码 972 × 734 的 `image/png`，源码复制与编辑文本一致。 |
| 文件名 | 固定浏览器本地毫秒下，连续两次点击生成 `greet-20261126-225530-128.png` 与 `greet-20261126-225530-128-2.png`。JPEG 使用 `.jpg`。 |

默认作品原始下载样本可直接打开 [PNG](exports/greet.png)、[SVG](exports/greet.svg)、[JPEG](exports/greet.jpg) 与 [WebP](exports/greet.webp)。[浏览器记录](chromium.json) 保存浏览器版本、视口、Worker 请求、下载文件名及像素对照数据。[独立文件复检](file-checks.json) 由 Pillow 与 Python ElementTree 验证 41 件真实下载的格式、尺寸、内容和 SHA-256。

## 依赖与隔离

- Shiki 4.6.0 使用 JavaScript 正则引擎。23 种高亮语言、纯文本及 12 套语法主题使用显式按需加载。首屏仅请求当前使用的主题与字体。C++ 使用同版本 Shiki 的锁定语法来源 `tm-grammars@1.32.22`，载入 C++ 及宏规则。
- JetBrains Mono、Fira Code 和 IBM Plex Mono 来自 Fontsource 5.3.0。字体、语法、主题和运行时的完整许可及来源见 [工具 NOTICE](../../../src/tools/code-image-generator/code-image.NOTICE.txt)。CodeMirror 继续复用[已有许可证](../../../src/ui/text-editor/codemirror.NOTICE.txt)。
- 渲染使用 40 万 UTF-16 代码单元高亮预算，文件导入预算为 12 MiB，位图单边最多 8192px、40 MP。浏览器不支持图片复制或 WebP 编码时，对应操作按能力隐藏或禁用。含非 ASCII 文字或系统字体的作品可导出位图。

`pnpm check` 通过，制图、工作区、共享编辑器、图像交付、样式及发布契约共 98 项定向测试通过。`pnpm build:cn` 与 `pnpm build:global` 均通过实际产物守卫。每个地区输出 48 个工具详情页，均无代码分享图路由、专属 Worker、Shiki chunk、编程字体、预设图或样式。

本轮的浏览器记录来自 Chromium 和手机模拟视口。Safari、Firefox、移动真机、操作系统间的 Emoji 外观，以及不同设备对最大图片的资源消耗尚未复核。作品留白、阴影和代码可读性待维护者视觉验收。

## 两层本地图片复核

Chromium 实测 CN 中文深色 1280px 和 Global 英文浅色 390px 模拟视口。覆盖画布导入入口、损坏图片后重试、替换失败保留原图、原图比例和手动比例、完整显示与铺满裁切、数字定位、鼠标和触摸拖动、两层独立设置及重置。600 × 800 的背景图在自动模式生成 486 × 648 的逻辑画布，保留 3:4 比例。

画布导入按钮在普通及悬停状态下的实际边框宽度均为 0。验证窗口底色默认开启和 100% 不透明，导入的窗口图片默认以 40% 叠加，独立开关可以恢复各自的不透明度。以 60% 底色、50% 图片导出时，重新解码的 PNG 与 SVG 在同一测试点均为 RGBA `68, 114, 115, 255`，JPEG 和 WebP 每通道相差最多 1。SVG 包含两张内嵌图片、圆角剪裁及两层不透明度，相关资源使用数据 URL。另复核文件 MIME、位图签名及输出尺寸。两个视口无整页横向溢出或页面脚本异常。

`pnpm check` 无诊断，64 项制图、工作区、数字输入和图片相关定向测试通过。

## 共享创意素材库

Creative Collection · Vol. 01 导入 23 张 AVIF、23 张 WebP 缩略图及原始 Catalog。47 个文件与提供的 ZIP 逐字节一致。AVIF 共 8,765,275 B，WebP 共 400,410 B，图片合计 9,165,685 B（8.74 MiB）。资产测试独立核对文件数量、分类、路径、编码、尺寸和高清文件的 SHA-256。Catalog 保留随包提供的来源记录，素材署名及许可尚未独立核验。

- [中文深色桌面选择器](creative-picker-cn.jpg) · [英文浅色 390px 选择器](creative-picker-global.jpg)
- [仅画布使用内置素材](creative-canvas.jpg) · [仅窗口使用内置素材](creative-window.jpg) · [双素材组合](creative-dual.jpg) · [实际下载的 PNG](creative-export.png)

Chromium 156 的两个验收视口均确认首页、图片格式转换和代码分享图初始状态的素材请求为 0。打开选择器时记录 23 次 WebP 请求，筛选、待选及取消均未触发高清请求。首次确认仅请求翡翠极光 AVIF。覆盖六类筛选、恢复当前选中项、Escape 和取消、键盘焦点恢复、内置与本地互换及独立缩放。桌面拦截一次 AVIF 请求返回 503，旧图保留。故意延迟的请求在更换素材时被取消，另一个背景保留自身结果。

| 实际交付 | 验收 |
| --- | --- |
| PNG、JPEG、WebP | 2× 输出为 1304 × 734，复核 MIME、文件签名和透明 PNG 的 alpha |
| SVG | 652 × 367，包含两张数据 URL 图片、圆角剪裁和 40% 窗口图片不透明度，离线重新解码时无 HTTP 请求 |
| PNG 剪贴板 | 两个视口均通过浏览器剪贴板 API 读回 1304 × 734 的 PNG 并复检采样像素 |

在五个相同相对坐标，PNG 与预览 Canvas 的采样像素一致。SVG、JPEG、WebP 的最大单通道差值分别为 5、8、9（0–255）。[网络与输出记录](creative-browser.json)

`pnpm check` 与 93 项定向测试通过。CN/Global 各输出 48 个工具详情页。对正式产物的文件哈希、路由和选择器实现扫描均为 0 命中。Code Image Generator 继续保持 Draft，当前环境覆盖 Chromium，Firefox、Safari 和移动真机留待复核。

## B19-D2 发布复核

最新工作区以 `8ebb68a` 为基础。指定参考提交 `328bf98` 和最新基线 `8ebb68a` 对应的 CI 均已通过。窗口阴影默认纵向偏移为 5 px，横向为 0 px。[指定参考 CI](https://github.com/librecosta/tool4furry/actions/runs/45980235561) · [最新基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45980673690)

### 素材交付权限

维护者确认素材按 Pixabay 通用许可取得。原 ZIP 和 Catalog 保留 23 项原始文件名、尺寸、哈希与处理记录，未附逐图源页、再分发许可或额外授权。两个素材 `pastel-spectrum` 和 `apricot-gradient` 的文件名无法定位原始作品。可由文件名追溯的示例 `winter-wolf` 对应 colfelly 的 Pixabay 作品 1992716，官方页面显示 2017 年 1 月 19 日发布。单一作品的发布记录不能作为整套素材的授权依据。[Pixabay 作品页](https://pixabay.com/photos/wolf-howling-animal-wild-nature-1992716/)

Pixabay 第 4 节说明 2019 年 1 月 9 日之前发布的内容适用 CC0 规则，第 5 节的通用许可限制独立分发基本保持原样的内容，并把仅缩放或裁切列为独立使用。作品内的合成使用与分发独立素材文件分别适用条款中的条件。首批素材的 AVIF 和 WebP 以基本相同的构图单独交付，格式转换和缩略图缩放不足以确认整套素材的再分发权限。Registry 仍为 Draft。Catalog、素材字节及历史保持原样，未补写许可证标签。[Pixabay 完整条款](https://pixabay.com/service/terms/)

### 构建与浏览器验收

以工作区当前 Registry 构建的 CN、Global 正式产物各有 48 个工具详情页，创意图片、选择器和代码分享图路由均为 0。另外在 Git 忽略目录中复制源码，仅将代码分享图设为 Published，生成两地区供本机验收的候选产物。两地区各有 50 个工具详情页。四个候选页面核对静态 Title、Description、唯一 H1、像素图标、四项步骤、六项限制及四组 FAQ，并验证 Canonical、hreflang、OG/Twitter、Sitemap、llms.txt、目录与相关推荐。

| 产物 | 工具详情页 | 静态文件数 | 静态文件总字节 |
| --- | ---: | ---: | ---: |
| CN 正式 | 48 | 692 | 27,816,471 |
| Global 正式 | 48 | 692 | 27,796,894 |
| CN 本地候选 | 50 | 834 | 40,476,048 |
| Global 本地候选 | 50 | 834 | 40,455,777 |

每个本地候选均输出 23 张 AVIF（8,765,275 B）和 23 张 WebP（400,410 B），均与 Catalog 对应的仓库文件逐字节相同。最大素材为 `golden-clouds` AVIF（833,513 B）。全站最大单文件为既有 3,485,872 B WASM。文件数和最大单文件低于 Cloudflare Workers Static Assets 与 EdgeOne Makers 公布的限额。两地区实际 CDN 响应头、缓存与线上分发留待部署验证。[Cloudflare 限额](https://developers.cloudflare.com/workers/platform/limits/) · [EdgeOne 限额](https://edgeone.ai/document/211893332490612736)

Chromium 156 在 CN 中文 Dark 1280px 桌面及 Global 英文 Light 390px 模拟视口操作候选产物。覆盖英文示例、源码导入和编辑、语言、主题、预设、Fira Code 字体、重点行和窗口样式、全屏、阴影两轴偏移、两层内置图片、本地文件替换及窗口图片透明度。样本在两个视口都通过真实源码及 PNG 剪贴板读取。首页、图片格式转换和代码分享图初始状态均为 0 个创意图片请求。打开选择器后加载 WebP，筛选与待选均无 AVIF 请求。首次确认仅请求翡翠极光 AVIF。桌面延迟请求被取消，加载失败保留已生效图片。[Chromium 验收与网络记录](d2-browser.json)

两个视口实际下载 PNG、JPEG、WebP 和 SVG。Pillow 独立解码三种 1304 × 734 位图，复检 PNG 透明通道。ElementTree 解析 652 × 367 SVG，核对两张内嵌 PNG、四个 WOFF2 字体和随附 OFL，无脚本或事件属性。离线 Chromium 打开 SVG 无图片或字体请求。两个视口在同一毫秒各导出两次，第二个文件名带 `-2`。D1 的 JPEG 白底、Unicode、Tab、自动换行、渲染预算以及八套预设和十二套主题证据仍适用。已核对工具 NOTICE 中 Shiki 核心 MIT 和三套 Fontsource OFL 对应包的完整许可。[独立文件及构建复检](d2-file-checks.json)

`pnpm check`（603 文件，0 诊断）、161 项定向测试及两地区正式构建通过。L3 尚未验证 Firefox、Safari、移动真机以及低内存设备的最大输出预算。
