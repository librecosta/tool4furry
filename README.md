# Tool4Furry

为 Furry 创作者准备的开源浏览器工具站。当前为 **V0.4-B — Image Converter**：首款真实单图 PNG/JPEG/WebP 转换器已提供开发预览，仍为 **draft**，待视觉打磨和维护者最终验收后另行决定是否进入 Beta，正式目录仍为空。采用 [L1/L2/L3 发布政策](AGENTS.md#mvp-beta-release-policy-2026-10-10)：全面跨浏览器/真机验证不再是 Beta 前置条件，未测平台如实记录。既有品牌首页、Creative Studio 控件与 Workbench 保持不变。

前端及未来浏览器本地工具使用现有 [BSD-3-Clause](LICENSE) 协议。当前没有后端；未来 SaaS 后端将放在独立仓库。

## 快速启动

推荐 Node.js **22 LTS（>=22.12）**，也支持 Node.js 24 LTS。pnpm 版本由 `packageManager` 固定为 **12.8.1**。若尚未安装 pnpm，可先执行 `npm install --global pnpm@12.8.1`。

```powershell
git clone --branch develop https://github.com/librecosta/tool4furry.git
cd tool4furry
pnpm install
pnpm dev
```

不需要 `.env`、云账号、数据库或密钥。一次 `pnpm dev` 启动 CN `http://127.0.0.1:54321/` 与 EN `http://127.0.0.1:54322/`；导航语言链接在两端本地切换并保留可用路径。端口占用会明确失败，不自动换端口。Ctrl+C 或 `pnpm dev stop` 同时停止两端。

| 路径 | 内容 |
| --- | --- |
| `/`、`/#tools` | 品牌首页与最多 9 项真实精选；无工具时显示准备中的空状态 |
| `/tools/` | 当前地区完整目录：DEV 显示 draft + published，生产仅 published（当前为空）；按任务/身份/场景发现 |
| `/tools/image-converter/` | 真实图片转换：开发可访问 draft，生产仅在 Registry published 后生成 |
| `/about/`、`/privacy/`、`/terms/` | 双语静态网站信息页 |
| `/lab/canvas` | 完整视口画布、浮动 Dock、默认关闭的 Inspector、手机参数 Sheet |
| `/lab/form` | 输入、参数、校验、模拟输出 |
| `/lab/batch` | 增删示例任务、推进模拟状态、清空 |
| `/lab/ui` | 基础控件、受控值、校验、Tooltip、确认弹窗和四类 Toast |
| `/lab/files` | 本地文件选择/拖放、元信息、部分接受与拒绝原因、长页面滚动进度球 |
| `/lab/hero-effects/` | Canvas 2D 参数化波浪网格；质量、文案叠加、暂停/恢复、重置与 RAF / 实际重绘观察 |
| `/404` | 404 页面预览 |

**Lab 只在 dev 可访问。** 页面明确标为 Demo；文件页仅持有本地文件引用并展示元信息，不读取内容、生成对象 URL、上传或持久存储。生产无 Lab 页面、入口或 demo 实现；首页仅有受控外观脚本，无 React Island 或 JS preload。

Hero 实验在两个开发端口均可访问，仅保留 Waves。主流线与更暗的横切线共享一个连续曲面，按坡度/峰脊/深度着色；屏幕投影间距不足的线段渐隐，不使用整体模糊。低/中/高主线预算为 40/56/64（另含边缘线），横切线最多 16/24/30；实际密度与采样受画幅和 DPR 控制，渲染 DPR 上限 1/2/2。桌面最多约 60 次实际重绘/秒，小屏或低档约 30 次；暂停、离屏、后台停绘，Reduced Motion 静态显示。支持现有 Hero 文案叠加、指针局部扰动、重置和 Canvas 失败提示。统计分别展示 RAF 回调率、实际重绘率及同步 JS draw 平均/P95，不代表 GPU 计时、总内存或帧率保证。Motion 保留 14.6.0 供现有工作台使用；实验不使用 WebGL、付费源码或图像纹理，也不接入正式首页。

**Converter 当前为 draft**，开发和生产共用 `/tools/image-converter/`，仅运行环境与 Registry 状态决定是否生成页面与加载实现。首页、完整目录、工具箱菜单及相关推荐沿用同一可见性规则：DEV 包含当前地区 draft + published，生产仅 published。它在浏览器内读取、解码、编码并管理预览 URL，文件不上传或持久保存。生产排除 draft 的路由、目录入口及专用 JS；发布时只需经授权调整 Registry status，不再另改 loader 开关。操作与验收记录见 [Image Converter 实施记录](docs/image-converter-implementation.md)。

## 检查与构建

日常按 L1 只做与改动相关的验证，完整 CI 优先由现有 GitHub Actions 执行，无需每次小修改都重跑全量。确需本地完整验证时，先用 Ctrl+C 或 `pnpm dev stop` 停止两端 dev，再顺序执行：

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build:cn
pnpm build:global
```

| 命令 | 结果 |
| --- | --- |
| `pnpm check` | Astro 与 TypeScript 检查 |
| `pnpm test` | Vitest：路由/地区契约、布局及交互状态 |
| `pnpm build:cn` | `dist/cn/`，中文，canonical 为 `https://tool4furry.cn` |
| `pnpm build:global` | `dist/global/`，英文，canonical 为 `https://tool4furry.com` |
| `pnpm build` | 等同 CN 构建 |
| `pnpm preview` | 预览 CN 静态产物 |
| `pnpm preview:global` | 预览 global 静态产物 |

两套产物互不覆盖，每次构建都会检查语言、title/description/OG/Twitter Card、正式 1200×630 PNG 封面、canonical、ICO/PNG favicon、真实工具目录与路由对应关系、首页外观及工具箱导航脚本精确白名单/零 Island/JS preload、自托管字体及授权、StyleX CSS 提取和 Lab 隔离。构建脚本用 cross-env，兼容 PowerShell。Astro/Vite 缓存按地区隔离；同一地区不要将 check/build 与 dev 混跑。

每个输出目录都可独立作为普通 HTTP Server 的根目录，不需要 Astro 服务端。例如已安装 Python 时：

```powershell
python -m http.server 8080 --directory dist/cn
# 另一个终端：
python -m http.server 8081 --directory dist/global
```

静态服务应支持目录下的 `index.html`；未来部署时由主机设置 `404.html` 的错误页映射。不要使用 SPA 全路由回退来伪造 Lab 页面。

无需单独启动英文服务器或配置语言目标环境变量。正式 CN/Global 产物的语言链接仍使用对应公网域名；未发布或地区不可用的工具安全回退目标工具目录。

## 目录

```text
src/
  pages/          Astro 首页、完整 tools 目录、404、lab/[mode]、tools/[slug]
  layouts/        SiteLayout：品牌、语言、SEO、页面外壳
  components/site/ 静态共用品牌组合
  site/           Taxonomy、Catalog 投影及 Astro-only 工具 SEO 内容
  workbench/      可选插槽、响应式、面板开关
  ui/             受控 UI 原语、Island 内的 UiProvider
  lab/            开发 demo、独立状态与纯模拟逻辑
  tools/          元数据、发布过滤、懒加载表、固定 ToolRuntime
  config/         地区及构建文案选择
  i18n/           正式页面的最小中文/英文文案
  styles/         StyleX token、站点/控件样式与少量 reset
tests/            Vitest 逻辑与组件契约
scripts/          静态产物验收
docs/foundation.md 架构边界、Gate 与人工验收记录
docs/ui-primitives.md 控件 API、弹层规则和 V0.2-A 验收
docs/file-interactions.md 文件/滚动 API、边界和 V0.2-B 验收
docs/visual-foundation.md 自托管字体、视觉 Token、控件状态与 V0.3-A 验收
docs/workbench-appearance.md V0.3-B 完整合同、布局所有权、浏览器与构建验收
docs/site-homepage.md V0.3-C 完整合同、首页/目录/SEO 与验收记录
docs/tool-platform-image-foundation.md V0.4-A 完整合同与 P0–P6 实施记录
docs/image-processing-capabilities.md 原生编解码证据与 B/C/D 待验发布门禁
docs/image-converter-implementation.md V0.4-B 草稿功能、复现、证据与发布阻断项
public/brand/     可替换单一 Mark、静态 Creative Fragments SVG
```

技术栈：Astro SSG、React、TypeScript、StyleX、Motion、Base UI、Phosphor Icons、pnpm、Vitest。没有 SSR Adapter、全局业务 Store、通用画布引擎、数据库、Docker、Monorepo、Storybook 或 Playwright 测试框架。`pnpm-workspace.yaml` 仅保存 pnpm 安装策略，不定义子项目。

日常开发使用 develop，通过 PR 集成到 pre-master，再通过 PR 合入发布基线 master。GitHub Actions 对 develop/pre-master/master 的 push 与面向 pre-master/master 的 PR 执行安装、检查、测试及双地区构建。**仅 CI，无 CD、部署 Secret 或生产发布。** 未来静态部署目标为 Cloudflare Workers Static Assets 与 EdgeOne Makers，本批次未部署。

新增工具前请阅读 [架构说明](docs/foundation.md)、[UI 原语契约](docs/ui-primitives.md) 和 [文件交互契约](docs/file-interactions.md)。

视觉规范见 [Visual Foundation](docs/visual-foundation.md)：Flat Studio 用于常驻面板，Floating Studio 用于浮层；主操作使用深暖橙，品牌橙只作视觉强调。DM Sans / Noto Sans SC Variable 由 Fontsource 自托管，正常 `wght.css` 随静态构建交付，无字体 CDN；OFL 授权随产物保留在 `licenses/`。

在 `/lab/ui` 用 Tab 聚焦、方向键切换 Select/Slider、空格切换 Checkbox、Escape 关闭弹层。清空名称并验证可查看错误；取消确认框不增加计数，确认才增加。连续触发消息至多显示三条；悬停/聚焦会暂停计时。手机参数抽屉中的嵌套 Select 可在 `/lab/canvas` 检查。

在 `/lab/files` 选择或拖入 PNG/JPEG/WebP，每次最多 3 个、单文件最多 2 MiB。混入错误类型、超大或第 4 个文件，检查合法部分进入列表、拒绝原因留在选择区；重复选择同一文件应新增记录。Tab → Enter/Space 打开系统选择器；可禁用、移除或确认清空。宽度至少 900px 且精确指针下滚动长页，右下球显示进度，点击向上移动总可滚动距离的 25%；手机继续原生滚动。详细步骤及未完成的真机检查见文件交互文档。

工作台入口与响应式合同见 [Workbench Appearance](docs/workbench-appearance.md)。品牌链接返回首页，独立工具箱按钮只展示当前地区已发布工具（目前为空）；烧瓶按钮收纳五个 DEV ONLY 预览。Canvas 的选择/标记属于当前 Demo 的局部操作；点击未被浮层覆盖的画布同样生效。

人工重点复核 `/lab/canvas` 在 901/900px 切换、390px 竖屏及 812×375 横屏：打开参数前后画布不缩小，名称/大小/颜色/计数保留，Select → Sheet 两次 Escape 依次关闭且返回焦点。Form/Batch 手机依次阅读输入/执行/结果或队列/设置。内置 Chromium 验收属于视口模拟；真实 iOS/Android 的软键盘、触摸、安全区与辅助技术仍需人工检查。

首页历史合同与验收见 [Site Homepage](docs/site-homepage.md)。V0.4-A 将 Header/Footer/404 的「工具箱」入口更新为 `/tools/` 完整目录，保留首页 `#tools` 兼容锚点；导航仍无吸顶或汉堡菜单。首页不加载 React 或动画运行时，品牌采用已审核双兽首 SVG Master，Favicon 提供 ICO/PNG，Hero 美术未改。当前没有探索主 CTA、搜索框或假工具卡。真实 `published` 工具按地区进入完整目录，首页精选最多 9 项；未知/错误分类在发布构建阶段拒绝。可索引页面共用正式 `public/brand/tool4furry-og.png`，图片 URL 使用本地区正式 HTTPS 域名；OG Locale 按内容语言解析，并提供 X/Twitter 大图卡片。404、Lab 和 draft 的 noindex 页面不输出社交 Meta。

人工审查首页及 `/tools/` 时重点看中英文、320px 导航、Tab 焦点、Footer 和真实空态；404 的「工具箱」应进入 `/tools/`，旧 `/#tools` 仍可用。真实移动设备与屏幕阅读器验收仍待维护者完成。

## V0.4-A：新增真实工具前

完整边界见 [Tool Platform & Image Foundation](docs/tool-platform-image-foundation.md)。先为真实需求确认 Taxonomy 的领域/方向与有依据的身份/场景标签，在 Registry 中以 draft 开始；添加独立 lazy loader 和各已发布地区的静态 SEO 内容，再完成实际功能与浏览器验证后发布。分类变化不改变 `/tools/<slug>/`。发布构建会拒绝重复 ID/Slug、非法分类关系、地区/标签、缺失 loader 或文案。首页精选 ID 顺序仅决定展示优先级，不能绕过发布门。

正式工具页使用单一 ToolRuntime：导航身份 → Astro 静态 H1/简介插槽 → 工具操作 → Island 外静态指南/相关工具。Lab 保留自己的 H1 和 Canvas 浮层。Quick/Advanced 共用工具自有 Settings；只有当前 sourceRevision/settingsRevision/requestId 的 ready 输出可下载。B 已实现转换草稿；尺寸调整、裁剪仍留在 C/D。

停止 dev 后可额外运行 `node scripts/verify-tool-fixture.mjs cn` 和 `node scripts/verify-tool-fixture.mjs global`：它们只在测试构建期间替换内存模块，输出到仓库外 `../.validation/platform-v04a/<region>/`，复用生产守卫验证非空页面及长文不进客户端 JS；不修改生产 Registry。**这些测试产物不可部署。**

原生图片探测的复现方式、固定样本与限制见 [能力记录](docs/image-processing-capabilities.md)。A 没有安装 WASM 或图片库，没有修改 FileDropzone/ScrollDock；已测 Chromium 结果不能作为 Firefox/WebKit 或真机兼容性声明，相关验证按 L3 推进，不自动阻断 Beta。

### Region and locale

`pnpm dev` still starts only CN (`http://127.0.0.1:54321`) and Global (`http://127.0.0.1:54322`). Each serves both languages: CN uses `/` (中文) and `/en/`; Global uses `/` (English) and `/zh/`. The same prefixes apply to `tools/`, `about/`, `privacy/`, `terms/` and available tool slugs. Navigation language links remain on the current origin. Footer region links select the other deployment while keeping the language, with unavailable tools falling back to its localized catalog. Production still builds only `dist/cn` and `dist/global`; Lab and drafts remain DEV-only.
