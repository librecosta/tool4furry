# B14-D1 Color & Contrast 验收

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
