# Changelog

记录重要功能、公开行为、兼容性与工程能力变化，不代替 Git 历史。普通文案、局部样式或测试夹具小修不要求逐条记录；重大架构取舍另见 [ADRs](docs/decisions/README.md)。

截至 2026-10-30，仓库没有 Git Tag 或 GitHub Release。`package.json` 的包版本和内部 V0.x 阶段名不是正式产品发布记录；源码 Published、静态构建就绪与实际部署分别管理。当前 CN/Global 均未部署，已有成果统一放在 Unreleased；今后依据真实 Tag/Release 整理版本段落，不追溯编造版本号或发布日期。

## Unreleased

### Added

- V0.7-B 新增四款双语 Draft：Image Compressor 的有界目标大小压缩/比较/ZIP；Comic Page Organizer 的排序、封面、逐页预览与原字节 ZIP/CBZ；Image Watermark 的文字/图片批量水印与 PNG/JPEG/WebP；EXIF Metadata 的可靠字段读取、隐私标记和无损清理。复用现有资源/串行/输出验证与发布门，集中集成，不提升 Published 或部署。

- V0.7-A2-B 新增 Palette Extractor 完整双语 Draft：有界 OKLCH 候选提色与六种倾向、手动色卡编辑/图片取色、复制及基础 PNG、三套固定分享模板与可用设备的系统文件分享；图片仅在浏览器本地处理，专属依赖、样式和 MIT 通知隔离于生产产物。未提升 Published 或部署。

- V0.7-A1-B 补齐 Image Resize & Crop 首版功能：共享多文件集合、独立单图草稿、单张/批量切换、四种批量缩放规则与默认不放大、逐项失败/重试/取消、独立下载和 ZIP。单图与批量共用重型处理通道，验证结果累计有界，过期任务/ZIP 快照不能交付；继续保持 CN/Global 双语 Draft，未提升资格或部署。下一阶段集中体验精修与正式资格验收。

- V0.7-A1-A 新增 Image Resize & Crop 单图 Draft：自由/固定比例裁剪、指针/键盘控制、精确宽高与百分比、实时构图预览、PNG/JPEG/WebP 单次绘制导出和下载；复用本地图片验证/隐私/资源与串行通道，CN/Global 双语 DEV 可访问，生产排除专属页面和资源。未实现批量、未提升 Published、未部署。

- Astro SSG 双地区双语浏览器工具平台、静态信息页与统一主题/产品外壳。
- 首个源码 Published 的 Image Converter：PNG/JPEG/WebP/受限静态 AVIF 互转，批量/文件夹导入、预览、逐项下载和 ZIP。
- AVIF 单线程编码按需加载、独立预算与 Worker 生命周期；默认常见隐私元数据清理，受限 JPEG 作者/版权白名单保留。
- 真实 Registry 驱动的首页/导航/工具目录，以及双语 SEO、OG、Canonical/hreflang、Sitemap 和静态发现/安全文件。

### Changed

- V0.7-B3-C1 完善 Image Watermark 快速/高级参数、显式重置、单点旋转和有界平铺，支持设备预算内的高清 Logo、严格白名单静态 SVG 与现有按需 AVIF 编码。预览/导出共用绘制，取消和参数变更继续隔离旧结果；颜色弹层复用 react-colorful，文件主内容可选择预览，公共下拉选项增加间隔。保留 Draft，未部署。

- V0.7-B4-D1 完成 EXIF Metadata 冻结双语 SEO 与 L2 Beta 资格收尾，提升 CN/Global 源码 Published。正式构建包含批量无损清理、字段前后对照、原图查看与完整 exifr MIT 通知，复用既有画家/运营入口及公开发现投影；漫画整理和水印仍为 Draft，未部署。

- V0.7-B4-C1 将 EXIF Metadata 扩展为共享文件列表、文件夹导入、单项/批量无损清理与成功结果 ZIP，加入主题斑马纹元数据表和前后字段对照，移除图片预览。检测/清理复用唯一串行通道、现有安全清理与预算，失败可隔离重试，仍保持 Draft。

- V0.7-B1-D1 完成 Image Compressor 冻结双语 SEO 与 Beta 审计，按维护者授权提升源码 Published，保留 C1-R1 最长边步进器。首页、创作身份和发现文件沿用 Registry 投影，AVIF 复用既有按需 Worker/WASM 及许可；漫画整理、水印和 EXIF 继续保持 Draft。B1 收尾，未部署或创建 Tag/Release。

- V0.7-B1-C1 将 Image Compressor 调整为文件列表 / 设置双栏与移动单栏，增加文件夹入口、独立快速/高级草稿和按格式区分的三档强度。复用既有 AVIF Worker/WASM、输出预算与真实格式复检，取消/超时回收仍受原串行通道管理；目标大小仅用于 JPEG/WebP。保持 Draft，不改其他工具业务或发布资格。

- V0.7-A2-D2 完成 Palette Extractor L2 Beta 审计并按维护者授权提升源码为 Published；先同步本地 D1 冻结双语 SEO。CN/Global 正式构建各包含三款工具、17 个 HTML 页面与 16 个公开发现 URL，首页复用画家/动画师既有精选，完整分发 Color Thief / react-colorful MIT 通知。794 项测试与双地区构建通过，真实 Chromium 桌面/手机视口及 9 个 PNG 下载完成核验；L3 真机/跨浏览器与压力范围见模块说明。A2 功能收尾，未部署或创建 Tag/Release。

- V0.7-A2-C4-R2 移除 Palette 系统分享，仅以 PNG 下载交付；分享画布与设置区收敛为自然流，下载跟随设置。新增颜色改用轻量 MIT `react-colorful`；工具模态框右上关闭统一为 44px 轻表面 X，保留键盘焦点与返回。Palette 仍为 Draft。

- V0.7-A2-C4-R1：Palette Extractor（Draft）：分享图收敛为四方向图片与紧凑色带、原图及六种固定比例；移除标题/品牌/日期/装饰等复杂配置。新增颜色支持原生选色与 HEX 同步，专注采样所有色块共用临时预览，色卡操作间距更清晰。

- V0.7-A2-C3 区分指针焦点、键盘焦点和选中态，统一两款图片工作区的焦点边界；Palette 取色增加独立临时预览、Quiet 下拉、Ghost 操作与紧凑新增颜色 Popover。公共 Toast 加强顶部浮层辨识度，保留 Base UI 计时/暂停语义；算法、分享模板和 Draft 资格不变。

- V0.7-A2-C2 整理 Palette 中央画布与响应式工具栏，加入稳定 ID 的颜色位置标记、选择与拖动取色，折叠限制并移除重复工作区说明；导出复用共享唯一命名。公共 Toast 改为紧凑居中提示与连续成功去重，保留错误、可访问性和 Reduced Motion；量化、分享模板及 Draft 资格不变。

- V0.7-A2-C1 将 Palette 调整为纵向创作工作区和紧凑单行色卡，复用 SelectField、缩放/平移几何及专注取色 Dialog；三款图片工具统一轻量状态过渡，保留立即可见的键盘焦点和 Reduced Motion。提色算法、分享模板与 Draft 资格不变。

- V0.7-A1-D2 完成 Image Resize & Crop L2 Beta 资格审计，并按维护者授权提升为 Published。两地区各包含两款工具、完整双语页面、发现链接、按需裁剪资源及 ISC 声明；验证当前 Chromium 桌面/手机视口与实际输出，修复共享 StyleX 在多 CSS 产物中的注入目标，继续保留 Draft/Lab/Fixture 隔离。A1 首版收尾；源码资格不代表部署，L3 跨浏览器/真机与性能压力验证仍按需跟进。

- V0.7-A1-C3 将单图裁剪整合为轻量工作区：缩放/平移、适应画面、预览位图 100%、同区裁剪/构图切换和共享草稿的专注编辑；桌面侧栏、手机横向工具栏，移除下方重复预览。按实际 DOM 尺寸映射裁剪坐标，视图变化不改参数或有效结果，多指冲突保护选区；图片处理、批量/ZIP、隐私及 Draft 发布契约不变。

- V0.7-A1-C2 让 Resize 构图预览默认可见并扩大显示面积；两款图片工具共享原图/结果/并排对比，每侧独立缩放与平移，手机上下排列。任务行显示原图与有效结果的懒加载缩略图，Resize 增加逐项预览；参数失效及时移除结果 URL。公共 Tooltip 悬停改为 150ms，裁剪帮助支持点击，Resize 快速/高级选择态使用 Lavender，「不放大原图」补充简短说明；处理与发布契约不变。

- V0.7-A1-C1 统一两款工具的居中标题与简洁简介，完整功能说明下移至静态指南。Image Resize & Crop 分开工作方式与快速/高级层级，集中文件管理，以裁剪画面为主，单图一次点击完成验证下载；批量改为紧凑任务行及按状态操作。沿用 Converter 的 Token、选择态与表单样式，折叠限制/帮助/预览，保留错误与第三方授权分发；图片处理、任务/ZIP 契约和 Draft 资格不变。

- E2-C 明确 Contract、Unit/Component、Build Artifact 与 Browser Smoke 的职责；专项夹具采集真实构建图并核对 Loader/资源归属，以成功构建后的反例识别提前加载、Draft 依赖泄漏和 Loader 互换，保持日常单 Job CI 不变。
- E2-B 将逐工具编译期资格统一由 Registry 生成，保留显式 Loader 与单一发布来源；隔离源码夹具验证多工具/多地区、私有 JS/Worker/WASM/CSS 排除、共享依赖和发布状态回退，构建守卫按真实地区 Registry 核对路由与目录。
- 完成 D2 源码资格审计，两地区正式静态产物与所需资源可构建；未执行线上部署。
- E1 将 README/AGENTS 整理为简洁入口，建立架构/工作流、四项稳定契约、两条既有决策 ADR 与统一文档索引；五份阶段长文完整归档，保留原路径当前说明和全部研究/验收数据。
