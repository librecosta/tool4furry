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

窗口图片在 0%、50%、100% 不透明度下复核预览采样。以 50% 导出时，重新解码的 PNG 与 SVG 在同一测试点均为 RGBA `108, 143, 156, 255`，JPEG 和 WebP 每通道相差最多 1。SVG 包含两张内嵌图片、窗口圆角剪裁和不透明度，相关资源使用数据 URL。另复核文件 MIME、位图签名及输出尺寸。两个视口无整页横向溢出或页面脚本异常。

`pnpm check` 无诊断，64 项制图、工作区、数字输入和图片相关定向测试通过。
