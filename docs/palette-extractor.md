# Palette Extractor · 当前实现

第三款工具，CN/Global、zh/en 均为 **Draft**，只在 DEV 的 `/tools/palette-extractor/`（以及同地区语言前缀路径）可用。A2-B 完成功能，A2-C1 调整工作区与交互；现有两款 Published 工具、生产页面和部署状态不变，尚未完成 Palette Beta 资格验收。

## 模块与所有权

- [工具实现](../src/tools/palette-extractor/PaletteExtractor.tsx)：Form Wide、单图导入、稳定 ID 色卡、完整 HEX 提交、复制/排序/删除、覆盖确认。
- [session](../src/tools/palette-extractor/session.ts)：复用 `acceptImage`、`decodeChecked`、`ImageResources`、设备 `ImageLimits` 与既有 `SerialJobs`；版本隔离、串行原生任务、过期导出作废、资源释放均由工具拥有。不修改 Image Core 或两款正式工具。
- [palette](../src/tools/palette-extractor/palette.ts)：有界像素过滤、Color Thief 候选量化、六种倾向与近色去重、contain 坐标映射。
- [ImageSampler](../src/tools/palette-extractor/ImageSampler.tsx)：复用 Image Core 的 `preview-geometry` 视图数学，拥有适应/缩放/平移与单实例专注模态框；鼠标/触摸 Pointer Events、目标色卡、Escape、9×9 预览像素放大镜。移动鼠标不解码、不量化、不创建 Blob。
- [render](../src/tools/palette-extractor/render.ts) / [ShareDialog](../src/tools/palette-extractor/ShareDialog.tsx)：同一套 Canvas 几何、字体测量、PNG 预览/导出、有效版本下载与可用设备的文件分享。没有全站分享框架、Worker 或持久化。
- [静态内容](../src/site/palette-extractor-content.ts) / [定义](../src/tools/palette-extractor/definition.ts)：双语 SEO、H1、3 步说明、4 项限制、4 项 FAQ；Registry 与字面量 Loader 沿用统一编译期资格。DEV 画家/动画师展示走既有手选 ID 与发布过滤。

稳定边界见 [图片处理契约](../contracts/image-processing.md)、[发布契约](../contracts/publication.md)。数值和实际行为以源码与测试为准。

## 提色与编辑

只接收一张经过现有内核检查的静态 PNG/JPEG/WebP/受支持 AVIF。方向校正后的显示位图最长边 1600px，分析图最长边 640px；量化前均匀抽取最多约 32768 个有效像素。原图不上传、不修改、不持久保存。导入 AVIF 不加载编码 WASM。

新增固定依赖 `colorthief@3.5.0`，使用已核对的浏览器 ESM `getPaletteSync(ImageData, …)`、OKLCH/sRGB、`ignoreWhite: false`。浏览器入口不引入 Node 的 sharp；锁文件中的可选 sharp peer 复用 Astro 已有依赖，没有新增综合图像引擎。[完整 MIT 通知](../src/tools/palette-extractor/colorthief.NOTICE.txt) 仅由工具懒加载入口引用，生产 Draft 构建排除该文件。

Alpha=0 在调用量化库前始终排除；存在不透明内容时阈值为 192，否则降到不超过 96 的有效阈值。全透明图片明确失败，不把隐藏 RGB 当成色彩。候选取较丰富的 20 色，结合真实面积、OKLCH 明度/色度与差异度排序；排除极小噪点与近重复颜色。Balanced/Colorful/Bright/Muted/Deep/Dark 是本工具的倾向，不能视作 Adobe Color 算法。

默认均衡六色，自动目标 3–10，手动结果 1–10；少色图不补造颜色。模式/目标变化复用候选，不重新解码。编辑后的重新提取需要确认；取消保持原结果。新增取消不创建空卡，未完成 HEX 不污染有效颜色。主题、Resize、模板以及组件 locale 属性更新不改变配色。维护者已确认保留现有完整页面语言导航，跨页面会话保留留待 A2-C 讨论，不由本工具另建存储系统实现。

## PNG 与分享

基础 PNG 为按当前顺序排列的颜色和 HEX。分享仅三套：

| 模板 | 尺寸 | 布局 |
| --- | --- | --- |
| Character Study | 1080×1350 | 作品在上，标题和完整配色在下；7–10 色为两行 |
| Gallery | 1200×1200 | 左侧 contain 作品，右侧编号/HEX 纵向色卡 |
| Color Story | 1600×900 | 宽幅 contain 作品，底部贯穿色带 |

作品来自有界预览，不承诺原始超大图逐像素保真。标题最多 120 个 UTF-16 code units；加载现有本地字体，按实际字宽/字素测量至两行，超长省略。中文、英文与常见系统 Emoji 可用；Emoji 字形受操作系统字体影响。颜色上文字选择对比度更高的黑/白；小型署名默认开启、可关闭。

界面预览就是最终完整尺寸 PNG 的缩放展示，避免两套布局分叉。每次输出都通过现有 PNG 格式、尺寸、完整解码与 privacy-v1 校验。图片、颜色、模板、标题或署名变化立即使旧结果失效；最新导出请求替代等待中的请求，原生任务仍遵循单通道收尾。关闭/卸载回收结果 URL。

系统分享仅在 `canShare({files})` 与 `share` 都可用时显示；点击前已准备当前有效 PNG，调用位于用户激活处理内。取消不报失败，真正失败有提示；下载独立可用。不生成链接、不上传分享图、不连接外部账户。

## A2-C1 工作区与过渡

Form Wide 内改为纵向：紧凑导入/参数 → 宽幅取色工作区 → 单行色卡 → 操作区。提色倾向和分享模板使用公共 SelectField；自动目标 3–10 用原生 Radio 语义的紧凑组（不是原生下拉），保留方向键与覆盖确认。色块 48px；窄屏次级 RGB/排序/删除在可点击的 Popover 内，不挤占 HEX 输入。

取色与平移互斥。支持适应、预览位图 100%、缩放、键盘 +/-/0/1 和方向键平移；专注窗口保持同一视图状态，只有一个交互采样实例。触屏在普通视图未取色时保留页面纵向滚动，在专注视图内可平移；启用吸管后按住移动、松开提交。取色时第一个 Escape 取消，随后 Escape 关闭专注窗口；关闭后返回入口焦点。缩放、平移、弹窗的 CSS 缩放过渡均纳入坐标映射，留白、棋盘格、透明像素及视口外位置不采样；替换图片释放指针、退出取色与专注状态。

三款工具复用公共控件过渡：通常反馈 200ms、局部模式/单选/色卡选中 280ms、Dialog 300ms ease-out；共用 [motion](../src/styles/motion.ts)，不改变主题调色板。Focus outline / 输入焦点阴影立即可见，不参与淡入；Reduced Motion 的过渡为 0ms。Canvas 视图位置不加 CSS 过渡，状态更新和取色不延迟。三套模板的绘制与排版、量化及预算未改动。

## A2-C1 定向验证

- `pnpm check`：284 文件，零错误/警告/提示；11 个相关测试文件、124 项通过，覆盖三个工具 UI、原语、视图几何、Palette 状态及分享失效。新增缩放/平移后的真实像素映射、旧源手势丢弃、目标数量方向键、单行编辑与 Portal 单实例/焦点返回回归。
- CN/Global 正式构建与既有守卫通过：仍各有两款 Published 工具；无 Palette 页面、私有实现或 Color Thief/NOTICE 泄漏。没有修改 Registry、Loader 或生产资格。
- Chromium：CN 中文 Light/Dark，1440/1200px 桌面与 320px；Global 英文 Dark、390px。实际检查零原生 select、3–10 单选、覆盖取消、缩放/平移/100%/适应、透明拒绝、自动退出取色、专注窗口目标切换/两次 Escape/焦点返回、手机更多菜单与排序；320px HEX 输入为 92px、图标有效区域 44px，无横向溢出。
- 缩放至约 174%、平移 (150,40) 后点击合成渐变图，对应预览像素 (413,199)，实际取色 `#696569`，与独立读取原样本像素一致。放大镜只拷贝小邻域，HEX 浮层不改变布局或触发视口重排。
- 三套模板各下载一个六色、中英/Emoji 标题 PNG，以 Pillow 完整回解码确认 1080×1350 / 1200×1200 / 1600×900。模板渲染文件未变；没有重跑 A2-B 的尺寸/颜色数量完整矩阵。
- Converter / Resize 实际 CSS：普通按钮/输入 200ms，模式/格式 280ms，Dialog 300ms ease-out；Resize 导入、专注窗口开关无控制台错误。浏览器已解析 Reduced Motion 的 0ms 规则，本机媒体状态为普通动效；未执行操作系统级 Reduced Motion 切换或真实移动设备验收。

截图与本轮下载仍留在仓库外 `.validation/palette/` / 本机 Downloads；不作为生产资源。真实触屏平移/长按放大镜手感、系统分享目标的实际投递、Firefox/Safari 仍待后续验收。跨语言整页导航仍不保留内存会话。

## A2-B 基线验证与未测范围

- [算法/几何测试](../tests/palette-extractor.test.ts)：纯色、透明、半透明/抗锯齿、白灰米色、暗色噪点、亮暗候选、少色像素图；六倾向确定性、去重、contain/透明取色、3 模板 × 1/6/10 色与标题字素测量。
- [状态测试](../tests/palette-session.test.ts)：稳定 ID、有效 HEX、数量与顺序、源图替换/清空、过期导出、串行收尾及资源计数。
- [组件测试](../tests/palette-ui.test.tsx)：取色激活/目标切换/Escape、透明/留白拒绝、模拟触摸 Pointer Events、旧 PNG 失效、卸载与晚到结果、分享取消和失败。jsdom 不作为布局或真机证据。
- 实际 Chromium：CN 中文 Light 与 Global 英文 Dark，1440px 桌面和 390px 手机视口；自动提色、手动取色、复制、新增取消/确认、无效 HEX、排序、覆盖确认、替换、全透明错误和清空。PNG/JPEG/WebP/静态 AVIF 实际导入成功。
- 同页切换主题和 320px 断点后色卡不变，无横向溢出。四个地区/语言 DEV HTML 都有唯一 H1、静态指南与 FAQ，并保留 `noindex, nofollow`。
- Ryzen 7 5800H / 31.4GiB Windows、内置 Chromium 单次观察：640×320 渐变图分析约 25.5ms，600×600 方图约 22.6ms；只计分析图读取与量化，不含源图检查/解码或导出，不代表移动设备或最坏性能。无需为这些样本新增 Worker。
- 三套模板实际下载 1/6/10 色 PNG，覆盖竖图、横图和透明作品，中英/Emoji/长标题、关闭署名；另用 Pillow 完整解码验证真实 PNG 与预设尺寸。原始合成素材与下载在仓库外 `.validation/palette/`，没有新版权素材或用户图片入库。
- `pnpm check`：283 文件、零错误/警告/提示；完整 Vitest：68 文件、768 项通过；最终相关 47 项通过；`build:cn` / `build:global` 及内置守卫通过。frozen lockfile 安装通过。两地区既有多工具专项也通过，包含缺 Loader/内容、升降级、错误绑定及私有依赖泄漏反例。
- 工程结果和简要结构化证据见 [A2-B 记录](evidence/palette-a2b.json)。正式产物仅保留两款 Published 工具，Palette 私有代码、StyleX 和通知继续受构建隔离检查；捕获的两地区客户端模块图中没有 Palette 业务模块或 Color Thief（纯 Registry 定义不属于私有业务实现）。原有专项夹具仅同步真实工具/内容，不新增验证系统。

未测：真实 iOS/Android 触摸手感、系统分享目标的实际投递、Firefox/Safari、专业色彩准确性及大量真实 Furry 作品的审美代表性。仅模拟手机视口，不宣称移动真机通过；未部署任一地区。跨语言完整页面导航仍按平台生命周期重新进入工具，不能承诺保留内存会话。
