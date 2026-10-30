# V0.6-C2-A：AVIF 质量与元数据评估

日期：2026-10-30。生产代码基线：`1456402`。**仅研究，没有增加正式 AVIF 支持或改变元数据行为。**

结论：Q55 / Speed 6 值得保留为 AVIF 候选，但不能直接冻结为所有图片的默认值。文字彩边更依赖 4:4:4；透明素材还必须独立决定 Alpha 质量。Speed 8 快、内存较低，但细纹理损失可见。AVIF 应有独立预算，不能继承原生 40MP。

隐私结论：现有 Quick 同格式直通确实保留 GPS 等来源信息；下阶段应优先实现受限、可验证的无损容器清理，而不是默认再次有损编码。方向、ICC 和来源凭证必须单独处理。

## 1. 证据与复现边界

- C1 资料实际位于 [报告](image-codec-evaluation.md) 与 [数据](image-codec-evaluation.data.json)，本轮开始时均已存在于工作区，尚未入库；本次一并归档，未冒充本轮复测。
- 本轮 [结构化数据](image-codec-c2a.data.json) 包含 39 个质量/重复任务、4 次全新 Worker 预算、终止/恢复、16 个元数据重编码、11 个现有校验入口用例、3 个真实 Session Quick/Advanced 对照及 66 个输出的独立解码/SHA-256。
- 环境：Windows、Ryzen 7 5800H、16 逻辑核、33,719,382,016 B 物理内存；内置 Chromium `156.0.0.0`；DPR 1 原尺寸裁切；Python 3.12.14、Pillow 12.3.0、NumPy。没有移动真机、Firefox/Safari、HDR/广色域验收。
- 全部程序、依赖、输入、输出、浏览器截图在仓库外 `../.validation/image-codec-c2a/`；复用 `../.validation/image-codec-v06c1/node_modules/`。服务仅监听 `127.0.0.1:4440`，没有上传用户图片。实验依赖未加入项目依赖或生产构建。
- 复现：运行 `fixtures.py` → `metadata.py` → `node build.mjs` → `node server.mjs`；浏览器依次运行质量、全新 Worker、元数据、取消；再运行 `preserve.py`，刷新后执行校验入口和 Session 审计；`analyze.py` / `export-data.py` 汇总。使用已有 `face.dat`、包锁和 WASM；这是本机隔离实验目录，不是新的开发流程或可随仓库独立运行的测试套件。

**口径**：每配置一次顺序 wall-clock 观测，明确命名的重复任务除外；非中位数/性能排名。编码时间不含下载、初始化、跨 Worker 传输、回解码、指标计算和落盘。原生 `toBlob` 仍包含浏览器异步排队；未控制温度与系统负载。全部 66 个输出在浏览器检查之外使用 Pillow 完整解码，核对格式、尺寸、单帧和哈希。WASM 结果的 Blob MIME 是适配器赋值，独立文件头/解码才是格式证据。

PSNR 使用 8-bit RGB MSE；SSIM 是明确实现的 **8×8 不重叠亮度块**版本（Rec.709、总体方差、C1=6.5025、C2=58.5225），不是 Gaussian-window 参考 SSIM，也不作为视觉通过阈值。透明图另算黑/白合成 PSNR、Alpha PSNR/最大误差；隐藏 RGB 和浏览器预乘往返会使其原始 RGB PSNR/SSIM 失真，不能据此判断透明素材画质。JSON 的 `null` PSNR 表示像素相同、理论无穷大。

## 2. 样本与编码配置

| 样本 | 尺寸 / 输入 PNG 字节 | 来源与用途 |
| --- | --- | --- |
| character | 1024² / 19,099 | 自制动物角色：平涂、轮廓、背景渐变 |
| detail | 1024² / 108,282 | 自制角色叠加固定种子细纹理、暗部及弧线 |
| manga | 1024² / 51,760 | 自制高反差网点、细线、红蓝绿文字 |
| alpha | 1024² / 76,099 | 自制连续 Alpha、半透明轮廓和低透明细线 |
| photo | 1024×768 / 1,177,535 | SciPy `dataset-face` 的真实浣熊照片；已处理的照片，不是相机 RAW |
| 预算 | 2048²；2830² | 自制 character/detail 按目标分辨率重绘；精确像素 4,194,304 与 8,008,900，表中简称 4MP / 8MP |

照片通过 [SciPy 数据说明](https://docs.scipy.org/doc/scipy/reference/generated/scipy.datasets.face.html) 追溯至 Judy Weggelaar 的 [Pixnio CC0 图片](https://pixnio.com/fauna-animals/raccoons/raccoon-procyon-lotor)。其他样本是本轮自行编写 Pillow 图元，不使用品牌图形或未经授权作品。**它们覆盖编码缺陷，但不能代替真实完成度 Furry 插画/漫画的维护者审美验收。**

沿用 C1 `@jsquash/avif@2.1.1`，直接初始化单线程 `avif_enc.js`，普通无 COOP/COEP 页面；未加载多线程或其他图像引擎。WASM SHA-256：`d9f2a95164362af48558d176e619becfd49dd97b50b86c679b47100860522b3d`。原始 3,485,872 B / gzip 1,125,519 B / Brotli 842,416 B；都是已有 C1 同一资源。npm `gitHead` 为 `b7fa9ac9ec02f224847ad23d19d115f9e296a368`。

Q50/55/60、Speed 6 为核心；character/manga 增加 Q75；manga/photo/alpha 及两个较大尺寸比较 Q55 Speed 8；manga 小范围比较 4:4:4；alpha 增加 `qualityAlpha:100`。其余为包内默认值：8-bit、subsample=1、qualityAlpha=-1、tune=0、无额外平铺/降噪/SharpYUV。已核对[对应提交的 C++](https://github.com/jamsinclair/jSquash/blob/b7fa9ac9ec02f224847ad23d19d115f9e296a368/packages/avif/codec/enc/avif_enc.cpp)：1=4:2:0、3=4:4:4，Alpha=-1 跟随质量，tune=auto 在本轮 Q 值使用 SSIM 调优。原生 WebP Q85 为对照，质量数字不等价；未增加不必要的 JPEG 质量矩阵。

## 3. AVIF 画质、体积与速度

单元为 **输出 KiB / 编码秒 / RGB PSNR dB**；透明行最后一项改用黑底合成 PSNR。

| 样本 | AVIF Q50 S6 | AVIF Q55 S6 | AVIF Q60 S6 | 原生 WebP85 |
| --- | --- | --- | --- | --- |
| character | 5.49 / 1.819 / 42.51 | 5.84 / 1.430 / 43.11 | 6.24 / 1.401 / 43.74 | 29.58 / 0.056 / 43.19 |
| detail | 31.08 / 3.374 / 35.51 | 33.08 / 3.131 / 35.81 | 34.36 / 3.175 / 36.00 | 110.93 / 0.071 / 35.45 |
| manga | 14.94 / 2.184 / 29.77 | 15.57 / 2.100 / 29.79 | 15.88 / 2.145 / 29.81 | 67.12 / 0.057 / 30.35 |
| alpha | 12.45 / 3.381 / 38.10 | 13.77 / 3.332 / 38.20 | 15.27 / 3.369 / 38.24 | 78.90 / 0.159 / 38.58 |
| photo | 61.77 / 1.065 / 35.59 | 77.41 / 1.080 / 37.27 | 90.67 / 1.105 / 38.69 | 138.98 / 0.075 / 39.17 |

实测 Q55 S6 比 WebP85 小约 44–83%，但编码明显较慢；不能据此认为同等质量。照片 Q60 比 Q55 更能保留细毛发，体积也增加约 17%。平涂/纹理样本 Q55 没有明显整体损伤，但细轮廓仍有轻微软化。已在 Chromium 看过五类样本的 100% 裁切，而非只看缩略图或统计值。

**文字/线条**：Q55 4:2:0 为 15,944 B / 29.79 dB；4:4:4 为 16,589 B / 46.32 dB（约增 4%），彩色字边明显更干净。Q75 4:2:0 仅到 29.88 dB；Q75 4:4:4 为 19,525 B / 48.34 dB。提高 Q 无法消除本样本色度抽样的主导损失。character Q75 为 7,297 B / 44.39 dB，但不足以证明所有角色插画都需要它。

**Speed 8**：photo Q55 从 1.080s → 0.354s，79,263 → 80,161 B，37.27 → 36.75 dB；detail 4MP 从 9.261s → 0.696s，70,230 → 135,933 B，38.38 → 35.56 dB，SSIM8 从 0.998800 → 0.973156。浏览器原尺寸可见细线周围涂抹/软化，不能因为更快就全局替代 S6。

**透明边缘**：Q55 默认 Alpha 跟随 55，Alpha PSNR 54.97 dB、最大误差 14；S8 最大误差升至 86。Q55 S6 + Alpha100 的 Alpha 完全一致，61,544 B / 4.070s，黑/白合成 PSNR 约 38.24 dB；原生 WebP Alpha 也完全一致。Alpha100 比默认 14,097 B 明显大，仍比 WebP 80,792 B 小约 24%。棋盘上默认 S6 边缘基本连贯，S8 更软；精确透明度不应静默变为有损。

**候选，不是生产冻结**：连续色调优先 Q55/S6/420；文字/漫画优先继续评估 Q55/S6/444；透明素材优先 Alpha100。S8 只适合作为明确的快速质量取舍候选。下一步用少量获准真实作品确认这些规则，不增加自动内容分类器，也不把不同编码器的 Q 值映射成等价质量。

## 4. 独立 AVIF 预算与生命周期

全新 Worker、Q55、detail；容量是调用后的 **WASM 线性内存容量**，不是活跃堆、峰值 RSS 或整浏览器内存。

| 尺寸 | S6 秒 / MiB | S8 秒 / MiB |
| --- | --- | --- |
| 2048² | 11.962 / 376.12 | 0.875 / 151.06 |
| 2830² | 24.993 / 682.50 | 1.689 / 283.75 |

复用 Worker 时 detail 4MP 首次 9.261s，随后三次 9.394/9.831/9.762s，结果字节相同，容量均保持 432 MiB；8MP 后达约 710.56 MiB，不会自动缩回。短序列没有持续增长证据，也不能据此宣称没有长期泄漏。**C1 16MP/459 MiB 不能外推为本轮更复杂内容的上限**，本轮因此不测 16MP。

此外，4MP/8MP 每份 RGBA 约 16/30.55 MiB，主线程像素、转移副本、Canvas、回解码、输出和浏览器本身都会叠加。`performance.memory` 仅作主线程诊断，未覆盖 Worker/Canvas/GPU；未获得可靠进程峰值或 GC 后 RSS，不能把这些容量相加当作实测总内存。

编码开始通知后约 60ms 终止 8MP Worker，未得到旧任务结果；新 Worker 初始化 24.4ms、初始容量 16 MiB，成功编码 1MP（1.576s）。这证明隔离 Worker 可硬取消并恢复，不证明操作系统立即回收全部 RSS。正常任务复用同一引擎；未来可在高水位任务结束/空闲或工作区卸载时回收 Worker，取消后必须更换实例并隔离晚到结果。不能把这种硬取消规则套到不可中断的原生 Canvas 通道。

| 候选用途 | 像素 / 单边 / 超时 / 并发 | 证据等级与准入 |
| --- | --- | --- |
| 桌面首轮 AVIF | ≤4,000,000 / ≤2048px / 30s / 1 | 本机相邻 4.19MP 已完成，属有限实测；30s 为建议策略，不是低端设备保证。需独立输入、解码、RGBA 和输出预算，不继承 40MP |
| 桌面 8MP | 暂不开放 | 实测可完成，但 S6 达 25s、线性容量约 683MiB，不足以作为默认额度 |
| 移动/未知设备 | 暂不准入；后续从 ≤1MP / ≤1024px / 30s / 1 开始真机验证 | **全部待测策略**，不是已验证移动预算；手机模拟视口没有内存证明力 |

以上只是研究建议，未改现有原生 100/50 张、像素、单边、超时或 ZIP 额度。没有构建设备评分系统。

## 5. 现有元数据行为与实际清理

审计 `inspect-image.ts`、`browser-codec.ts`、`session.ts`、`presets.ts` 及文件/输出校验：

- Inspector 识别格式、结构、CRC、尺寸、动画/MPF 和 IFD0 Orientation，**不是隐私扫描器**，不会删除 GPS、XMP、IPTC、文本或 ICC。
- `acceptImage` 保留原字节，以 `createImageBitmap(from-image)` 验证实际解码和方向尺寸；资源由 `ImageResources` 所有。
- Quick 同格式用 `source.blob`，不经过编码和新输出验证；Advanced 才 Canvas 重编码。格式/参数版本隔离旧结果，命名与模式切换本身不编码。没有 metadata policy 或对应版本。
- 隔离页面直接导入现有 Session（不修改源码），JPEG/PNG/正常方向 WebP 三例 Quick 输出均为 passthrough、逐字节相同，测试 GPS/作者/设备/时间仍在。Advanced 手动生成后测试隐私字段消失。每个 Session 6 个 Bitmap 全关闭、4 个 Canvas 全释放，没有创建 URL。

样本 256×160：虚构相机/作者/版权/时间和明显标为测试数据的 GPS；XMP 描述；JPEG APP13 IPTC 作者、COM；PNG tEXt/zTXt/iTXt；真实生成的 sRGB ICC；EXIF Orientation=6。AVIF 用 Pillow 写入 EXIF/XMP/ICC，仅作为输入夹具，不参与编码性能比较。

### 无损清理原型（已测，非生产库）

| 格式 | 原型处理 / 原始→清理字节 | 实测结果与限制 |
| --- | --- | --- |
| JPEG | 清除 EXIF 隐私、XMP、IPTC、COM；5102→4499 | 保留最小 Orientation=6、ICC、编码表/扫描数据；压缩载荷哈希及 Pillow/浏览器显示像素相同。**仅基线 JPEG 夹具**，非渐进/多扫描/CMYK 通用实现 |
| PNG | 清除文本、时间、EXIF 隐私；2394→1786 | 保留最小方向、ICC 和必要色彩/透明度块；IDAT 等编码载荷相同，CRC 正确，显示像素相同；未知块/APNG 拒绝，不盲删全部 ancillary |
| WebP | 删除 XMP、EXIF 隐私；2238→1750 | 保留最小方向、ICCP、VP8/VP8L/ALPH；更新 VP8X 标志、RIFF 长度和偶数字节填充。压缩载荷/ICC 相同，但本 Chromium 的非1方向兼容性未通过，见下文 |
| AVIF | 未制作无损写回器 | EXIF/XMP item、ICC/colr、方向属性及 iloc 等关联需要 BMFF 重封装；不直接删除字节或盒子，**暂不可用** |

三个原型保留的 ICC SHA-256 与来源相同；Pillow 方向后像素完全一致。浏览器清理前后同样逐像素相同，但 WebP 两者都未按 EXIF 旋转，不能当成正确方向通过。负例覆盖 PNG CRC 损坏、WebP 截断、APNG 标志、未知 PNG 块，均拒绝。

**方向边界**：JPEG、PNG 的 Orientation=6 在 Chromium 正确得到 160×256；WebP 的 EXIF=6（带/不带 `Exif\0\0` 前缀）在 Bitmap 和 HTML Image 都仍为 256×160。项目现有 `acceptImage` 将其判为 `decode` 并关闭 Bitmap，**没有让错误方向进入转换**。隔离的裸 Canvas WebP 四种输出虽然格式/解码成功、元数据清掉了，方向却不对，JSON 已标为失败；不计作可用管线。AVIF 输入夹具浏览器方向正确，但尚未作为正式输入被接受。

### 重编码清理（已测）

四类输入各转 PNG/JPEG/WebP/jSquash AVIF，共 16 个输出，独立解码并按容器和解压后的文本检查：均不含测试 EXIF/GPS、XMP、IPTC、文本字段；方向正确性需排除上述 WebP 源四例。C2PA 没有签名样本，本项不宣称验证它。

代价例子：同格式 JPEG 5102→3157 B、2.4ms，PSNR 42.33dB，已二次有损；PNG 2394→2916 B，像素完全相同但体积变大（此次 toBlob wall-time 871ms，含调度，不能作为编码核心速度）；AVIF 小样 62–89ms。原生 JPEG/WebP 输出生成了 **456 B 的 sRGB ICC**，不是来源的 588 B；PNG/AVIF 此组无 ICC。仅证明这批 sRGB 样本的行为，不证明广色域正确保留或全局删除所有可能的元数据。

## 6. 清理 / 保留能力矩阵

| 数据类型 | JPEG | PNG | WebP | AVIF |
| --- | --- | --- | --- | --- |
| 时间/设备/GPS、作者等 EXIF | 测试字段可无损删除 | 测试字段可无损删除 | 测试字段可无损删除；方向非1待解决 | 重编码测试清掉；无损重封装未验证 |
| XMP/IPTC、描述/版权 | XMP+APP13 IPTC 可移除 | 文本/XMP 可移除；不泛化所有私有块 | EXIF/XMP 块可移除 | EXIF/XMP 重编码清掉；任意 item 未覆盖 |
| Orientation | 无损保留最小方向；重编码归1 | 同左 | 容器可保留，但当前浏览器方向兼容失败 | 本输入回解码正确；无损方向编辑未验证 |
| ICC / 色彩 | 不改像素时可原样保留 | 同左；还需保留适用颜色块 | 不改像素时可原样保留 ICCP | 重封装未验证；jSquash RGBA 接口没有 ICC 写入参数 |
| 主动保留少量字段 | JPEG 源→JPEG/PNG/WebP 的作者/版权白名单原型已测 | 输出 eXIf 可写 | 输出 EXIF/VP8X 可写 | 浏览器端写回未验证，暂不可用 |
| C2PA | 仅规范研究，未验证签名 | 同左 | 同左 | 同左 |

已制作 JPEG 源→JPEG/PNG/WebP 的作者/版权白名单回写，Orientation 归1，不复制 GPS；输出压缩载荷不变，Pillow 读到字段，项目现有入口通过 160×256。**仅证明这三条受限组合，不等于完整 EXIF/XMP/IPTC 跨格式迁移**。另一负例将旧 Orientation=6 整份复制到已经旋转的 JPEG，确实再次变为 256×160；因此不能回贴整包 EXIF，缩略图和尺寸标签也必须重建或删除。

ICC 是颜色解释，不等同于 GPS。无损清理可以保留经验证的色彩描述；经过 Canvas 色彩转换后，不能再给 sRGB 像素贴原 Display-P3/AdobeRGB ICC。广色域/HDR/CMYK、渲染意图、ICC 私有/描述字段的隐私审计本轮未验证，先不承诺原样保留。内嵌水印/像素隐写也不在“元数据清理”保证范围。

官方约束：[PNG 规范](https://www.w3.org/TR/png-3/) 的块/CRC/色彩关系、[WebP RIFF 规范](https://developers.google.com/speed/webp/docs/riff_container) 的标志/顺序/填充必须保留；未来可评估 [libwebp mux](https://developers.google.com/speed/webp/docs/container-api) 避免自行维护广泛封装。根据 [C2PA 规范](https://spec.c2pa.org/specifications/specifications/2.5/specs/C2PA_Specification.html)，签名与内容绑定及载体定位需要专门验证；转换后复制 APP11/caBX/JUMBF 或 BMFF 凭证不等于有效来源。默认清理应识别并移除凭证载体或明确拒绝，不能宣称“保留有效签名”；保留/重签、外置凭证验证均暂缓。上述规范结论不是本轮的签名实测。

## 7. Quick 与后续正式集成决策

| 条件 | 建议行为 |
| --- | --- |
| 用户明确保留，且同格式无需像素/参数变化 | 可原字节直通；明确保留 GPS 等信息，不作默认去隐私承诺 |
| 默认清理，已通过完整容器审计确认无需修改 | 可原字节直通；不能只看后缀、Orientation 或缺少某个 marker |
| 默认清理，同格式，存在支持的隐私元数据 | 无损重封装，保留编码数据、必要方向与色彩；清理后再次验证策略和真实显示 |
| 无损清理无法可靠覆盖 | 不静默直通；明确告知需要重编码及质量/体积/色彩代价，由用户选择，或标记不可用 |
| 原本就要跨格式/修改像素 | 方向只应用一次后重编码，检查输出容器；不得无验证复制旧 ICC/EXIF/C2PA |
| 非1方向 WebP、未知私有块、未支持 AVIF 重封装 | 当前保持拒绝/明确不可用；先补可靠性，不为了“成功”绕过校验 |
| 主动保留受支持字段 | 只开放验证过的组合/白名单；GPS、设备、时间的暴露须明确提醒并主动同意，默认关闭；C2PA 有效保留不开放 |

下阶段最小实施范围：

1. 元数据策略加入任务参数/结果一致性版本，命名仍不重编码；Quick 先走策略决策，ZIP 和单项下载只接受已满足策略的当前输出。不能选“移除”却由 passthrough 绕过。
2. 先实现静态 JPEG/PNG/WebP 的有界容器清理、未知块拒绝和重新验证，补渐进 JPEG/方向1–8/调色板与透明结构的针对性夹具；保留策略与像素编码分离。**本轮 Python 原型不直接搬成生产解析器。**
3. AVIF 若获准，独立按需单线程 Worker、资源预算和硬取消，明确 Q55/S6、文字色度、Alpha 取舍；WASM 失败不偷偷改输出格式。继续原生优先，缓存和引擎复用沿用 C1 建议，不提前搭媒体平台。

正式 AVIF 最小新增依赖候选仍是 jSquash（Apache-2.0），需要保留 [jSquash LICENSE](https://github.com/jamsinclair/jSquash/blob/b7fa9ac9ec02f224847ad23d19d115f9e296a368/LICENSE) 及实际构建的 libavif/libaom 等第三方许可/通知，不能用根包许可代替所有二进制通知；[libavif LICENSE](https://github.com/AOMediaCodec/libavif/blob/main/LICENSE) 说明其中存在多项许可。现有 ST WASM 原文件约 3.49MB，不超过 C1 核对的 EO 单文件限制，但本轮没有部署验证或重新审计 EO 规则。无损清理未证明必须引入运行依赖；自行解析需承担长度/偏移/CRC/未知元数据及拒绝服务风险，jSquash 本身不提供通用元数据写回引擎。

明确暂缓：生产 AVIF、移动端准入、8/16MP 默认额度、完整元数据保留 UI、广色域/ICC 转换承诺、有效 C2PA 保留/重签、综合图像框架。真实作品审美、低内存桌面/移动真机与长期 Worker 内存仍需单独验收。

## 8. 本轮验证

Chromium 实际编码/原尺寸视觉检查、66 个输出的独立完整解码、压缩载荷及 ICC 哈希、PNG CRC/RIFF 结构负例、方向与二次旋转负例、现有 Session 三格式隐私复现、终止 Worker 后恢复均已完成。结构化数据记录未通过的 WebP 非1方向，未将其算作方向正确。

按 AGENTS L1，本次仓库只增加研究 Markdown/JSON；执行数据断言、链接/数值一致性检查及 `git diff --check`，不重复无关 Vitest、`pnpm check`、双地区构建或完整编码矩阵。生产源码、依赖、Registry/draft、资源限制和发布配置未修改。
