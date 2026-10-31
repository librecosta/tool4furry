# Image Resize & Crop · 当前实现

V0.7-A1-A：`image-resize-crop` 为 CN/Global 双语 **Draft**，仅 DEV 可访问。Image Converter 仍是唯一 Published 工具；两个地区均未部署。

## 模块与数据边界

- `src/tools/image-resize-crop/geometry.ts`：方向校正后的 Source 像素空间、整数 Crop、比例居中/边界约束、百分比投影、Output 尺寸验证。尺寸使用最近整数（半值向上），比例切换尽量保持面积，中心使用稳定半像素格后约束边界，避免奇偶边长反复切换时偏移；无法表示的极端比例拒绝。响应式变化只改变投影，不回写 Source/Crop。
- `session.ts`：一个活动 Source 与编辑草稿；未自定义输出时跟随 Crop 自然尺寸，自定义后保留宽度并重算高度。解锁提交不同宽高比会围绕当前中心重构裁剪，避免拉伸。输入字符串由 UI 暂存，明确应用时才验证并原子提交；非法/超限值不会写入合法状态。导出和下载在有未应用输入时禁用。
- `render.ts`：复用 `acceptImage` / `decodeChecked` / `ImageResources` / `limits.ts`。导入时生成最长边不超过 1600 的方向校正 PNG 预览；交互使用原图像素投影与有界 Canvas 构图预览，不反复编码。导出从原图一次 `drawImage` 完成裁剪、缩放，PNG/JPEG/WebP 编码后经过 `validateOutput` 的 `privacy-v1` 清理、格式/MIME/尺寸及完整回解码复检。
- `CropEditor.tsx`：`react-image-crop 11.1.2`，React peer 范围 `>=16.13.1`。自由比例与五种固定比例、拖动/控制点/键盘；局部 CSS 的变量从 `:root` 移到工具根，动画改名、扩大控制点并尊重 Reduced Motion。原始 ISC 条款与本地修改见 `crop.NOTICE.txt`，由工具按需引用，不放入无条件复制的 public。
- `ImageResizeCrop.tsx`：复用 `WorkbenchShell mode="form" formWidth="wide"` 和现有受控 UI 原语；桌面左图右参数，≤1050px 单栏、预览在前。替换和清空通过 ConfirmDialog；取消文件选择不改变当前草稿，验证失败的替换保留上一张有效图。

Source 是已验证文件、格式和方向校正尺寸；Crop 是其整数像素矩形；Output 是独立的最终宽高、格式、质量和 JPEG 背景。预览与导出复用同一方向校正入口，不能再次旋转。整数取整允许 Source 裁剪边缘至多一个像素、或 Output 边缘最近整数的比例近似（包括极小缩略图）；不把 CSS 像素存作真实数据。

## 生命周期与范围

单源 Session 独立于 ConverterSession，只复用其 `SerialJobs` 通道工具。导入、能力检测、导出串行；原生超时不提前释放通道。编辑、替换、清空和卸载使旧结果立即失效，revision/source request 拒绝晚到写回。Canvas/Bitmap 在真实异步工作结束后释放；预览与下载 URL 由工具拥有并在更换、清空或卸载撤销。文件名标签复用 `file-naming.ts`，不触发编码。

支持现有内核验证过的 PNG/JPEG/WebP/静态 AVIF 输入；AVIF 输入明确提示仅可输出 PNG/JPEG/WebP。默认 PNG，JPEG 合成用户选择的背景。输出受同一固定设备 profile 的边长和像素上限约束，不以断点改变预算，不自动缩小或换格式；用户主动放大时显示细节不会增加的提示。

本阶段无批量、ZIP、逐文件草稿集合、旋转、透视、AI、历史记录、持久化或作者版权编辑。A1-B 可复用 geometry、单次 render、输出验证、命名、预算与串行通道；不能把当前单源 Session 描述成已实现批量管理。

## 验证与人工入口

定向测试：`resize-geometry`、`resize-session`、`resize-render`、`resize-ui`、`resize-publication`。原生边界在单测中被模拟，不替代浏览器证据。生产构建内置守卫额外检查 Draft 交互标记、裁剪专属 CSS 和 NOTICE 资产不泄漏；既有多工具夹具继续验证真实依赖图与反例。

本轮本地工程验证：`pnpm check`（0 errors/warnings/hints）、`pnpm test`（61 文件 / 660 测试）、`pnpm build:cn`、`pnpm build:global` 全部通过；frozen-lockfile 安装通过。两地区多工具夹具也通过，包含缺 Loader/内容、提前加载、共享入口携带 Draft 私有依赖、Loader 互换和资格回退到零工具的检查；原始构建图与日志保留于仓库外 `.validation/multi-tool-ih5yV2`（CN）及 `.validation/multi-tool-DFVc5n`（Global），不承诺这些本机目录随克隆分发。未将本地结果称为远端 CI 结果。

运行 `pnpm dev`，以终端打印的 CN/Global 来源（端口以 `src/config/dev-origins.mjs` 为准）拼接下面路径：

| 地区 | 中文路径 | English 路径 |
| --- | --- | --- |
| CN | `/tools/image-resize-crop/` | `/en/tools/image-resize-crop/` |
| Global | `/zh/tools/image-resize-crop/` | `/tools/image-resize-crop/` |

人工检查：导入带方向/透明度的图片 → 自由/固定比例、拖动边缘/角点和键盘 → 调整宽高与百分比 → 切换桌面和手机视口 → 导出三种格式并下载 → 修改参数确认旧下载失效 → 替换/取消/失败/清空。检查未应用输入、超限错误、焦点与触控命中区域。

2026-10-31 在真实 Chromium IAB 完成 CN 中文 / Global 英文核心路径：桌面 1365×1000、手机视口 390×844；鼠标拖动选区及角点、键盘边缘微调、固定比例、精确宽高、解锁重构图和百分比。跨视口前后百分比坐标相同。实际下载 PNG 400×400、JPEG/WebP 600×300；独立系统解码 PNG/JPEG，WebP 文件头/VP8X 尺寸核验，浏览器内三格式均完整解码复检。JPEG 背景 `#123456` 在透明区域得到 RGB 18/52/87（有损编码误差）。EXIF 6 JPEG 导出 PNG 48×80，左上蓝/右上红像素符合一次顺时针方向校正。受支持 `private.avif` 256×160 可导出 PNG；未声明可靠色彩信号的原始 encoder-alpha.avif 被明确拒绝，保留旧草稿。

未验证 Firefox/Safari、iOS/Android 真机和真实触摸事件；手机视口与鼠标不能作为真机触控证据。其余两种地区/语言组合的深度交互、完整八方向浏览器像素矩阵、峰值内存与低端设备容量留给维护者按实际反馈检查。未执行上线，也未提升为 Published。

最终版本复核另完成：1:1 / 16:9 反复切换仍回到同一居中选区；原图 1200×800 缩至 PNG 2×1 成功下载并经系统独立解码；390px 视口无横向溢出，跨视口选区坐标不变；真实清空后焦点回到导入按钮。
