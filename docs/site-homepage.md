# Issue #28 — 下半部双组图文故事（2026-10-29）

E3-r1 覆盖首轮下半部无动效及独立居中排版约定。≥1440px 两组通过两级 CSS subgrid 共用标题/正文/链接行，标题与正文开始 Y、底部链接对齐；图片列为 clamp(230px,17vw,280px)，文字用剩余空间。900–1439px 继续上下交错，<900px 继续文字在前。两张装饰图仅局部禁拖拽、禁选中及 pointer-events，矩形双轴柔边和原图字节不变。

独立 `#t4f-home-stories` 内联脚本逐字加入构建审计，不改三栏脚本。一个 IntersectionObserver 观察两组，成功注册后仅将视口下方内容设 pending；每组首次进入底部收窄 48px 的视口即解除观察。图片 0–850ms、标题 120–760ms、正文 260–960ms、链接 440–1150ms，只变 opacity/translateY，ease 为 cubic-bezier(.22,1,.36,1)；大屏紫色组额外延后 100ms。链接外层承担入场，不覆盖共享链接的颜色/下划线过渡。无 JS/IO、Reduced Motion、初始化异常、已有锚点与恢复可见内容直接显示；聚焦、偏好变化和 pagehide 立即收束，不重播。无新依赖、Island、滚动监听或 RAF。

仅替换 WorkflowStory 的旧流程 H2、三步说明、DEV Converter 入口和相关文案/媒体字段。社群、三栏理念、前三块及 PrinciplesStory 保持原样。维护者在 E3-r1 执行期间提供了新的完整双语文案，现逐字采用「反馈与改进 / Feedback & Improvements」「交流与合作 / Contact & Collaboration」及其正文、入口文字；不自行润色，链接仍为真实 Issues 与 contact@librecosta.com。共享 h.link / h.linkText 的雾紫 Hover/Focus 和 180ms 下划线不变。

按维护者随后补充的三级布局：≥1440px 两组并排一行；900–1439px 上下两组，第一组左图右文、第二组左文右图；<900px 每组文字在前、图片在后，DOM 也为同样阅读顺序。无背景板、描边或阴影。社群和三栏既有间距保留，未叠加新顶部 padding。

正式附件原样存于 `public/visuals/home/luminous-blue.avif`（500×400，8,694 bytes，SHA-256 `e4ec08ff7285dd922a23dee64f47da03510f0658fa256d3b744c77fc1d1225ec`）及 `luminous-purple.avif`（500×400，16,886 bytes，SHA-256 `c9222193d9103b54a0eeede5dd460d14c41a796ec8f101a4d112ae42b82c99a2`）。按维护者视觉修正保留柔边矩形：两级局部线性 mask 分别柔化水平/垂直边缘，中部保持清晰，含 WebKit 前缀；不支持 mask 时保留 24px 圆角原图。图片 alt 为空、准确尺寸、lazy/async，不预加载，不引入 Island、依赖或图片副本。

---

# Issue #27 — 社群与支持衔接（2026-10-29）

评论 `6489181171` 覆盖下方上一轮的对齐和 Dark 按钮色：仅 Dark communityAction / Hover / onCommunityAction 改为 #755C8C / #806898 / #FFFFFF，Light 不变。非 QQ 标题、正文（最大 340px）、辅助说明和底部按钮水平居中；QQ 仅标题居中，主体继续左文右码且文字左对齐。赞助来源说明仍在按钮上方，按钮底部对齐、196px 最小高度与 18px 内边距不变。最新评论 `6489584393` 将雾紫交互统一到共享 h.link：首页所有既有 h.link / h.linkText 文字链接默认中性色，Hover / Focus-visible 使用 supportLavender，颜色与 62% 下划线收缩均为 180ms（Reduced Motion 为 0ms）；删除 browseAllLink 特例。Hero、社群按钮、工具卡片、导航及 Footer 不受影响，第四区下半部仅继承链接交互，不改内容。文案、URL、素材（含维护者本地提交的 Telegram 图标）、其他首页区域及主题控制均不改。

`CommunitySupport.astro` 是 `WorkflowStory` 内 `ThreePillars` 的前一个兄弟。角色区既有 40px 底留白后直接进入三卡，局部覆盖 workflow 顶部 padding；三卡后 48px 接入三栏理念。卡片使用现有中性 Surface、14px 圆角，无实体边框或阴影；三列 / ≤1100px 两列 / ≤600px 单列，桌面同行等高，最小 196px、内容自然撑高；窄屏不人为补齐行高。2026-10-29 收尾评论覆盖旧居中分布：18px 内边距、10px 内容间距、标题/正文/按钮左对齐；QQ 采用左文右码，常规 128px、≤360px 为 112px，保留完整静区。原第四区下半图文、第五区及前三块不变。

`src/site/home-community.ts` 只按 Region 选择 QQ/Discord 和赞助入口，Locale 只选中英文文案。CN 使用附件原样 `public/community/QQ-Group.avif`（128×128 源图，以 112–128px contain 完整显示，不修改数据，SHA-256 `3cd0e1d70b2a0153024d13212cce2844bc0ff5ed00b6b634e4b57ad9748fc3b4`），无捏造 QQ 直链；Global 页面不引用或请求该图片。Discord/Telegram/GoFurry 爱发电及维护者随后补充的 `https://ko-fi.com/gofurry` 使用原始 URL，原生外链加 noopener/noreferrer；CN / Global 均明示实际 GoFurry 账户。最新评论冻结 Global Ko-fi 入口为「Support on Ko-fi / 在 Ko-fi 支持我们」。正文与 GoFurry 来源 note 分开，保留准确的地区平台归属。四个平台 Logo 原样入库并在按钮内以 20px contain 显示：Discord 32×32 PNG（带透明区域）、Telegram 180×180 RGB PNG（原有白底保留）、爱发电 152×152 PNG；附件 ko-fi.ico 实为 64×64 RGBA PNG，保留原文件，并以字节相同的 ko-fi.png 正确扩展名交付。无裁切、重绘或重新着色。没有新脚本、Island、依赖或入场动效；按钮 44px 命中区。仅本组件使用 communityAction / communityActionHover / onCommunityAction：Light #745F8D / #655077 / #FFFFFF，Dark #493F57 / #5C4E6D / #F2EBFA；其余语义色及全站 action 不变。220ms 只过渡背景，Reduced Motion 为 0ms。

原封顶线改为一个可见 H2「关于 Tool4Furry / About Tool4Furry」和左右两段 2px 线；标题与两线复用现有整组 Reveal 的 0–320ms 阶段，后续时间轴、01/02/03、环绕正文、桌面粗斜线及单列隐藏规则不变。无 JS/Reduced Motion 下标题和线条直接可见。外部邀请是否仍有效、实际扫码加入未作为自动验收结论，维护者可另行核验。

---

# Issue #26 — 第四区上半部三栏理念（2026-10-29 补充精修）

[维护者补充评论](https://github.com/librecosta/tool4furry/issues/26#issuecomment-6475918093) 覆盖首轮短文案和统一齿轮；编号及环绕排版采用维护者随后截图纠偏。仅调整 `ThreePillars.astro`：第四区下半旧图文、第五区和前三块不变。三栏透明，无卡片背景、边框或阴影；整组唯一 2px 封顶线、桌面两条 6px / 12° 斜线。按维护者最新截图纠偏，恢复 01 / 02 / 03（80–96px），标题基线同行优先、空间不足自然回绕。≤840px 单列且完全隐藏斜线，栏目间距 40px。64px（≤480px 为 48px）Phosphor Regular CursorClick / ShieldCheck / LockKey 无底板，仅淡入微移。图标在 flow-root 内浮动，正文从其右侧开始，超过图标高度后恢复全栏宽；`data-pillar-artwork` 保留按栏目 ID 替换正式素材的入口。

`homepagePillars` 逐字保存维护者中英文正文，六个真实链接和现有下划线不变。安全文字是维护者提供的平台长期范围介绍，不据此新增账户/支付功能；公开部署前仍由维护者复核实际措施与承诺的一致性。

仅首页多一段逐字审计的 `#t4f-home-pillars` 内联脚本，既有三个全站脚本及唯一 Wavefield 懒模块不变；无 Island、依赖、JS preload、RAF 或滚动监听。一个 IntersectionObserver 只观察整个 section，首次进入收窄底部 64px 的视口后启动一次完整时间轴并 disconnect，手机同样整组触发，不再逐栏观察。初始已在视口内或上方时直接显示，滚动往返、主题改变和 bfcache 恢复不重播。

CSS 仅过渡 transform / opacity / clip-path：封顶线 0–320ms 从左到右；两条斜线 160–520ms 沿轴展开；数字 360–800ms 裁切揭示及 10px 微移；标题 420–820ms；图标 560–960ms；正文 620–1060ms；链接 740–1140ms。第二、三栏分别错峰 80/160ms，线条不叠加错峰，整组 1300ms 收束。无循环、旋转或尺寸动画。

静态 HTML 默认全部可见，IO 成功 observe 后才对整组启用 pending；无 JS / 无 IO 保持静态，初始化异常恢复可见。Reduced Motion 跳过增强，运行中切换 Reduce、pagehide 或任一链接提前聚焦将整组显示并清理；CSS 同时确保 Reduce 下无位移、裁切和时长。没有新设置界面。

---

# Issue #25 — 角色紧凑工具列表（2026-10-28）

仅替换角色右侧的工具展示，覆盖下方历史 3×2 封面和补足六项演示的约定。角色仍手工维护 `toolIds`，经现有地区/语言/Registry 过滤与去重后最多 12 项，不按分类自动分配。DEV 只显示真实可访问的 draft/published 工具；无工具采用既有空状态，不补假工具。生产仍只含本地区 published。

工具为静态 `ul/li` 中的 44px 链接：复用 `FeaturedToolIcon` 的同一映射，传入 20px（精选默认 40px 不变），搭配 13px Medium 单行名称。长名称省略，完整文本仍作为访问名称及原生 title；默认透明，Hover/Focus 中性背景、Active 触控反馈，220ms 背景过渡，Reduced Motion 为 0ms。列表按自身容器宽度分列：不足 300px 一列、300–459px 两列、460px 起三列，最多四行（宽屏满 12 项）。不新增脚本、Tooltip 或横向滚动。

六角色顺序、身份图标、全部文案、「查看更多」、3:4 代表插画底对齐及手机隐藏规则均保留。维护者截图修正：简介从身份图标的左边缘开始；同排角色共用完整内容高度，使 0/1/12 项的插画底边仍一致；工具列表独立从内容区左上角按行排列，不跟随插画底部。第二块四项精选、Hero/Wavefield 和共享背景不变。12 项布局仅使用临时测试 fixture 验证，不进入正式首页配置。

---

# Issue #24 — 连续工具发现区与角色插画合同（2026-10-28）

本节覆盖下方历史独立角色题头、灰底、角色名和 Hero 锚点跳转约定。Hero 的「探索工具箱 / Explore tools」始终进入当前地区/语言 `/tools/`；移除已无用途的 hasTools 条件，保留 Reveal、Wavefield、文案与 `#tools` 锚点。

精选和六角色共享 `section#tools` 的页面底色与既有全站固定点阵，唯一可见 H2 为「精选工具」。删除角色大标题、副标题与灰色底板；精选仍保留 32px 顶部留白，与第一行角色仅间隔 30px，不再叠加 section padding。工作流和理念章节不变，精选四卡、Phosphor、下划线及可选左侧原创小物件槽也不变。

角色原 finance 改为 studio / 工作室 / Studios；动画师、运营、工作室分别采用 Issue 冻结的「每一帧都值得打磨」「为内容与社群增添色彩」「工作细节决定成败」及对应英文。前三角色文案不变，角色编排仍与现有 Registry 取交集，不新增分类、工具或发布状态。

角色插画每人仅一幅 3:4 母稿，建议 900×1200 或 1200×1600px，中央安全焦点，后续使用 WebP/AVIF 并保留绘画源稿。桌面框宽最高 145px、中屏缩至约 110px，始终 3:4；按维护者本轮截图补充，与右侧工具网格底部对齐，禁止随工具网格拉伸。≤600px 隐藏插画，3×2 工具网格使用完整宽度；工具缩略图仍为 4:3。复用 HomeMedia 本地图片检查与 focus；DEV 严格等比占位，生产无有效本地插画时不渲染媒体列，内容自然铺开。六角色图尚未提供，不生成新素材。

维护者截图补充：每组角色标题左侧保留独立的 28px 图标素材槽，当前使用已有 Phosphor Regular 24px 图标；手机端也显示。后续填写 `RoleShowcase.icon` 的本地路径与真实尺寸即可替换，不影响底部角色竖幅插画。缺少或无效文件回退现有图标，静态输出且不请求不存在的图片。

---

# Issue #23 — Icon-first 精选工具（2026-10-28）

仅取代下方历史胶片精选区：首页第二区域沿用 `getHomepageEntries` 的地区、发布和精选顺序，再独立限四项；导航的九项上限不变。≥1200px 四列、640–1199px 两列、<640px 无整行背景的 Icon 左置列表。图标采用已有 Phosphor 的 Regular 单色线性图标，40px SVG 静态输出，未知 ID 回退通用图标；不使用自绘路径、封面、序号或横向滚动。短摘要由工具自身的可选 `copy.summary` 提供，详情/SEO 描述不变。

DEV 可补三个带明确“非工具”说明且无链接的裁剪/压缩/取色设计示例；不进入 Registry。生产只显示真实已发布条目，零条目保留原空状态。无新增 JS、依赖或入场动画，Hover 为 260ms 背景变化；Hero、职业区、故事区、导航、Footer 和工具业务均不变。

最新纠偏（[评论 6470211603](https://github.com/librecosta/tool4furry/issues/23#issuecomment-6470211603)）覆盖前轮首页点阵与绝对定位约定。保留精选区上下 32/36px、标题下 20px（手机 18px）、桌面卡片最小高度 152px / 内边距 16px，职业区外侧上下 40px；不改职业内部结构。共享 `SiteLayout` 沿用 [GoFurry #149 最终源码](https://github.com/gofurry/gofurry-nav-site/blob/b186325c59c086351cf2b37d0b5c6530b937813c/apps/cn/web/app/components/common/PublicPageBackground.vue)：固定视口基底与点阵，30px 间距、1.1px 半径、边宽 `min(30%,460px)`、左右 15% 后向内渐隐、顶部 18% 后向下渐隐、高度 `min(720px,100svh)`，滚动不改变屏幕坐标。768–1279px 减淡；手机单层满宽、28px / 0.8px、185px 上显下隐，不再隐藏整个背景。按维护者本轮减淡反馈，Light/Dark alpha 为桌面 .20/.18、中屏 .13/.12、手机 .10/.08，仅使用一次 alpha；颜色由现有 StyleX 主题的三个 pageDot 语义值提供。

背景仅一份、无 JS：shell 隔离负层级，固定基底 -3、角色底色伪元素 -2、固定点阵 -1、实际内容在其上。Hero 与 Header/Footer 沿用自身底色；现有 `workspace && !documentScroll` 的 Canvas/沉浸 Lab 隐藏点阵，Form/Batch 背景不浮到实际工具内容上。

`homepageMedia.featuredDecor` 是可选的本地原创素材槽，仅当文件存在且尺寸有效时输出装饰性、延迟加载的图片。精选父级是正常 Grid：≥1440px 有素材/DEV 占位时为 160px 插画列 + 32px 间距 + 右侧内容列（标题、浏览全部、四卡整体）；更窄时隐藏插画。当前未配置素材，生产只渲染右列且不预留空白；DEV 显示中性 3:4“素材预留 / Artwork slot”。没有绝对定位、负偏移或虚构图片请求。

首页轻量文本链接采用 [DeepFurry `.hero-action::after`](https://github.com/deepfurry/website/blob/main/src/styles/global.css)：文字 span 的 1px 完整下划线，Hover 从左侧 180ms 收缩至 62%，移出恢复；44px 命中区不参与划线，键盘焦点保留，Reduced Motion 为 0ms。不改主 CTA、导航或 Footer 的交互。

---

# Issue #22 — Hero 文案、排版与 Reveal（2026-10-28）

仅覆盖下方历史 Hero 文案与排版约定：使用 Issue #22 冻结的中英文两段标题、两段简介及原有 CTA，移除按钮下的状态尾巴。按最后补充评论收紧为桌面最小高度 440px、文字区 56%；手机解除最小高度限制、底部曲面留白 120px，长英文允许自然增高。首页使用独立文案键，不影响 Lab 或默认 SEO 摘要。

五层 StyleX/CSS 入场分别为 0/880、220/980、680/950、1000/950、1420/900ms（延迟/时长），12px 上移、ease-out，2.32s 收束。仅在支持且启用 scripting、无 Reduced Motion 时播放；其他情况直接可见。CTA 提前获得键盘焦点时立即显现，不重启时间轴；Hover/Focus 颜色过渡 300ms。无新增客户端脚本，主题/尺寸/GPU 状态不改变动画类。Wavefield 核心、静态图、裁切锚点与独立 280ms 交接不变。

---

# Issue #21 — Wavefield Hero（2026-10-28）

此节只取代历史 Hero 狼图/舱体 CSS 占位和首页零增强脚本的约定；五区结构、H1/简介/CTA、Registry、双地区双语、SEO、主题、导航与 Footer 不变。

- 核心固定来自 [Wavefield v1.0.0 / 3e5ad2f](https://github.com/librecosta/wavefield/tree/3e5ad2f9ce5717cfb787e9e2c1c1fda79918cbd0)，非 dev。仅移植 terrain/shaders/renderer 与必要 clock/session，无 React Demo、Motion 运行时或 WebGL。WGSL 的 Gaussian 软线、景深、掠射高光、192×112 / 43,008 两族网格及预乘 Alpha 保留；来源、BSD 与参考设计说明见 `src/visuals/wavefield/NOTICE.md`，静态产物附 `public/visuals/wavefield/NOTICE.txt`。独立随机参数不等于已消除参考设计的授权核验事项。
- 正式附件 `public/visuals/wavefield/wavefield.avif` 原样使用：1440×576、16,651 bytes、sRGB、无透明，SHA-256 `27593852d0a627510e4fe304f63ffdec91707bf26692f5cb567f9d8bd09a72e7`。静态 HTML 已含装饰图片，加载/无 JS/失败都可见；没有新的狼图需求。其他媒体槽不变。
- 视觉坐标为 1440×576，`s=max(.78,W/1440)`，横向中心、纵向底部对齐。AVIF 与 GPU uniforms 共用比例/锚点；320/390px 固定最小尺度裁切局部，GPU backing 仅实际可见尺寸×最高 1.5 DPR。Hero 在 Light/Dark 都独立深色，文字渐隐层不拦截操作。
- 唯一新增首页 module 是 `entry.ts`，近视口、非 Reduced Motion/Save-Data 且支持 WebGPU 时才 dynamic import 核心。首帧提交与 validation 成功后 280ms 淡入；失败/设备丢失立即恢复图片并释放。无反复重试或可见技术 UI。非首页仍只有三段原样审计 inline scripts，禁止 JS preload/Island，保留 Lab/draft 隔离。
- 每 Document 使用 crypto 32-bit seed + Mulberry32，在独立四横向带内至多评估 8 个候选；轻量 CPU 评分覆盖手机起伏、峰间分离、幅宽差异、暗谷、投影高度、坡度/局部折叠与左侧安全区。候选不合格使用独立安全预设，不采用文章固定参数作为生产模板。resize/主题/离屏/bfcache 不重抽。
- 实际提交上限桌面 24、小屏 12/s，计时不累计隐藏/离屏时间，timer 合批 RAF。可见度、偏好、尺寸与 DPR 监听随生命周期清理，异步迟到设备只销毁不复活。CPU encode+submit 指标不是 GPU 执行耗时。
- DEV 复现：`/?waveSeed=12345&waveTime=8&waveStill=1`；`waveReference=1` 仅对比原版，`waveStatic=1` 跳过增强，`waveFail=adapter|shader|timeout`、`waveLoss=1` 验收故障，`waveDpr=1.5|2` 仅检查 backing 上限（不代表真实屏幕 DPR）。QA 参数/诊断不进入生产；无新调参 UI。
- 验收先固定原版场景/时间的视觉与响应式，再随机构图、生命周期和实际 CN/Global 产物。实体手机、其他 GPU/浏览器及真实 DPR 的覆盖须如实报告，不以模拟视口代替实机。

---

# V0.5-C6 — 当前首页合同（Issue #17，2026-10-27）

此节取代下方历史两区首页、创作碎片 Hero 及素材必须先齐备的要求；导航、主题、Footer、SEO 与三段精确脚本合同不变。

- `src/pages/[...locale]/index.astro` 只编排五区：全宽独立深色 Hero、横向精选胶片、六职业分区、工作流故事、品牌与工程理念。各区为 `src/components/home` 下的静态 Astro 组件，样式集中在 `src/styles/homepage.ts`；无新增脚本、Island、依赖或轮播运行时。
- Hero 保留原 H1/Intro，CTA 在有可用工具时到 `#tools`，否则到真实目录；正文稳定不随指针移动。当前只有深色舱体 CSS 结构，不生成狼形、星点、假截图或替代图片。
- `src/site/homepage-showcase.ts` 是本地媒体与职业编排入口。待审核素材到位后，在 `homepageMedia.hero` 填入 `/brand/tool4furry-standing-wolf-hero.png` 的路径、真实尺寸和双语 alt 即可；工具封面、角色代表图及两处故事图也在同一配置维护。媒体组件只输出确实存在的本地 public 文件，预留比例、焦点及 AVIF/WebP source，缺图使用中性几何画幅，绝不输出 404 图片。Hero 优先加载，其他图延迟加载。
- 精选沿用 `getHomepageEntries` / `featuredToolIds` 与 9 项上限；原生横向滚动、scroll-snap、可聚焦滚动区和真实工具链接支持键盘浏览，无装饰性箭头或自动播放。
- 六角色固定为画家、作曲家、开发者、动画师、运营、财务，仅是展示视角，不新增分类或路由。各角色 ID 编排先与当前地区 Registry 可用条目取交集、去重，再限 6 项；桌面 2×3 分区、每区 3×2 位，窄屏单列。当前没有发布工具，生产为真实空状态；不得伪造 36 个产品。
- DEV 胶片补足 6 位、角色各补足 6 位，演示槽明确标注且没有 href，真实 Converter 明确为草稿预览。生产不含演示标记、演示文案、draft 信息或链接；Image Converter 仍为 draft。工作流和工程理念不承诺未上线服务、虚假性能或所有工具离线。
- 验证按 L1：相关投影测试、check、两地区真实构建守卫；浏览器定向覆盖双语言/外观、320/390/960/1440px、原生胶片滚动和唯一 H1。正式素材及文案仍待维护者后续视觉验收与替换，不需要新的实施框架。

---

> Issue #15（2026-10-27）：可索引页面共用维护者确认的 `public/brand/tool4furry-og.png`（1200×630，原附件不修改），对应 SVG 仅保留为源稿。OG/Twitter 图片均使用当前 Region 的正式 HTTPS 域名；`og:locale` / alternate 根据 Locale 输出 zh_CN / en_US，图片 Alt 双语。404、Lab、draft 的 noindex 页面仍无社交 Meta。此条取代下方历史“仅文本 OG、没有分享图”状态；生产抓取和社交缓存须部署后再核验。

> Issue #2 最终编辑验收（2026-10-26）：About / Privacy / Terms 的标题下不再显示副标题，取代下方历史短摘要要求。仅按维护者冻结文案清理版本状态及 About/Privacy 摘要；隐私与私密联系使用已确认的 contact@librecosta.com，Terms 保留普通 GitHub 反馈。Footer 最终行 margin-top 为 0，其余结构和动效不变。

> Issue #8 最后补充验收：备案行保留在 Legal/Copyright 上方，桌面 ICP 左/公安右，窄屏统一左对齐折行；编号本身直链现有核准查询入口，不另占查询行。CN DEV 双位置提示、生产空配置零高度、Global 隔离及 additional 保留。仅将版权中的 LibreCosta 链接到 https://librecosta.com；其他导航/主题/滚动球不变。正式上线前仍按实际备案/许可类型核实展示要求。以下历史中央布局记录不覆盖本条。

> V0.5-C4-E（Issue #8）：Light 导航/Footer 使用 #30343A 与独立浅色 chrome 文本/焦点，精选区中性灰 #F0F1F2 / #E5E7E9 / #DDE0E3 / #394149；Dark 原色不变。导航强调当前语言，Sun/Light、Moon/Dark 表达当前状态。单一 appearance-controller 在主动语言跳转时携带白名单一次性 #t4f-theme，目标 head 首绘前应用并清除；普通直接访问仍恢复本站偏好。按钮中心 420ms 原生 ViewTransition 揭幕参考 [Gopher Atlas 1f730584](https://github.com/deepfurry/gopher-atlas/blob/1f730584d7b3b585bfa142fa90d9a9714a607e21/apps/web/src/lib/theme.ts)，无 API/Reduced Motion/隐藏页面直接切换，异常/离页/改尺寸清理。新增静态 DocumentScrollDock 与第三段精确审计内联脚本，复用 React Dock 的 scroll-metrics.js（阈值 72/320、回退总距离 25%），rAF 合批、ResizeObserver、原生滚动；Footer 进入视口或模态打开时让位，Lab/Canvas 显式排除。仅隐藏根文档滚动条装饰，内部保留细滚动条。备案槽移至最终法务/版权行上方；ICP 中央且其下官方查询、公安右侧，手机折行；CN DEV 两类位置提示，生产空槽零高，Global 不继承 CN 信息。正式展示仍须按实际备案/许可类别复核主管要求（[工信部第13条](https://www.miit.gov.cn/zcfg/xxtxl/art/2024/art_7c8cc677bfb7433e93e31bbad81142ef.html)）。以下历史记录不覆盖本条。

> V0.5-C4-D（Issue #7，含人工验收补充）：精选面板仅在 Light 使用独立浅灰绿材质（#ECF0E9 / #E0E8DF / #415B4B），Dark 沿用原值；面板顶部裁剪揭示/收回 420ms，16×16 Chevron 居中旋转 300ms。原生 details 退出时保留 open，先撤销 ARIA 展开状态并将面板 inert，transitionend 后关闭（480ms 容错）；快速重开取消旧关闭，Reduced Motion 立即完成。Footer 使用 navBackground，静态三段为品牌/GitHub、工具/项目/支持真实链接、法务/许可/版权；品牌下不再重复署名。原合规配置条件渲染在法务/版权行之后的居中底部槽，生产空槽零高度、无占位；仅 CN DEV 无记录时显示“备案展示位 · 开发预览”，Global 不继承 CN 备案。无装饰线或额外脚本。以下历史记录不覆盖本条。

> V0.5-C4-C（Issue #6）：顶栏独立标签为「精选工具 / Featured Tools」（完整目录仍为工具箱）。Astro/React 直接复用 getHomepageEntries 的精选顺序、9 项上限及地区/DEV 发布过滤；移除同分类优先的旧 Switcher 投影。普通导航展开为贴合下缘的全宽色面，1280px 内层、自然高度、无卡片轮廓/阴影；手机单列，Canvas 保持原浮动导航几何。主题图标的行内基线问题以 20×20 flex 盒、零行高和 block SVG 修正；display 与互斥隐藏留在同一 global.css 层，避免 StyleX display 覆盖隐藏。首页/目录卡片、通用静态 Card、Converter 设置面与桌面 Inspector 去除装饰围边/阴影；输入、拖放、焦点、状态边界及真正浮动 Sheet/菜单保留。色板、Hero、转换业务、两段脚本精确白名单及生产隔离不变。以下历史记录不覆盖本条。

> V0.5-C4-B（Issue #5）：普通导航采用独立 navBackground（Light #E8EBEF / Dark rgba(20,22,25,0.97)），无底边框，桌面 64px / 手机 56px；手机品牌 T4F，操作顺序为语言、GitHub、外观、桌面非交互账户位。Astro 与 ToolPageFrame 共用原生 details 工具箱、StyleX 样式及独立 `navigation-disclosure.js`（body 末尾 #t4f-navigation）：精细指针 120ms 打开/180ms 关闭，触控点击，支持外部点击、Escape 与正常 Tab 链接导航。面板只读取当前地区 getAvailableTools(region, DEV)，无 JS 仍可展开/进入完整目录。静态脚本白名单在 C3-B 外观脚本外仅增加这段逐字审计的导航增强，不允许 Island、无关脚本或 JS preload；Canvas 保持原浮动位置、视口与控制收纳方式。以下历史记录不覆盖本条。

# Tool4Furry V0.3-C — Site Shell, Homepage & Tool Discovery

> V0.5-C3-C（2026-10-25，[Issue #2](https://github.com/librecosta/tool4furry/issues/2)）：`InformationPage.astro` 与仅供 Astro 使用的 `src/site/information-content.ts` 提供 About / Privacy / Terms 双语静态内容；正文沿用 820px 阅读宽度。Footer 增加真实信息页入口，语言白名单保持这三个路径，其余 DEV/未知路由仍安全回退。页面仅继承既有外观脚本，无新 JS/Island。
>
> 发布前事实核验：仓库只有 CI、没有生产部署配置；README 中 Cloudflare Workers Static Assets / EdgeOne Makers 是计划，不是实际部署证据。源代码未集成访问统计；实际运营主体、托管/CDN/其他处理方、访问数据的目的/类别/保存期限/存储地区及适用法律仍须维护者核实。未找到可验证的 `contact@librecosta.com` 公开来源或邮箱可用性证据，因此首版使用已有 GitHub Issues（不在公开问题提供个人信息，私密请求先索取渠道）；正式发布前须确认私密联系和权利请求的接收处理方式。这些首版说明不代表法律审核完成；合规配置仍由 C2-A 原机制管理。

> V0.5-C3-B（2026-10-25）：导航增加真实地区语言链接、亮暗操作和非交互账户占位。首页/目录的零脚本历史约束仅放行 head 中逐字校验的 `appearance-controller.js`：绘制前恢复 `t4f.appearance`，仅替换完整主题类，storage 同步且存储失败时页内可用。仍无 React Island、无关脚本、JS preload 或系统主题跟随。Astro/React 共用控制器与导航样式；Canvas 将控制收纳在可键盘操作的浮层中。语言按目标 Registry 发布状态映射，未知/DEV/未实现信息页回退目标 `/tools/`；不携带 query/hash。
>
> Issue #3（2026-10-25）替换旧本地联调方式：一次 `pnpm dev` 启动 CN 54321 / EN 54322，语言链接自动保持本地同路径（包括地区可用 draft）；`pnpm dev stop` 同时停止。真实工具只使用 `/tools/{slug}/`，生产继续由 Registry status/regions 过滤，未知/Lab 路径回退目标工具目录。两端主题偏好独立；`T4F_DEV_APPEARANCE` 仍只决定 DEV 无偏好时的起点，手动选择优先。

> V0.5-C3-A（2026-10-21）：普通 Header 与 Form/Batch 产品导航共用 68px 导航行和 `clamp(16px, 2vw, 36px)` 安全边距；Footer 全宽静态渲染，简化为品牌、by LibreCosta、真实链接与原有条件合规信息。宽度分为 Full Bleed、Fluid Workspace 与 820px Readable Content；首页构图上限 1600px，Converter 空状态上限 960px，有文件时列表流式展开、设置 320px。Canvas 保持原浮动入口和 `100dvh`，900px 断点及 Footer 文档流不变；没有新增客户端入口或脚本。

> V0.5-C2-A（2026-10-21）：`SiteLayout` 统一挂载静态 `components/site/SiteFooter.astro`，`workspace` 只隐藏站点 Header；正式工具、DEV 预览及 Lab 均有同一 Footer。Canvas 仍为 `100dvh`，Footer 在其后自然滚动，不参与坐标、Overlay 或 Sheet 布局。
>
> 合规配置位于 `src/config/compliance.ts`，CN / Global 分开且当前均为空，不输出占位区域。获得真实核准后才填写 ICP 号码、公安备案号码及实际核准链接和本地图标路径，其他真实许可可放入 `additional`。ICP 固定链接至 `https://beian.miit.gov.cn/`；Global 不继承 CN 记录。配置不能替代实际合规审核，也不代表网站已满足全部运营要求。测试记录只在测试或临时验收中使用，不得提交到正式配置或产物。

> **中文 Codex 总实施文档｜C1–C4 已冻结设计｜待实施**\
> 建议入库位置：`docs/site-homepage.md`\
> 目标仓库：`https://github.com/librecosta/tool4furry`\
> 目标分支：`dev`（**禁止擅自合并 `main`、部署或修改生产环境**）\
> 设计日期：2026-10-09\
> 核实基线：`dev` HEAD `4b14fe2bbcc12836a2515b611d64ce4405781f3a`；开始前 Codex 必须重新检查远端和本地状态，不得机械依赖这一 SHA。

## 0. 执行摘要与成功定义

本轮实现 Tool4Furry 的**公开站点外观与工具发现基础**，把 V0.1 的简单首页改造成有完整品牌识别、可信信息和直接工具入口的 **Creative Toolbox / Editorial Creative Studio**。

**已冻结的产品原则**：

- **Site 是发现入口，Workbench 是操作入口**：首页负责品牌表达与找到工具，不复制 V0.3-B 的工作台布局。
- **Tool-first**：工具是首页的主角；Hero 要建立识别感，但不应占用几屏导致找不到目录。
- **品牌风格**：V0.3-A 的暖白、浅砂、深墨、暖橙和鼠尾草；DM Sans Variable + Noto Sans SC Variable；**经审定双兽首 Mark + `Tool4Furry` Wordmark**。
- **Hero**：非对称双栏，左侧主标题与说明，右侧纸张/画板/配色/曲线组成的静态“创作碎片”；手机端压缩视觉装饰。
- **Catalog**：Editorial Grid，卡片简短清晰；发布状态与地区由唯一 Registry 决定。**当前正式工具为 0，必须诚实展示空状态。**
- **渐进工具发现**：工具少时直接列出全部；后续有实际工具再启用分类浏览，高级搜索及独立 `/tools` 总目录后置。
- **轻量站点**：Astro SSG + StyleX 静态提取。**生产首页零 `<script>`、零 Astro Island、零 JS preload；不加载全站 React Provider。**
- **双地区**：`tool4furry.cn` 简体中文、`tool4furry.com` 英文；同一代码库独立静态构建，分别使用已发布/允许该地区的工具元信息。

### 成功标准

打开 `pnpm dev`，中文首页拥有成熟的 Header、Hero、真实目录或空状态、轻量 Footer；英文开发预览采用独立英文文案，构图及功能一致。Hero、品牌符号、卡片布局都符合冻结设计；移动端不被插画占满。构建后两地区 Title/Description/Canonical/OG 文本、工具链接、静态脚本/字体/实验室隔离守卫全部正确。**没有新增假工具、无效入口或不必要的客户端依赖。**

### 设计阶段与编码阶段编号

| 已完成的设计冻结 | 本文的 Codex 实施关口 | 对应内容 |
|---|---|---|
| C1 — Identity & Navigation | I1 | 几何占位 Logo、Header、工作台品牌一致性 |
| C2 — Hero & Brand Composition | I2 | 标题、文字、CTA、静态创作碎片、移动端 |
| C3 — Tool Discovery & Catalog | I3 | Editorial Grid、Registry、分类语义与空状态 |
| C4 — Footer, SEO & Responsive Acceptance | I4 / I5 | Footer/SEO 与测试、视觉验收 |
| 所有阶段的现实基线 | I0 | 审计、确保零回归 |

**C1–C4 是设计阶段，I0–I5 是执行关口，不要混淆。**

---

## 1. 必须先读的真实工程与现状

开始前先读：`AGENTS.md`、`README.md`、`docs/foundation.md`、`docs/visual-foundation.md`、`docs/workbench-appearance.md`，必要时参考 `docs/ui-primitives.md`。以实际当前文件为准。

2026-10-09 在 `dev` 核实到的重点：

| 文件/路径 | 现状与实施意义 |
|---|---|
| `src/pages/index.astro` | 首页尚是 V0.1 标记 + 标题/说明 + Registry 卡片或空状态；应成为主要改造目标 |
| `src/layouts/SiteLayout.astro` | 持有站点 Head、普通站点 Header/Footer、字体引入、Skip Link；`workspace` 关闭站点导航；Title 当前拼接 `{title} · Tool4Furry` |
| `src/styles/site.ts` | Site 外观所有者；当前内容最大宽度 1080px、普通一行 Footer、Hero 字号 56/36、卡片 Grid 简单 |
| `src/i18n/messages.ts` | CN/Global 官方文案唯一现有入口；需增加 Hero、导航、目录、Footer、SEO 文本，不泄漏中文至 Global |
| `src/tools/types.ts` | `ToolDefinition` 包含 id、slug、category、mode、status、regions、copy；没有图片/标签/推荐字段 |
| `src/tools/registry.ts` | `tools: readonly ToolDefinition[] = []`；`getPublishedTools(region)` 已正确按发布状态/地区过滤 |
| `src/tools/ToolPageFrame.tsx` | V0.3-B 形成的产品级工作台导航，含 Tool4Furry 文本、工具箱 Menu、当前工具名；**只允许为品牌占位标识做极小的统一性修改** |
| `src/pages/tools/[slug].astro` | 只为已发布工具生成 SSG 页面；不得擅自注册新工具 |
| `src/pages/404.astro` | 已使用 SiteLayout 且 `noindex`；需要确认更新站点 Shell 后仍正确 |
| `src/config/region.ts` | CN `https://tool4furry.cn`、Global `https://tool4furry.com` 的固定映射 |
| `scripts/verify-build.mjs` | 守卫两地区首页 canonical、HTML lang、首页零 script/Island/JS preload、空态文本、工具路由链接、StyleX/字体及 Lab 排除 |
| `astro.config.mjs` | Astro Static + React/StyleX 的特殊配置；**本轮不要触碰** |
| `tests/contracts.test.ts` | 已验证地区、发布、Lab 和工具入口基础约束；可扩展首页有关的纯数据测试 |
| `.github/workflows/ci.yml` | frozen install → check → test → build:cn → build:global；不要增加部署动作 |

当前 `dev` 最新一次核实 CI 成功：`https://github.com/librecosta/tool4furry/actions/runs/37890579758`。这是**改动前基线**，不是本任务完成证据。

### 不可变工程边界

1. 保留 Astro SSG + React Islands + StyleX + Base UI 的当前分层，不新增框架、UI 库、动画库、图表库、SSR Adapter、持久化或后端。
2. 首页、Footer、SEO 的交付必须为构建期 HTML/CSS/本地 SVG，不新增 React Island；不用 Motion 制作 Hero。
3. 保留 DM Sans / Noto Sans SC 自托管与已存在的 `@font-face` 分包策略；不从远程 Google Fonts 加载，也不预加载所有中文子集。
4. 不触碰 Canvas 全视口、Form/Batch、Base UI Portal、文件、ScrollDock、工具业务状态以及 `ToolRuntime` 的懒加载行为。
5. 不发布假工具、不把五个 Lab 注册为工具；生产继续没有 Lab 路由、DEMO 代码和 DEV ONLY 菜单。
6. 不创建虚构隐私政策、服务条款、用户评价、下载量、热门排行、定价入口或不存在的社会媒体链接。
7. `LICENSE` 仍是 BSD-3-Clause；**只可以说“前端开源”**，不要宣传未来可能闭源的 SaaS 后端也开源。
8. 当描述隐私与处理方式时使用“**浏览器本地处理优先**”，不要承诺所有未来工具均离线或绝不上传。
9. 本次只提交至 `dev`；不修改 `main`，不推送生产，不创建 CD 工作流。

---

## 2. C1 — Site Identity & Global Header

### 2.1 标识结构与资源

使用经维护者审核的双兽首 `public/brand/tool4furry-symbol.svg`，两条 Master path、双眼和透明负形保持不变。Header/Footer/工作台通过同一 CSS mask 与 `currentColor` 呈现，旁边只保留一份 DM Sans 700 实时文字；手机导航继续使用 T4F 缩写。

- `tool4furry-horizontal.svg` 为 A 平衡版正式组合，DM Sans 700 字标已转为真实路径，无 text/字体依赖。
- Favicon 使用根路径 `/favicon.ico`（16–256px 多尺寸）及 `/brand/tool4furry-favicon.png`（96px），中性深灰底配浅白 Master 图形，不使用 SVG Favicon。
- 不新增品牌色、图形管理器或全局脚本；Hero 装饰素材不变。字形来源、许可与转曲参数见 [视觉基础](visual-foundation.md)。

**工作台一致性**：仅在 `ToolPageFrame.tsx` 的已有产品入口附近消费这一 Mark，不移动原 Menu、修改导航行为或干扰 Canvas 浮层空间。ToolPageFrame 是产品级导航的现有所有者，不要复制首页 Header 进去。

### 2.2 Header 信息与行为

| 区域 | 桌面与移动端行为 |
|---|---|
| 左侧 | Mark + `Tool4Furry`，整体品牌链接 `href="/"` |
| 右侧主入口 | 当前地区“工具箱 / Toolbox”链接 `href="/#tools"` |
| 右侧辅助 | 真实 GitHub 仓库 `https://github.com/librecosta/tool4furry`；移动端可用仅图标链接但需 `aria-label` |
| 首页链接 | 不再冗余设置独立“首页”按钮；Logo 已能返回首页 |
| 移动导航 | 元素数量很少，不建立汉堡菜单/抽屉菜单 |
| Sticky | 暂不吸顶、不做滚动缩放/渐变 Header |

**注意**：`/#tools` 必须在空工具状态也确实存在，因此首页工具目录 Section 必须始终有 `id="tools"`。从 404 或未来其他站点页点击 Header 工具箱也应可以正确跳转。`#tools` 不能只存在于有工具的状态。

### 2.3 视觉参数

- 桌面 Header 高度约 68–72px；手机约 56–64px。采用自然文档流、不固定视口。
- Mark 桌面约 32px，移动约 28–30px；Wordmark 桌面约 20–22px，移动约 18–20px；导航文字 14px。
- 站点内容最大宽度建议调整为约 **1160–1200px**，响应式 24–40px 桌面边距、16–20px 移动边距；与 Hero、目录、Footer 对齐。
- 暖白底 + 细浅砂边线，布局紧凑；不加大面积毛玻璃、滚动特效、重复阴影。
- 移动端优先保证品牌文字完整和“工具箱”始终可见；GitHub 可以图标化，不隐藏工具箱。

---

## 3. C2 — Homepage Hero & Brand Composition

### 3.1 文案冻结

**CN Hero H1**：

> 灵感尽情发挥。\
> 繁琐留给工具。

**Global Hero H1**：

> More room for imagination.\
> Less time on the tedious bits.

中文副标题建议使用：

> 为 Furry 创作者打造的轻巧工具箱。让素材处理与日常创作更简单，把时间留给真正喜欢的事情。

英文保持语气而非逐字翻译，例如：

> Thoughtful browser tools for furry creators, made to simplify everyday creative tasks.

短小眉题可用 `FOR FURRY CREATORS`（中文用“为 Furry 创作者而造”），但不要在首页反复堆砌关键词。H1 只有一个，第二行突出 `tokens.action`，其余用 `tokens.textPrimary`。

### 3.2 构图冻结

- 桌面**非对称双栏**，左侧约 55% 文案、右侧约 45% 静态创作碎片。整体在页面原有背景上组合，不把 Hero 全体再塞入一张厚重卡片。
- 左侧顺序：眉题 → 两行 H1 → 简洁副标题 → 真实可用的行为入口或状态说明。
- 右侧：抽象创作素材构图，包括 **暖白纸张/画板、配色小圆点、几何线条、轻微流动的尾巴意象曲线**；控制数量、旋转与阴影，避免贴纸墙或高度卡通化。
- 不使用真实产品界面假截图；不绘制虚假功能图标；不依赖远程插画图库。
- 采用独立静态 SVG/轻量 Astro 表现（建议 `public/brand/creative-fragments.svg` 或 `src/components/site/HeroArtwork.astro`，二选一即可）。页面布局使用 StyleX；装饰 SVG 不应迫使 `index.astro` 变成难维护的千行模板。
- 动效为 **零要求**。本轮不加入轮播、连续浮动或 Motion/Canvas/WebGL。

### 3.3 Hero CTA：按真实工具发布状态

| `getPublishedTools(region)` | Hero 行为 |
|---|---|
| `length === 0` | 展示“正在打造首批工具”等**非欺骗性状态**；可附真实 GitHub 开源链接；**不出现“立即使用”或暗示已有工具的醒目 CTA** |
| `length > 0` | 主要 CTA “探索工具箱 / Explore tools”，锚点 `#tools`；不跳虚构页面 |

无论数量如何，Header 工具箱导航均指向 `/#tools`；空状态也能被抵达。主要 CTA 样式采用 `tokens.action #A6532C`，白字有可读对比度；`tokens.brand #C97849` 是装饰色，不用于普通白字操作按钮底色。

### 3.4 手机端与尺寸

| 属性 | Desktop | Mobile |
|---|---|---|
| Hero | 左右两栏 | 文字先、图形后 |
| 标题 | 48–56px | 32–36px |
| 正文 | 16–18px | 14–16px |
| 图形高度 | 约 360–400px | 约 120–180px，允许减少细节 |
| 首屏上下留白 | 约 64–80px 的节奏 | 约 32–40px |

不要为 Hero 设置固定 `height:100vh`，不要让手机用户滚动几屏才能看到 `#tools`。英文长标题在 320/375/390px 下应自然换行，不产生横向溢出；不要硬插入与语言不一致的强制 `<br>`。

---

## 4. C3 — Tool Discovery & Catalog

### 4.1 信息架构

首页工具区 `section#tools[aria-labelledby]` 持续存在，H2 “探索工具箱 / Explore tools”（或已冻结的简洁对应文案）；工具列表只来自 `getPublishedTools(region)`，并在构建期渲染真实 `<a href="/tools/<slug>/">`。

**当前 0 工具情况**：

- 显示真实、精心排版的空状态面板，中文必须保留字样 **“工具正在准备中”**，英文保留 **“Tools are on the way”**（现有生产构建守卫会验证它们）。
- 下方使用真实的简短解释，体现正处于打磨首批工具的阶段；可链接真实 GitHub。
- 不显示 `00 tools` 计数、空分类 Tab、禁用搜索框、虚假“精选”“热门”内容或 Lab 演示卡片。
- 空状态依然有 `id="tools"` 的目标，导航不死链。

**未来 `>0` 工具情况**：

- 桌面三列优先，平板两列、手机一列；统一整卡可点击、SVG 小图标或统一轻量几何符号、中文/英文工具名、简短用途描述及可选合法分类微标签。
- 卡片样式：`tokens.surface`、`tokens.border`、`tokens.radiusLg(12px)`；图标容器约 40–44px，图标约 20–24px；标题 16px/600，说明 13–14px，Hover 轻微变化，不加大封面/假截图。
- 工具卡片标题 H3；列表结构为 `<ul><li><a ...>`，Tab 焦点清晰；工具不存在则不输出链接。
- 不引入评分、热度、下载次数、用户评价和 `NEW/HOT` 等无数据徽章。
- 卡片的图标表现不要求在本期为每个工具引入文件资产或新增 Registry `icon` 字段；优先使用小型**通用/分类级**静态符号作为可维护的默认表现。

### 4.2 类别模型：长期可扩展、短期克制

`ToolDefinition.category: string` 已有，可以保留为稳定的类别 ID。建议为真实工具提供以下候选映射，**仅展示当前地区已发布工具中实际占用的类别**，不创建空分类页面：

| 稳定 ID（建议） | 中文 | 英文 |
|---|---|---|
| `images` | 图像与素材 | Images & Assets |
| `creative` | 创作与设计 | Creative & Design |
| `characters` | 角色与设定 | Characters & Worldbuilding |
| `text` | 文本与写作 | Text & Writing |
| `files` | 文件与效率 | Files & Productivity |

这些是**候选词表**，不是现在必须建立的五个路由。短期阶段不做多级类别、搜索索引、分类数据库/管理后台、标签云。目录不按工程 `WorkspaceMode` 分为 Canvas/Form/Batch：那是内部分层，不是用户的自然分类方式。

**本次交付最低要求**：0 工具时没有空分类；未来添加真实的已发布 Registry 项，工具卡片自动出现，描述按地区取文案；遇到未知类别键时应有安全回退，不让页面构建失败。可以预留轻量类别文本映射，但**不要为了 0 个真实工具立即实现复杂筛选 UI**。当实际工具数量带来查找困难时，再用真实使用数据决定何时在首页增加分类锚点和独立 `/tools` 页。

### 4.3 首页与工作台工具切换器的关系

- 首页 Catalog 用于**发现**工具；V0.3-B `ToolPageFrame` 中的 Tool Switcher 用于**切换**工具。
- 二者只共享同一个 Registry，不复制发布配置，不在本期重构 ToolPageFrame 的 Base UI Menu 行为。
- 暂不开发前端即时搜索、收藏、最近使用、推荐算法、服务端搜索和筛选持久化。
- 若为了测试“已有工具时的目录状态”使用 fixture，必须**仅在测试代码/临时未提交的调试环境**中使用，不得将其标记为生产 `published` 并推送到 `dev`。

---

## 5. C4 — Footer, SEO, 静态与响应式合同

### 5.1 Footer：Minimal Editorial Footer

Footer 两层结构：

1. **品牌/导航层**：占位 Mark + Tool4Furry、1 句品牌介绍、简短生态关系文案（可写 “A GoFurry project.”）、工具箱 `/#tools`、GitHub、真实 BSD-3-Clause 许可证链接。
2. **元信息层**：`© 2026 Tool4Furry` 或构建期取当前年份；“前端开源 · 浏览器本地处理优先 / Open-source frontend · Local processing first”。

建议 License 链接 `https://github.com/librecosta/tool4furry/blob/master/LICENSE`（仓库现有真实许可证）；GitHub 链接 `https://github.com/librecosta/tool4furry`。如果站点需要显式标记 GoFurry 生态关系，仅作简短真实文案，不额外添加不确定 URL。

- 桌面两栏，移动自然纵排；不用多列企业站导航、手风琴或折叠菜单。
- 仅真实链接；不虚构隐私政策、服务条款、备案号、联系邮箱、赞助、价格、社区图标。
- Footer 和 Header 的 Mark **同源**；不会因为后来更换 Logo 而需要逐组件修改图形内容。
- 保持普通 HTML 文档流，不引入 Sticky Footer JS 或观察器。

### 5.2 首页 SEO 字符串与语义

**建议正式首页 Head 文案**（因目前 0 正式工具，描述应保持建设中语气，不暗示现成工具）：

| 字段 | CN | Global |
|---|---|---|
| `title` | `Tool4Furry — Furry 创作者的浏览器工具箱` | `Tool4Furry — Browser Tools for Furry Creators` |
| H1 | `灵感尽情发挥。繁琐留给工具。` | `More room for imagination. Less time on the tedious bits.` |
| `description` | `Tool4Furry 正在为 Furry 创作者打造轻巧的浏览器工具箱，涵盖创作、素材处理与日常效率。首批工具开发中。` | `Tool4Furry is building browser-based tools for furry creators, focused on creative tasks, assets and everyday productivity. Tools are on the way.` |
| `lang` | `zh-CN` | `en` |
| canonical | `https://tool4furry.cn/` | `https://tool4furry.com/` |

现有 `SiteLayout.astro` 使用 `<title>{title} · Tool4Furry</title>`，**直接把整句 SEO 标题塞到 `title` 会重复品牌**。Codex 需要采取最小向后兼容方案，例如首页特有的 `fullTitle?: string` 属性或等效简单逻辑；其他 404/工具页现有 title 语义与页面输出保持不变。

### 5.3 Open Graph 与 Head 边界

- 在现有 `SiteLayout.astro` 中由一处统一导出页面 Title/Description/Canonical 与 `og:title`、`og:description`、`og:url`、`og:type`（`website`）及适当的 `og:site_name`。
- `og:url` 必须使用对应地区当前页面的绝对 URL，首页同 canonical；不得把 `.cn` 的 URL 出到 `.com`，也不能将两个地区互相 canonical。
- 默认 `og:image` 使用已确认的 `/brand/tool4furry-og.png`，补齐实际尺寸、PNG 类型与双语 Alt；源稿 SVG 不作为分享图片引用。X/Twitter 使用同图的 summary_large_image 卡片，不编造社交账户。
- 保持 404 与开发 Lab 的 `noindex`，不要把 404 当作有效的 SEO 页面；可以对 noindex 页面省略 OG 页面推广元信息。
- 目前不引入 JSON-LD（它通常使用 `script[type="application/ld+json"]`，与现有零 script 守卫有冲突），不放宽现有静态守卫来迎合 SEO。
- 暂不添加 Sitemap、Google Analytics、埋点、强行生成的 robots 页面与 `hreflang`。后续确定对应地区工具页面存在且上线规则明确后再考虑。

### 5.4 可访问性与内容语义

- `main#main-content` + Skip Link 继续保持，H1 只能有一个；工具 Section H2；工具标题 H3。
- Header/Footer 使用 `nav` 与合理可访问名称；品牌链接、工具箱链接与 GitHub 图标链接必须可用 Tab 聚焦且有可读名称。
- 静态 Hero 装饰用 `aria-hidden="true"` 或等效空 alt，不让装饰路径被屏幕阅读器读成正文。
- 主要交互区域尽可能达到 44px 的易点触尺寸；保留 2px 的可见键盘焦点，移动不依赖 Hover。
- V0.3-A 已确认：`textSecondary` 在 `surfaceMuted` 上约为 4.28:1；浅砂区普通正文应使用 `textPrimary` 或经过验证的可读搭配。
- 文案不在视觉状态外重复伪装可点击按钮；真实操作一定使用 `<a>` 或原生按钮。

### 5.5 静态性能红线

- 首页 **零客户端业务 JS**：生产 `index.html` 不包含脚本、Astro Island 或 JS preload；不能为了搜索/动效引入 React Island。
- Hero 插画为静态轻量 SVG，不请求第三方资源、不使用 video/canvas 动画。
- 卡片不依赖大量独立封面/大尺寸预览图；Favicon 资源本地可用。
- StyleX 在构建后继续正常提取，Fontsource 当前交付与授权副本保留，不修改特殊 Vite/StyleX HMR 集成。
- 保留 `scripts/verify-build.mjs` 检查；只在新增验收事实时**增强**其断言，不得删除零脚本、Lab 排除、字体、canonical 或工具路由约束。
- 不以未经测试的 CLS、LCP、Lighthouse 数据宣称性能达标；实测时记录环境、状态和可重复路径。

---

## 6. 实施关口（Codex 按顺序执行）

### I0 — Audit & Baseline（不改 UI）

1. `git status`、当前 branch、远端 `dev`；确认工作区是否有不属于本任务的改动；若有先停下说明，不覆盖。
2. 阅读工程合同及上述文件，简述当前功能边界，确认 Registry 仍按实际状态筛选（可能在 Codex 开始时已新增真实工具，届时以事实为准）。
3. 确认现有 CI / 生产守卫含零脚本、Labs、Local Fonts / CSS、地区 canonical、空态文本与 Tool Routes。
4. 输出简短基线审计，不建立额外迁移框架，不改依赖。

**Gate I0**：目标明确，不会动工作台或虚构工具。可继续 I1。

### I1 — Brand Asset & Header

1. 品牌资源已由 Issue #13 的审核 Master `public/brand/tool4furry-symbol.svg` 与 A 版横向转曲 Logo 接替，保留单份可见 Wordmark。
2. Header Desktop/Mobile：Logo+Wordmark 左，Tools→`/#tools` 与 GitHub 右；不加“首页”重复入口、汉堡、吸顶、通知。
3. 最小改造 `ToolPageFrame.tsx` 的品牌入口使用**同一审核 Master Mark**；保持 Base UI Menu、现有标题/焦点/工具切换及 B 阶段行为。
4. Favicon 链接指向实际打包的 ICO / PNG；验证 404/工作台的资源路径。
5. 样式归属尽量在 `site.ts`；不得引入新的全局 CSS 主题。

**Gate I1**：Header 链接可用、品牌同源、移动不挤压、B 期工作台回归。

### I2 — Homepage Hero

1. 移除公开首页的 `V0.1 / 基础建设中` 大型工程痕迹；保留真实“仍在建设首批工具”的业务事实。
2. 落地 CN/Global H1、副标题、眉题；两行排版自然，第二行使用操作暖橙强调。
3. 采用非对称双栏；做独立静态 Creative Fragments SVG/局部 Astro 组件，主视觉不冒充真实工具截图。
4. 构建期以 `getPublishedTools(region)` 决定 Hero CTA：0 项不展示虚假“立即使用”；有工具才提供探索目录锚点。
5. 手机压缩/简化视觉，确保 `#tools` 在合理滚动距离可达；支持长英文换行，不需要 JS。

**Gate I2**：桌面和手机构图有质量、有辨识度；Hero 不等于全屏广告。

### I3 — Tool Discovery & Zero-State

1. `section id="tools"` 总是存在，包含正确 H2。
2. 0 个正式工具：精致、诚实的空面板；必须包含原 CN/Global 空态关键短语，不能显示数字 `00`、五个空分类或伪工具。
3. 有已发布工具：从 Registry 生成真实 `<ul>/<li>/<a>` 卡片，使用本地化标题与描述、整体可点击、无页面负担的通用静态小图标。
4. 保留未来主类别 ID/本地化标签的扩展方向，但本期不建完整搜索、筛选、收藏、热门或运营排序系统；不向 Registry 注册真实产品以外的数据。
5. 保证 `/tools/<slug>/` 链接与实际静态路由同一规则，地区过滤不变。

**Gate I3**：空 Registry 与测试 fixture 的非空/跨地区情形均可验证，无死链、无目录状态矛盾。

### I4 — Footer, SEO & Shell

1. 落地简洁 Footer：复用 Mark + Wordmark、简介、工具箱/GitHub/LICENSE 等真链接、简洁生态关系、年份与准确的“前端开源/本地处理优先”说明。
2. 首页 Title/Description 正确 CN/Global；最小增强 SiteLayout 避免 SEO 完整标题重复 `Tool4Furry`；其他页面标题保持原有逻辑。
3. 增加文案型 OG 元信息；没有有效图像就不输出 `og:image`。保留 `noindex`、各自 canonical。
4. 404 使用统一新 Header/Footer，仍能返回首页；Lab 不因此获得生产入口。
5. 如有实质变化，更新 `README.md`、`AGENTS.md`，新增 `docs/site-homepage.md` 记录设计规则与已验证结果；不重写其它阶段历史合同。

**Gate I4**：没有重复标题、错误地区、虚假图片或失效链接；旧页面不回归。

### I5 — Tests, Browser Acceptance & Delivery

**自动检查**（停止 dev 后顺序执行，不并发读写 Vite 缓存）：

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build:cn
pnpm build:global
```

- 建议扩充 `scripts/verify-build.mjs`：静态 HTML Title/Description/OG、`#tools` 锚点、真实 Header/Footer 链接、无未知 `og:image`、SVG Favicon 资源存在（仅已实际添加时）。**绝不删除现有零 JS、Lab、地区、Fontsource 和 CSS 断言。**
- 使用测试 fixture 验证：`status=draft` 和非当前地区的工具不显示、已发布工具链接/文案本地化；Fixture 只能属于测试，禁止发布。
- 可能新增纯数据/HTML 断言；不要求安装 Playwright 大型框架。不以 jsdom 模拟声称完成真实响应式几何测试。
- 真实浏览器检查 CN 与英文预览的 Header、Hero、目录、Footer、404、#tools 导航、焦点、零横向溢出；可留截图到仓库外 `../artifacts/site-v03c/` 等未提交路径。
- 回归 `/lab/canvas`、`/lab/form`、`/lab/batch`、`/lab/ui`、`/lab/files` 的关键行为，尤其不能因 Header/Logo 调整产生双品牌区或 Portal 问题；生产则必须无五个 Lab。
- 最终提交变更并推回 `dev`，附简洁报告：修改文件、通过的命令、实测尺寸、未完成验证、Git/CI 状态。不要擅自合并 `main` 或部署。

**Gate I5**：P0 全部通过，P1 已按实际浏览器体验处理或明确列出未验风险，才可结束本次任务。

---

## 7. 验收矩阵

### P0 — 不可妥协

| 检查 | 必须达到 |
|---|---|
| 地区隔离 | CN 中文 `.cn`，Global 英文 `.com`；各自 HTML lang、canonical、正文无串语种 |
| SEO | 首页 Title/Description/OG 文本正确且不重复品牌；404/Lab noindex 仍存在 |
| 静态性能 | 首页生产零 `<script>`、零 Astro Island、零 JS preload，无新增运行时依赖 |
| 品牌路径 | 占位 Logo 资源存在，Header/Footer/ToolPageFrame 同源且可替换 |
| 导航 | `/#tools` 在 0 工具与非空均可跳转；全部对外链接是真实资源 |
| 工具数据 | 仅当前地区 `published` 显示；空 Registry 无假卡片/空类别/搜索死入口 |
| 发布路由 | 工具卡片 href 与已生成 `/tools/[slug]` 页面一致，Registry 发布契约不变 |
| 实验室 | CN/Global 生产无 Lab URL、组件、Demo 内容、DEV ONLY 入口 |
| 工程 | `pnpm check`、`pnpm test`、`pnpm build:cn`、`pnpm build:global` 都通过，已有 CI 不削弱 |

### P1 — 人工视觉与操作

| 检查 | 目标 |
|---|---|
| 1440×900 | Header 与 Hero 空间关系合理、Hero 55/45 左右视觉不笨重、目录清晰 |
| 1024×768 | 不出现尴尬的极窄双栏或英文标题遮挡 |
| 768×1024 | 平板自然过渡，工具网格和 Footer 不溢出 |
| 390×844 / 375×812 | Logo/Wordmark 可辨、目录较早可见、Header 与 CTA 易点 |
| 320×568 | 最小宽度没有横向滚动、不可读按钮或标题截断 |
| 812×375 | 横屏全体真实链接可达，Hero 不固定高锁住页面 |
| 长英文 | 标题/卡片/Footer 正常换行，排版不被拉坏 |
| 键盘 | Skip Link、导航、全部卡片可 Tab/Shift+Tab 操作，焦点可见 |
| 字体 | 正确本地加载；不出现异常方框字、字体阻塞依赖与明显布局碰撞 |
| 信息真实 | 没有不存在的正式工具/功能、伪评级/伪流量/虚假隐私承诺 |

**测试边界**：桌面浏览器视口模拟 ≠ iOS Safari / Android Chrome 真机。若无真机能力，须列出软键盘、系统缩放、屏幕阅读器、实际触摸等未验证项，不得声称已通过。

### P2 — 本轮明确延期

- 正式 Logo / 吉祥物插画；完整 OG 分享图片。
- `/tools` 大型目录与搜索、分类筛选 UI、关键词排序、最近使用、收藏、推荐算法。
- 登录、账户、收藏同步、付费、后端服务、数据库、遥测、SSG→SSR 迁移。
- 真实工具的发布/SEO 深度内容、结构化数据 JSON-LD、Sitemap、hreflang 自动映射。
- 真实文件处理能力与未来画布/批处理引擎。
- 暗黑模式、复杂动画、全站组件重构、移动版大型菜单。

这些未实施并不妨碍 V0.3-C 完成，前提是现有设计为未来扩展留下清晰路径。

---

## 8. 风险、冲突处理与禁止事项

### 8.1 已识别的真实冲突

**标题重复**：`SiteLayout.astro` 现在会自动追加 `· Tool4Furry`，完整 SEO title 不能直接传入 `title`，需小型兼容调整。

**零脚本 vs JSON-LD**：生产守卫禁止首页任何 `<script>`；本轮暂不做 JSON-LD，不可以为了 SEO 放宽红线。

**空状态 vs 构建守卫**：`verify-build.mjs` 通过“工具正在准备中 / Tools are on the way”识别零工具；若重写空状态文案，必须保留关键短语及同步增强断言，而不是删掉检查。

**目录卡片 vs 构建守卫**：它要求生成的工具页都能从首页列出。当前 C3 明确首页展示所有已发布工具，符合守卫；未来首页精选/独立目录阶段再设计新的链接覆盖校验，**本轮不要为了假想规模削弱它**。

**工作台品牌共享**：可改变占位 Mark 的来源与少量布局，不能改变 ToolPageFrame 的 Base UI 工具箱逻辑、Canvas 浮层和焦点关系。

**Hero CTA 真实性**：前几版设计示意图中展示“探索工具箱”大按钮，但真实 Registry 为零时不允许把它当“可用工具”承诺；Header 的“工具箱”是有效的目录锚点，可以保留。

### 8.2 禁止误实施

- 不得复刻抽象右侧 SVG 成“已发布的图像编辑器截图”，不追加评分/访问数/成功案例。
- 不引入 `@astrojs/sitemap`、搜索引擎、Tailwind、额外 React 根、Framer/Motion 动画，只为展示几个静态块。
- 不修改 `astro.config.mjs` 的 StyleX 运行方式，不借本轮“修复”现有已验证工程选择。
- 不用大段内联页面级 CSS 与 StyleX 同时控制相同外观；必要 global.css 仅保留既有 reset 与字体基础。
- 不删除 `noindex`、不在 `.com` 页面混入中文内容，不互相 canonical。
- 不在生产 Registry 加入测试工具，不暴露 `/lab/*`，不让首页加载工作台 React 包。
- 不为工作台重新设计独立 Logo/导航组件，不建立二次全局 Tool Registry。
- 不因为单一截图好看而牺牲最窄屏、键盘、自然滚动和真实工具入口。

---

## 9. 交付清单与完成报告格式

建议实际交付文件范围（允许小幅调整，但必须解释）：

| 路径 | 预期改动 |
|---|---|
| `public/brand/tool4furry-symbol.svg` / `tool4furry-horizontal.svg` | 经审定 Master / A 平衡版转曲组合 |
| `public/favicon.ico` / `public/brand/tool4furry-favicon.png` | 多尺寸 ICO / 96px PNG Favicon |
| `public/brand/creative-fragments.svg` *或* `src/components/site/HeroArtwork.astro` | 静态抽象 Hero 视觉，择一即可 |
| `src/pages/index.astro` | Hero、真实 CTA、#tools、目录与空状态 |
| `src/layouts/SiteLayout.astro` | Header、Footer、完整 SEO title 能力、OG 文本、可选 Favicon |
| `src/styles/site.ts` | 统一 Site 视觉、响应式、卡片与页脚 |
| `src/i18n/messages.ts` | CN/Global 首页/站点与 SEO 文案 |
| `src/tools/ToolPageFrame.tsx` | 仅为同源 Mark 做最小必要变更 |
| `scripts/verify-build.mjs` / `tests/*` | 补充新静态/语义/地区契约，保留旧守卫 |
| `docs/site-homepage.md`、`README.md`、`AGENTS.md` | 记录 V0.3-C 实际实现与验收，更新当前阶段说明 |

**Codex 最终报告必须包含：**

1. `dev` 上的实际实现摘要；哪些设计元素按计划交付、哪些不得不调整及原因。
2. 改动范围与新增资源路径；说明资源均可替换、无新增业务客户端 JS。
3. 四条命令的真实通过/失败结果；附 CI 运行链接（如已由远端触发且确实成功）。
4. CN/Global SEO 验证摘要、0 工具空状态、工具 fixture 验证方式、生产 Lab 隔离结果。
5. 浏览器检查的视口、人工截图或记录的保存位置；未做真机测试明确说明。
6. 尚存问题 / 已知限制；不得用“应该没问题”代替验证。
7. 确认未合并 `main`、未部署、未发布虚假工具。

**交付后的下一步**：由维护者运行 `pnpm dev` 人工复核首页字体、Hero、Catalog 和 Footer。V0.3-C 人工通过后，再讨论第一批**真实**工具需求，不在本轮顺手开发工具。

---

## 10. 冻结结论

**Tool4Furry V0.3-C 的目标不是一张营销海报，而是一个可以持续增加真实工具的创作工具门户。**

C1 的轻量品牌、C2 的创作碎片 Hero、C3 的简洁目录与诚实空状态、C4 的 Footer/SEO/响应式全部以 **Astro 静态页面、一个工具 Registry、两份地区构建**为底座。保证有品牌感，又不妨碍未来 MVP 和增长。

---

## 11. V0.3-C 实施记录（2026-10-09）

以上 0–10 节保留为导入的冻结合同；开头“待实施”是合同交付时的状态。本节记录实际实现与验收，不改写 V0.3-A/B 的历史结果。

### I0 — 实际基线

开始时仓库缺少本文件，已告知维护者，并完整阅读其附件后导入；仅将 Markdown 两空格硬换行等价转为反斜线硬换行。工作区原本干净，分支 `dev`；fetch 后 HEAD 与 origin/dev 均为 `4b14fe2bbcc12836a2515b611d64ce4405781f3a`。本轮没有回滚、覆盖现有变更或修改 main。Registry 仍为空。基线 CI 为第 1 节所列成功 run，不能代替本轮结果。

已核对 SiteLayout 的品牌后缀接口、地区配置、发布过滤、五个 DEV Lab、ToolRuntime/Provider、Canvas 单份参数树与构建守卫。原来首页没有 `#tools`，本轮补齐。没有依赖升级，未修改 Astro/StyleX 特殊集成、全局 CSS、Registry、工具加载器、WorkbenchShell、FileDropzone、ScrollDock 或 Provider。

### I1–I4 — 已实现的边界

- Issue #13 已用经审定双兽首 Master 替换旧占位图形。Header/Footer 的 `Brand.astro` 与 ToolPageFrame 共享 CSS mask，实时字标为 DM Sans 700，正式 A 组合另存为转曲 SVG；Favicon 使用真实 ICO/PNG。Menu/焦点/布局逻辑不变。
- `creative-fragments.svg` 是本地手写静态矢量装饰，不是工具预览；无外部引用、脚本、动画或 React。Hero 双栏比例约 55/45；760px 及以下采用单列，装饰高度 150px。冻结中英文 H1 分别使用主文字与深暖橙 action。
- Header 不吸顶，始终提供 `/#tools` 与真实 GitHub；手机 GitHub 只显示有名称的图标。Footer 包含 GoFurry 关系、相同工具箱目标、GitHub、真实 BSD-3-Clause 许可链接及“前端开源 · 浏览器本地处理优先”。
- `src/site/catalog.ts` 只调用原有 `getPublishedTools(region, registry)` 并投影当前语言标题、描述、路由和类别标签。没有第二套发布配置或客户端状态。已知类别提供五组标签；未知类别（含对象原型属性名）安全省略，不渲染空类别。
- `index.astro` 的 `section#tools` 始终存在。空态没有工具数、假卡片、搜索或探索主 CTA；非空分支为整卡链接，Grid 在 >1000px 三列、601–1000px 两列、<=600px 一列。有已发布工具才出现 `#tools` Hero CTA。卡片为静态 Astro 分支；当前正式 Registry 空，所以浏览器验收的是空态。非空/跨地区数据由仅存在于测试代码的 fixture 覆盖，未发布假工具。
- `SiteLayout` 新增可选 `fullTitle`，默认仍输出 `title · Tool4Furry`，404/Lab/Tool 调用保持兼容。首页单独传入完整地区标题与冻结 Description；文本 OG 与 canonical 共用同一解析结果。没有 og:image、JSON-LD、hreflang、追踪代码或新增运行时。
- StyleX 沿用冻结 tokens；字体仍为 Fontsource DM Sans / Noto Sans SC Variable 5.3.0、正常 wght.css。空态浅砂底使用主文字，导航/卡片使用可见焦点环；没有新增全局 CSS 或阴影主题。

### I5 — 自动验证与浏览器证据

最终命令、静态产物和浏览器验收记录见以下实际结果。

在 Windows PowerShell、Node 24.15.0 / pnpm 12.8.1 下先停止 dev，然后依次执行：

| 命令 | 本轮实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过，lockfile 无变更 |
| `pnpm check` | 61 文件；0 errors / 0 warnings / 0 hints |
| `pnpm test` | 9 个文件、73 项测试通过；保留原 67 项，新增 Catalog 6 项 |
| `pnpm build:cn` | 通过，2 个静态页面，0 工具卡，完整构建守卫通过 |
| `pnpm build:global` | 通过，2 个静态页面，0 工具卡，完整构建守卫通过 |

两个目录均仅生成首页和 `404.html`，无工具详情、Lab 路由或 Demo 实现。增强守卫保留全部原断言，并增加：冻结标题/H1/Description、唯一文本 OG、始终存在的目录锚点、条件 CTA、Header/Footer 真实目标、共用标识与 SVG favicon、卡片到真实静态工具页的反向校验、404 noindex 及默认标题兼容。每区域 100 个本地 WOFF2 文件与 3 个内嵌子集，OFL 文本逐字对照包授权；StyleX 提取正常，未引入远程字体。

`tests/site-catalog.test.ts` 用仅存在于测试中的元数据 fixture 验证空表、draft 排除、地区过滤、双语卡片数据与 `/tools/<slug>/`、未知类别安全降级、业务类别独立于工作台模式。未用源码包含某个 class 的断言冒充行为测试。未来发布真实工具时，构建守卫会同时验证实际整卡 HTML 和生成路由双向对应；当前未对生产 Registry 注入 fixture 或生成假详情页。

CI 配置保持原样：dev/main push/PR 仅 frozen install、check、test、build:cn、build:global，无 CD。上述为本地结果；提交后本轮 commit 的 GitHub Actions 状态与链接在交付回复中单独报告，不借用基线 CI 证明本轮通过。

#### 真实 Chromium 浏览器验收

使用普通 Python HTTP Server 分别服务 `dist/cn`（127.0.0.1:4381）与 `dist/global`（4382），未依赖 Astro 服务端。下面是内置 Chromium 的真实布局引擎和浏览器输入，视口覆盖不等于真机覆盖。

| 视口 | CN 目录顶部（页面坐标 px） | Global 目录顶部（px） | 实测 |
| --- | ---: | ---: | --- |
| 1440×900 | 588 | 628 | 双栏 Hero，完整 Header/Footer |
| 1024×768 | 588 | 590 | 双栏，文字和装饰不碰撞 |
| 768×1024 | 588 | 590 | 双栏，英文自然换行 |
| 390×844 | 550 | 627 | 单列，小图形，工具箱及 GitHub 可见 |
| 375×812 | 577 | 627 | 单列，无导航挤压 |
| 320×568 | 577 | 654 | Wordmark 完整，Footer 链接自然换行 |
| 812×375 | 588 | 590 | 正常文档滚动，没有锁屏或吸顶遮挡 |

14 个地区/尺寸组合均实测 `scrollWidth === clientWidth`、没有横向溢出元素，`script/astro-island` 数量为 0，三个装饰图片实例全部加载、`document.fonts.status` 为 loaded。Header 桌面 72px、手机 64px；导航触达 44px。最矮视口需纵向滚动查看目录，顶栏工具箱可直接导航；不为把所有内容塞进首屏而缩小文字。

检查了所有尺寸的整页截图；另用真实 Tab/Enter 检查 Skip → 品牌 → Toolbox → GitHub 的顺序及 2px 深暖橙焦点环。CN Skip 激活后下一次 Tab 进入正文 GitHub 进展链接，绕过 Header。Header 的 `/#tools` 与中英文 404 的工具箱导航均实际返回首页目录，404 标题仍为 `404 · Tool4Furry`。锚点遵守普通文档最大滚动范围，短页面/高视口不会强行把目录顶到屏幕顶部。

截图与测量 JSON 留在仓库外 `../artifacts/site-v03c/`：`cn-<宽>x<高>.jpg`、`global-<宽>x<高>.jpg` 共 14 张；`*-404-mobile.jpg`、`global-keyboard-skip.jpg`、`global-header-focus.jpg`、`global-tools-anchor.jpg`；几何记录为 `browser-measurements.json`。整页截图用于内容审查，尺寸结论以浏览器布局测量为准。

#### 五个 Lab 回归

- Canvas：390×844 手机参数打开前后 viewport 都是 390×844；名称改为 `V0.3-C 回归`，鼠标选择暖橙，Escape 关闭 Sheet 并返回触发器。切换到 1440×900 后再开 Inspector，名称/颜色保留、参数 TextField 实例数为 1。工具箱仍显示准备中空态。仅共用 Mark 更新，原 Menu 与 Provider 未改动。
- Form：空输入显示错误，输入 `furry` 并用空格启用大写后输出 `✦ FURRY`。
- Batch：添加第二个示例，两次推进得到 2/2 完成；移除得到 1/1；清空后为 0/0 且推进/清空禁用。
- UI：成功 Toast 实际出现，确认框确认后计数为 1并返回触发器。
- Files：混合选择 41B PNG 与不支持的 TXT，仅 PNG 进入队列，TXT 有独立错误；ScrollDock 从 100% 点击到 75%（可滚动范围 1290px）。未读取文件内容或发起上传。

对应截图是 `lab-*-regression.jpg`。旧交互单元测试全部保留。本轮不把这些抽样回归等同于重新完成 V0.2-A/B、V0.3-B 的所有人工验收。

### 剩余人工审查与边界

没有发现阻塞本轮交付的问题。请维护者审查正式 Mark 的实际显示与创作碎片、中英 H1 换行、手机 Hero 到目录的距离、空态和 Footer 密度；正式工具发布前还需以真实标题/描述检查非空卡片视觉与工具加载契约。

未进行 iOS Safari / Android Chrome 真机、实际触摸、软键盘/动态地址栏/安全区、系统缩放、屏幕阅读器及系统 reduced-motion 开关测试；没有提供 Lighthouse、LCP 或 CLS 跑分结论。首页自身无动效和 JavaScript，仍须结合真实设备复核阅读体验。没有实现正式工具、暗黑模式、搜索/收藏、账户、后端或部署。LICENSE 保持原 SHA256 `6D71EFDA0046FEF9B229E7080766E88155D8FFF2FB192C5555D1FED70A0C0871`。未发布假工具、未合并 main、未部署。

## Region / Locale separation (#11)

Region controls domain, compliance and Registry availability; Locale controls copy, HTML language and URL prefix. CN serves zh at `/` and en at `/en/`; Global serves en at `/` and zh at `/zh/`. Each page has a self canonical and two same-region reciprocal hreflang links. Astro templates live once under `[...locale]`, and React roots receive both axes. Language links never relay across origins. Explicit Footer region links preserve Locale, use published-only target availability and may relay appearance through the existing allowlist. Regional dev services remain on 54321/54322, with no additional server or client i18n runtime.

## Static discovery and security contact (#12)

Each regional build emits `/robots.txt`, `/sitemap-index.xml`, `/sitemap-0.xml`, `/.well-known/security.txt` and `/llms.txt` through Astro static endpoints. `src/site/discovery.ts` derives both local-language variants from the real static routes and published regional Registry. The build guard compares the XML/Markdown index with actual canonical HTML; no draft, Lab, fixture or invented lastmod is indexed. `llms.txt` is an optional content index convention, not a ranking or crawler guarantee.

Footer Support links privately to `contact@librecosta.com`, confirmed by the maintainer; public Issues remain for ordinary feedback. The single [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116) template uses each deployment’s Canonical, UTF-8 text and a build-relative 180-day UTC Expires. Rebuild/redeploy before expiry even if content is unchanged. Before any future deployment, verify the actual CDN preserves `.well-known/security.txt`, serves it as `text/plain; charset=utf-8` over HTTPS with 200, and returns real 404 for missing/draft/Lab paths. Local preview evidence does not certify an undeployed CDN. No policy, encryption or bounty is claimed.
