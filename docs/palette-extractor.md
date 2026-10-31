# Palette Extractor · 当前实现

第三款工具，CN/Global、zh/en 均为 **Draft**，只在 DEV 的 `/tools/palette-extractor/`（以及同地区语言前缀路径）可用。A2-B 完成功能，A2-C1/C2/C3 调整工作区、颜色标记与反馈，A2-C4 重构 Share Composer；现有两款 Published 工具、生产页面和部署状态不变，尚未完成 Palette Beta 资格验收。

## 模块与所有权

- [工具实现](../src/tools/palette-extractor/PaletteExtractor.tsx)：Form Wide、单图导入、稳定 ID 色卡、完整 HEX 提交、复制/排序/删除、覆盖确认。
- [session](../src/tools/palette-extractor/session.ts)：复用 `acceptImage`、`decodeChecked`、`ImageResources`、设备 `ImageLimits` 与既有 `SerialJobs`；版本隔离、串行原生任务、过期导出作废、资源释放均由工具拥有。不修改 Image Core 或两款正式工具。
- [palette](../src/tools/palette-extractor/palette.ts)：有界像素过滤、Color Thief 候选量化、六种倾向与近色去重、contain 坐标映射。
- [ImageSampler](../src/tools/palette-extractor/ImageSampler.tsx)：复用 Image Core 的 `preview-geometry` 视图数学，拥有适应/缩放/平移与单实例专注模态框；鼠标/触摸 Pointer Events、目标色卡、Escape、9×9 预览像素放大镜。移动鼠标不解码、不量化、不创建 Blob。
- [render](../src/tools/palette-extractor/render.ts) / [ShareDialog](../src/tools/palette-extractor/ShareDialog.tsx)：同一套 Canvas 几何、字体测量、有效版本 PNG 与可用设备的文件分享。[ShareCanvas](../src/tools/palette-extractor/ShareCanvas.tsx) 负责有界实时画布及构图手势，[ComposerControls](../src/tools/palette-extractor/ComposerControls.tsx) 负责局部属性面板；没有全站分享框架、Worker 或持久化。
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
| Postcard / 明信片（内部 ID `character`） | 1080×1350 | 全宽上图、说明区与底部色卡，对角短线框 |
| Editorial / 编辑卡（`gallery`） | 1200×1200 | 内缩作品、编辑式说明与编号色卡，保留外缘留白 |
| Moodboard / 氛围板（`story`） | 1600×900 | 全宽横图、紧凑说明和横向配色，作品权重更高 |

作品来自有界预览，不承诺原始超大图逐像素保真。默认 Cover，可拖动、缩放 100–400% 和重置；每个模板独立保存以图片区为单位的偏移，统一计算 Cover 并约束平移，不露出源图外的空白。原图透明部分由中性底承托。构图不修改源图、主工作区镜头或正式色卡。键盘可用 +/-、0 与方向键；Esc、PointerCancel、失焦、页面隐藏取消当前拖动，替换源图丢弃旧手势。

有限色卡预设：方/圆角/圆，色号内/外/隐藏，等宽/间距/小卡片/紧凑色带，三档间距，全部/前五/前六色。只引用当前 1–10 个实际颜色；根据可用高度选择行数，避免两行圆形缩成细点。HEX 按真实字宽缩放，内部文字按颜色选择可读前景。

标题可选，最多 120 个 UTF-16 code units；本地字体按字宽/字素测量最多两行（横版一行），超长省略，不拆 Emoji。品牌默认开启，安全加载同源正式路径字标 `/brand/tool4furry-horizontal.svg`，另附小号工具名；日期默认关闭，打开 Composer 时确定本地 YYYY-MM-DD，当前编辑会话内不随重绘变化。三个元素各有说明区九宫格锚点，同格按标题→品牌→日期堆叠，三行按需要分配高度，不覆盖图片区或色卡。四种边角预设只使用中性线条。

实时预览最长边不超过 1000px，不创建预览 Blob；与完整 PNG 调用相同 `drawShare`、布局、构图、字体与装饰函数。拖动按帧重绘，期间不启动完整导出；松手后防抖 180ms，经现有串行通道准备完整文件。每次输出仍通过 PNG 格式、尺寸、完整解码与 privacy-v1 校验。图片/配色版本和完整分享选项构成有效性检查，任何改变立即禁用旧下载；取消拖动恢复原构图，晚到结果不能恢复资格。关闭/卸载丢弃结果和清零实时 Canvas；下载 URL 继续由 Session 拥有并回收，不保留无用的预览 PNG URL。

系统分享仅在 `canShare({files})` 与 `share` 都可用时显示；点击前已准备当前有效 PNG，调用位于用户激活处理内。取消不报失败，真正失败有提示；下载独立可用。不生成链接、不上传分享图、不连接外部账户。

Palette 普通操作使用默认可见的轻中性表面，主要确认与下载使用 Lavender；图标保留弱表面和选中反馈。只改本工具外观，不修改公共按钮及其他工具。以下 C1/C2/C3、A2-B 记录为当时验收事实，旧模板名称与 PNG 预览方式已由上述 C4 实现替代。

## A2-C4 定向验证

- `pnpm check`：287 文件、零错误/警告/提示；`pnpm test`：68 文件、789 项通过。新增 Cover 极端平移/缩放、1–10 色全部有限预设的边界、九宫格全部锚点冲突、拖动暂停导出/松手恢复、模板独立构图、Esc 恢复、替换源图丢弃旧手势与晚到 PNG、信息选项/日期稳定、关闭后 Canvas 清零及无多余预览 URL 的回归。系统分享测试继续覆盖预先准备 File、取消不报错、真正失败不阻断下载。
- Chromium：CN 中文 Light、1440/1200px 桌面；Global 英文 Dark、390/320px 手机视口。实际完成拖动、键盘缩放、模板切换、Quiet 下拉键盘选择、圆形/独立色卡、内部 HEX、九宫格同格避让、日期、品牌关闭、标题清空与中英/Emoji 长标题省略。修复手机 Grid 压缩画布与属性区导致的重叠；复核自然堆叠、固定导出区、无横向溢出。画布复用 C3 焦点合同：指针无外框，键盘计算轮廓为 2px；Canvas 不添加 CSS 位移过渡，既有控件/弹窗继续复用 Reduced Motion 规则。
- 下载七份真实 PNG，覆盖三模板、1/6/10 色、横/竖/方图与带透明区域的合成渐变、长标题、正式 Logo、日期与无署名；用独立 Sharp 完整解码确认 1080×1350、1200×1200、1600×900。390px 手机预览截图的 Canvas 区域与当前下载 PNG 缩放对照，RGB 绝对差均值约 1.83/255（包含采样取整与文字抗锯齿），构图及内容位置一致。未将低分辨率预览宣称为逐像素相等。
- `pnpm build:cn` / `pnpm build:global` 及既有静态/发现/资源守卫通过，各 15 页、两款 Published 工具；额外扫描产物未发现 Composer 特有 DOM/文字/布局标记。Palette 路由、私有实现、Color Thief/NOTICE 仍排除。Registry、Loader、提色算法、主采样工作区、Image Core、SEO 与依赖未改；Session 只同步导出文件名中的新模板名称。

截图、合成素材、下载副本和构建日志保留在仓库外 `../.validation/palette/c4-*`。实际浏览器验收只代表当前 Chromium；未测真实 iOS/Android 触控/多指手感、系统分享目标投递、操作系统 Reduced Motion 切换及 Firefox/Safari，未执行所有预设的真实 PNG 笛卡尔积。仍需维护者用真实作品判断裁切与版式审美。跨语言整页导航的会话限制不变；未部署，未提升 Draft。

## A2-C1 工作区与过渡

Form Wide 内改为纵向：紧凑导入/参数 → 宽幅取色工作区 → 单行色卡 → 操作区。提色倾向和分享模板使用公共 SelectField；自动目标 3–10 用原生 Radio 语义的紧凑组（不是原生下拉），保留方向键与覆盖确认。色块 48px；窄屏次级 RGB/排序/删除在可点击的 Popover 内，不挤占 HEX 输入。

取色与平移互斥。支持适应、预览位图 100%、缩放、键盘 +/-/0/1 和方向键平移；专注窗口保持同一视图状态，只有一个交互采样实例。触屏在普通视图未取色时保留页面纵向滚动，在专注视图内可平移；启用吸管后按住移动、松开提交。取色时第一个 Escape 取消，随后 Escape 关闭专注窗口；关闭后返回入口焦点。缩放、平移、弹窗的 CSS 缩放过渡均纳入坐标映射，留白、棋盘格、透明像素及视口外位置不采样；替换图片释放指针、退出取色与专注状态。

三款工具复用公共控件过渡：通常反馈 200ms、局部模式/单选/色卡选中 280ms、Dialog 300ms ease-out；共用 [motion](../src/styles/motion.ts)，不改变主题调色板。Focus outline / 输入焦点阴影立即可见，不参与淡入；Reduced Motion 的过渡为 0ms。Canvas 视图位置不加 CSS 过渡，状态更新和取色不延迟。三套模板的绘制与排版、量化及预算未改动。

## A2-C2 标记与反馈

中央画布与右侧紧凑工具栏分开布局，700px 以下工具栏移到画布下方；专注视图仍只有一个采样实例。格式和设备限制默认折叠，不再显示文件名/清空行或常驻技术说明；预览精度边界继续由既有静态限制说明承接。

[markers](../src/tools/palette-extractor/markers.ts) 在导入时缓存最多 65536 个有效预览像素索引，重新提取时为量化颜色寻找稳定的接近位置，不修改六种提色倾向。位置以预览内部坐标随稳定色卡 ID 保存，复用同一相机投影。点击标记选择色卡，拖动结束才提交实际采样点；透明/留白、旧源手势、取消与多指冲突不提交。HEX 改色和手动新增没有虚构来源点；重排保留、删除移除、重新提取重建标记。

选中色卡与启用吸管分开显示，避免普通选中误报为正在取色。公共 Toast 改为上方中央的中性紧凑浮层；连续成功提示复用一条，错误仍可关闭且停留更长。控件附近的错误不搬入 Toast。基础色卡与三模板复用 [file-naming](../src/tools/file-naming.ts) 的时间戳、清洗和会话序号，区分 `palette` / `character-study` / `gallery` / `color-story`；预先准备的系统分享 File 与当前分享结果绑定，下载后分享沿用对应文件名。

### A2-C2 定向验证（2026-11-01）

- `pnpm check`：285 文件，零错误/警告/提示；9 个相关测试文件、112 项通过，覆盖标记位置、投影/拖动/取消、编辑与源替换、文件名、分享失效、Toast 去重/计时，以及两款正式工具 UI。
- `pnpm build:cn` / `pnpm build:global` 及原有静态守卫通过：每地区 15 个 HTML 页面，包含现有两款 Published 工具；Palette 路由、私有实现和 Color Thief/NOTICE 继续排除。没有修改 Registry、Loader、构建配置或依赖。
- Chromium：CN 中文 Light/Dark、1440/1200px 桌面；Global 英文 Light/Dark、390/320px 手机视口。限制默认折叠，无文件管理行和常驻技术说明，未发现横向溢出；桌面侧栏/手机底部工具栏、缩放/平移/适应/专注、标记选中、透明拒绝、HEX 移除来源点、重排和重新提取均完成定向检查。
- 专注视图放大并平移后拖动第二个标记，实际预览像素 (553,201) 取色 `#8D6650`，与 Sharp 独立解码的 `[141,102,80,255]` 一致。标记归一化位置在缩放/平移前后保持一致。
- 连续复制只显示一条「已复制」，1440px 下居中浮层宽 144px、高 56px、距顶部 80px、无左侧边框。Converter 与 Resize 均实际导入损坏样本，错误保留在控件附近；三款工具没有捕获到控制台错误/警告。
- 基础 PNG 实际下载并完整解码为 1080×240；三模板当前准备的六色 PNG 分别通过 1080×1350 / 1200×1200 / 1600×900 完整解码。模板绘制文件未变，未重复模板完整矩阵。内置浏览器后续连续原生下载未落盘，未更改下载权限；连续唯一命名与下载/系统分享文件名一致性由组件和会话测试验证，三模板文件另由浏览器下载当前预览后检查。

截图与合成样本保留在仓库外 `.validation/palette/`，不进入生产。未测真实触屏标记拖动/放大镜手感、系统分享实际投递、操作系统 Reduced Motion 切换及 Firefox/Safari；手机视口与合成 Pointer 测试不代表真机通过。跨语言整页导航仍不保留内存会话。

## A2-C3 焦点与临时预览

- 数量标签原来的 `:focus-within` 会把鼠标焦点误画成外框；主动 `.focus()` 的图片工作区还会继承输入模态，并叠加局部/基础规则。数量改为投影隐藏单选的 `:focus-visible`；Palette/Resize 画布共用显式指针标记与单层键盘轮廓。保留全局焦点回退、Tab 和画布键盘操作，不全局清除 outline。Resize 的裁剪选区仅在 `:focus-visible` 绘制自身轮廓。
- `ImageSampler.onPreview` 只发送带源 URL、稳定 ID 和像素位置的临时颜色；色块、展示 HEX 与图片标记同步预览，不修改 Session 版本或使分享结果反复失效。确认才调用原有采样提交；Escape、PointerCancel、移出、窗口失焦与源替换清理临时状态。未完成的 HEX 草稿独立保留。
- 参数和模板显式使用 `SelectField appearance="quiet"`，普通操作使用 Ghost，分享 CTA 保留 Lavender；选中态不继承描边、下划线或内阴影。新增颜色改为锚定按钮的紧凑 Base UI Popover，只有验证成功才新增，支持 Enter/Escape、外部关闭和焦点返回。
- 公共 Toast 距顶部改为 16px + 安全区并增强中性表面/阴影；成功仍为 2.4 秒且去重，错误仍可关闭并停留更久。悬停/键盘/窗口暂停交给 Base UI，未新增强制关闭计时器。Converter/Resize 没有工具内 Toast 调用，其原有控件附近错误继续保留。

### A2-C3 定向验证（2026-11-01）

- `pnpm check`：285 文件，零错误/警告/提示；8 个定向文件、106 项通过，包含临时预览/取消/确认/源替换、HEX 草稿隔离、Popover 验证/外部关闭/焦点返回、两款工具 UI 与 Toast 计时/去重/暂停。最终另补「吸管目标与拖动标记不同」回归并复跑 Palette UI，13 项通过（本轮共 107 个不同用例）。契约测试扫描 StyleX 的 `:focus-within` 轮廓误用，不以此替代浏览器证据。
- Chromium 实际计算样式：数量组鼠标点击无轮廓，Tab 返回标签为 2px solid；Palette/Resize 画布指针主动聚焦为 none、键盘进入为 2px solid。键盘触发吸管的程序聚焦保留轮廓，指针触发不显示；Resize 裁剪选区键盘聚焦时仅自身有 2px 轮廓，父画布不叠加。Quiet 下拉鼠标选中无轮廓，方向键选项为 2px solid，Trigger 为 0px 边框。
- 鼠标悬停取色时，色块、HEX、放大镜和标记同步预览 `#99BF47`，已提交颜色仍为 `#7DD867`；取消恢复原色。缩放后拖动标记提交 `#93864C`，色卡与标记一致。触摸 PointerCancel、旧源与未完成 HEX 草稿由定向测试覆盖，不宣称真实触屏通过。
- CN 中文 / Global 英文，Light/Dark、1440/1200px 桌面及 390/320px 手机视口完成局部检查，无横向溢出。320px 新增 Popover 宽 296px、两边各 12px，非法 HEX 就地报错，Escape 返回触发按钮，合法 Enter 才新增。三模板切换会准备当前预览；实际下载基础色卡与 Color Story，并由 Sharp 完整解码为 PNG 1080×240 / 1600×900。未重复模板完整矩阵。
- Toast 普通成功提示实测约 2.43 秒消失；重复复制保持一条。实际悬停约 31 秒、F6 键盘阅读约 29 秒均保持可见，离开后恢复/支持手动关闭，未发现正常计时失效。原生窗口失焦未完成独立实测，仅核对 Base UI 原有暂停实现；没有用额外定时器规避阅读暂停。DEV 编辑期间曾出现旧 `data-style-src` 行号的水合警告，冷启动复核 Palette/Converter 后没有捕获错误或警告。
- `pnpm build:cn` / `pnpm build:global` 及现有守卫全部通过，每地区 15 页、两款 Published 工具；Palette 路由、私有实现及 Color Thief/NOTICE 继续排除。Registry、Loader、算法、模板绘制、Image Core、SEO 和依赖未改。

截图与合成样本保留在仓库外 `.validation/palette/c3-*`。未测真实 iOS/Android 触控、系统分享实际投递、操作系统 Reduced Motion 切换、原生窗口失焦暂停及 Firefox/Safari；未部署。跨语言整页导航仍不保留内存会话。

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
