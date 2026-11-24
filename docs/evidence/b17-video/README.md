
# B17-D1 视频取帧验收

通过 `pnpm dev` 使用 [CN 中文工作区](http://127.0.0.1:4321/tools/video-frame-extractor/) 或 [Global 英文工作区](http://127.0.0.1:4322/tools/video-frame-extractor/)。视频取帧保持 Draft。

## Chromium 工作区

在 Windows Chromium 156.0.8078.4 实际导入视频，操作播放、暂停、时间轴点击和键盘定位、首末帧、前后逐帧、全屏、四种提取模式、画廊选择和清空、图片预览与下载、联系表、ZIP 和更换文件。Global 390 CSS px 模拟视口无页面横向溢出。

- [CN 中文 Dark，1280 px](cn-desktop-dark.png)
- [CN 中文 Dark，900 px 桌面参考宽度](cn-prototype-width.png)
- [Global 英文 Light，390 px 手机模拟](global-mobile-light.png)

## 帧时间与文件复检

- 使用 FFmpeg 生成 H.264 和 VP9 测试片段。VFR MP4 从 2 秒 PTS 开始，包含 77 帧和 B 帧。对照 ffprobe 的呈现顺序验证首末帧及相邻帧。请求 0.450 s 时显示 0.400 s，下载的原尺寸 PNG 与精确预览的 PNG 字节一致。
- 验证间隔秒数、采样 FPS、半开区间逐帧及数量模式。VFR 样本在 0–0.2 s 请求 40 次，生成 2 个不同的实际帧并报告 38 次重复采样。对照 MP4 编辑列表中的负 PTS 包，验证时间轴从第一个可显示画面开始。MKV 也经逐帧验证。模拟播放器原生错误后，精确浏览和真实提取仍可用。损坏文件、无视频轨道、浏览器不支持的编码分别反馈。
- ffprobe 确认实际 PNG、JPEG、WebP 编码及尺寸。验证 3840 × 2160 和 7680 × 4320 原始输出、90° 旋转后的 360 × 640 WebP，以及非方形像素源的 853 × 360 PNG。4K 缩放实际生成 1280 × 720 与 533 × 300 JPEG，另复检关闭时间戳的 JPEG 联系表。
- 使用独立 FFmpeg RGB 参考帧比较实际图片和 ZIP 内的首、中、末图片。参考使用 BT.709 转换，记录 8-bit RGB 平均绝对差值。Python `zipfile` 检查所有条目的 CRC、存储方法、顺序及时间戳。三列 PNG 联系表为 648 × 608，按时间排列，与已选帧逐格抽检。
- 下载完整 400 帧 WebM ZIP，画廊保留原有 25 帧。用实际 OPFS 可写文件验证直接写入、取消及保留上一次完整归档。清空画廊后，创建的 Blob URL 回到播放器的两份。额外验证任务结束后页面无存活视频 Worker。

[FFmpeg / ffprobe 和 ZIP 输出数据](independent-output-checks.json) · [Chromium 数据](chromium.json) · [扩展格式与定位](chromium-extended.json) · [编辑列表、缩放和 JPEG 联系表](chromium-final-spot-checks.json)

## 大文件与测量

| 样本或任务 | 实际结果 |
| --- | --- |
| 31:05 H.264 MP4 | 约 0.73 s 导入，0.27 s 定位至 31:04，并下载正确画面 |
| 265.18 MiB H.264 MP4 | 约 1.49 s 导入，0.39 s 定位至 4 s |
| 2,127,660,718 字节 H.264 MP4，约 1.98 GiB | 约 1.05 s 导入，0.38 s 定位至 37 s，PNG 复检通过 |
| 逐帧 400 帧 VP9 WebM | 约 6.05 s 下载 12,432,476 字节的 ZIP，含全部帧 |
| 60 帧原尺寸 PNG 直写 ZIP | 约 13.11 s 写入并关闭 358,135,898 字节归档，单次最大写块 1 MiB，全部条目 CRC 通过 |

每行是本机的一次端到端测量。导入计时包含文件选择到精确预览出现，定位计时包含 Worker 解码。Window JS Heap 读数粒度较粗，导入前后均约 72.2 MB。该读数不覆盖 Worker、浏览器其余进程、解码器、GPU 或峰值内存。350 帧 OPFS 小归档的记录耗时包含将成品读回测试运行器。[大归档直写数据](chromium-large-zip.json)

Mediabunny 1.66.3 与 fflate 0.8.3 使用仓库已有锁定版本，MPL-2.0 对应源码和 MIT 通知随工具交付。视频工作区网络记录没有音频编码器、WaveSurfer 或音频 Worker。CN/Global 的正式构建守卫检查视频专属 JS、CSS、Worker、NOTICE 及全部成品脚本中的专属标记，Mediabunny 仍可由 Published Audio Trimmer 使用。pnpm check、52 项定向、样式及回归测试、CN/Global 正式构建及两地区平台夹具均通过。

尚未实测真实设备触摸和 OS 保存对话框，也未覆盖 Safari、Firefox、HDR 实机色彩或经典 ZIP 临界尺寸的全量写入。8K 结果来自本次 H.264 样本。
