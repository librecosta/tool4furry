# WebGPU、3D Gaussian Splatting 与浏览器图形技术路线调研

> 调研日期：2026-10-20  
> 项目：Tool4Furry  
> 状态：技术储备 / 尚未立项  
> 文档性质：研究与选型参考，不是开发任务单、版本承诺或新增发布门禁

## 1. 摘要与决策

**结论：保留 WebGPU 与 3D Gaussian Splatting（3DGS）作为按需引入的能力，不改造现有站点基础架构，也不在 Image Converter 尚未收尾时启动 3D 工具开发。**

- WebGPU 值得关注：除了 3D，也适合计算密集型图像处理；但不能假定它在所有设备上都可用或比 WebGL 更快。
- 3DGS 适合照片级真实空间、展馆或实景漫游；不应替代常规三维 Mesh、骨骼动画或 Shader 特效。可互动的 Furry 角色优先评估常规 GLB/glTF + Three.js。
- 当前仍采用 Astro SSG + React + TypeScript。工具本地处理、按需加载，GPU 能力不能成为普通工具页的运行前提。
- 若未来确有大型高斯场景需求，优先研究 PlayCanvas / SuperSplat 的 WebGPU 渲染与 WebGL 2 回退、SOG 和 Streamed SOG；若以 Mesh/角色为主，优先验证 Three.js。
- **按真实需求选型，不按“Canvas → WASM → WebGL → WebGPU”的固定顺序升级。** WASM 和 GPU API 不存在上下代关系。

与当前仓库的关系：遵守 [AGENTS.md](../../AGENTS.md)、[Foundation](../foundation.md)、[Tool Platform & Image Foundation](../tool-platform-image-foundation.md)。首页继续零客户端脚本与零 Island；正式工具保持 Registry 发布门禁、ToolRuntime / loader 按需导入及 Tool Module 自有状态；不引入全局画布引擎或新的全站运行时。

## 2. 技术层次与适用边界

| 层次 | 技术 | 主要职责 | 注意 |
| --- | --- | --- | --- |
| 页面与编排 | HTML/CSS/SVG、Astro、React、TS | 页面、SEO、输入、交互、状态、资源调度 | 常规 UI 不应依赖 GPU |
| 浏览器 2D API | Canvas 2D、ImageBitmap 等 | 图像预览、简单像素处理、输出 | 大图复制与主线程占用需控制 |
| CPU 计算 | JavaScript、Web Workers、WASM | 图像算法、解码、数据转换、复杂计算 | WASM 不自动使用 GPU；调用和内存复制有成本 |
| GPU API | WebGL 2、WebGPU | Shader 渲染、GPU 资源管理；WebGPU 另支持通用 GPU Compute | 可用性与性能因浏览器/驱动而异 |
| 引擎/库 | Three.js、PlayCanvas 等 | 场景、相机、资源、渲染器抽象 | 渲染后端迁移是否省力取决于是否使用定制 Shader |
| 资产与表现 | glTF/GLB、3DGS（PLY/SOG/SPZ 等） | 决定画面内容与格式 | 3DGS 是表示/渲染方法，不是另一种浏览器 API |

常见组合：WASM 负责解压场景，WebGPU 负责渲染；或 JS + Canvas 2D 完成简单图像特效。WebGPU 与 WASM 可以共存，但都不是另一个的前置条件。

WebGPU 仅能在满足安全上下文、浏览器/系统/驱动支持、GPU Adapter 和 Device 申请成功及所需限制可用时使用。不得将 `navigator.gpu` 存在视为“可稳定运行”。缺失功能或运行中 Device 丢失时须安全降级。参见 [MDN GPU](https://developer.mozilla.org/en-US/docs/Web/API/GPU) 和 [GPUAdapter](https://developer.mozilla.org/en-US/docs/Web/API/GPUAdapter)。

## 3. 3DGS 性能：公开基准与解读

PlayCanvas 于 2026-06-03 发布 SuperSplat WebGPU 与 WebGL 2 渲染器对比。其 WebGPU 路径利用 Compute Shader 执行可见性剔除、投影、排序。以下均为**厂商公布、特定设备/分辨率/场景的基准**，并非 Tool4Furry 实测，不能推断低端设备最低帧率。

| 设备 / 分辨率 | 高斯数量 | WebGL 2 | WebGPU | 加速 |
| --- | ---: | ---: | ---: | ---: |
| Apple M4 Max / 1298×962 | 100 万 | 137.2 FPS | 138.7 FPS | 1.0× |
| Apple M4 Max / 1298×962 | 1000 万 | 48.1 FPS | 124.1 FPS | 2.6× |
| Apple M4 Max / 1298×962 | 2000 万 | 22.3 FPS | 97.8 FPS | 4.4× |
| Apple M4 Max / 1298×962 | 3500 万 | 13.3 FPS | 75.8 FPS | 5.7× |
| iPhone 13 Pro Max / 642×1126 | 100 万 | 38.1 FPS | 77.6 FPS | 2.0× |
| iPhone 13 Pro Max / 642×1126 | 400 万 | 20.4 FPS | 42.4 FPS | 2.1× |

来源：[PlayCanvas — New in SuperSplat: WebGPU and Streaming Bring Huge Performance Wins](https://blog.playcanvas.com/new-in-supersplat-webgpu-and-streaming-bring-huge-performance-wins/)。

解释：
- 小场景的性能优势可能很低，大型高斯场景才更容易体现 WebGPU 排序/剔除的优势。
- FPS 同时受 GPU、分辨率/DPR、过度绘制、可见高斯数量、相机视角与浏览器影响；手机发热和连续运行稳定性不能通过单次基准证明。
- 本文**不设置通用最低硬件型号**，也不宣称任何 GPU/浏览器组合“必然流畅”。今后以具体样例资产在目标设备上实测决策。
- 桌面高性能设备可以选择高画质；普通笔记本、主流手机从低 LOD / 限制 DPR 开始；弱设备只显示静态预览或提供明确的关闭入口。

## 4. 资产体积、传输与内存

### 4.1 文件格式

| 格式 | 定位 | 取舍 |
| --- | --- | --- |
| PLY | 高质量原始/编辑/交换 | 文件可能达到数百 MB 至数 GB，不宜直接作为网页交付格式 |
| SOG | 单一压缩高斯场景 | 官方典型约比等价 PLY 小 15–20 倍，属于有损量化 |
| Streamed SOG | 大场景分块、空间树与 LOD | 首先显示粗略场景，再依视角加载所需细节；复杂度更高 |
| SPZ | 其他高斯生态的压缩交换 | 可用于互通；不必作为首选 Web 交付格式 |
| glTF/GLB | 常规 Mesh、材质、骨骼动画 | 适合可控角色/道具，并非高斯场景的直接替代 |

来源：[PlayCanvas Splat Formats](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/)、[SOG](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/sog/)、[Streamed SOG](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/streamed-sog/)。

压缩的“磁盘/网络体积”**不等于** GPU/CPU 驻留内存：解码、缓冲、排序、渲染目标及贴图都占空间。也不等于每次必须完整下载：Streamed SOG 能根据视角和预算按需传输，但总场景资源量仍存在。

### 4.2 初步传输预算（设计目标，未实测）

| 场景 | 建议的额外首轮下载目标 | 默认行为 |
| --- | --- | --- |
| 常规装饰性图形 | 低于 500 KB | 采用 CSS/SVG/静态图 |
| 小型 3D 吉祥物 | 约 1–3 MB | 可见且确需时才加载 |
| 小型 3DGS 展示 | 约 2–8 MB | 用户触发；超预算应降级 |
| 沉浸式场景 | 首轮约 3–8 MB | 静态封面 + 初级 LOD；后续按需流式加载 |
| 大型实景漫游 | 不承诺单次文件大小 | 必须使用流式/LOD，并测总传输 |

上述数字是**产品希望控制的额外传输预算**，不是厂商基准、普遍场景体积或发布时强制门槛；具体是否做得到必须拿真实素材验证，受引擎代码、资源格式、压缩率影响。若为了预算严重损失视觉价值，应重新判断是否适合做普通网页内容。

简单流量估算：每次冷加载额外 10 MB，10 万次冷加载约 1 TB 对外传输。CDN 缓存可节省源站回源，但不消除 CDN 出口流量与用户的下载量。

## 5. 适用场景：不要用 3DGS 解决所有 3D 问题

| 需求 | 首选方向 | 原因 |
| --- | --- | --- |
| 真实展馆、建筑、风景、可漫游的空间照片 | 3DGS + SOG/Streamed SOG | 照片级空间还原 |
| Furry 吉祥物、可控制人物、表情、提灯/背包动作 | glTF/GLB + Mesh/骨骼动画 | 动作、碰撞、重打光和资产制作链更成熟 |
| 科技感流光、粒子、品牌装饰 | CSS/SVG，必要时 Shader | 小型装饰未必值得加载 3D 引擎 |
| 上传 → 处理 → 下载的图像特效工具 | 优先 Canvas 2D / Worker | 不需要先做三维渲染架构 |
| 高吞吐图片运算 | 按瓶颈考虑 WASM 或 WebGPU Compute | 有性能证据再加入复杂性 |

3DGS 优势在于外观重建，但静态高斯难以直接拥有传统模型那样的骨骼、精确几何碰撞与常规材质重打光。训练/生成高斯场景还涉及拍摄素材、处理与潜在 GPU 成本；**网页渲染成本低不等于制作成本低**。

## 6. 开源与技术选型候选

- **PlayCanvas + SuperSplat Viewer / SplatTransform**：优先用于大型 3DGS、SOG 与流式 LOD 验证。参考 [SuperSplat Viewer](https://github.com/playcanvas/supersplat-viewer)、[SplatTransform](https://github.com/playcanvas/splat-transform)。引入任何仓库时另核实所用版本、LICENSE、第三方依赖和素材授权。
- **Three.js**：优先用于常规 Mesh、角色和中小型互动场景；其 WebGPURenderer 提供 WebGPU 与 WebGL 2 回退，但定制 Shader/后处理不能假定零迁移。参考 [Three.js WebGPURenderer](https://threejs.org/manual/pages/webgpurenderer)。
- **Spark 等 Three.js 高斯方案**：可作为 Mesh + 高斯混合场景的实验性候选，不预先绑定项目实现或格式。

本轮不选择唯一图形引擎，也不添加依赖。

## 7. 分阶段采用与迁移成本

**这是“触发式路线图”，不是必须完成的五个版本。**

| 触发条件 | 可以引入的能力 | 成本与注意事项 |
| --- | --- | --- |
| 当前 Image Converter 与常规工具 | 浏览器原生 API + TS | 现有基础；不做无收益重构 |
| 图片特效遇到主线程卡顿 | Worker / OffscreenCanvas（先验证兼容） | 中低；需调整数据与资源所有权 |
| 图片核心算法出现可证明的 CPU 瓶颈 | WASM | 中；涉及构建、内存复制、兼容 fallback |
| 出现可交互 3D 角色/场景 | Three.js 或 PlayCanvas + WebGL 2 | 中；独立按需加载的渲染模块 |
| 3DGS 大场景或明显的 GPU Compute 需求 | 高层引擎的 WebGPU 路径 + WebGL 回退 | 低至高：标准场景相对低，自定义 Shader/后处理可能较高 |
| 自己维护底层 WebGL 到原生 WebGPU 的迁移 | 尽量避免 | 高；资源、Shader、管线可能大幅重写 |

Three.js 官方指出：旧 `ShaderMaterial`、`RawShaderMaterial`、`onBeforeCompile` 以及旧 `EffectComposer` 不能直接照搬到新 WebGPURenderer；需要采用 TSL / 新的后处理体系。**抽象层能减少迁移范围，但不保证零成本。** 来源：[Three.js 官方迁移说明](https://threejs.org/manual/pages/webgpurenderer)。

架构边界：
- 图形渲染器留在未来具体的 Tool Module / React Island 内；UI、文件操作、SEO 和 Registry 继续由既有层持有。
- 禁止将大型 3D 引擎静态导入站点首页、通用 Layout 或全部 ToolRuntime。
- 图形源文件与交付资产分开管理；保留可编辑源格式，不让业务 UI 直接依赖某一压缩格式。
- 不新建“万能渲染器”或全站 WebGPU Provider；待真实工具落地时再设计最小接口。

## 8. 未来图形能力的六条性能约束（本轮共识）

1. **普通工具页不得依赖 GPU。** 缺失 WebGPU/WebGL 或硬件加速失败，不影响站点与无关工具的基本使用。
2. **3D 引擎必须延迟加载。** 仅在进入对应能力、内容可见且有必要时加载；重量级场景优先由用户触发。保持现有首页零 JS/Island 约束。
3. **可视化必须能静态降级。** GPU 申请失败、设备丢失、资源失败、设备性能不足时，使用封面/静态预览或清晰的错误提示，不让整页崩溃。
4. **用户可以关闭复杂效果。** 尊重 `prefers-reduced-motion`、触摸设备体验、移动设备节能诉求；不强制持续动画。
5. **渲染质量可调整。** 按设备能力和实际帧率控制渲染分辨率/DPR、LOD、帧率及高斯数量；优先稳定体验，不把“60 FPS”当成全设备保证。
6. **场景资产与引擎代码分离。** 保留源文件、转换过程与压缩产物的边界，便于以后更换渲染器、编码或 CDN 交付策略。

这些是**未来引入复杂图形功能时应遵守的设计原则**，并不是要求现阶段为所有工具加入 GPU 监控、画质菜单或降级管理器。

## 9. 如真正立项，做一个最小验证即可

建议只选择一份小型 GLB（可动画）和一份经过授权的 SOG / Streamed SOG（实景）做概念验证；分别测：首次传输体积、首次可交互时间、场景初始化、典型视角 FPS、连续使用后的帧率变化、峰值内存（如果工具能可靠观测）、卸载后的资源释放。桌面 Chromium + 一台实际手机先足够，避免为尚未立项的方向跑完整浏览器矩阵。

只在验证结果显示真实价值时继续，例如：沉浸体验明显优于普通图像/视频展示，目标设备上可流畅运行，流量成本可承受，且页面与工具原有性能不被污染。否则搁置 3DGS，将投入继续用于 Image Converter、图像特效或其他更有明确用户需求的工具。

遵守现有 [L1/L2/L3 政策](../../AGENTS.md#mvp-beta-release-policy-2026-10-10)：文档调研不构成 Beta 发布门；未测环境必须如实标注，未来实施时按实际风险做定向验证。

## 10. 参考资料与有效期

主要参考（截至 2026-10-20 阅读；外部技术、兼容性与版本可能变化）：

1. [PlayCanvas，2026-06-03：WebGPU / WebGL 2 3DGS 基准与流式升级](https://blog.playcanvas.com/new-in-supersplat-webgpu-and-streaming-bring-huge-performance-wins/)
2. [PlayCanvas：Gaussian Splatting 总览](https://developer.playcanvas.com/user-manual/gaussian-splatting/)
3. [PlayCanvas：Splat 文件格式与压缩定位](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/)
4. [PlayCanvas：Streamed SOG 格式](https://developer.playcanvas.com/user-manual/gaussian-splatting/formats/streamed-sog/)
5. [PlayCanvas：性能与全局 Splat 预算](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/performance/)
6. [Three.js：WebGPURenderer 与迁移限制](https://threejs.org/manual/pages/webgpurenderer)
7. [MDN：GPU / WebGPU 可用性与安全上下文](https://developer.mozilla.org/en-US/docs/Web/API/GPU)
8. [SuperSplat Viewer 开源仓库](https://github.com/playcanvas/supersplat-viewer)
9. [SplatTransform 开源仓库](https://github.com/playcanvas/splat-transform)

**尚未验证**：Tool4Furry 自有 WebGPU/3DGS 原型，实际用户硬件分布、任何具体资产的压缩效果/内存/带宽、各平台连续负载的实际性能、投入产出与独立 SaaS 付费需求。本报告只能支持“是否值得进一步做原型”的判断，不能当成生产上线测试结果。
