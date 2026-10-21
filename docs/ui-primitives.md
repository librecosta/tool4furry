# V0.2-A — UI Primitives Foundation

`src/ui/` 提供 Tool4Furry 的公共视觉和交互原语，不持有工具参数、结果或算法。`UiProvider` 只在 `LabRuntime` / `ToolRuntime` 内挂载，Toast 队列属于该 React 树。首页仍是纯 Astro；多个 Island 不共享 Context。

## API

按文件直接导入所需组件，不需要全局组件注册。字段的 `hint`、`error` 是可选字符串，组件生成稳定 ID 并关联标签与反馈。错误留在字段旁，不用 Toast 代替。

| 文件 / 导出 | 契约 |
| --- | --- |
| `Button.tsx` / `Button` | 原生 button 属性和 ref；`variant`: primary/secondary/ghost/danger，`size`: sm/md；默认 type=button；disabled/loading 禁止操作，loading 保留文字占位与宽度 |
| `Button.tsx` / `IconButton` | 同上，必须提供 `label` 作为 aria-label，children 放图标 |
| `TextField.tsx` / `TextField`, `TextAreaField` | `value: string`、`onChange(value: string)`、label/hint/error/disabled/required；保留适用的原生输入属性 |
| `SelectField.tsx` / `SelectField` | `value: string`、`onValueChange(string)`、`options: {value,label,disabled?}[]`、placeholder；空字符串表示未选；选项应使用非空唯一 value |
| `CheckboxField.tsx` / `CheckboxField` | `checked: boolean`、`onCheckedChange(boolean)`、label/hint/error/disabled/required |
| `SliderField.tsx` / `SliderField` | 单值 `value: number`、`onValueChange(number)`、min/max/step、label/hint/error/disabled、可选 unit/name；默认 0–100、步长 1 |
| `Tooltip.tsx` / `Tooltip` | children 为可接收 props/ref 的按钮，content 为辅助提示；可选 open/onOpenChange；按钮仍需独立可访问名称 |
| `ConfirmDialog.tsx` / `ConfirmDialog` | 必须提供受控 open/onOpenChange、trigger、title/description、confirmLabel/cancelLabel、onConfirm；可选 onCancel/danger。初始聚焦取消，只有确认按钮触发 onConfirm |
| `Toast.tsx` / `useToast` | `notify({type?,title,description?,id?,timeout?})` 返回 id；`close(id?)`；同 id 更新并刷新计时；type 为 info/success/warning/error |
| `UiProvider.tsx` / `UiProvider` | children + `labels`（通知区域、关闭与四类状态文案）；包裹 Base UI Tooltip/Toast Provider 与 ToastViewport |
| `FileTaskList.tsx` / `FileTaskList` | `label` + 受控 `items`：稳定 id、name、可选 media 槽位（44px，缺省回退 icon）、metadata/output、status/statusLabel、error 和 actions；状态为 validating/queued/processing/ready/stale/error，操作提供 label、回调或下载链接及禁用原因。两行紧凑布局、44px 操作区；不持有 File/Blob、Object URL 或媒体任务。 |
| `FilePreviewDialog.tsx` / `FilePreviewDialog` | 受控 open/onOpenChange、title、可选 description/toolbar、媒体 children、关闭/全屏/还原 labels 与可选 finalFocus 回调。负责模态、焦点、滚动锁定、Fullscreen API（不可用时最大化）及清理；仅打开时挂载 children，不持有文件、URL 或媒体变换。 |

例如工具内部直接使用 `TextField value={name} onChange={setName} label={t.name}`。工具已位于 ToolRuntime 的 Provider 内，通过 `useToast().notify({type:'success', title:t.saved})` 反馈；不要再在 SiteLayout 或 WorkbenchShell 添加 Provider。

## 实现边界与版本差异

沿用已锁定的 Base UI 1.8.0、StyleX 0.19.1、React 19.3.0 和 Astro 7.3.8，无运行依赖升级。Button/Input 使用原生语义；Select、Checkbox、Slider、Tooltip、AlertDialog、Toast 使用 Base UI，键盘导航、焦点约束、返回焦点和通知计时均由库管理。

Base UI 1.8 的禁用 Select 项可被方向键聚焦以供发现，但不能确认选中；测试验证这一实际行为。其 Tooltip 是视觉辅助标签，不自动赋予 ARIA tooltip 角色；测试用焦点触发后可见内容验证，触发按钮另有名字，必要信息放正文或可点击反馈。参见 [Select](https://base-ui.com/react/components/select)、[Tooltip 使用规则](https://base-ui.com/react/components/tooltip)、[Toast](https://base-ui.com/react/components/toast)、[AlertDialog](https://base-ui.com/react/components/alert-dialog)。

ConfirmDialog 的 Backdrop 使用 `forceRender`，保证位于 Workbench 的 Dialog 上下文中仍有独立模态遮罩。WorkbenchShell 只把原有遮罩颜色和层级改为语义 Token，没有改变参数 Portal 宿主、keepMounted 或面板状态结构。

样式复用 `controls.ts` 的按钮/输入视觉及布局，新增样式均用 StyleX；global.css 无新增规则。按钮保持至少 44px 触达高度，Slider 的轨道交互区为 44px。loading 图标在 reduced-motion 下停止旋转；沿用 Canvas 原有 Motion/useReducedMotion，其余弹层不增加动画。

## 弹层与通知

层级 Token：Toast 15 → Bottom Sheet 遮罩 20 / 面板 30 → ConfirmDialog 50 → Select 60 → Tooltip 70。Select 使用 body Portal，避开面板 overflow，宽度跟随 trigger，留碰撞边距。ConfirmDialog 限制视口高度并允许内部滚动。

Toast 位于顶部 safe-area 内，桌面最大宽度 360px，窄屏留边距，区域高度限制为 36dvh / 320px 并可滚动；层级低于模态面板，不覆盖 Bottom Sheet 的主要操作。Base UI `limit=3`；超限项隐藏，库继续管理生命周期。info/success/warning 默认 5 秒，error 8 秒，允许逐条覆盖（0 表示不自动关闭）。悬停/焦点暂停、离开恢复，提供手动关闭，不另建 live region 或 singleton。

## 验收

开发访问 `/lab/ui`：按钮点击反馈与 loading、名称清空校验、多行备注、三种可选配色及禁用项、布尔值和数值展示、Tooltip、取消/确认计数、四类通知。画廊只由已有 `[mode].astro` 开发路径加载，生产不生成独立 UI Lab 页面。

2026-10-09 在 Windows / 内置 Chromium 做了视口模拟：

- 1440×900 与 768×1024：UI 布局正常，无横向溢出；Tooltip 键盘聚焦显示。
- 375×812：Select 键盘选择、Checkbox 空格、Slider 方向键改变受控值；确认框初始聚焦取消，Shift+Tab 留在弹窗，Escape 返回触发按钮。通知至多三条，位于顶部。
- 812×375：确认框操作可达；Canvas 参数可内部滚动，Select 弹层不被裁剪。
- Canvas 的 375→768→1440 切换保留名称、颜色和大小；第一次 Escape 关 Select，第二次关闭参数，焦点依次返回。
- Form 得到 `✦ FURRY`；Batch 新增 WEBP、两次推进显示 `2 / 2`，均无手机横向溢出。

StyleX Gate：临时 React 页面中按钮 padding 从 14px 热改为 15px，浏览器直接更新且输入保持 `HMR-kept`；静态 HTML 有控件及编译类名，独立 CSS 中有对应规则。验证后移除临时页；Astro 配置未修改。

Vitest 保留旧 Demo 断言，新增受控值/ARIA、键盘、disabled/loading、确认取消、Tooltip、Toast 限制/去重/手动关闭/焦点与悬停计时测试。每次 `build:cn/global` 都自动检查零 Lab/Demo、首页零 script/astro-island、语言和提取 CSS。

本轮实际执行：`pnpm install --frozen-lockfile` 成功；`pnpm check` 为 0 errors / 0 warnings / 0 hints；`pnpm test` 为 3 文件、23 项通过；`pnpm build:cn` 和 `pnpm build:global` 均通过，每地区各输出首页与 404 两页，隔离及 CSS 验收通过。完成构建后冷启动 `/lab/ui`，文字、三选一与按钮 Toast 正常，控制台无错误或警告。

仍需真机人工复核 iOS Safari / Android Chrome 的软键盘、动态地址栏、安全区、触摸拖动和屏幕阅读器读序；浏览器视口模拟不代表这些已通过。系统 reduced-motion 真机体验也需复核。

没有实现 V0.2-B 的 ScrollDock、FileDropzone、TimePicker，未做真实工具、后端、品牌改版或部署。
