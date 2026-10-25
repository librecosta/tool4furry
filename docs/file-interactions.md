> C4-E（Issue #8）：以下 React ScrollDock 合同继续用于 FilesLab。公共页面新增静态 Astro DocumentScrollDock，复用同一 scroll-metrics.js，不增加 React Island；所有 Lab/Canvas 显式排除。仅根文档隐藏滚动条装饰，内部保留细滚动条，原生滚轮/键盘/触摸照常。公共 Dock 不限桌面，Footer 可见或模态打开时隐藏，详见 site-homepage.md 当前合同。

# V0.2-B — File Interactions & ScrollDock

本轮只提供文件交互与文档滚动原语。`/lab/files` 通过既有 `routes.ts`、WorkbenchLab、LabRuntime 和 UiProvider 接入；队列与确认弹窗状态属于 FilesLab。没有修改 WorkbenchShell、Astro 配置、主要依赖或全局 CSS。没有真实工具、文件内容读取、后端、SSR 或部署。

## FileDropzone API

从 `src/ui/FileDropzone.tsx` 直接导入 `FileDropzone` / `FileDropzoneProps`，从 `file-constraints.ts` 导入校验函数和类型。组件不需要 Provider；Lab 的 Toast 仍使用现有 UiProvider。

| 属性 | 契约 |
| --- | --- |
| `label: string` | 必填的控件名称，同时用于原生按钮与文件 input 的可访问名称 |
| `hint?: string`, `id?: string` | 辅助说明与可选稳定 ID；默认 useId，自动关联提示与错误 |
| `accept?: string` | 默认不限；逗号分隔的扩展名、精确 MIME 或 image/audio/video 通配，大小写不敏感 |
| `multiple?: boolean` | 默认 false；单次最多接收 1 个合法文件 |
| `maxFiles?: number` | 每次选择/投递的合法文件上限，不是累计队列上限；与 multiple 取较小限制 |
| `maxSizeBytes?: number` | 每个文件的大小上限，等于上限可接受；省略不限 |
| `disabled?: boolean` | 禁用选择和拖放，并清除当前拖拽高亮 |
| `issueMessages: Record<'type' \| 'size' \| 'count', string>` | 必填的本地化原因文案；由调用者提供具体约束说明 |
| `onFilesSelected(files: File[]): void` | 只交付本次合法部分，保持原始 File 引用和顺序；空批次或全部不合法时不调用 |
| `onRejected?(issues: FileIssue[]): void` | 拒绝项 `{name: string, reason: 'type' \| 'size' \| 'count'}`，按原顺序返回 |

相对建议 API，仅增加必填 `issueMessages`，以便组件旁的错误可以完整本地化；无需从 UI 层导入 Lab 文案。沿用 V0.2-A 的字段提示与语义 Token。

`matchesAccept(file, accept?)` 只查看 name/type。`validateFiles(files, constraints?)` 返回 `{accepted, rejected}`，不修改输入或读取内容。校验顺序如下，每个拒绝文件只报告一个原因：

| 顺序 | 判定 | 结果 |
| --- | --- | --- |
| 1 | 无规则时接受类型；有规则时任一扩展名或 MIME 匹配即可 | 不匹配为 type，不占数量名额 |
| 2 | size > maxSizeBytes | size，不占数量名额 |
| 3 | 合法文件已占满单次名额 | count |
| 4 | 以上均通过 | 交付原 File 引用 |

空 MIME 不能匹配 MIME 规则，但可匹配显式扩展名。空 accept 项忽略；无法识别的非空规则不匹配。数值约束需为非负安全整数，0 表示零额度/仅零字节，非法配置抛 RangeError。没有隐含类型或大小限制。

浏览器 input 的 accept 只是选择提示，本地校验也不证明文件内容真实或安全。原生 input 在每次处理后清空 value，因此相同文件连续选择仍生效。按钮提供 Tab、Enter、Space；拖放只绑定组件内事件，计数器处理嵌套 dragenter/dragleave。最近一次非空批次替换错误，完整合法的新批次清除旧错误；取消/空选择不改变反馈。文件名以 React 文本渲染，不用 innerHTML。

组件只持有 input 引用、拖拽与错误 UI 状态。调用者决定列表、去重、移除与释放引用；Lab 故意允许重复记录方便验收。组件及 Lab 不调用 FileReader/arrayBuffer/text/stream、不创建对象 URL、不发请求、不写入 Storage 或 IndexedDB。刷新或离开页面清空记录，不删除设备上的文件。

## ScrollDock API 与边界

从 `src/ui/ScrollDock.tsx` 导入 `ScrollDock`，唯一必填属性 `getLabel: (percent: number) => string`，返回含动作与整数进度的本地化名称。FilesLab 使用如“向上滚动，当前进度 43%”的文案。`scroll-metrics.js` 的 `getScrollMetrics(scrollTop, scrollHeight, clientHeight)` 是独立纯函数，返回 distance/top/percent/canShow/stepTarget；处理零高度、负值、越界与非有限输入。

只监听文档 scroll（passive），用 requestAnimationFrame 合并；window resize、媒体条件 change 和 ResizeObserver（body/documentElement）触发重新测量。内部面板 scroll 不触发更新。整数进度及显隐均未变化时不提交 React state；卸载移除全部监听、断开 observer 并取消待执行 frame。

显示条件为总可滚动距离 >320px、已滚动 >72px、宽度至少 900px 且 pointer:fine。隐藏时不渲染按钮；CSS 同样限定媒体条件。48px 圆球用 SVG 圆环、StyleX 与 Phosphor 箭头实现，进度钳制到 0–100%。单击或 Enter/Space 向上移动总可滚动距离的 25%，最低到 0；reduced-motion 使用 instant，其他情况 smooth，没有持续动画。

仅参考指定旧项目 ScrollDock 的交互体验，独立编写计算、订阅和 SVG 渲染代码，没有搬入私有仓库实现。未增加无实际需求的 ScrollArea。保留原生滚动条、滚轮、键盘和触摸滚动，未实现拖动圆球或内部 ScrollTarget。未来页面须显式选择挂载；不能为了它给静态首页增加 React。

层级为 Dock 10 < Toast 15 < Bottom Sheet 20/30 < ConfirmDialog 50 < Select 60 < Tooltip 70。球距右/下至少 20px 并考虑 safe-area；模态弹窗由现有 Base UI 处理焦点和背景隔离。

## 人工验收

`pnpm install && pnpm dev` 后访问 `/lab/files`，默认中文；英文先停止 dev，再执行 `pnpm exec cross-env SITE_REGION=global pnpm dev`。

1. 点击、Tab → Enter/Space 选择小 PNG/JPEG/WebP，检查名称、大小与类型。连续选择同一文件应新增记录。单条移除及确认清空只释放本页引用；取消清空不变。
2. 混合投递合法文件、TXT、超过 2 MiB 的图片扩展名文件；合法部分进入列表，其余逐条说明原因。一次选择 4 个合法文件只接收 3 个；关闭多选后最多 1 个。切换禁用后不能选择/接收拖放；跨越区域内文字/图标时高亮不应闪烁。
3. 桌面宽屏滚到页底，显示 100%；点击变为约 75%，多次点击到顶部后隐藏。关闭/移除文件改变页面高度时进度应更新。开启系统减少动态效果后不应平滑滚动。
4. 在 375×812、812×375、768×1024 检查无横向溢出、原生滚动正常、滚动球隐藏；确认弹窗操作可达。回归 `/lab/ui`、`/lab/canvas`、`/lab/form`、`/lab/batch`。
5. 用浏览器开发者工具复核无文件字节上传和自动图片预览，控制台无错误；手机真机检查系统文件选择器、触摸与屏幕阅读器。

## 验证记录

2026-10-09，Windows / 内置 Chromium（视口模拟，非手机真机）：实际通过原生文件选择流程用点击、Enter、Space 选入测试文件；合法/错误类型/超大混合批次部分接受，同文件再次选择新增记录；4 个合法文件接收 3 个，错误随后可清除。测试文件仅含占位文本，仍只展示元信息，没有尝试解码。

1440×900 长页可滚动距离 1200px，底部点击球后 scrollY 从 1200 到 900、进度从 100% 到 75%，环颜色与层级正确。375×812、812×375、768×1024 没有横向溢出或滚动球；确认框初始聚焦取消，横屏按钮可达；禁用文件区不可操作。

英文开发模式验证了选择区、类型拒绝原因、清空确认框和进度名称，无残留中文。桌面确认框层级 50、滚动球层级 10，打开后焦点位于取消，背景球不在可访问树中。Canvas 抽屉重新打开保留名称；Form 输出 `✦ FURRY`；Batch 两步推进至 `2 / 2`；UI 按钮和 Select 受控值正常。浏览器控制台没有错误或警告。

最终顺序验证：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功，无依赖或 lockfile 变更 |
| `pnpm check` | 53 个文件；0 errors / 0 warnings / 0 hints |
| `pnpm test` | 6 个测试文件、60 项全部通过，保留 V0.2-A 原断言 |
| `pnpm build:cn` | 成功；dist/cn 两个静态页面（首页、404），中文与 canonical 正确 |
| `pnpm build:global` | 成功；dist/global 两个静态页面（首页、404），英文与 canonical 正确 |

两地区 StyleX CSS 提取均通过，无 Lab 路径、Lab 入口或 FilesLab 演示实现；首页为零 script、零 astro-island、零 JavaScript 预加载。构建检测新增 FilesLab/data-files-lab 标识，没有禁止未来正式工具使用通用原语。registry、主依赖、Astro 隔离措施、LICENSE 均未改动。

Vitest 覆盖纯文件匹配及部分接受、大小/数量边界、同文件重复选择、局部拖放与嵌套高亮、禁用及旧错误清理、禁止读字节/对象 URL/fetch/持久化、调用者列表移除与确认清空；ScrollDock 覆盖零高度/钳制、阈值/媒体条件、按段上移、减少动画、事件合并、内部面板隔离和卸载清理。jsdom 不验证浏览器原生选择器或布局。

`.github/workflows/ci.yml` 已核对并保持原有 CI：dev/main 的 push 与 PR 使用 Node 22，依次 frozen-lockfile 安装、check、test、build:cn、build:global；仅 contents:read，无 CD 或部署 Secret。

尚未完成：从操作系统文件管理器真实拖入浏览器、iOS Safari / Android Chrome 真机、实际触摸/混合指针设备、屏幕阅读器和系统 reduced-motion 体验。拖放嵌套/禁用、媒体条件和即时滚动目前有 Vitest 模拟覆盖，不将其视为真机验收。

本轮没有发现需要扩大 Workbench 状态、Astro 配置或全站 Hydration 的问题；没有已知的 V0.3 架构阻碍。上述真机复核仍需完成。TimePicker 明确延期，不继续预建无需求组件。

参考浏览器语义：[文件 input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file)、[文件拖放](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop)、[scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo)。

## V0.4-B 增量接口记录

FileDropzone 新增可选 `appearance: 'expanded' | 'compact'`（默认 expanded），只改变外观；新增 `onSelection(selection: FileSelection)`，在原有 accepted/rejected 回调之前报告本次完整元信息校验结果。Converter 用它识别“本次全拒绝”，使上一候选失效且恢复旧下载。原有回调、部分接受规则与文件所有权不变。触发按钮 ID 为 `${inputId}-button`，供移除后的焦点返回使用。组件仍不读取字节、不生成 URL、不持有工具队列。

以上 V0.2-B 历史记录未重写其验收事实。
