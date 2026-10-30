# V0.6-C1 — Native-first Codec Strategy & WASM Evaluation

日期：2026-10-30（Asia/Shanghai）。审计基线：`develop` / `14564024d8dd44b672ea6991ff0c030ed299df2d`。

这是研究记录，不是格式支持或发布承诺。没有修改生产源码、依赖、Registry、资源额度或 Converter 的 draft 状态。

## 结论

- **继续原生优先**：现有静态 PNG/JPEG/WebP 路径满足当前工具需求，明显快于本次 AVIF WASM 路径。
- **未来需要 AVIF 输出时，优先评估按需加载 jSquash AVIF 的独立 Worker**：普通环境可用，编码核心较小；不能沿用原生 40MP 额度而不再验证内存。
- **ImageMagick 保留为特殊格式候选**；**wasm-vips 暂不作为默认引擎**。两者可运行，但本次没有证明足以抵消包体、内存及集成要求的收益。
- 没有证据支持仅凭“高质量模式”自动把现有 WebP/JPEG 切到 WASM。不同编码器的 quality 数字不等价；当前质量比较只覆盖一类合成图。

文中“实测”仅指下述环境；“官方”指包内文件或上游文档；“建议”尚未实施。

## 1. 现有生产路径审计

已阅读 `AGENTS.md`、`docs/image-converter-implementation.md`、`src/tools/image/`、Converter 的 Session/预设/URL 所有权，以及 inspector、browser-codec、能力实验相关测试。

| 项目 | 当前代码事实 |
| --- | --- |
| 输入 | 仅 PNG/JPEG/WebP；按真实签名和结构识别，不信扩展名。分块读取、尺寸预算、EXIF 1–8；拒绝 APNG、动画 WebP、MPF 及损坏结构 |
| 接受文件 | 结构检查后还使用 `createImageBitmap` 真解码；`imageOrientation: 'from-image'` 是方向变换的唯一所有者 |
| 编码 | HTML Canvas 2D → `toBlob()`；JPEG 显式合成背景，默认白色。WebP 85 / JPEG 88 / PNG 无有损质量参数 |
| 能力 | PNG/JPEG/WebP 逐一实际编码 2×2 样本，并复检输出；不是浏览器名称或返回非空判断 |
| 输出 | 非空、精确 MIME、真实格式结构、方向/尺寸、再次解码和位图尺寸均需通过；输出预算独立于输入大小 |
| Quick | 同格式可保留已验证的原始字节；Advanced 才按设置重新编码 |
| 调度/取消 | FIFO 单通道，逐任务 key；任务/源/参数/请求版本隔离晚到结果。原生操作不可硬中断；45 秒 watchdog 报错也不提前释放仍在执行的通道 |
| 资源 | bitmap.close、canvas 尺寸归零；`ImageResources` + `useOwnedUrl` 管理任务原图/输出 URL，移除/过期/卸载释放；计数器不是操作系统内存测量 |
| 限制 | 桌面 100 张、单张 50 MiB / 40MP / 10000px、累计 100 MiB；移动/未知 50 张、20 MiB / 16MP / 8192px、累计 60 MiB；ZIP 128 MiB；工作区内限制档位固定 |

**需后续单独处理的策略差异**：`ConverterSession.retryCapabilities()` 在当前格式不支持且 PNG 可用时会恢复 PNG 推荐设置，没有区分“首次默认选择”和“已有用户选择”。每次编码的真实格式校验仍然严格，但未来“不静默改变用户输出格式”的合同需要把这条选择逻辑也纳入，不能只增加 WASM 分支。本轮未修改它。

## 2. 实验方法与证据边界

实测：Windows、Ryzen 7 5800H（16 逻辑处理器）、约 32 GB 内存，Codex 内置 Chromium 报告 `Chrome/156.0.0.0`；文档可见。普通与 COOP/COEP 隔离页面均在 `127.0.0.1:4439`，没有向外上传图片。

样本为自建 8-bit SDR RGBA 梯度、确定性细纹理和锐利网格，分别 1000²、2000²、4000² 像素；另用仓库小样本及 Pillow 生成透明 AVIF、BMP、静态/双帧 GIF、双帧 AVIF。全部依赖、WASM、样本、服务及原始证据位于仓库外 `../.validation/image-codec-v06c1/`。

每个配置只取一次顺序运行观测值，不是中位数/排名基准。引擎预先初始化；编码计时不含样本生成、传输到 Worker、结果回解码、质量统计或磁盘保存。Magick/vips 包含原始 RGBA 读入/封装成本。没有控制温度、后台负载或公网带宽。

每个结果检查 MIME、文件头、尺寸及浏览器完整回解码；WASM 只返回字节，其 Blob MIME 是实验适配器赋值，**不算独立格式证据**。另用 Pillow 12.3.0 完整解码 30 个落盘输出，核对真实格式/尺寸/帧数并记录 SHA-256。故意请求原生 AVIF 所得到的 PNG 也单独标记，不计作 AVIF 成功。数值摘要见 [测量数据](image-codec-evaluation.data.json)。

## 3. 原生能力实测

| 格式 | `createImageBitmap` 输入 | Canvas 请求输出 | MIME / 文件头 / 尺寸 / 回解码 |
| --- | --- | --- | --- |
| PNG | 成功 | PNG | 全部匹配 |
| JPEG（含 progressive） | 成功 | JPEG | 全部匹配 |
| WebP | 成功 | WebP | 全部匹配 |
| AVIF | 成功，含透明样本 | **回退 PNG** | MIME 为 image/png，PNG 签名；不是 AVIF 编码 |
| GIF | 静态、双帧样本可解码 | 未测输出 | 位图路径只得到首帧 |
| BMP | 24-bit RGB 样本成功 | 未测输出 | 96×64；未验证 BMP 变体覆盖 |

这与 [HTML Canvas 序列化规范](https://html.spec.whatwg.org/multipage/canvas.html#serialising-bitmaps-to-a-file)允许不支持的输出类型回退 PNG 一致。不能以 `toBlob('image/avif')` 非空推断支持；WebCodecs 的解码接口也不是静态 AVIF 编码能力证明。

边界实测：

- APNG、动画 WebP、双帧 GIF/AVIF：原生位图只显示第一帧；`ImageDecoder` 报告双帧样本为 2 帧。没有验证动画重编码、时序、循环或帧合成。静态 GIF 的 `animated` 标记也可能为 true，不能单独作为多帧判断。参见 [ImageDecoder 合同](https://www.w3.org/TR/webcodecs/#imagedecoder-interface)。
- EXIF 1–8：方向后的尺寸、四角颜色与 Pillow `exif_transpose` 全部一致，角点差为 0；5–8 的 80×48 变为 48×80。没有验证任意 ICC/CMYK/HDR 保真。
- PNG/WebP 和三套 AVIF WASM 的透明样本 alpha 最大差均为 0。Canvas 对半透明 RGB 有预乘/反预乘舍入；无损容器不代表任意原始 RGBA 字节完全一致。
- 原生 JPEG 直接编码透明 Canvas 会变为不透明黑底。本次故意未加 matte 以确认边界；生产显式 JPEG 背景仍须保留。

## 4. 候选版本、许可与实际覆盖

2026-10-30 从官方 npm registry 查询 latest 后固定安装，仅在隔离目录安装：

| 候选 | 固定版本 / 主要底层 | 许可证与浏览器要求 | 本轮实际结果 |
| --- | --- | --- | --- |
| [jSquash AVIF](https://github.com/jamsinclair/jSquash/tree/main/packages/avif) | 2.1.1；包内 encoder README 标注 libavif 1.0.1 | 包 Apache-2.0；底层还需保留 [libavif 及其第三方条款](https://github.com/AOMediaCodec/libavif/blob/v1.0.1/LICENSE)。单线程不要求 SAB；包可自动选择线程版本，本轮未测多线程 | 普通 ESM Worker 编码、解码 AVIF 成功；其他五种输入报解码错误；双帧 AVIF 只返回一张图 |
| [magick-wasm](https://github.com/dlemstra/magick-wasm/releases/tag/0.0.45) | 0.0.45；运行时 ImageMagick 7.1.2-33 Q8 wasm32，libheif 1.23.6 / aom 3.15.1 | 包 Apache-2.0，但 [NOTICE](https://github.com/dlemstra/magick-wasm/blob/0.0.45/NOTICE)包含 ImageMagick、libheif、libde265、GLib 等独立条款，不能视为整个产物只受 Apache 约束。普通 ESM Worker 可运行，无需 SAB | 六种静态输入均读取实际像素；AVIF 输出成功。GIF/WebP/AVIF 双帧集合均读取两帧；APNG 只读取一帧 |
| [wasm-vips](https://github.com/kleisauke/wasm-vips) | 0.0.19；运行时 libvips 8.18.7，包内 heif 1.23.5 / aom 3.15.1 | 包装 MIT；[第三方清单](https://github.com/kleisauke/wasm-vips/blob/master/THIRD-PARTY-NOTICES.md)列出 libvips/libheif/GLib/libexif 的 LGPLv3 等条款。要求 WASM SIMD、异常处理、SAB 及跨源隔离 | 隔离 Worker 成功；普通环境 SAB 不可用，实验入口明确拒绝。PNG/JPEG/WebP/静态 AVIF/GIF 强制读取像素成功；BMP、该双帧 AVIF 样本失败；默认页路径的 APNG/WebP/GIF 只返回首帧 |

Magick 运行时可读写列表还包括 TIFF/JXL/SVG 等，但本轮未逐一测试；HEIC 被报告为可读、**不可写**。不能套用桌面 ImageMagick“100+ 格式”的总清单。vips 的 config 列出其他动态模块能力，本轮仅装载 HEIF side module，没有装载 JXL/resvg，未测试 all-pages 参数。许可记录不是正式分发合规结论；真正采用前须针对固定二进制整理 notices、对应源码和适用的重链接要求。

## 5. 资源体积与启动

以下为包内单文件原始字节及本机 Gzip level 9 / Brotli quality 11 的实测字节；不是 npm 压缩包或 unpacked 总量。核心 JS 表示上游胶水代码，不含实验入口/分块及其他应用代码。

| 文件 | 原始 B | Gzip B | Brotli B |
| --- | ---: | ---: | ---: |
| jSquash avif_enc.wasm（本轮 ST） | 3,485,872 | 1,125,519 | 842,416 |
| jSquash avif_enc.js | 39,621 | 10,931 | 9,851 |
| jSquash avif_enc_mt.wasm（未运行） | 3,534,665 | 1,139,552 | 852,879 |
| jSquash avif_enc_mt.js（未运行） | 54,909 | 14,661 | 13,127 |
| jSquash avif_dec.wasm（单独解码模块） | 1,170,930 | 340,845 | 267,341 |
| Magick x86/magick.wasm | 15,425,791 | 5,428,719 | 4,091,338 |
| Magick dist/index.js | 409,295 | 99,274 | 60,542 |
| vips.wasm | 5,154,052 | 2,023,395 | 1,610,227 |
| vips-heif.wasm（本轮额外加载） | 3,802,681 | 1,261,044 | 994,923 |
| vips-es6.js | 83,765 | 31,813 | 28,224 |
| vips-jxl.wasm（未加载） | 2,224,543 | 798,402 | 613,990 |
| vips-resvg.wasm（未加载） | 1,176,530 | 445,638 | 358,978 |

Magick 另附 x64 WASM 15,802,930 B，未用于本次浏览器路线。实验打包器会改写 JS 并增加入口；例如实际 Magick 实验 chunk 为 471,878 B，不能将表中胶水代码字节当作总下载成本。

| 首次本地冷加载 | WASM Resource Timing 耗时 | 引擎 import + 下载/编译/初始化 | 含 Worker 启动的往返 |
| --- | ---: | ---: | ---: |
| jSquash ST | 21.6 ms | 37.1 ms | 53.5 ms |
| Magick | 98.6 ms | 145.6 ms | 154.0 ms |
| vips + HEIF | 64.9 + 23.2 ms | 211.1 ms | 220.2 ms |

WASM 实际使用 Brotli 传输，压缩/解压后字节由 Resource Timing 与本地 HTTP 日志对应核对。这些是 loopback、未限速的一次观测，**不是 CN CDN 下载速度**；没有将 fetch 时间与编译时间进一步独立剥离。vips 生成的部分子 Worker Resource Timing 有负 duration，未把这些异常项相加当作启动性能。

## 6. 编码、体积与质量实测

各列顺序为 **1MP / 4MP / 16MP**，三档使用相同图案生成规则。

| 路径与参数 | 编码耗时 ms | 输出 B | RGB PSNR dB |
| --- | --- | --- | --- |
| 原生 PNG | 49.1 / 251.7 / 862.5 | 1,894,314 / 7,377,673 / 28,853,090 | ∞ / ∞ / ∞ |
| 原生 JPEG 88 | 16.3 / 49.9 / 360.9 | 285,864 / 1,133,988 / 4,532,432 | 30.53 / 30.41 / 30.39 |
| 原生 WebP 85 | 114.4 / 440.5 / 1,906.7 | 240,680 / 935,292 / 3,747,086 | 31.31 / 31.21 / 31.19 |
| jSquash AVIF 50, speed 6 | 1,217.1 / 4,187.3 / 17,177.0 | 43,247 / 171,422 / 688,509 | 28.93 / 28.84 / 28.83 |
| Magick AVIF 50, heic:speed 6 | 1,566.9 / 5,478.3 / 21,405.3 | 69,606 / 274,980 / 1,094,165 | 29.04 / 28.97 / 28.96 |
| vips AVIF Q50, effort 3, concurrency 1 | 1,439.3 / 5,467.8 / 21,670.2 | 69,849 / 275,223 / 1,094,408 | 29.04 / 28.97 / 28.96 |

libvips 将 speed 映射为 `9 - effort`，所以使用 effort 3 对应 speed 6；参考 [上游 heifsave 源码](https://github.com/libvips/libvips/blob/master/libvips/foreign/heifsave.c)。最初 effort 6 的 1MP 探索值约 22 秒，发现档位差异后停止该轮，不混入上表。色度采样、编解码库版本和参数含义仍不同，不能声称三个 quality 50 等价。

另外对 jSquash 测试 1MP：quality 75 / speed 6 为 **1,282.4 ms、230,752 B、31.50 dB**；lossless / speed 6 为 **2,172.9 ms、1,728,133 B、RGB 完全一致**。相对原生 WebP 85，Q75 约小 4.1%、耗时约 11.2 倍；相对原生 PNG，无损约小 8.8%、耗时约 44 倍。这不足以证明默认替换的收益。

已在真实浏览器检查八组同位置、1:1 像素局部图：Q50 AVIF 的细纹理明显平滑，Q75 更接近原图/原生 WebP，无损恢复本样本 RGB。PSNR 是全图 8-bit RGB 均方误差指标，不等于人类视觉等价；未做 SSIM、照片/漫画/文字素材集或盲测。

## 7. 内存、失败与生命周期

| 完成任务后线性内存容量 MiB | 初始化 | 1MP | 4MP | 16MP |
| --- | ---: | ---: | ---: | ---: |
| jSquash ST | 16 | 48.0 | 123.6 | 458.9 |
| Magick | 16 | 84.8 | 211.1 | 792.2 |
| vips + HEIF | 256 | 307.3 | 637.3 | 1,566.9 |

实测口径是 `HEAPU8.buffer.byteLength` 或实验 Worker 对 WASM 导入/导出 memory 的观察，表示分配容量；**不是峰值 RSS、实际活跃图像内存，也不包含所有浏览器/GPU/JS 开销**。16MP RGBA 源自身另需 64,000,000 B，还可能有 Canvas、传输、读回和输出副本。`performance.memory` 只保存为不可靠的辅助快照，不能证明进程峰值或回收量。

vips 关闭操作缓存并 delete 图像后，跟踪分配数/live bytes 为 0；16MP 的 `Stats.memHighwater()` 约 65.9 MiB，远小于线性内存容量，表明该统计也不覆盖整个编解码器。预编译 JS 在这台机器初始化了 16 个 pthread Worker；`concurrency(1)` 不会消除预建线程池。不能把 libvips 的按需管线宣传为这条 RGBA→AVIF 路径的零内存优势。

同页多次调用的 engine ID 不变、初始化计数为 1。三个引擎均实测：启动 16MP 后由主线程终止 Worker、丢弃请求，然后创建新 Worker 成功初始化；观测到约 287 / 117 / 119 ms 后请求拒绝（包括启动/消息调度，非硬实时取消保证）。重建后的初始容量回到 16 / 16 / 256 MiB。实验按钮释放全部引擎后客户端集合为 0，页面离开也终止 Worker；操作系统是否立即归还内存没有测量。

真实 jSquash 初始化指向缺失 WASM 时，请求 404，Emscripten 将返回文本尝试编译而报 magic-word CompileError；实验页面明确反馈、终止失败 Worker，没有无限重试，随后正常引擎可重新初始化/解码。未来加载器应先检查 HTTP status、MIME 并提供清楚错误，不直接展示底层异常。损坏输入也产生受控错误，不转成其他格式。

本轮不运行 40MP：16MP 的容量已足以说明不能直接继承原生额度，特别是 vips 路线接近 2 GiB 线性内存上限。没有验证手机、浏览器 OOM/崩溃恢复或跨浏览器释放时机。

## 8. 按需加载、缓存与 EdgeOne 可行性

| 隔离浏览器步骤 | 实测结果 |
| --- | --- |
| 首次进入，不选择 WASM 格式 | 网络仅页面/脚本/清单/本地结果日志；没有 WASM 或编码 Worker |
| 首次明确选择 AVIF 引擎 | 创建 Worker，动态 import 对应编码器，独立请求 WASM；未加载其他两个引擎 |
| 同页重复执行 | 复用同一初始化 Promise/实例，无再次 WASM 请求 |
| 刷新与再次进入 | WASM Resource Timing `transferSize=0`，日志无重复实体传输；新 engine ID，仍重新初始化。一次刷新 jSquash 初始化 35.0 ms，含 Worker 往返 46.6 ms |
| 版本变化 | 实际下载 2.0.0 和 2.1.1 的编码 WASM，URL 分别含 `8f2342e147fa` / `d9f2a9516436`；浏览器计算响应 SHA-256 与各自预期一致，无旧字节冒充新版本 |
| 失败 | 真实缺失 WASM 只产生一次失败请求；明确错误、销毁失败实例，须用户再次操作；不自动无限重试 |

本地哈希资源响应为 `Content-Type: application/wasm`（JS 为 text/javascript）、`Cache-Control: public, max-age=31536000, immutable`、ETag、压缩时 `Vary: Accept-Encoding`，浏览器成功取用/解压。HTTP 缓存可能被清除或驱逐，不能保证跨访问永不重新下载；缓存字节也不等于缓存运行中引擎。

[EdgeOne Makers 官方限额](https://edgeone.ai/document/211893332490612736)当前列出单文件 25 MB。本次采用保守的 **25,000,000 B 原始单文件**比较：三个候选所需的各个 WASM 均低于上限，Magick x86 最大约 15.43 MB；总包体超过 25 MB 不等同于单文件超限。压缩体积变小也不能豁免原始单文件限制。

从静态资源角度可行；[edgeone.json 官方配置](https://pages.edgeone.ai/document/edgeone-json)支持响应头，可为版本化资源配置缓存及 MIME。vips 还需要主文档/Worker 的 COOP same-origin、COEP require-corp 和相容的子资源策略，部署影响明显大于 jSquash ST。**未部署 EdgeOne**，未实测其压缩、CDN 缓存、地域速度、实际响应头及跨源隔离效果；本地证据不能代替上线前 HTTP 验收。不需要本轮新增 COS/R2、Service Worker 或 IndexedDB。

## 9. 建议决策合同（仅设计）

| 任务条件 | 建议决策 | 失败/不可用行为 |
| --- | --- | --- |
| 静态 PNG/JPEG/WebP，原生真实探测通过，需求为普通 8-bit 转换 | 原生；保持当前流程与同格式 Quick passthrough | 错误可重试；不把输出格式偷偷换成 PNG |
| 用户明确需要 AVIF，浏览器真实编码探测通过 | 标准模式可优先原生；本次 Chromium 不满足此条件 | 不能由“可解码 AVIF”推导可编码 |
| 明确需要 AVIF，原生失败，允许加载且 WASM/预算满足 | 用户操作后按需加载 jSquash ST Worker；同页复用 | 加载/编码失败保持 AVIF 意图并报错；可重试，其他格式只能由用户重新选择 |
| 要求严格可复现的专业编码设置 | 固定版本 WASM 是候选，必须另外证明对应素材/质量收益 | 不用当前一类合成图直接承诺更优；未经验证的能力明确不可用 |
| GIF/BMP/AVIF 等新输入 | 浏览器解码可以复用，但先补真实结构、多帧与预算验证合同 | 当前仍不开放；不能跳过现有安全门禁 |
| 特殊 HEIC/TIFF 等格式 | 按实际需求单独比较 Magick 的固定 delegates 与许可成本 | 未测格式/变体、缺失编码器明确不可用 |
| 动画、HDR、ICC/CMYK/16-bit 保真 | 独立格式/保真任务；现有 Canvas 路径不足以承诺 | 不默默降为首帧/8-bit 后仍声称保真 |

最小接口可以只是图片工具内部的纯决策和适配器，不要求一个跨音频/视频的平台：

```ts
type ImageCodecPlan =
  | { kind: 'native'; format: ImageOutputFormat }
  | { kind: 'wasm'; format: 'avif'; encoderVersion: string }
  | { kind: 'unavailable'; reason: string };
// planImageCodec(intent, verifiedCapabilities, budget) -> ImageCodecPlan
// loadImageEncoder(version) -> 同页共享 Promise；首次用户操作后才调用
// encode(...) -> bytes；调用方仍校验真实格式/尺寸/回解码和当前任务版本
// cancel/dispose -> WASM Worker 可终止；原生仍需等实际操作结算
```

同格式替代引擎也必须满足用户的参数与保真语义，不能借“等价回退”暗改质量。失败的加载 Promise 应随失败实例清除，只有显式重试才重建；加载截止时间/Worker 终止应有明确错误。重型图片任务继续共用一个串行预算，禁止因为多了 Worker 就并发多个大图任务。音频、视频将来各自选择适合的编解码器。

## 10. 验证记录与保留材料

- `pnpm exec vitest run tests/browser-codec.test.ts tests/image-inspector.test.ts`：**2 文件、32 测试通过**。
- Chromium：六类输入、四类输出请求、EXIF 1–8、透明度/多帧边界；三引擎 1/4/16MP、jSquash 质量档、Worker 取消/重建、按需/缓存/版本/失败，以及真实 100% 局部画质检查。
- 外部 `verify-evidence.py`：**30 个输出完整独立解码通过，8 个 EXIF 样本一致**。研究 JS 的 `node --check` 通过；仓库文档做 `git diff --check`。本轮只有研究文档/静态数据，无需 Astro check 或两地区构建，也没有重跑完整图片实验矩阵。
- 仓库外保留 `package.json`/锁文件、`fixtures.py`、`build.mjs`、`build-workers.mjs`、`cache-version.mjs`、`server.mjs`、`worker.js`、`public/app.js`，及 `evidence/` 下原始结果、HTTP 日志、输出、独立校验与 `codec-comparison.png`。启动现有实验可在该目录执行 `node server.mjs`；这不是正式页面或生产构建入口。
- 本次已终止实验编码 Worker。实验脚本、第三方包和大型二进制均未加入仓库；摘要数据随报告保留。早期仅读头/错误调用 API 的探索记录不作为最终像素解码证据，最终 Magick 回调读取每帧像素、vips 强制 `writeToMemory()` 后才记录成功。

**尚未验证**：真实 iOS/Android、Firefox/Safari、40MP WASM、受控峰值进程内存、长时间批量循环/低内存崩溃、jSquash 多线程、广色域/高位深/专业色彩保真、动画往返、全部特殊格式、EdgeOne 实际托管以及公网下载。下一步应由明确的格式需求推动这些验证，不将研究结果直接升级为正式格式支持。
