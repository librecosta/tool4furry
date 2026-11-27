# B20-D1 SVG Converter 验收

`svg-converter` 替换原 Draft 工具，沿用分类、角色和双地区配置。共 29 款工具，25 Published、4 Draft。工作区通过 DEV 路由验收。两地区正式构建排除新旧 Draft 路由和工具私有资源。

## 工作区

使用 Windows Chromium 156，CN 中文 Dark 1280px 桌面及 Global 英文 Light 390px 模拟视口。检查模式状态保留、文件替换、查找替换面板、尺寸联动、桌面全屏、对比分隔线、并排查看和 PNG / SVG 剪贴板。Windows 剪贴板文本统一换行为 LF 后，与 SVG 下载内容比对一致。

| 模式 | 桌面 | 窄屏 |
| --- | --- | --- |
| 栅格化 | [中文 Dark](cn-rasterize.jpg) | [English Light](global-rasterize.jpg) |
| 矢量化 | [中文 Dark](cn-vectorize.jpg) | [English Light](global-vectorize.jpg) |
| 图片封装 | [中文 Dark](cn-embed.jpg) | [English Light](global-embed.jpg) |

## 下载复检

浏览器实际下载 26 个文件。Pillow 12.3 独立解码位图，Python XML 解析器验证矢量与封装文档，并独立读取 ICO 目录与嵌入的 PNG 帧。[浏览器结果](browser.json) · [独立文件复检](file-inspection.json)

- 栅格化实际输出 PNG、JPEG、WebP、AVIF。2048 × 2048 渐变曲线样本在目标尺寸重新绘制，透明度在 PNG、WebP 和 AVIF 中保留。JPEG 默认白底通过像素取样验证。另通过 8000 × 5000 的 40 MP PNG 和 16,384 × 1024 的单边上限样本。
- ICO 逐个核对文件头、六项索引、连续偏移量及 16、32、48、64、128、256 px 的真实解码，保持透明通道。
- Logo、插画、照片、黑白线稿及 Pixel Art 分别生成 3、5、445、2、8 个路径。所有样本均为静态几何且不存在嵌入原图。描摹时间及实际工作分辨率见浏览器记录。照片样本保留主要色块和轮廓，局部细节会随调色板和路径拟合改变。Worker 完成后退出，实际取消一次降采样至约 4 MP 的任务也终止 Worker，下载保持禁用。[五种预设对比](vector-comparisons.jpg)
- 使用仓库 32 × 32 像素图标测试 Pixel Art，生成 SVG 后重新栅格化。1,024 个像素的 alpha 及可见 RGB 全部一致。对比忽略完全透明像素中不可见的 RGB。精确读色优先用 WebCodecs 原尺寸 RGBA，使用 Canvas 回退时，半透明像素可能受浏览器预乘和取整影响。
- 封装分别导入 PNG、JPEG、WebP、AVIF，生成自包含 SVG 并独立解码内嵌数据。正常方向的 JPEG 保留 JPEG，测试中的 WebP、AVIF 转为 PNG。PNG 封装再栅格化的 128,000 个像素同样无可见差异。
- 从 B19 的真实导出中取三份作品。使用内嵌编程字体的默认作品为 486 × 367，单本地背景为 486 × 367，双层创意素材背景为 652 × 367。三份均成功预览并下载原尺寸 PNG。检查了作品文本、背景、窗口裁切、阴影和透明度。[跨工具输出](code-image-roundtrip.jpg)

## 安全与资源

CSS Tree 3.2.1（MIT）解析静态样式，DOMParser 解析 XML。预览与目标尺寸绘制通过 Blob URL 在隔离图片上下文运行。浏览器 Network 观察到外部 SVG 图片和 CSS 导入样本的请求均为零。定向测试覆盖不支持的元素、事件属性、命名空间、DTD、危险引用、内嵌格式及复杂度边界。Image Watermark 使用既有独立政策。

固定预算见[工具契约](../../general-toolbox-v0.8.md#svg-converter--v08-b20-d1)。目标尺寸、输出字节、XML 节点、路径数据、引用、内嵌图像和字体各自有界。以上分辨率系本机 Chromium 实测。照片处理耗时仅代表记录中的单次本地样本。浏览器进程、Worker 和 GPU 的峰值内存未单独测量。

轻量图形加注释构成的 33,554,432 B 文件成功导入与预览，源码按大文件模式展示。同类样本增加 1 B 后被拒绝。无 viewBox 的 `1in × 24pt` 样本解析为 96 × 32 px。[边界实测](bounds.json)

VTracer 上游公开的 npm WASM 包面向 Node.js 且标记 Alpha，浏览器示例需要额外构建。因此采用 ImageTracerJS 1.2.6（Unlicense），仅在执行常规描摹时由专属 Worker 导入。Pixel Art 使用原尺寸同色区域合并。CodeMirror XML 6.1.0 使用 MIT，与既有 CodeMirror 6 兼容。第三方许可、版权及来源保存在仓库随工具交付。[VTracer 上游](https://github.com/visioncortex/vtracer) · [完整 NOTICE](../../../src/tools/svg-converter/svg-converter.NOTICE.txt)

## 验证与边界

本地执行 `pnpm check`、SVG Converter 与图片、Watermark、安全、共享编辑器和发布相关回归，以及 `pnpm build:cn`、`pnpm build:global`。两地区正式守卫验证 50 个工具详情页，SVG Converter 的专属模块、Worker、引擎、样式和 NOTICE 均不进入产物。共享图标表生成两份静态像素图标，正式页面无对应工具引用。AVIF 复用其他图片工具的现有编码链。

未覆盖 Firefox、Safari、实体移动设备、不同显卡的 Canvas 极限、完整 Figma / Inkscape 导出矩阵。静态子集会明确拒绝动画、外部资源、编辑器私有命名空间属性或元数据，以及不支持的 CSS 和绘制能力。
