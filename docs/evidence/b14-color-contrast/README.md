# B14 Color & Contrast 验收

## B14-D1

截图和测量记录对应 B14-D1 首版 `865290e`。当前默认前景色为 `#F7CDAD`。

## Chromium

| DEV 页面 | 主题与视口 | 截图 |
| --- | --- | --- |
| CN 中文，`localhost:4321/tools/color-contrast/` | Dark，1280px 桌面 | [工作区](cn-dark.png) · [选色浮层](cn-dark-picker.png) |
| Global 英文，`localhost:4322/tools/color-contrast/` | Light，390px 触控模拟 | [工作区](global-light-mobile.png) · [选色浮层](global-light-mobile-picker.png) |
| CN 中文，`localhost:4321/tools/color-contrast/` | Light，848px 桌面 | [工作区](prototype-width-light.png) |

三个视口均复核了修改 HEX/RGB/HSL 后的预览更新、失效状态、交换、两侧修正、重置及主题切换。选色浮层覆盖键盘打开、方向键调色、Escape 与焦点返回、触控选色和外部点击关闭。390px 视口中页面与浮层无横向溢出。浏览器版本与实际测量值见 [Chromium 结果](chromium.json)。

- 真实剪贴板逐项读回 `#3583D2`、`rgb(53, 131, 210)` 和 `hsl(210.2, 63.6%, 51.6%)`。
- 用独立的相对亮度公式复算默认配色的修正建议。修改前景为 `#629EDC` 得到 4.506249:1，修改背景为 `#1B1717` 得到 4.509840:1。
- 核对 Chromium 中 EyeDropper API 可用，注入响应覆盖成功、取消、编辑或交换或重置后旧响应失效，以及浏览器不支持时隐藏按钮。未执行操作系统屏幕上的实际像素采样。
- DEV 中读回的 react-colorful MIT 通知与仓库版本一致。

## 定向测试

Color Contrast、既有颜色调用方、Palette 和 Draft 发布契约共 120 项通过。覆盖 HEX / RGB / HSL、越界和不透明约束、黑白 21:1、同色 1:1、3 / 4.5 / 7 阈值舍入边界、双方向明度搜索、实际 RGB 复核，以及单侧调整不可达。工作区测试覆盖格式复制、局部无效状态、对比度更新、交换、重置和取色取消及卸载。

## 构建与范围

`pnpm check`、`pnpm build:cn` 和 `pnpm build:global` 通过。两个正式产物每种语言各有 19 个工具详情页。均排除 Color & Contrast 的 Draft 路由、工作区 JS 和专属 CSS。Registry 维持 29 款工具、19 Published、10 Draft。

触控验证使用 Chromium 手机模拟视口。Firefox、Safari、真实移动设备和操作系统屏幕采样尚未验证。

## B14-D2 正式产物

- 使用 Chromium 在 CN 中文 Dark 1280px 桌面、Global 英文 Light 390px 触控模拟视口运行正式静态构建。复核选色浮层、键盘与触控、主题切换、英文预览、无效输入、交换、两侧修正和重置。两个视口的 HEX、RGB、HSL 均逐项写入并读回真实剪贴板，使用浏览器 Canvas 独立还原 RGB 字节。
- 最新 develop 默认配色为 `#F7CDAD` / `#383131`，独立计算为 8.651509:1。用 D1 蓝色样本 `#3583D2` 复测时，前景候选 `#629EDC` 达 4.506249:1，背景候选 `#1B1717` 达 4.509840:1。阈值始终依据未舍入比值，临界向上舍入使用 `<` 标记。
- 穷举全部 16,777,216 种不透明 8-bit sRGB，现有 HSL 复制格式均可重新解析为原始 RGB。保留已有 EyeDropper 成功、取消、过期结果和降级测试。在 Chromium 确认 API 可用，未执行操作系统实际像素采样。
- `pnpm check`、20 个定向测试文件（284 项）和 CN/Global 正式构建通过。四个正式页面验证静态 SEO、目录角色、Sitemap、llms.txt 和图标。每地区有 40 个详情页。Color & Contrast 工作区按需加载，MIT 通知读回与源码字节一致。其余九款 Draft 及 DEV Lab/Fixture 由产物守卫核对。
- 范围为 Chromium 桌面及手机模拟视口。Firefox、Safari/WebKit、真实移动设备和系统屏幕取色保留为 L3 未验。[正式产物浏览器记录](d2-chromium.json)

D1 和 D2 实施前的 develop 基线均已通过 GitHub Actions。D2 提交的结果以对应 SHA 的运行为准。[D1](https://github.com/librecosta/tool4furry/actions/runs/45359744636) · [D2 实施前基线](https://github.com/librecosta/tool4furry/actions/runs/45364494410) · [develop 构建记录](https://github.com/librecosta/tool4furry/actions?query=branch%3Adevelop)
