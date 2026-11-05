# V0.8 通用工具初版

两批共 22 款工具（15 + 7）；PDF Merge / PDF Split / Images to PDF / ZIP Manager / Batch File Renamer / File Hash 已获得 CN/Global Published 源码资格，其余 16 款保持 Draft。加上七款既有 Published 图片工具，共 29 款（13 Published / 16 Draft）。第二批基于第一批本地提交 `e7cd6bf` 继续，未覆盖未推送成果。DEV 入口：CN `http://127.0.0.1:4321/tools/`、Global `http://127.0.0.1:4322/tools/`；非默认语言分别使用 `/en/tools/`、`/zh/tools/`。生产不包含这些 Draft 路由或专用实现。

## File Hash — V0.8-B6-D3 SEO 与 Beta 资格（2026-11-05）

- 依据维护者对 D1/D2 的验收与本轮发布授权，提升 File Hash 的 CN/Global Published 源码资格；当前 29 款（13 Published / 16 Draft），历史 15 + 7 集合不变。仅更新本工具静态长文、短元数据及发布投影，UI、计算内核、队列、Worker、依赖与资源策略未改动。
- 双语 Astro 内容各含 4 项步骤、6 项限制与 4 组 FAQ，准确说明默认 MD5、SHA-1/SHA-256/SHA-512/CRC32、多文件自动队列、比对及复制/TXT。CN 中文 `/tools/file-hash/`、CN 英文 `/en/tools/file-hash/`、Global 英文 `/tools/file-hash/`、Global 中文 `/zh/tools/file-hash/` 的静态 Title/Description、唯一 H1、专属像素图标、同地区 Canonical/hreflang、可索引性、目录、相关推荐卡片、Sitemap 与 llms.txt 均通过正式产物守卫；不增加客户端 SEO 脚本或修改人工推荐配置。
- Chrome 156 在实际 CN/Global 正式静态产物上完成中文 Dark / 1280px 与英文 Light / 390px：六份真实文件（空、`abc`、UTF-8 中文/Unicode、二进制、`123456789`、含制表符/换行的文件名）逐项计算五种算法，与独立 Node crypto / zlib CRC32 一致。`abc` MD5 为 `900150983cd24fb0d6963f7d28e17f72`，`123456789` CRC32 为 `cbf43926`。默认 MD5、算法自动重算、选择保持、追加只处理新项、单项移除、清空恢复默认及取消/重试正确。取消场景仅延迟真实本地 Worker 的 HTTP 交付 700ms，未伪造摘要或进度，取消后未交付旧结果。
- 实际复制完整 MD5/SHA-256 和批量 SHA-256；四份下载的 TXT 重新读取后摘要、名称、顺序、Unicode 及特殊名称转义均正确，重复下载名称不同且未触发重新计算。MIME `text/plain;charset=utf-8` 由现有 UI 测试验证。比对大小写/空白、空值、不完整、非法、匹配/不匹配、文件与算法切换均正确；尾部图标与隐藏无障碍状态同步。查看桌面/手机截图，行内原生 Radio、38px 复制图标、128 位 SHA-512 换行、三个等宽 44px 操作均保留，无横向溢出、阻断交互、明显样式闪现或 Hydration 报错。
- D1 的 37 MiB + 8 字节真实文件证据继续有效：20 次读取，最大 2 MiB、主线程整文件读取为零，MD5/SHA-256 与独立实现一致；本轮未机械重复该压力样本。现有核心测试再次覆盖五算法的空/ASCII/UTF-8/二进制、跨 2 MiB 边界及 33 MiB 输入、安全失败、任务隔离和已完成项导出。
- `hash-wasm@4.12.0` 的完整 MIT 及所用 MD5/SHA/CRC32 上游声明保持原样。每地区产物仅有一个约 52.5 kB 本地哈希 Worker，五个 WASM 二进制完整内嵌且不进入主线程 Chunk；唯一 Worker URL 引用归属 File Hash 懒加载入口。浏览器首页不请求 File Hash，实现加载后无文件时不启动 Worker；实际计算只请求同源 Worker，没有外部 WASM/CDN、哈希 API、上传请求或持久存储。浏览器读取实际许可资源并与源码全文比较一致。
- `pnpm check`（452 文件，零错误/警告）、17 个相关文件 / 243 项定向测试、CN/Global 各一次正式构建及完整产物守卫通过；每地区 26 个工具详情页、36 条公开发现 URL，其余 16 款 Draft / Lab / Fixture 私有资源继续排除。新增正式 Worker/WASM/许可证正向交付检查，保留 Draft 反向隔离断言。基线 [`a83ac46823c3` CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/42020304169)；新提交由既有工作流复检，最终远程状态单独核对，不以本地通过替代。
- 未测 Firefox、Safari/WebKit、真实 iOS/Android、真实屏幕阅读器、极端大文件与浏览器进程级内存耗尽，仍属 L3；390px 为桌面 Chromium 移动视口。匹配摘要不认证来源，MD5/SHA-1 不适合抗恶意碰撞、CRC32 非密码学；TXT 为本站可读清单，不宣称普遍兼容第三方 checksum 格式。Published 不代表部署，两个地区均未部署。

## File Hash — V0.8-B6-D2 UI 精修（2026-11-05）

- 算法最终按维护者截图采用紧凑的行内原生 Radio：圆点和文字横排，窄栏自然换行，无卡片背景、逐项边框或等宽拉伸，不使用 Select。右侧移除安全提示、重复算法/完成行与常驻完成统计，复制/TXT 操作后才反馈实际完成项数量。
- 当前文件名独立一行，完整摘要与 38px 复制图标同排；SHA-512 自然换行。工具内复用 FieldFrame/useField/controls.input 组合「哈希比对（可选）」：仅有效完整摘要显示尾部 CheckCircle/XCircle；未完成、空值或不完整输入不显示结果图标，非法值保留 aria-invalid。仅屏幕阅读器可见的状态通过 polite live region 和 aria-describedby 提供语义，无可见的结果/长度说明段落。
- `pnpm check`（452 文件、零错误/警告）及 4 文件 / 41 项 UI、Converter、共享样式与布局测试通过。真实 Chromium 156 在 CN 中文 Dark / 1280px、Global 英文 Light / 390px 验证默认 MD5、键盘 Radio、自动 SHA-256/SHA-512 重算、完整剪贴板、比对各状态、切换隔离和四份实际 TXT 下载，均与独立 Node crypto 摘要一致；38px 复制按钮未被长摘要挤出，输入尾部图标垂直居中，无横向溢出或冷启动 Hydration 报错。查看桌面/手机及 Converter 亮暗对照截图，原卡片几何和视觉语言保留。开发态跨模块移动 CSS 后重启服务以清除旧 SSR 类名缓存；稳定冷启动验收通过。
- 未改 core、queue、engine、Worker、协议、依赖、SEO 或资格，仍为 Draft / 12 Published / 17 Draft。本轮不重复正式构建和大型文件压力；D1 的内核与资源证据仍适用。Firefox/Safari、真实移动设备和真实屏幕阅读器未实测；无障碍属性、隐藏状态文本及真实浏览器键盘操作已验证。
- 截图纠偏后，File Hash 使用自身的行内样式；撤回上一轮不必要的 RadioChoices 抽取，恢复 Converter 原样式及裁剪/压缩/漫画控件仍使用的 CSS 导出，增加旧消费者导出回归检查。`pnpm check` 与 File Hash UI、Resize UI、布局共 34 项定向测试通过；Chromium 再次完成 CN Dark / 1280px 与 Global Light / 390px，实际摘要、复制及四份 TXT 下载正确。已查看两视口截图：选项按内容宽度排列、无卡片背景/边框，窄栏换行、无溢出。

## File Hash — V0.8-B6-D1 多文件自动校验（2026-11-05）

- 保持 CN/Global Draft，全站仍为 29 款（12 Published / 17 Draft），未改静态 SEO 长文和其他工具。默认 MD5，可选 SHA-1、SHA-256、SHA-512、CRC32；一次添加多文件并可追加，自动串行计算。左文件列表、右设置使用既有 Form 配方、FileTaskList 视觉资产和完整灰色设置面板；空态 960px，有文件 Wide Form，1050px 以下单列。
- `hash-wasm@4.12.0` 固定版本，增量计算仅由 File Hash 的本地 Vite Worker 引入，WASM 嵌入 Worker，不请求远程 API/CDN。每次只读取 `File.slice()` 的 2 MiB 数据，复用并重置当前算法实例，不整体读取文件、不再执行旧 32 MiB 配额。单 Worker 有界并发不代表任意设备可处理无限输入；读取、模块初始化和资源失败逐项报告并继续队列。
- 工具局部队列持有稳定 ID 与原始 File；切换算法、删除正在处理的文件、取消、清空和卸载均终止旧 Worker，消息按 Worker、任务 ID 和算法校验。取消保留文件与已完成结果，可重试未完成项；算法切换自动重算并清除旧摘要和预期值，避免跨算法混用。
- 单项复制完整摘要；可选预期值按准确十六进制长度、大小写不敏感自动比对，空值/未完整输入不误报不一致。批量复制/TXT 仅含当前算法已完成项并显示数量，特殊文件名转义为单行，保留 Unicode；点击下载时生成 `checksums-md5-YYYYMMDD-HHmmss-SSS.txt` 等名称，同毫秒以短计数消重，复制/下载不重算。MD5、SHA-1 不宣称现代抗碰撞能力，CRC32 为校验和；安全性要求较高时建议 SHA-256。
- Chromium 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成拖入多文件、五种算法、追加/同名文件、预期值、单项/批量复制、下载、算法重算、计算中删除/取消/重试和清空。37 MiB + 8 字节真实文件的 MD5 为 `8f10daa14f51dab410329a8e2dedba5e`，SHA-256 为 `59c4b752e5c9f626eca9119bda8e2ce5af00221d9268064d5c86c90bddb2ccb1`；Worker 实测 20 次读取，最大块 2 MiB，主线程整文件读取为零。Node crypto 和 Python hashlib/zlib 独立复核五种算法、空/中文/二进制样本、大文件摘要及四份实际 TXT 下载，顺序和内容正确。删除/取消场景仅为真实块读取添加 200ms 测试延时，未伪造摘要或进度。
- 7 个相关测试文件 / 70 项通过（增加五种算法跨块用例后定向复验），覆盖标准向量、块边界、超过 32 MiB、初始化/读取失败、取消与迟到消息、UI 与导出；`pnpm check`（452 文件）零错误/警告。另在仓库外隔离编译生产 Worker（约 52.5 kB），真实 Chromium 校验五种算法及 37 MiB SHA-256，未为 Draft 伪造正式路由。DEV 首次导入曾触发 Vite 依赖发现重载，已将 hash-wasm 加入 DEV 预构建，重启后首次上传不再重载；这不会在浏览器预加载或进入正式公共资源图。
- `hash-wasm.NOTICE.txt` 随私有入口包含完整 MIT 及 MD5/SHA/CRC32 上游所需声明。CN/Global 各一次正式构建与产物守卫通过，每地区仍为 24 个 Published 工具详情页；File Hash 专属 Worker、运行时代码、CSS 和通知均未泄漏，17 款 Draft 隔离不变。Frozen Lockfile 安装核对通过，远程 CI 结论另查本轮提交。Firefox/Safari、真实移动设备、超大文件/极限内存及浏览器进程级资源耗尽未测；390px 为桌面 Chromium 视口。复制仍需浏览器剪贴板权限，失败时显示手动复制反馈；无上传、持久保存或结果遥测。

## Batch File Renamer — V0.8-B5-D1 Beta 资格与详情页展示（2026-11-05）

- 依据维护者验收和本轮授权，提升 Batch File Renamer 的 CN/Global Published 源码资格，当前 29 款（12 Published / 17 Draft）；历史 15 + 7 工具名单不变。冻结文件名组合器和工作区，未改 `renamePlan()`、文件预算或其他工具业务。Quick/Advanced 共用可选名称、序号、高级起始值/位数/连接符，自动保留扩展名；名称为空仅编号，两者都关闭则保留原名。旧前后缀、查找替换交互已删除，不直接重命名磁盘文件。
- 双语 Astro 静态 SEO 各包含 4 项步骤、6 项限制、4 组 FAQ，明确 100 文件、单项 32 MiB、累计 96 MiB、ZIP 输出 128 MiB 及非法/重复名拒绝。下载点击时使用 `renamed-files-YYYYMMDD-HHmmss-SSS.zip`，同毫秒碰撞短计数；重复下载复用 Blob，不重打包。完整 fflate MIT 继续随按需入口交付。
- 全部详情页的 `ToolIntro.astro` 由路由传入工具 ID，直接复用现有 `FeaturedToolIcon`；标题组合居中，图标固定桌面 40px / 手机 32px、装饰性且 pixelated。`ToolGuide.astro` 复用实际目录 `ToolCards.astro`，仅增加 related 布局参数（最多三列、手机单列）；推荐仍使用同组/排除自身/最多三项的原算法与 Catalog 双语文案，正式构建只含 Published，不引入目录 Fixture 或客户端业务实现。`/tools/` 的 DOM 契约不变。
- Chromium 156 在 DEV 的 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成四种基本命名组合、高级参数往返、逐行冲突、增删、取消、清空和结果失效。实际下载 12 个 ZIP，Python zipfile 独立核对条目名称、CRC 和原始 PNG/JPEG/中文 UTF-8 字节；中文文件名、多点英文名、扩展名均正确。重复下载名称不同、结果 Blob 相同。复用未改业务在 `ec6893b` 的安全/资源/中文输入组合事件证据。
- DEV 两地区各 29 个真实静态页面通过唯一 H1、图标 ID、同组推荐顺序与空推荐检查；7 类页面实际检查桌面/手机尺寸与布局。标题 PNG 延迟 800ms 时，标题组合宽高和位置变化均为 0px；查看两主题标题与相关卡片截图，无横向溢出或页面运行错误。目录搜索、分类、身份筛选及分页实测通过，Fixture 隔离保留定向测试。
- `pnpm check`（444 文件，零错误/警告）和 17 个相关测试文件 / 248 项断言通过；CN/Global 各一次正式构建与产物守卫通过。四个 Renamer 页面静态 Title/Description、唯一 H1 图标、4/6/4 正文、同地区 Canonical/hreflang、可索引状态及 Sitemap/llms/目录均正确，每地区 24 个工具详情页 / 34 条公开发现 URL；17 款 Draft、Lab、Fixture 和专属资源仍隔离。新工具 JS/CSS 及完整 fflate MIT 正常按需交付。
- 正式静态预览再次通过 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 的 Published 标题、相关卡片、合法跳转、目录搜索/筛选；没有页面运行错误、横向溢出或明显样式闪现。独立复检正式预览另外 12 个真实 ZIP，路径、CRC、原始字节和重复下载均通过（本轮 DEV + 正式共 24 个 ZIP）；与 DEV 的区别仅是推荐过滤隐藏 Draft。
- [基线 `ec6893bdc6e4` 的既有 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/42001314739)；首轮新 CI 暴露导航/提色测试两处旧 Published 名单，已同步为 12 项且 2 文件 / 32 项定向复验通过；修正提交的 CI 需单独核对，不将本地成功代替远程结果。Firefox/Safari、真实 iOS/Android、极限内存和系统输入法未重测，390px 是桌面 Chromium 视口/触控模拟。源码 Published 不代表部署，未部署。

## Batch File Renamer — V0.8-B5-C 文件名组合器（2026-11-05）

- 快速/高级共用一份规则与 `renamePlan()`：可选名称 + 条件连接符 + 可关闭序号 + 原扩展名。默认直接输出 `001.ext`；名称和序号均留空/关闭时保留完整原名。高级仅展开起始值、位数和四种连接符；切换显示模式保留规则及有效输出。旧前后缀、查找替换及扩展名开关已删除，没有规则兼容层。
- 41 项定向测试、`pnpm check`（443 文件，零错误/警告）通过。Chromium 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成四种基本组合、高级参数往返、逐行冲突、增删/重新编号、重复下载与清空取消；Python zipfile 独立验证 12 个真实下载的路径、CRC 和原始字节。查看两主题空态/快速/高级/冲突截图，无横向溢出；DEV 重启冷载无 Hydration 报错。保持 Draft 与 11 Published / 18 Draft，未改 SEO、其他工具或文件资源预算，未重复正式构建。Firefox/Safari、真实移动设备及系统输入法未实测；中文组合输入事件已做定向验证。

## ZIP Manager — V0.8-B4-D3 Beta 资格（2026-11-05）

- 依据维护者本轮授权，只提升 ZIP Manager 的 CN/Global Published 源码资格；当前 11 Published / 18 Draft，历史 15 + 7 工具集合不变。D1/D2 双模式、紧凑布局、目录树、图标操作、自动命名和任务隔离全部冻结；未修改工作区组件、样式或 ZIP 核心。
- 中英文 Astro 静态 SEO 各包含 4 项步骤、6 项限制、4 组 FAQ。四个正式页面唯一 H1、Title/Description、同地区 Canonical/hreflang、Sitemap、llms.txt 和目录检查通过；原有首页四槽与身份人工映射不变，工作室可发现 ZIP，开发者不因 Definition roles 自动补入。
- 创建使用 ZipPassThrough / Store 原始字节打包，不保证压缩率；读取支持 Store/Deflate。保留创建 500 文件 / 单项 32 MiB / 累计 96 MiB / 输出 128 MiB、读取 64 MiB / 500 条目、展开单项 32 MiB / 累计 128 MiB。所选重打包仍受创建预算约束，不向本地目录直接写入；完整 fflate MIT 通知从工具懒加载入口交付。
- 14 个相关文件共 191 项定向测试通过（修正一处旧数量断言后单文件复验）；新增 Store/Deflate、同名不同目录、Unicode/二进制、绝对/穿越/重复路径、ZIP64、方法/编码拒绝、声明/实际解压大小和预算验证，保留 CRC、加密、异常压缩比、取消和迟到结果测试。`pnpm check`（440 文件）与 CN/Global 各一次正式构建及守卫通过；每地区 22 个工具详情页、32 条公开发现 URL，其余 Draft / Lab / Fixture 私有资源仍隔离。
- Chrome 156 正式预览复核 CN 中文 Dark / 1280px、Global 英文 Light / 390px（另查 320px）：文件与文件夹添加、移除、树折叠/选择/部分选中、单文件下载、所选重打包、模式恢复、取消和失效均通过；按钮等宽 44px / 无边框 / Purple，无横向溢出或 Hydration 报错。fflate 与 Python 标准库独立核对 10 个实际下载 ZIP 的路径、CRC 和逐项原始字节，重复下载名称不同、SHA-256 相同；清空后活动 Object URL 为零。未变功能同时复用下方 D1/D2 证据。
- 提交前核对：[D1 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/41856773953)，[最新 D2 `82a34d8` CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/41864131756)；较早 `aba7238` CI 失败于未改动的 PDF 预览 Actual size/scale 断言，后续基线在相同 PDF 代码上通过，本轮未改动 PDF 工具。本轮提交后的既有工作流结果需单独核对，不以本地通过声称 L2 七项全通过。Firefox/Safari、真实 iOS/Android 和极限内存/大规模压力为 L3 未测；390px 为桌面 Chromium 视口与触控模拟。未部署。

## ZIP Manager — V0.8-B4-D1 交互打磨（2026-11-04）

- 创建/打开为独立模式，桌面左右布局、900px 以下上下布局；文件、目录展开、选中项和有效输出分别保留。创建、检查、批量导出及单项下载独立使用局部任务状态，共用执行锁；取消后等待原操作结束才释放执行槽，清空只影响当前模式。
- 使用安全相对路径投影目录树，默认展开前两级；折叠子树不挂载，列表独立滚动。Base UI Checkbox 从同一份文件路径集合计算文件夹全选/部分选中。Trash / Download 图标操作具有 Tooltip 和可访问名称；单项下载仍经过 `extractZip()` 的实际字节/CRC 检查，批量导出保留所选文件路径并生成新的 ZIP。
- 创建名称默认取单一根文件夹或 `archive`；打开模式取来源 ZIP 主体并加 `-selected`。下载当次添加本地 `YYYYMMDD-HHmmss-SSS`，同毫秒用短计数消重；安全处理 Windows 保留名称、非法字符及 Unicode 字节长度，不修改归档内部文件名。重复下载使用同一 Blob。
- D2 工作区减法：移除两模式的名称输入与同步状态，直接按上述规则自动命名；移除操作区重复的限制说明，静态指南和实际错误反馈继续保留。空输入不显示零统计；有文件时只显示一行摘要，打开模式的已选数量放在目录树标题旁。目录操作、任务隔离及安全预算不变。
- D2 定向复验：29 项相关测试、`pnpm check` 通过；冷启动 Chromium 在 CN 中文 Dark / 1280px、Global 英文 Light / 390px（另查 320px）完成自动命名、重复下载、目录选择、单项/批量下载和逐字节解压比较，模式保留、取消及危险路径拒绝通过。冷启动无 Hydration 报错，清空后活动 Object URL 为零；本轮未重复地区构建。
- 保留创建 500 项 / 单项 32 MiB / 累计 96 MiB、读取 64 MiB、展开单项 32 MiB / 累计 128 MiB 等边界：当前检查会读取完整归档，提取/重新打包仍累计内存，并非磁盘流式或 ZIP64 实现。继续使用 fflate / 原有 NOTICE 和 ZipPassThrough，不承诺 DEFLATE 压缩率；路径、重复项、加密、异常压缩比和 CRC 拒绝规则不变，仅补充检查阶段的 AbortSignal。
- `pnpm check`（440 文件）、30 项相关定向测试及 CN/Global 各一次构建/隔离守卫通过。Chrome 156 在 CN 中文 Dark / 1280px、Global 英文 Light / 390px 实际导入嵌套文件夹、创建并下载、打开/折叠/勾选、单文件下载、所选重打包；解压逐项比较路径和原始字节，验证重复下载、模式恢复、取消及危险路径拒绝。清理后活动 Object URL 为零。仍为 Draft，10 Published / 19 Draft 不变；未测 Firefox/Safari、真实移动设备及极限内存。

## Images to PDF — V0.8-B3-D2 Beta 资格（2026-11-04）

- 依据维护者验收和本轮授权，仅将 Images to PDF 提升为 CN/Global Published；冻结 PNG/JPEG 画廊、鼠标/长按/键盘排序、缩放平移预览、追加/移除、逐页生成、取消和失效管理。资源策略仍为宽松非阻断提醒，未重新加入数量/累计体积配额；不承诺无限处理或清除源图片隐私信息。
- 中英文静态 SEO 各含 4 项步骤、6 项限制、4 组 FAQ。四个正式页面均可索引，唯一 H1、Title/Description、Canonical/同地区 hreflang、目录、Sitemap 和 llms.txt 通过产物守卫。保留人工角色关联：工作室现显示三款 PDF 工具，画师不因 Definition 的 roles 自动新增首页精选；首页四槽不变。
- Chrome 156 在 DEV 和正式静态预览中复核 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px：真实上传、鼠标/触控长按及键盘排序、缩放/平移/关闭及焦点恢复、删除/追加、取消/清空和下载失效均通过。三按钮等宽、44px、无边框且紫色主操作，未见横向溢出、阻断交互或明显样式闪现。
- 实际下载并以 pdf-lib 重读：输出顺序与当时画廊一致（含 `C → B → A`、`B → A → D`），逐页核对尺寸、JPEG 原始字节哈希、PNG 解码 RGB / alpha 哈希及 EXIF 6 方向矩阵。20,000×20 PNG 的 PDF 页面坐标按比例缩放为 14,400×14.4，嵌入像素仍为原始尺寸；重复下载名称不同、PDF 字节相同。清理后活动 Bitmap / URL 均为零，原生解码最大并发为 1。
- 复用未变业务代码在 `a594e20` 的 45 图 / 75,758,780 字节 / 29,603,200 像素与 45 页有效 PDF、失败恢复证据，不机械重跑压力样本。`pnpm check`（435 文件）及 18 个相关文件共 218 项定向测试通过；CN/Global 各一次正式构建与守卫通过，每地区 20 个工具页面、30 条公开发现 URL。合法共享 Comic PDF 模块及完整 pdf-lib MIT 通知随按需图交付，其余 19 款 Draft / Lab 的私有实现和资源仍被排除。
- [基线 `a594e20` 的既有 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/41843836846)；本轮提交继续由同一工作流复检，远程 CI 结论单独核对，不以本地成功代替。Firefox、Safari、真实 iOS/Android、浏览器进程级内存耗尽和极端规模仍属 L3 未测；390px 是桌面 Chromium 视口/触控模拟。源码 Published 不代表部署，未部署。

| ID | 实际能力 | 主要边界 |
| --- | --- | --- |
| `pdf-merge` | 文件排序、页数检查、顺序合并与 PDF 下载 | 100 文件、累计 96 MiB、1000 页；拒绝损坏/加密文件 |
| `pdf-split` | 真实页面缩略图、可缩放/拖拽的放大预览、点击或有序范围选页、单个 PDF / 所选逐页 ZIP | 单文件 32 MiB / 1000 页；PDF 输出 128 MiB；ZIP 所选最多 200 页 / 96 MiB；预览每批 24 页，放大栅格最多 200 万像素 |
| `images-to-pdf` | PNG/JPEG 画廊、拖拽/键盘排序、缩放平移预览、原比例 PDF、方向与透明度 | 独立宽松策略，原 40 页 / 32 MiB / 2400 万总像素仅用于提醒；实际解码、分配及 PDF 生成/验证失败时安全停止，不缩小原图 |
| `zip-manager` | 独立创建/打开模式、文件夹目录树、单文件下载、所选重打包、自动时间戳命名 | 创建 500 项/96 MiB；读取 64 MiB；展开单项 32 MiB、累计 128 MiB；拒绝 ZIP64/加密/不安全路径/异常压缩率，验证 CRC |
| `batch-file-renamer` | 快速/高级共用内嵌文件名组合器：可选名称、序号开关及高级起始值/位数/连接符；保留原扩展名、实时逐行预览与冲突提示、ZIP 下载 | 100 文件、单个 32 MiB、累计 96 MiB；非法/重复名称拒绝，原字节不变；默认仅序号，留空且关闭序号时保留完整原名 |
| `file-hash` | 默认 MD5；MD5/SHA-1/SHA-256/SHA-512/CRC32 多文件自动队列、逐项进度与预期值、复制及 TXT 清单 | 单 Worker、2 MiB 分块，无旧 32 MiB 配额；依赖 Worker/WebAssembly 与真实设备资源；不是加密或来源认证 |
| `text-cleaner` | 独立空白/空行/换行选项、Unicode/词段/汉字统计、前后对照、复制/下载 | 50 万 UTF-16 代码单元；词段依赖浏览器分词 |
| `text-diff` | 行级增删对照、忽略行末空白、数量、文本导出 | 每侧 10 万字符/4000 行；差异计算有时间和编辑量上限 |
| `subtitle-tools` | SRT/WebVTT 互转、毫秒偏移、多行字幕、条目检查、下载 | 5000 条；不支持 NOTE/STYLE/REGION；转 SRT 提示定位设置丢失 |
| `json-formatter` | 校验、2/4 空格、单行压缩、复制/下载 | 50 万字符、128 层、格式化结果 400 万字符；保留原数字字面量，避免大整数舍入 |
| `url-base64` | URL 组件与 UTF-8 Base64 编解码、复制/下载 | 50 万字符；严格检查 Base64/UTF-8；不是加密 |
| `timestamp-converter` | 明确秒/毫秒/带时区 ISO、UTC/本地展示、复制 | 不猜单位；拒绝无时区 ISO、非法日期和闰秒 |
| `qr-code-generator` | 标准二维码、尺寸/前背景色、PNG/SVG 下载、内容复制 | 2000 字符、128–2048px；深色前景、浅色背景、对比度与模块尺寸检查 |
| `color-contrast` | HEX/RGB/HSL、可视化选色、WCAG 比值、AA/AAA、复制 | 不透明 sRGB；大文字阈值不替代实际字号检查 |
| `audio-trimmer` | 波形、起止时间、选区试听、真实 PCM16 WAV 导出与复检 | 输入 20 MiB/180 秒/双声道，解码缓冲 64 MiB；原生解码可能额外瞬时占用内存，无 MP3/AAC 输出 |
| `markdown-editor` | 实时 GFM、双栏/编辑/预览、复制及 .md 下载、示例/清空 | 10 万字符；Marked + DOMPurify，移除脚本、图片及嵌入内容；不自动保存 |
| `video-frame-extractor` | 原生播放器/时间轴、PNG/JPEG 单帧与间隔批量、尺寸/质量、ZIP | 输入 100 MiB/30 分钟/1600 万像素；单帧 800 万像素，批量 40 帧/8000 万像素/96 MiB；依赖浏览器编解码，不保证逐帧精度 |
| `csv-json-converter` | UTF-8 文件/粘贴、逗号/分号/Tab、双向转换、表格/复制/下载 | 文件 2 MiB、100 万字符、10000 行/100 列/20 万单元格；CSV 为字符串，JSON 为标量对象数组，拒绝不安全整数 |
| `code-image-generator` | 9 种语言高亮、明暗图片主题、标题/行号/内边距、实时 Canvas 与 PNG | highlight.js 只注册所需语言；20000 字符/160 行；2× 输出最多 8192px、800 万像素，过长明确拒绝 |
| `svg-to-png` | 文件/源码、安全图片预览、比例联动尺寸/倍率、透明/纯色 PNG | 复用 Watermark 的 SVG 白名单和独立图像解码；256 KiB/512 节点/16 层，形状/路径/渐变/裁切；不支持文本、CSS、滤镜或外部资源；PNG 最多 800 万像素 |
| `regex-tester` | JavaScript flags、实时高亮/数量/捕获组、替换/复制 | 局部 Worker，1500ms 超时真实 terminate；表达式 500 字符、文本 20 万字符、1000 处匹配；与其他引擎可能不同 |
| `uuid-generator` | 安全 UUIDv4 单个/批量、大小写、逐项/全部复制、TXT | 每批 1–1000；仅使用 Crypto.getRandomValues，不提供其他 UUID 版本 |

文件和文本均不上传、不持久保存。PDF/原文件归档不承诺清理来源元数据。删除、清空或改变参数会作废结果；有界异步操作取消后仍等实际结束才释放当前执行槽。下载 URL 延时撤销，预览 URL 在失效/卸载时释放。

工具使用既有 Form Wide、受控 UI、Registry/显式 Loader 和默认图标回退。通用目录只抽取被多款工具实际使用的布局、文件行、交付、有界输入、单次任务及 PDF 操作；没有全局 Store 或新工作区引擎。新增运行依赖为 `qrcode`（MIT）与 `diff`（BSD-3-Clause），独立 QR 解码测试使用开发依赖 `jsqr`；第三方条款随对应懒加载工具分发。

## 第一批验证与待打磨

- `pnpm check`：0 错误、0 警告；121 项集中定向测试覆盖核心逻辑、实际 PDF/ZIP/WAV 内容、QR 独立解码、晚到结果/执行槽、分类、双语内容和发布隔离。
- CN 正式构建及原有产物守卫通过：仍为七款 Published、14 个双语工具页面；未执行此次无关的全量测试和双地区发布矩阵。
- 真实 Chromium：完成 CN 中文和 Global 英文核心操作；PDF 合并/拆分/逐页 ZIP、图片 PDF、目录 ZIP 提取、批量命名 ZIP、文件哈希、文本/字幕/时间戳、二维码和 WAV 导出；实际复制和文件下载正常。下载 PDF 重新解析确认页数/顺序，ZIP 解压核对路径及原字节；512px PNG 用 jsQR 独立读回 Unicode；WAV 为 44.1kHz 单声道 PCM16、选区 1 秒，采样与原文件对应，误差不超过 1 LSB。
- 390px 手机视口逐一打开 15 款工具，无横向溢出；另检查已加载文件与结果的移动布局、亮暗主题。手机视口不代表真实手机触控验证。
- 仍待后续打磨：专属图标、正式 SEO、操作密度和批量文件行体验；Firefox/Safari、真实 iOS/Android、低端设备与资源压力未测。没有取得 Beta/Published 资格，也未部署或触发远程 CI。

定向入口：`tests/general-toolbox-core.test.ts`、`tests/general-toolbox-jobs.test.tsx`、`tests/general-toolbox-publication.test.ts`；图片 PDF 的既有方向/预算测试见 `tests/comic-pdf.test.ts`。

## 第二批验收（V0.8-A2）

- 使用现有分类、默认图标回退、显式 Loader 和 Registry 资格；增加 Marked（MIT）、DOMPurify（Apache-2.0 选项）、Papa Parse（MIT）、highlight.js（BSD-3-Clause），许可随工具懒加载分发。未修改原有七款图片工具或第一批处理逻辑，未增加运行服务和生成素材。
- `pnpm check` 通过；98 项本轮核心/Worker/内容/发现定向测试通过，另复测第一批核心与任务失效回归。28 个新增地区/语言 DEV 页面均为 HTTP 200、静态 H1 和 Draft noindex。未重复全量测试或双地区正式构建。
- 真实 Chromium：Markdown 表格/任务/代码及不安全 HTML 清理、视图切换、复制/.md 下载；CSV 文件导入、多行引号、Unicode 与大整数字符串、反向 CSV 下载；Regex 捕获/替换及灾难性表达式真实超时后恢复；10 个大写 UUIDv4 的实际复制/TXT 下载。
- SVG 真实 PNG 下载为 160×80，复解码核对红色形状、透明 alpha 和指定绿色背景；代码分享图 PNG 为 832×424，高亮、标题、Unicode 与行号可读；三秒 VP8 视频分别提取 0/1/2 秒红绿蓝画面，ZIP 三张 160×90 PNG 解压后逐一核对像素，JPEG 也完整解码。参数变更使旧下载入口失效。
- 七款工具逐一检查 390px 视口，无横向溢出；覆盖 CN 中文与 Global 英文主要路径。手机视口不是触控真机证据。Firefox/Safari、真实移动设备、其他视频编解码及大型媒体压力仍未测，不宣称 Beta 或 Published。

定向入口：`tests/general-toolbox-a2.test.ts`、`tests/regex-worker.test.ts`，继续使用第一批发布与目录契约测试。后续仅按反馈集中打磨操作密度、正式 SEO、专属图标和兼容性。

## Images to PDF — 画廊与资源策略（2026-11-04）

- 直接复用 Comic 的 `galleryLayout` / `useGalleryDrag`，保留行优先页序、鼠标拖动、触控长按、自动滚动、Escape 与键盘排序；不实例化 ComicSession，不改变漫画的 UI/预算。放大查看复用 FilePreviewDialog / ImagePreviewViewport，关闭恢复焦点并撤销原图 URL。
- 本工具独立策略不再调用 `boundedFiles(40, 32 MiB, 20 MiB)` 或移动设备图片/PDF预算。旧数量、累计字节与总像素阈值只提醒，不阻断生成；保留真实格式/结构/方向检查、安全整数算术、浏览器解码/分配及 PDF 完整性边界。纯本地工具优先采用用户可控的宽松策略，但不批量改动其他工具。
- 仅做容器检查的导入不会解码全部原图。可见图片才请求最长边 480px 的缩略 Bitmap，缓存最多 48 张 / 8 MiB；与原图预览、逐页 PDF 导出共用 SerialJobs 单通道，输入变化/关闭/清空/卸载使旧任务不能交付。用户可取消长任务，原生操作真正结束后才释放执行槽；失败保留文件与顺序。
- PNG/JPEG 直接嵌入，保留方向与适用透明度，不改变原始像素；大图仅按比例调整 PDF 页面坐标以遵守 [PDF 默认用户空间尺寸](https://developer.adobe.com/acrobat-pdfl-sdk/guides/jsapiref/doc)。保存后核对页数、尺寸及每页的嵌入图像引用顺序。PDF 仍在内存中组装、保存与复检，并非流式 PDF，不能保证任意设备或规模成功。
- 三个 44px 等宽操作始终显示：生成 / 下载 / 清空；生成中另有取消入口。下载点击时使用 `images-YYYYMMDD-HHmmss-SSS.pdf`，同毫秒追加短序号，重复下载复用同一 Blob。
- 70 项相关定向测试和 `pnpm check`（435 文件，0 错误/警告）通过；真实 Chromium 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成鼠标、触控长按和键盘排序、预览缩放/平移、增删、取消、清空及真实下载。逐页核对 JPEG 嵌入字节、PNG RGB/Alpha 哈希、EXIF 方向和当前顺序；超宽 20000px 图片的原始嵌入宽度保留。
- 实际 45 张输入共 75,758,780 字节、29,603,200 像素（其中两张各约 36.1 MiB），生成并重读 45 页 / 75,746,503 字节有效 PDF；单通道最大并发 1，清理后活动 Bitmap / URL 为零。CN/Global 正式构建及画廊私有 JS/CSS 隔离守卫通过，当时仍为 Draft，资格为 9 Published / 20 Draft（当前提升见 Beta 资格小节）。Firefox/Safari、真实 iOS/Android、浏览器进程级内存耗尽及极端规模未测；390px 是桌面 Chromium 触控模拟。

## PDF Split — D1 可视选页（2026-11-04）

- 上传后默认全选；真实缩略图、范围输入和全部/已选视图共用选页状态。手动范围保留指定顺序，点击页卡按原页码升序整理。无效/空范围、文件更换、模式变化和清空立即使旧结果失效；提取、下载、清空三个按钮始终等宽显示。
- PDF.js 固定为 `6.5.438`，只在有效文件导入后动态加载。Worker 及所需 CMap、标准字体、编解码资源使用 Vite 本地哈希 URL；完整 Apache-2.0 和附带字体/编解码许可随私有模块分发。另读一份 File 数据供 Worker 转移，pdf-lib 仍独立负责输出和验证，不将 Canvas 用于导出。
- 预览每批 24 页、进入视口后排队串行绘制；缩略图最多 10 万像素，放大页最多 200 万像素，PDF.js 嵌入图像栅格化预算为 16 MiB。文档加载 20 秒、单页 15 秒超时回收；切批/关闭/更换/清空会取消任务并释放 Canvas，文档卸载释放 Worker。PDF.js 内部解析/原始解码可能有额外瞬时内存，不承诺所有复杂 PDF 的固定峰值。
- 单个 PDF 使用当前选页顺序，仍受 128 MiB 输出限制；逐页 ZIP 只导出已选页面，最多 200 页/96 MiB，文件名保留原页码，例如 `page-008.pdf`。从 500 页来源选择 10 页可以导出，不按来源总页数错误拒绝。
- 定向测试覆盖实际 PDF 内容流/方向/顺序、ZIP 解压、范围双向同步、旧任务隔离、取消/超时和许可完整性。真实 Chromium 156 完成 10 页缩略图、键盘选择、放大/Escape/焦点恢复、PDF 和 ZIP 下载复检，以及 500 页来源选择 491–500 页的 ZIP；逐页解析的内容流、尺寸和旋转与来源一致。
- CN/Global 中英文、Dark/Light、1280px/390px 视口未见横向溢出；三按钮为 44px 等宽无边框。抽样已选 10 页共约 80 万 Canvas 像素、一个 Worker；清空后为零 Canvas/Worker。损坏/超大输入安全拒绝，预览加载失败会明确提示且仍可提取原 PDF。
- `pnpm check` 通过（424 文件、0 错误/警告）；17 项 PDF Split/发布定向测试通过，CN/Global 各一次正式构建及隔离守卫通过。仍为 CN/Global Draft，正式产物不包含 PDF.js、Worker、私有资源或专属 CSS；未运行无关全量矩阵。Firefox/Safari、真实移动设备、复杂 PDF 字体/表单全矩阵及临界规模压力未测。

定向入口：`tests/pdf-split-core.test.ts`、`tests/pdf-split-preview.test.ts`、`tests/pdf-split-ui.test.tsx`、`tests/pdf-split-loader.test.ts`。

## PDF Split — V0.8-B2-D1 Beta 资格（2026-11-04）

- 按维护者授权完成双语静态 SEO：4 项步骤、6 项限制、4 组 FAQ；唯一 H1、Title/Description、Canonical/hreflang、OG、Sitemap 和 llms 沿用现有静态系统。该次只提升 PDF Split 为 CN/Global Published，发布时为 9 Published / 20 Draft，历史两批 ID 不变；工作室关联继续使用原人工配置。
- 两款 PDF 在每次 Download 点击时命名：`merged-YYYYMMDD-HHmmss-SSS.pdf`、`源文件名-extracted-YYYYMMDD-HHmmss-SSS.pdf`、`源文件名-pages-YYYYMMDD-HHmmss-SSS.zip`。使用本地时间，同毫秒碰撞追加 `-2`、`-3`；源名去掉末尾 PDF 扩展名、过滤路径/控制字符和 Windows 非法字符，按 UTF-8 字节有界截断，空名用 `document`。重复下载复用同一 Blob，不重新处理，也不改变 ZIP 内的页名。
- 真实 Chromium 156 完成默认全选、点击/有序输入、已选视图、旋转页放大/Escape/焦点恢复、替换和错误范围拒绝。下载的选页为 8→1→2→3→5，重新解析确认 5 页内容流、尺寸和旋转与来源一致；ZIP 解压为 `page-008/001/002/003/005.pdf`，各自内容与来源对应。PDF/ZIP 连续下载名称不同且字节完全相同；另复检 PDF Merge 真实三页合并和重复下载。500 页中选择 10 页的证据复用上轮 D1，不重复压力验证。
- CN 中文 Dark 桌面、Global 英文 Light 390px 的缩略图、Dialog、紫色主操作和禁用态可用，无横向溢出；卸载/更换/清空沿用取消与版本隔离，清空后无残留 Canvas/Worker。PDF.js 的惰性导入、独立读取字节、24 页批次、串行与像素/超时预算不变；未引入 Viewer UI 或远程 Worker。
- 158 项命名/PDF UI/输出/预览/发布/发现定向测试和 `pnpm check` 通过（426 文件，0 错误/警告）。CN/Global 正式构建各生成 18 个双语工具页面；产物守卫核对四个 PDF Split 页面、28 条公开发现 URL、Worker/CMap/字体/编解码资源原始字节与完整 PDF.js/pdf-lib/fflate 许可，其他 20 款 Draft 仍隔离。真实静态预览中再次下载 PDF/ZIP、核对连续下载字节与本地 Worker，未见资源错误或运行异常。
- 基线 `c1e0123` 的[既有 CI 全部通过](https://github.com/librecosta/tool4furry/actions/runs/41830254636)；本轮首次集成 CI 暴露目录/Converter/工具外壳中四组旧八工具名单，已同步为九款并保留资格过滤断言，另定向复验 59 项。修正仍由相同 GitHub Actions 复检，不将本地构建当作远程 CI 结果。Firefox/Safari、真实 iOS/Android、复杂 PDF 全矩阵和临界内存压力属于未测 L3；桌面手机视口不是真机证据。源码资格不代表部署，未部署。

新增命名定向入口：`tests/pdf-download-name.test.ts`；既有 PDF 输出内容、任务失效和资源检查均保留。

## PDF Merge — V0.8-B1-D1 Beta资格（2026-11-04）

- 双语静态 SEO 完成：每种语言 4 项步骤、6 项限制、3 组原生 FAQ；Title、Description、H1、Intro 使用维护者定稿。保留紫色主操作、三等宽按钮及既有鼠标/触屏长按/键盘排序，不修改 PDF 算法或其他工具资格。
- 真实 Chromium 在 DEV 和 Published 静态预览中完成导入、双向鼠标排序、键盘排序、合并与实际下载。样本 A 为两页、B 为一页；B→A 输出完整解析为 3 页，尺寸依次为 400×400、300×400、310×400，方向与逐页解压内容流均与来源一致。CN 中文与 Global 英文下载均复检通过；重排、移除、清空使旧下载失效，损坏 PDF 明确报错。
- 定向测试验证实际页内容/顺序、加密/损坏拒绝、100 文件/32 MiB 单项/96 MiB 累计/1000 页/128 MiB 输出边界、取消/晚到结果、重复提交、排序及下载资格。139 项核心/UI/发现/发布定向测试通过，另通过受影响导航断言；`pnpm check` 为 0 错误、0 警告。
- CN/Global 各一次正式构建及产物守卫通过：各 16 个双语工具页面、26 条公开发现 URL；PDF Merge 的四个地区/语言页面可索引，Canonical/hreflang、目录、导航总精选与工作室关联正确。pdf-lib / dnd-kit MIT 许可完整交付，21 款 Draft 的路由、实现入口、私有 Worker/NOTICE 保持排除，静态长文不进入客户端实现。未运行无关多工具夹具。
- 基线 `32e474e` 的 CI 在首页图片归属断言失败；本次补齐既有导航图标的精确 Registry/URL 归属，同时保留原始图片字节与资格校验。首次集成 CI 另发现一处旧七工具名单断言，已同步且保留原有检查；修正提交 `b39e8ca` 的[既有 CI 全部通过](https://github.com/librecosta/tool4furry/actions/runs/41676614664)（check、1138 项测试、CN/Global 构建）。L2 七项满足，依据维护者授权确认 Published；不新增工作流。
- 桌面及 390px 手机视口的中英文核心路径、亮暗主题与等宽按钮可用，无横向溢出。视口模拟不是触控真机证据；Firefox、Safari、真实 iOS/Android、低端设备、临界规模压力和原生操作瞬时内存仍属 L3 未测。源码 Published 不代表部署，未部署。
