# Tool4Furry V0.4-A — Tool Platform & Image Tools Foundation

**中文 Codex 总实施文档 · 正式设计冻结 / 待实施**\
设计日期：2026-10-09\
目标仓库：[`librecosta/tool4furry`](https://github.com/librecosta/tool4furry)\
目标分支：`dev`（不得擅自合并 `main`、部署或接入生产服务）\
建议仓库内存放位置：`docs/tool-platform-image-foundation.md`\
核实基线：`dev` HEAD `7310eaeadc615d01cee10888bed923d4dbd507ff`，对应 CI 已通过；**Codex 启动时必须重新确认远端与本地状态，不得机械依赖上述提交。**

> **阶段含义**：V0.4-A 整合已讨论冻结的 **A1（Tool Taxonomy & Discovery Architecture）** 与 **A2（Tool SEO、Quick/Advanced UX、Image Processing Contract、Shared UI）**。本阶段交付的是可检验、可复用的产品与工程基础；真正的图片格式转换、尺寸调整、图片裁剪分别在 **V0.4-B / C / D** 开发，最后于 **V0.4-E** 集成验收。
>
> **最重要的范围约束**：不要因为文档给出了未来三款工具的能力规格，就在 V0.4-A 提前发布三款工具、实现完整图片编辑器或引入大而全的图像处理依赖。

---

## 0. 一页执行摘要

### 0.1 产品目标

Tool4Furry 是一个面向 Furry 创作者、开发者、工作室及相关用户的**工具优先型生产力平台**。未来可能拥有数十至上百款工具，所以需要做到：

1. **一份正式工具注册表，多种发现入口。** 用户既可以按“领域 → 方向 → 工具”浏览，也可以按“适合谁 / 在什么场景用”查找。
2. **首页只展示少量有价值的工具。** 完整工具库 `/tools/` 收录当前地区全部已发布工具，工作台的 Tool Switcher 只提供快捷入口和“浏览全部工具”。
3. **一个工具，一条稳定 URL。** 具体工具页以 Astro 静态内容承担 Title/H1/简介/说明/相关工具；React Island 承担实际操作，避免重复 SEO 页和重复 H1。
4. **快速与高级是同一份状态的不同视图。** 简单用户少点几次即可获得正确结果，高级用户可以精确设置且不被模式切换重置。
5. **三款首批图片工具共享技术边界，不共用一套臃肿的业务组件。** 格式转换、尺寸调整、裁剪三个独立页面，底层按需复用 Decode → Crop → Resize → Encode 等可靠能力。
6. **以真实工具完善 UI 基本单元。** 数值输入、格式选项、预览、处理反馈、下载等规范先冻结，等 V0.4-B/C/D 出现真实消费者后提炼共享组件。

### 0.2 V0.4-A 的最终交付

- 稳定、可校验的 `Taxonomy + Registry` 元数据合同：7 个一级领域的受控词表；首个二级方向 `image-processing`；角色 `creator/developer/operator`；场景 `studio/community`。
- 同一 Registry 的三种投影：**首页真实精选（最多 9 个）**、**`/tools/` 全量目录**、**工作台短列表 + 全量目录入口**。
- `/tools/[slug]` 的**工具页静态 SEO 合同**、页面内容数据结构、区域/索引/发布约束；构建阶段没有真实工具时用测试 Fixture 验证合同，不发布假工具。
- **Quick/Advanced 参数状态合同**：预设、自定义、有效结果版本、过期任务竞争和下载资格；需要可执行的纯逻辑测试。
- **图片处理技术决策记录与能力探测计划/证据**：准确区分解码能力与编码能力；核对生成的真实 MIME；列出浏览器差异与可证明/未证明的限制。
- 旧构建守卫迁移：由“首页必须链接所有工具”改成“**完整目录必须覆盖所有已生成的可发布工具页面**”，保留 V0.3-A/B/C 的所有安全、区域、字体与 Lab 守卫。
- 更新文档、必要的类型及测试。**Registry 仍不发布任何虚构工具**；Image Converter/Resizer/Cropper 的真实业务实现不属于 V0.4-A。

### 0.3 明确不进入本阶段

不实现图片批处理/ZIP 下载、付费/账户、后端 API/数据库、SSR adapter、复杂搜索服务、收藏/最近使用、推荐算法、埋点、完整画布引擎、WASM 全家桶、图片滤镜、AI 工具、长尾词自动生成页面、分类/角色的空 SEO 页面；不调整现有 Canvas 浮层架构、Base UI Portal、ScrollDock 行为或 V0.3-C 首页品牌美术。

---

## 1. 已核实的仓库基线与工程不变量

开始实施前先阅读：`AGENTS.md`、`README.md`、`docs/foundation.md`、`docs/visual-foundation.md`、`docs/workbench-appearance.md`、`docs/site-homepage.md`，必要时再查 `docs/ui-primitives.md`、`docs/file-interactions.md`。

| 文件 | 当前事实 | V0.4-A 影响 |
|---|---|---|
| `src/tools/types.ts` | `ToolDefinition` 包含 id/slug/category/mode/status/regions/copy | 最小扩充 `group/audiences/contexts` |
| `src/tools/registry.ts` | 仍为 `tools: readonly ToolDefinition[] = []`，按发布状态和地区过滤 | 唯一发布门，**不能添加假工具** |
| `src/site/catalog.ts` | 已有 5 个一级类别显示名，首页用 `getCatalogEntries(region)` 展示全部 | 衍生完整目录与精选视图；本地化 Taxonomy |
| `src/pages/index.astro` | Hero + `section#tools`，全部已发布工具卡片或真实空状态 | 精选最多 9 个；保留 `section#tools` 与零工具真实空态 |
| `src/pages/tools/[slug].astro` | 仅已发布工具静态路径；当前只挂载 ToolRuntime | 未来静态 H1/简介/说明与工具交互组合 |
| `src/tools/ToolPageFrame.tsx` | 产品导航/Toolbox Menu/当前工具标题；导航内目前为 React `<h1>` | 转为非 H1 的工具身份标识，避免静态主 H1 重复；Menu 不再平铺无限工具 |
| `src/tools/ToolRuntime.tsx` | 唯一 React 工具入口，持有 UiProvider、lazy 与错误边界 | 尽量不动懒加载和 Provider 边界 |
| `src/layouts/SiteLayout.astro` | Head、地区 canonical、OG、favicon、站点壳；支持 `fullTitle` | 工具页 SEO 沿用既有 Head 接口，避免重复品牌尾缀 |
| `src/config/region.ts` | `.cn` 为 `zh-CN`，`.com` 为英文，分别构建 | 不能把两地区默认视为同一已发布列表 |
| `scripts/verify-build.mjs` | 验证首页零 script/Island/JS preload、H1/OG/本地字体、Lab 隔离；**假设首页列出所有工具** | 必须以 `/tools/` 作为全覆盖来源，且补真实工具静态 SEO 验证 |
| `.github/workflows/ci.yml` | Node 22、frozen install/check/test/build:cn/build:global，纯 CI | 不更改部署和工作流职责 |

**工程不变量**：Astro SSG + React 19 Islands + StyleX + Base UI + Motion（按需）+ Phosphor；首页生产 **零业务 JS / 零 Island**；字体 DM Sans Variable + Noto Sans SC Variable 自托管；暖白、深墨、暖橙 Token 延续 V0.3-A；双地区静态产物分别生成；Lab 五页只在开发环境可用；没有新全局 Store、后端、数据库、Monorepo 或新 UI 框架。

**CSS 和图像处理所有权**：StyleX 负责通用控件与布局外观，`global.css` 只保留原有少量基础规则；WorkbenchShell 负责布局和面板可见性；工具自身负责业务参数、文件、异步任务及结果。FileDropzone 只交付 File 引用和文件约束反馈，不能被扩展成全局图片处理服务。

---

## 2. A1 — Tool Taxonomy & Discovery Architecture（正式冻结）

### 2.1 功能三级结构与命名

- **L1 Domain / 一级领域**：工具解决问题的宏观领域。
- **L2 Group / 二级方向**：一级领域之下的实际任务类目。
- **L3 Tool / 具体工具**：独立产品与 SEO 页面，稳定 `id`、`slug`。
- 每款工具**恰好一个**主要 L1 与 L2 归属；`group` 必须属于声明的 `category`。
- 分类根据**主要用户任务**，而非 UI 技术（Canvas/Form/Batch）、文件扩展名或使用者职业。
- 分类调整不修改工具 URL；不同领域或身份推荐只关联工具 ID，不复制实体。

#### 2.1.1 一级领域受控词表

| `DomainId` | 中文 | English | 边界 |
|---|---|---|---|
| `images` | 图像与素材 | Images & Assets | 图片转换、裁剪、缩放、基础素材处理 |
| `creative` | 创作与设计 | Creative & Design | 跨图片的设计辅助、排版、创作工作流 |
| `characters` | 角色与设定 | Characters & Worldbuilding | 兽设档案、角色信息、设定组织 |
| `text` | 文本与写作 | Text & Writing | 文字转换、写作与文本处理 |
| `documents` | 文档与办公 | Documents & Office | PDF、发票/票据、报表和办公文档 |
| `development` | 开发与数据 | Development & Data | 编码、JSON、数据和开发者工具 |
| `files` | 文件与效率 | Files & Productivity | 通用文件重命名、整理、归档与效率 |

沿用既有 `images/creative/characters/text/files` 标识；新增 `documents/development`。这是**受控词表**，不是要求马上生成七个分类路由或七块空栏目。实际展示时仅显示当前地区至少拥有一个已发布工具的分类。

#### 2.1.2 首个二级方向

`image-processing`：中文 **图片处理**、英文 **Image Processing**；父领域固定为 `images`。首批后续三款工具：

| Tool ID（建议） | 稳定 Slug | 领域 / 方向 | 真正开发阶段 |
|---|---|---|---|
| `image-converter` | `image-converter` | `images` → `image-processing` | V0.4-B |
| `image-resizer` | `image-resizer` | `images` → `image-processing` | V0.4-C |
| `image-cropper` | `image-cropper` | `images` → `image-processing` | V0.4-D |

未来有真实工具再添加二级方向，不因设想的发票转换等项目建立空目录；`GroupId` 应全站唯一或可无歧义定位到父领域。

### 2.2 身份与场景：相互独立的发现维度

| 类型 | ID | 中文 / 英文 | 使用原则 |
|---|---|---|---|
| Audience | `creator` | 创作者 / Creator | 创作、素材与作品工作 |
| Audience | `developer` | 开发者 / Developer | API、格式、开发效率等实际任务 |
| Audience | `operator` | 运营与管理 / Operations | 内容、社群活动与日常管理 |
| Context | `studio` | 工作室 / Studio | 委托生产、批量素材、客户交付、票据等场景 |
| Context | `community` | 社群 / Community | 社群活动、公告、资源组织等场景 |

- `audiences?: readonly AudienceId[]` 与 `contexts?: readonly ContextId[]` 均可多选；**不互斥**，也不要求用户登录填写身份。
- 身份/场景作为**浏览筛选和关联推荐**，不改变工具功能归属；首页“适合谁”只展示确有当前地区真实工具的入口。
- 不引入几乎所有工具都能打上的泛化标签（如 `personal`）；不为了曝光给工具无依据地打满所有标签。
- 身份与场景标签须在文案上解释其适用理由；不生成身份 × 领域的成百上千个自动 SEO 页面。

### 2.3 最小数据合同（示例，非要求一字照抄）

```ts
export type DomainId =
  | 'images' | 'creative' | 'characters' | 'text'
  | 'documents' | 'development' | 'files';

export type AudienceId = 'creator' | 'developer' | 'operator';
export type ContextId = 'studio' | 'community';

// group 与父领域的对应关系在一处 Taxonomy 定义，不复制两份配置。
export type GroupId = 'image-processing'; // 后续随真实需求扩展

export type ToolDefinition = {
  id: string;
  slug: string;
  category: DomainId;
  group: GroupId;
  audiences?: readonly AudienceId[];
  contexts?: readonly ContextId[];
  mode: WorkspaceMode;
  status: 'draft' | 'published';
  regions: readonly Region[];
  copy: Record<Region, { title: string; description: string }>;
};
```

推荐 `src/site/taxonomy.ts` 统一声明 Domain/Group/Audience/Context 的有效 ID、中文/英文展示名及 Group 所属 Domain；`src/tools/types.ts` 消费其类型或共享纯类型，不造成服务端页面内容与 React 的循环导入。`src/tools/registry.ts` 仍只存工具元信息；`src/site/catalog.ts` 根据 Registry 投影展示数据，**绝不成为第二份发布名单**。

注意迁移现有测试 Fixture（部分原 Fixture 使用 `category:'test'`）：应改为**合法分类组合**，另用负向测试验证非法组合会失败，不要为了让旧 Fixture 通过而放宽所有生产分类约束。

### 2.4 验证和错误处理

- `id`、`slug` 全局唯一，`slug` 为安全、稳定的小写短横线形式。
- `category/group` 对应关系必须合法；未知 Audience/Context、重复同一标签、未知地区等应在测试/构建验证中暴露。
- 校验所有已发布工具具备目标地区文案，且 `toolLoaders[tool.id]` 存在；Draft 不获得静态公开工具路由。
- 在没有正式工具时保持 Registry 为空；通过 Test Fixture 模拟三款、20 款和 100 款数据，**不能把测试 Fixture 合并进发布列表**。
- 单款工具出现在多个身份或场景视图是正常的，但每个具体列表内不得重复同一工具 ID。

---

## 3. A1 — 三类工具发现入口的页面合同

### 3.1 首页 `/`：少量真实精选

- 保留 V0.3-C 的品牌 Header、Hero/创作碎片、`section#tools` 和真实零工具空状态。
- 从 `getPublishedTools(region)` 过滤首页精选工具 ID，**最多 9 个**；候选 UI 容量 6–9，少于 6 个已发布工具则展示实际数量，不补假卡片。
- “精选”表示编辑选择，不声称“最热门”“最多人使用”；目前没有真实频率数据、用户评价或评分。
- 推荐一份简单的精选工具 ID 顺序列表（纯配置）；若已发布工具未在列表中，可按稳定 Registry 顺序补位至上限。配置中的 Draft、其他地区或不存在 ID 被自动排除。
- 首页不再承载“完整收录”。无论有没有工具，`#tools` 仍存在以兼容现有 Hero 锚点和历史链接。
- 首页可在有真实内容时展示一级功能领域和“适合谁”入口；在没有目标内容时不显示空卡片、死链和大量占位导航。
- 仍保持生产首页 **零 `<script>` / Astro Island / JS preload**，不开发实时搜索。

### 3.2 完整工具库 `/tools/`：唯一全量收录入口

新增独立的 Astro SSG 页面 `src/pages/tools/index.astro`；与已有 `src/pages/tools/[slug].astro` 共存。它应当：

- 展示当前地区**所有**已发布工具，分组顺序稳定，具有清楚的“领域 → 小方向 → 工具”视觉层级。
- 支持轻量的身份/场景发现（静态区块或锚点），不立即建设完整搜索服务。分类不因工具跨多个角色而生成重复工具页面。
- 目录中的工具卡片均为真实 `<a href="/tools/<slug>/">`，名称、简介从本地化元数据取值。
- 零工具时展示真实空状态；不能展示已经发布但本地区不可用的工具。
- 标题、Description、一个可见 H1 和当前地区 canonical 由 Astro 静态输出；页面语义可访问，键盘导航正常。
- 长列表可采用分组 Grid；100 个 Fixture 的测试应证实没有遗漏、冲突和重复 ID，不要求在 A1 实现虚拟滚动或分页后端。

### 3.3 工作台 Tool Switcher：快捷切换，不充当完整目录

在已有 `ToolPageFrame.tsx` 的 Base UI Menu 内：

- 不继续无上限平铺所有已发布工具。
- 最多显示**少量快捷工具**（例如当前同方向的几款真实工具，具体数量按视口和 UI 判断）；提供始终明确的 **“浏览全部工具 / Browse all tools”** 链接到 `/tools/`。
- 保留品牌返回首页、当前工具身份、Base UI 键盘/关闭/焦点行为和 Canvas 浮层层级；工具切换不得侵入业务状态管理。
- 工具未发布时不展示为可点击项目；0 工具时保留合理空状态和全量目录/首页入口。
- 不实现复杂可搜索大型下拉框、工具收藏、最近使用、自动推荐、无依据的热门排序。

### 3.4 工具 URL 不随分类变更

稳定工具路径为 `/tools/image-converter/`、`/tools/image-resizer/`、`/tools/image-cropper/`，**不要**采用 `/tools/images/image-processing/<slug>/` 作为工具规范 URL。分类与受众推荐指向同一工具路由。分类专题页、角色专题页及其独立 SEO 内容根据未来真实内容需求再决定，不在 A 阶段批量生成。

### 3.5 构建守卫必须同步迁移

当前 `scripts/verify-build.mjs` 将首页所有 `a[href^="/tools/"]` 当作工具卡片，要求 `cards.length === toolLinks.size`，并要求**每个生成工具页面**都必须从首页卡片可达。这与“首页最多 9 个精选工具 + `/tools/` 目录”冲突。

**必须精确迁移：**

1. **不要**把新的 `/tools/` 导航链接误认作某个工具卡片。按稳定 `data-tool-card` 或实际 `ul > li > a` 作用域区分首页精选和完整目录。
2. 首页断言从“全量覆盖”改为“精选数量 ≤9，均为当前地区真实已发布工具、有目标静态路由、无重复”。
3. `/tools/` 断言为“覆盖当前地区**全部**已生成的已发布工具页面，工具 ID/URL 唯一，页面 H1/标题/描述结构正确，未发布或跨地区项目不可见”。
4. 0 工具时，首页和工具库都有可信空状态；主页 Hero 的空/有工具 CTA 行为保持正确。
5. **正式导航冻结**：站点 Header/Footer、404 的“工具箱”入口，以及工作台 Menu 的“浏览全部工具”入口，都指向新的 `/tools/` 全量目录；首页 Hero 的滚动入口与历史 `/#tools` 链接仍指向首页 `#tools` 区。同步精准更新原有守卫，**不可直接删掉链接/导航核验**。
6. 原有区域 canonical、首页静态零 JS、OG、favicon、本地 SVG/字体/CSS/OFL、Lab 排除等断言必须完整保留。

---

## 4. A2.1 — Tool Page SEO & Static Content Contract

### 4.1 SEO 的产品目标

每个正式工具必须有一个稳定 URL、一处清晰的可见主标题、一段真实功能介绍、直接可用的工作区，以及位于工作区下方的具体使用说明。SEO 用于准确解释用户能完成什么，**不能让内容压过操作入口**。

建议内容层次：

```text
产品级工具导航（ToolPageFrame：返回/工具箱/当前工具身份）
↓
静态 ToolIntro：唯一主 H1 + 简短功能介绍 + 真实能力信息
↓
React Tool Runtime：文件导入 → Quick/Advanced → 预览 → 下载
↓
静态 ToolGuide：操作步骤、支持范围、限制、真实 FAQ、相关工具
```

主标题与介绍不得是一块占满手机一屏的营销 Hero。ToolPageFrame 的当前工具名属于**导航身份**，不应继续为 React `<h1>`；Astro 静态内容拥有唯一主要 H1。不要出现两个 H1，也不要因为用户切换 Quick/Advanced 产生另一个可索引页面。

**渲染集成要求**：现有 `ToolRuntime` 已提供 React 导航/Provider 与懒加载工具，`/tools/[slug].astro` 当前只包裹 ToolRuntime。实现时应首先验证 Astro 7 的静态内容与 React Island 合成方案（Astro slot/children 或最小页面组合），确保视觉/DOM 顺序符合“导航→静态 H1→工具→静态说明”，并通过真实生产构建及 hydration 检查。不要为满足静态 SEO 而复制第二份 Header、增加多余 React root、生成双 H1、或把全部 SEO 正文下载进客户端。**如发现合成方式有问题，应在 A2.1 停下记录选项并做最小技术验证，不允许 Codex 任意大改 B 阶段工作台。**

### 4.2 独立的 Tool SEO 内容数据（Astro-only）

`Registry.copy` 继续只存短名称和卡片简介；不要塞入 SEO 长文、FAQ 或关键词数组。建议单独定义：

```ts
type ToolPageContent = {
  title: string;        // 浏览器 Title，明确处理与 Tool4Furry 品牌后缀
  description: string;  // Meta Description
  h1: string;           // 可见主标题
  intro: string;        // 一两句功能说明
  features?: readonly string[];
  steps?: readonly string[];
  limitations?: readonly string[];
  faq?: readonly { question: string; answer: string }[];
};
```

- 内容以 `toolId + region` 为键，服务端构建时引用；只为当前地区**已发布且存在的真实工具**生成公开页面。
- 具体组织可采用 `src/site/tool-content/<tool-id>.ts` 或相近的简单类型化映射；不要在 V0.4-A 引入完整 CMS、Content Collections 或 Markdown 全站管线。
- 规则须检查已发布工具的 Title/Description/H1/intro 是否存在，链接是否有效；Draft 内容即使有预稿，也不生成公开路由。
- 内容应跟**真实实现**一致：未支持 HEIC 就不能写 HEIC 转 JPG；没有批处理就不能声称批量转换；不写虚假隐私/保真承诺。
- H2/H3、步骤和 FAQ 根据实际需要组织；不强制每页固定五个问题，不为了关键词而写低价值段落。
- 长尾词属于市场需求研究与内容写作的输入，**不是** `meta keywords`、自动关键词注水或数百个相似 URL。

### 4.3 三个工具的内容草案（后续正式发布前复核）

| Slug | 中文 H1 候选 | 用户的真实核心意图 |
|---|---|---|
| `image-converter` | 在线图片格式转换器 | PNG/JPEG/WebP 格式互转、透明背景、质量设置 |
| `image-resizer` | 在线图片尺寸调整工具 | 指定像素、限制最长边、锁定宽高比 |
| `image-cropper` | 在线图片裁剪工具 | 自由裁剪、1:1/4:5/16:9 比例、裁剪框调整 |

英文独立编写语义等价的 Title/H1/介绍，不做机械堆关键词。上述是**SEO 意图候选**，不是已完成关键词搜索量、排名竞争度的实证报告。每个工具内容必须和版本真实能力对应；在本阶段没有正式工具时只冻结结构/测试样本，不用假内容发布页面。

### 4.4 Head、地区、canonical、相关推荐

- 复用 `SiteLayout.astro` 的 `fullTitle`/`description`、canonical 与 OG 文本；避免整句 SEO Title 被再次拼接 `Tool4Furry`。
- 具体工具 `/tools/<slug>/` 在 `.cn` 自引用 `.cn` canonical、在 `.com` 自引用 `.com` canonical。不要把两地区互相 canonical。
- 仅当真实同一工具在两地区均发布、页面对应内容存在时，才可未来建立 `hreflang`；缺一方不输出无效备用链接。
- 同一工具 Quick/Advanced、输出格式、身份入口不另建同内容的独立可索引 URL。相关工具区只链接**当前地区真实已发布且有关联**的工具；可按同一 `group` 得到，再允许少量手工指定。
- 工具指南和相关工具使用静态 HTML，**不依赖交互 React 成功初始化才出现**；页面仍由一个 ToolRuntime React root 处理实际操作。
- 不预生成格式组合型的数十个薄内容 SEO 页面；不批量创建角色 × 类别页；不添加无需求 JSON-LD / 自动 FAQ 富媒体标记。

### 4.5 A 阶段的真实性与验收限制

Registry 当前为空，不可能仅凭 `pnpm build` 就实测三款正式工具页面。**A 阶段只能建立内容合同和用测试 Fixture 验证模板/标题/地区过滤**；首个真实工具在 V0.4-B 发布前，必须补完整静态页面生产构建、单 H1、真实操作和 SEO 内容一致性验收。不能将 Fixture 塞入 Registry 假装真实工具完成 SEO 验收。

---

## 5. A2.2 — Quick / Advanced UX & Parameter State Contract

### 5.1 两个模式，一个参数源

- `Quick` 是默认进入的**易用操作视图**，显示推荐预设及最小操作。
- `Advanced` 显示精确参数。两者使用**同一份有效 Settings** 与同一处理函数。
- **切换模式本身不触发处理、不重置参数。** 当参数偏离推荐值，返回 Quick 显示“自定义设置”；只有点击“恢复推荐参数”才覆盖参数。
- 导入、选择预设、精确编辑都要有明确的版本状态；输出结果必须标记对应哪个 Source 和 Settings。

示例（非要求引入全局 Store）：

```ts
type ToolMode = 'quick' | 'advanced';
type ResultStatus = 'idle' | 'processing' | 'ready' | 'stale' | 'error';

type ProcessingSnapshot<S> = {
  sourceRevision: number;
  settingsRevision: number;
  settings: Readonly<S>;
  requestId: number;
};
```

实际业务 Settings 类型归各个工具所有；如 `ConvertSettings` 含目标格式、质量、JPEG 背景色，Resizer/Cropper 则各自定义精确必要字段。不可为了三款工具强行做成一个包含所有参数的 `UniversalImageSettings`。

### 5.2 三款工具的快速触发行为（冻结）

| 工具 | Quick（推荐交互） | Advanced（明确编辑） |
|---|---|---|
| Image Converter | **导入有效静态图片 → 检查当前设备真实编码能力 → 使用可见推荐设置自动生成预览结果**；不自动触发文件下载。已是相同目标格式且无参数变动时，允许提示无需转换、保留原文件，避免无意义重编码 | 格式、编码质量、JPEG 填充背景、文件命名；用户明确点击生成 |
| Image Resizer | 导入只显示原图与尺寸；用户选择「最长边不超过 2048/1024/512」等预设后自动处理；**默认不放大**；若无尺寸变化则明确无需重编码 | 宽高、锁定比例、放大限制、输出策略等；用户明确点击生成 |
| Image Cropper | 导入预览，选择自由/1:1/4:5/16:9，用户调整裁剪框并**确认区域**后处理；不能默默居中截断主体 | 精确裁剪坐标/宽高、固定比例与输出尺寸；确认参数后处理 |

上表的 2048/1024/512 为**产品预设候选**，不是任何设备都支持的最大输出尺寸；实际处理前仍进行像素预算验证。格式质量的具体默认值（WebP 暂建议 85、JPEG 暂建议 88，界面范围 1–100）属于 A2.3 待浏览器实测复核的初始建议，**不可宣传为无损或精确文件大小控制**。

### 5.3 更换图片时哪些设置应该保留？（P0）

- **Converter**：保留用户选中的目标格式、质量和背景设置；新文件必须重新验证该格式与参数是否适用，并令上个源文件的结果失效。Quick 模式可在安全与能力检查后按当前可见设置重新自动生成，不悄悄替换为另一套预设。
- **Resizer**：保留“最长边预设、锁定比例、是否允许放大”等**处理策略**；依新图尺寸重新计算目标宽高。Advanced 中上一张图片专属的绝对像素输入如无法合理迁移，应显示需要确认/重新校验，不可静默采用失效的旧宽高。新图片导入本身不立即触发尺寸重编码。
- **Cropper**：可以保留用户主动选择的裁剪比例，但**绝不沿用上一张图片的裁剪坐标和裁剪框**；新图片重建初始裁剪区并等待用户确认。
- 以上状态只在当前工具会话内管理；本阶段**不引入 LocalStorage 持久化、自动保存或跨工具参数继承**。

### 5.4 结果版本、竞争条件与下载资格（P0）

- **改参数 → 旧结果立即变为 stale**。可以暂留旧预览便于对照，但不能让主下载按钮把旧结果冒充当前设置。
- **换源文件 → 旧结果立即失效**，撤销旧结果下载资格。正在执行的旧请求返回时不得覆盖新源的结果。
- **异步请求完成 → 仅与当前 `sourceRevision + settingsRevision + requestId` 对应者可以提交为 ready**；已过期的结果仅清理资源。
- Quick 自动生成遇到连续预设变更时，应避免无限重复计算；有必要可合并短时间内的请求，但不能牺牲正确性。
- Advanced 编辑期间不自动在每次按键后生成；点击明确的主操作再执行。
- **模式切换不修改版本**；只有实际 Settings/Source 的改变才导致失效。
- 下载文件名、扩展名和下载按钮状态必须与**当前有效 Blob** 对应；未成功处理或 MIME 与请求不符时禁止标注“完成”。
- 每个工具在自己的 React 根内拥有版本与异步状态。V0.4-A 可实现**纯 reducer/状态迁移函数或测试用模型**，不提前打造全局调度中心。

### 5.5 推荐预设管理

- 推荐参数本身在代码里有确定的版本和显示文案，用户知道输出格式/质量/尺寸等关键影响。
- 从 Advanced 返回 Quick 时，如当前参数不等于推荐值，显示“自定义”；用户主动“恢复推荐参数”后才重置。
- 参数变更如果产生无效组合，要立即清楚显示范围/冲突，禁止执行，不悄悄修正成另一个输出。
- 有真实原始文件、可见预设、可撤销的明确编辑行为，才能称为“快速模式”；不能只是把一大堆高级字段默认折叠。

---

## 6. A2.3 — Image Processing Contract & Capability Gate

### 6.1 处理流水线与三工具边界

统一认知模型：`Decode → (optional Crop) → (optional Resize) → Encode → Blob / Preview / Download`。

| 工具 | 激活步骤 | 不在该工具承担 |
|---|---|---|
| Converter | Decode → Encode | 裁剪、尺寸调整、AI 处理 |
| Resizer | Decode → Resize → Encode | 裁剪、复杂滤镜 |
| Cropper | Decode → Crop → Encode | 多图层编辑、自由绘画、完整无限画布 |

这只是一套**共享处理能力与输入输出约定**。A 阶段不要构建超前的插件引擎或所有图片操作的统一大类；在 B/C/D 各自出现真实需求时，以小型纯函数和底层图像模块逐步沉淀。

### 6.2 首批格式矩阵与发布真相

| 格式 | 首批静态图片导入 | 首批导出 | 冻结策略 |
|---|---|---|---|
| PNG | P0 | P0 | 支持透明背景；PNG 不提供有损质量滑块 |
| JPEG/JPG | P0 | P0 | 不支持透明度；转换为 JPEG 时明确背景填充 |
| WebP | P0 | P0 产品目标 | 不预设各浏览器一定能编码，先探测原生编码能力 |
| AVIF | 暂缓 | 暂缓 | 后续单独验证 |
| BMP | 按实际需求再评估 | 暂缓 | 不能仅凭浏览器能显示就说能导出 |
| GIF / 动画 WebP / APNG | **暂缓** | 暂缓 | 绝不静默提取首帧伪装转换成功 |
| HEIC/HEIF、TIFF、SVG | 暂缓 | 暂缓 | 独立安全/兼容性评估 |

首批 P0 的“WebP 导出”是**产品期望**，不是未经浏览器验证即可承诺的兼容性。用户看到的可用格式取决于实测能力；目标浏览器确实缺失时，再评估轻量、按需加载的 WebP 编码方案。**未批准依赖及性能方案之前，不引入大型 WASM 编解码库**；如目标浏览器不能满足发布承诺，必须如实限制支持范围或阻止发布，而非错报格式。

### 6.3 可执行的能力探测规范

A 阶段进行小范围 **Capability Spike**，至少覆盖代表性的 Chromium、Firefox、WebKit 环境；可能时补 iOS Safari/Android Chrome 真机验证。探测流程：

1. 构造一张小尺寸的彩色+透明度测试图（来源可信，非用户敏感文件）。
2. 使用浏览器实际导出接口尝试 `image/png`、`image/jpeg`、`image/webp`，保存 `Blob.type`、大小、可解码性及关键文件标识；**不能仅以 `toBlob` 不抛错认定支持**。
3. 结果如果回退为 PNG，应记录“请求的目标格式不可用”，不得仅修改后缀伪装目标格式。
4. 比较透明像素在 JPEG 背景填充和支持 alpha 的格式中的结果；记录像素信息/可能损失。
5. 记录环境：浏览器与版本、操作系统、桌面/移动、实际通过项、失败项、待测项。WebKit 桌面模拟**不能等价宣称 iOS Safari 真机通过**。
6. 输出兼容性表、证据和阶段结论（原生足够 / 需要按需 fallback / 暂不支持）。若未具备相应浏览器条件，应标明“未验证”，不能猜测为已支持。

官方参考：
- [MDN — HTMLCanvasElement.toBlob](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
- [MDN — createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)
- [MDN — ImageBitmap.close](https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap/close)
- [MDN — URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)
- [MDN — Canvas drawing limitations](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size)

### 6.4 图像质量与数据完整性的强制规则

- 用户操作影响大小、分辨率、背景或重新编码时，在界面明确展示，**不承诺无损、色彩绝对一致或文件必定更小**。
- PNG/WebP 的透明像素转换到 JPEG 时默认填充白色，可在 Advanced 修改；绝不可静默变成黑底。
- JPEG 质量 100% 也不表示无损；JPEG 转 PNG 不会恢复原已损失的细节；输出大小可能上升。
- 处理前验证文件内容可识别/可解码；扩展名和 MIME 只作为初步线索。无效、损坏或超限文件应清晰拒绝。
- 动画 WebP / APNG 即便 MIME 是 `image/webp` / `image/png`，也不可悄悄只导出一帧；真正实现前必须可靠识别并拒绝或说明不支持。
- EXIF Orientation 应有**单一负责人**，避免解码自动旋转和手工旋转重复叠加；图片预览、裁剪坐标、输出朝向一致。
- 不承诺重新编码后保留 EXIF、ICC、C2PA、原始版权元数据等；应明确向用户说明潜在丢失或变化，不把 Image Tools 宣传为证据保全工具。
- 真实格式判定基于输出 Blob 的 MIME/可解码内容；文件名扩展名与真实输出格式保持一致。
- Canvas 最大边长、总像素、原文件尺寸及资源预算需共同考虑，不准仅按文件大小判断。超限不可静默缩小；由实测后冻结的环境/产品约束决定可用范围。
- 替换图片、处理结束、取消/卸载时应及时关闭 ImageBitmap、撤销无用 Object URL；正在被预览使用的 Blob URL 不可过早撤销。

### 6.5 输出数据与预览合同（供 B/C/D 复用）

每次可下载的输出至少包含：`blob`、实际 MIME、宽高、字节数、建议文件名、来源版本、参数版本及完成状态；预览应正确显示透明背景（可使用柔和棋盘格）、保持比例、区分原图与输出图、显示实际文件大小变化。**只有当前最新请求对应的 `ready` 结果才能获得主要下载资格。**

### 6.6 延迟的技术决定

- 不在 A 阶段拍板所有设备通用的 4096px、10MB 或 20MP 等上限；通过真实设备/浏览器实测再制定可说明的阈值。
- 不提前选定 WebP/WASM fallback 包，先确定是否需要、实际支持平台、下载体积与性能损失。
- 不把所有图片操作迁移到 WASM；原生 Canvas/浏览器 API 是首选，后续针对缺失能力逐项补充。
- 复杂批量、Worker 队列、ZIP、专业色彩管理、动画、AI 及 C2PA 保全均延期到有真实工具需求的独立阶段。

---

## 7. A2.4 — Shared UI & Acceptance Contract

### 7.1 统一但按需沉淀的控件

| 能力 | 契约 | 主要实际消费者（未来阶段） |
|---|---|---|
| Quick/Advanced `ModeSwitch` | 清楚区分两种模式，状态不丢失 | B/C/D |
| `FormatChoice` | 3 个格式用可见单选/分段控件优先，大量选项才用 Select | B |
| `NumericField` | 宽高/像素、单位、范围、键盘输入与错误提示 | C/D |
| `RatioControl` | 锁定宽高比、自由与常用比例；语义可访问 | C/D |
| `ImagePreview` | 真实原图与结果、宽高、大小、透明背景 | B/C/D |
| `ProcessingFeedback` | Idle/Processing/Ready/Stale/Error | B/C/D |
| `DownloadAction` | 当前有效结果、真实格式、正确命名 | B/C/D |

本阶段可以冻结语义、状态与最小接口，在**没有实际消费者**时不先建七个功能空壳。首个真实工具开发时再提取第一批真组件；之后其他工具复用并修正。

### 7.2 SelectField 与基础视觉治理

保留现有 Base UI Select 的焦点、方向键、Enter/Escape、Portal 与 ARIA 语义；用真实工具检查 Trigger 的文字/图标、行高、选中与高亮的对比、弹层边界及手机屏幕/软键盘行为。**只有 PNG/JPEG/WebP 三项时优先用可见选项组，不强迫用户每次展开下拉框。** 不因审美问题重写成熟可访问的底层 Select 行为。

继续使用 V0.3-A 语义 Token 和最小 44px 可点区域，保证 `:focus-visible` 清楚、错误信息可读、Disabled 状态真实可辨、Reduced Motion 正确。布局不强行要求三个工具共用一套“万能 Image Workbench”；Cropper 可以有独立交互预览区域，但不因此开发无限画布引擎。

### 7.3 工作流可用性

- 首屏在简洁 H1 和一两句简介后直接可见文件导入；不先放长营销 Hero。
- Quick 自动生成的是**预览/结果**，不是未经操作自动下载文件。
- Advanced 的数值输入不在每次按键时不受控地频繁编码。
- 图片处理结果展示源格式/尺寸/大小与输出的真实对应信息；修改参数后旧结果明确过期，不能误下载。
- 手机保持可达、信息不重叠；不能为了浮层好看而挡住下载或设置。
- 任何面向用户的处理能力均须是真实实现而非演示型成功反馈。

---

## 8. Codex 实施关口（按顺序执行，不跨阶段越权）

本章执行编号为 **P0–P6**；不与产品设计编号 A1/A2 或未来工具开发 V0.4-B/C/D 混淆。

### P0 — Audit & Baseline（只审计）

1. 确认 `dev` 分支、工作区、远端 HEAD 与现有 CI；如果有未知未提交修改，停下来报告，不覆盖用户工作。
2. 阅读前述工程合同和所有会影响的 Type/Registry/Catalog/Home/ToolPageFrame/ToolRoute/VerifyBuild/Test 文件。
3. 输出 1 页以内的审计：现有发布、地区、首页卡片/锚点、H1、工具路由、CI 事实以及计划修改的文件。
4. 不能直接先写一个大型分类/图片引擎；先确认真实修改范围。

**Gate P0**：基线清楚、无未知工作区覆盖风险。

### P1 — Taxonomy & Registry Contract

1. 定义可扩展受控词表、`group → category` 关系、本地化显示名以及类型。
2. 最小更新 `ToolDefinition`；调整合法测试 Fixture 以适配新字段。
3. 增加发布前的元数据校验：唯一 ID/Slug、合法归属、地区、标签和已发布工具 loader。
4. 不新增真实已发布工具，不把测试伪数据进 Registry。
5. 增加 0/3/20/100 Fixture 与负向分类校验测试。

**Gate P1**：类型/验证通过、Registry 仍为空、非合法组合被发现。

### P2 — Full Catalog, Homepage Curation & Switcher

1. 新增 `/tools/` 静态全量目录；从同一个已发布 Registry 获取当前地区工具。
2. 首页只显示最多 9 个有效精选，保留现有 Hero、设计与 `section#tools` 空/有工具表现；不要为完成分类改造重新设计首页。
3. 目录支持有真实内容的功能分组和身份/场景发现；0 工具不出现空目录树、搜索框和死链接。
4. 工作台 Tool Switcher 改为少量快捷项 + 真实 `/tools/` 链接；保留 Base UI 行为与当前工具状态边界。
5. **精准升级 `verify-build.mjs`** 的全覆盖假设：全部正式工具以 `/tools/` 目录为准，而非首页；首页仅检查精选真实且 ≤9。更新相关 Header/Footer/404 导航断言，保留 `#tools` 兼容锚点。
6. 使用测试 Fixture 验证分类视图与地区过滤，不发布假工具。

**Gate P2**：0/3/100 测试数据均正确，首页保持零 JS、静态生成全目录，原有保护断言没有被删减。

### P3 — Static Tool SEO Contract

1. 定义 Astro-only ToolPageContent 类型和按工具/地区访问的最小模块边界；不要把整篇说明打包进 React。
2. 针对 `tools/[slug].astro` + `ToolRuntime` + `ToolPageFrame` 制定并验证**实际可行的 DOM/水合组合方案**，保留一个导航所有者、一个 React 工具根、一个静态 H1。当前 React 导航 H1 在正式工具页需变为普通身份标识。
3. 确认页面组合中有静态介绍、真实使用步骤/限制/FAQ 的可选 Section，且不阻挡工具首屏；发布/地区/SEO 元信息沿用现有 SiteLayout 的 head。
4. 先用**测试 Fixture 或开发隔离的真实渲染样本**检查静态 HTML 和水合，不允许为通过构建而在生产注册假工具。
5. 增加标题、唯一 H1、静态内容、canonical、无重复索引及相关工具链接约束。真实三款工具文案在 B/C/D 确定功能后定稿。

**Gate P3**：模板与 SEO 责任清晰，有可复现验证证据；**如果因为无真实工具而无法验证生产工具页，必须注明尚待 B 阶段发布验证，不能虚报完成。**

### P4 — Quick/Advanced State & Output Validity Prototype

1. 定义 Quick/Advanced 参数唯一来源、推荐预设、自定义标记、`sourceRevision/settingsRevision/requestId` 结果匹配规则。
2. 以纯状态迁移单测或简单的开发测试组件覆盖：切换模式保值、不处理；更改参数使结果 stale；旧请求完成不覆盖新结果；只有最新 ready 可下载。
3. 分别记录 Converter 自动转换、Resizer 选择预设、Cropper 确认裁剪框三个不同自动执行合同。
4. 不在本阶段开发真实图片导出界面，也不创建全局状态管理平台。

**Gate P4**：状态与异步竞争测试通过，可供 B/C/D 各自使用。

### P5 — Image Capability Spike & Engineering Decision

1. 编写/执行**最小测试性编码能力探测**，区分 PNG/JPEG/WebP 的真实导入/导出及 MIME 回退。
2. 尽可能运行 Chromium/Firefox/WebKit 的真实浏览器测试，额外真机可用时再验证 iOS/Android；不将模拟等同真机。
3. 记录输出 Blob 类型、透明度、实际文件有效性、典型异常、大图限制的证据；未测试的项必须标明未验证。
4. 根据实测决定是否有必要在后续 B 阶段引入按需 WebP 编码 fallback；A 阶段**不直接引入大体积 WASM 依赖**。
5. 形成 `docs/image-processing-capabilities.md`（或本文附录）记录能力矩阵与仍需验证的浏览器/设备；内存/像素上限仅记录证据与待决项，不乱填统一阈值。

**Gate P5**：技术承诺可证实且有测试来源；未完成的浏览器支持以待验证为准，不隐瞒。

### P6 — Regression, Browser Acceptance & Handoff

1. 回归 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm test`、`pnpm build:cn`、`pnpm build:global`。按仓库 AGENTS 要求：**先停止 dev，再顺序运行构建，不并行共用 Vite 缓存**。
2. 检查 CN/Global 首页、`/tools/`、404、工具链接、真实目录与空状态。人工浏览器复核 1440×900、1024×768、768×1024、390×844、375×812、320×568、812×375。
3. 保留 V0.3-B 的 `/lab/canvas`、`/lab/form`、`/lab/batch`、`/lab/ui`、`/lab/files` 交互回归，不修改基础工具状态和 Canvas 几何。
4. 如果当前没有任何真正发布的工具，应报告静态工具 SEO 生产页面尚待 V0.4-B 验证；不要声称三款图片工具已经发布。
5. 更新 `README.md`、`AGENTS.md`、本实施文档在仓库中的落地记录（若要求）、必要的测试与能力记录。任何性能/兼容性测试给出浏览器/设备与未验证点。
6. Codex 输出阶段性变更摘要、测试结果、仍待决项，提交并推回 `dev`；不得合并 `main`、创建部署工作流或发布网站。

**Gate P6**：所有 P0 阶段验收通过；仍未满足的真实图片兼容要求保留为 V0.4-B/C/D 的发布门禁。

---

## 9. 验收矩阵与阻断级别

### 9.1 P0 — 必须通过

| 维度 | 验收条件 |
|---|---|
| Registry | 仍无假工具；发布/地区筛选不回归；ID/Slug/Group/Domain/Audience/Context 合法 |
| Taxonomy | 图片三工具在测试 Fixture 中正确归入 `images → image-processing`，跨受众可发现但实体不重复 |
| 首页 | 只有真实精选工具，≤9；0 工具时维持真实空状态和 `#tools` |
| 完整工具库 | `/tools/` 静态存在，当前地区所有发布工具都可达；Draft/其他地区不可见 |
| Tool Switcher | 不无限平铺所有工具；导航/焦点/Base UI Menu 不回归；可访问 `/tools/` |
| Tool URL | 不随分类/身份变化；有效链接目标确实生成静态文件 |
| Tool SEO | 有可检验静态 H1/标题/简介内容合同，不产生导航第二 H1；生产真实工具页在 B 阶段补验收 |
| 快速/高级 | 同源参数，切换保值，不自动触发不必要请求；旧任务不覆盖最新结果 |
| 格式真相 | 探测实际 MIME 与可解码性，不能将 PNG fallback 冒充 WebP |
| 发布真实性 | 不宣称未支持动画/HEIC/批量/无损；无虚构工具、评价和 SEO 页面 |
| 生产隔离 | 首页零 script/Island/JS preload；Lab 仍不进产物；本地字体、许可证、CSS 与 OG/canonical 守卫不削弱 |
| 地区 | CN 和 Global 独立语言、路由、可发布工具和 URL |
| CI | check/test/build:cn/build:global 全通过；不新增部署 |

### 9.2 P1 — 体验与健壮性

- 首页 Hero 与 V0.3-C 美术保持不变，只调整工具发现区；移动端不产生多层空分类区或横向溢出。
- `/tools/` 有清楚的领域/方向层次和足够明显的身份发现入口，工具卡片可键盘聚焦且易读。
- 工作台菜单在桌面/手机键盘/触摸场景保持合理宽度、可滚动、可关闭。
- 未来工具页的 H1/Intro 不把导入入口推到多屏之后；静态内容与 React 工作区顺序合理。
- 结果过期/错误/处理状态能够使用现有设计 Token 表达，而非只靠颜色。
- 图片能力记录有充分的测试环境和失败案例，不把推断写成事实。

### 9.3 P2 — 明确延期

真实图像转换/裁剪/缩放、动画输入、AVIF/HEIC/TIFF、WASM 编码器、批量队列、ZIP、图片高阶编辑、AI、SEO 关键词量化调研、统计驱动热门、推荐算法、账号、云处理、分析埋点、完备的用户保存/恢复系统。

### 9.4 关键的负向回归用例

1. **100 个模拟已发布工具**：首页只收录 ≤9，`/tools/` 覆盖全部，Tool Switcher 不展开 100 项大菜单。
2. **不同地区与 Draft**：CN-only 不能出现在 Global，Draft 不能出现在任何发布目录。
3. **同工具匹配 Creator/Developer/Studio**：可从多个发现入口进入，但 URL 与工具 ID 始终唯一。
4. **无效 `images + invoice-processing`**：校验失败，而不是悄悄进入错误目录。
5. **切换 Quick→Advanced→Quick**：修改过的参数保持为“自定义”，模式切换不重新生成。
6. **任务 A 正在处理，新文件 B 已导入**：任务 A 完成也不能使旧结果成为可下载的当前结果。
7. **请求 WebP 实际得到 PNG**：识别不支持，提示/降级，不输出 `.webp` 假文件。
8. **用户打开 Cropper 但未确认区域**：不自动裁掉图片主体。
9. **A 阶段没有真实工具**：构建不生成 `/tools/image-converter/` 等假页面，也不应让首页宣称首批工具已经上线。

---

## 10. 设计风险、决策优先级与可变范围

| 风险/冲突 | 约束与处理 |
|---|---|
| 首页原静态守卫要求全覆盖 | 目录覆盖全量、首页验证精选，保留其余完整检查 |
| React ToolPageFrame 现有 `<h1>` | 改为非 H1 的身份标题，工具 Astro 静态主要 H1；验证 DOM 与水合，不复制导航 |
| Astro slot/hydration 复杂性 | 在 P3 做最小验证；优先保留现有单 ToolRuntime 与 ToolPageFrame，未经验证不做大型架构迁移 |
| 只有 0 个正式工具导致无法实测工具 SEO | 用纯测试 Fixture 验证合同，并将真实工具生产页验收明确延续到 B 阶段 |
| WebP 各浏览器能力不统一 | 实测再做兼容方案，永不伪造 MIME 或无依据承诺 |
| 100+ 工具造成长菜单/首页膨胀 | 首页 ≤9 + 独立完整目录 + 工作台少量快捷项 |
| Taxonomy 过度工程化 | 7 个 L1 词表，首个 L2 只有 image-processing；不用创建几十个空分组 |
| 图片处理核心过度抽象 | 只冻结数据/处理合同和能力验证；真实算法随 B/C/D 逐步交付 |
| 没有真机导致极限值无法拍板 | 记录待测与发布门禁，不编造统一资源限制 |

**优先级**：先产品与目录的正确性、静态 SEO 与异步任务一致性，再浏览器能力证据，最后才是局部 UI 美术。阶段内若出现已冻结产品合同与真实浏览器能力冲突，必须报告事实和方案，不能偷偷改变承诺。

---

## 11. 最终交付清单及阶段边界

Codex 应交付：

- [ ] 本文在 `docs/tool-platform-image-foundation.md`，并按需要补充执行审计与技术验证结果。
- [ ] Taxonomy/Registry 合法性、两种发现维度的最小模型和测试。
- [ ] 完整静态 `/tools/` 与首页 ≤9 真实精选、工具切换器短列表。
- [ ] 原静态构建守卫的精确迁移，不丢首页零 JS、地区、字体/授权与 Lab 防泄漏断言。
- [ ] Tool SEO 内容合同、主 H1/导航身份职责边界及测试证据；真实工具页保留后续发布门禁。
- [ ] Quick/Advanced 同源参数及结果版本迁移模型/测试；不提前实施三款工具。
- [ ] PNG/JPEG/WebP 的浏览器能力验证报告或注明无法完成的验证项和后续阻断要求。
- [ ] 无新假工具、无新增服务/数据库/SSR/WASM 大依赖、无 main 合并或部署。
- [ ] 校验、测试、双地区静态构建结果与简短交接报告。

### V0.4-A 完成后的下一步

- **V0.4-B — Image Converter**：真实单图 PNG/JPEG/WebP 转换；默认 Quick 导入后生成、Advanced 参数、透明背景、结果/下载；由第一个真实工具补全 SEO、组件和跨浏览器验收。
- **V0.4-C — Image Resizer**：最长边快捷预设、精确尺寸、锁定宽高比、无意义重编码避免、质量与下载。
- **V0.4-D — Image Cropper**：自由及常用比例、鼠标/触控裁剪框、精准坐标和结果。
- **V0.4-E — Integration & Release Gate**：三工具共用能力与控件回归、不同地区 SEO、真实浏览器/真机兼容、发布审计。

---

**设计冻结结论：** A1 的“三级功能归属 + 独立身份/场景发现 + 首页少量精选 + `/tools/` 全量目录”正式冻结；A2 的“工具静态 SEO + 同源 Quick/Advanced + 图片能力真实性 + 共享控件按需提炼”正式冻结。V0.4-A 的任务是把这些冻结合同落实为可验收、可增量成长的基础，而不是在没有真实用户工具时重做一轮大规模抽象平台。

## 12. V0.4-A 执行记录（2026-10-09）

上文保留导入的完整冻结合同；本节记录本次实际实现与验收，不改写 V0.3-A/B/C 的历史事实。A 阶段完成，真实工具发布与跨浏览器/真机门禁仍留在 B/C/D。

### P0：基线审计

- 当前工作区为 `tool4furry-workspace/tool4furry`，分支 `dev`；开始时无已修改/暂存/未跟踪文件。fetch 后本地与远端均为 `7310eaeadc615d01cee10888bed923d4dbd507ff`，没有回滚或覆盖用户改动。
- 仓库最初没有本文；先完整读取用户附件，再将完整合同导入本路径，依次实施 P1–P6。
- 基线 [CI 37904284299](https://github.com/librecosta/tool4furry/actions/runs/37904284299) 为 success。CI 仍只对 dev/main 的 push/PR 执行 frozen install、check、test、双地区构建；本轮未修改工作流或增加 CD。
- Registry/loaders 均为空；原首页覆盖所有工具，`#tools` 已存在，Header/Footer/404 指向 `/#tools`；工具页仅有固定 ToolRuntime，导航的 React H1 尚无静态内容合同。地区、字体、StyleX、Lab 隔离与 Workbench 状态所有权与合同一致。
- 修改范围为 taxonomy/types/校验、catalog/静态目录、静态工具内容与 Runtime 的 intro 插槽、纯状态合同、隔离能力探测、测试/守卫及文档。未修改 Astro 特殊集成、依赖、WorkbenchShell、Lab Demo、UI primitives、FileDropzone、ScrollDock、Tool Registry 或 loader 表。
- LICENSE SHA256 保持 `6D71EFDA0046FEF9B229E7080766E88155D8FFF2FB192C5555D1FED70A0C0871`。

### P1–P3：发现与静态工具内容

| 关口 | 实现 | 实际验证 |
| --- | --- | --- |
| P1 | `taxonomy.ts` 定义 7 Domain、唯一首个 Group、独立 Audience/Context；`ToolDefinition` 最小扩充；`assertValidRegistry` 在静态路径生成前检查发布元数据 | 当阶段目标测试 3 文件/33 项通过；最终 taxonomy 单测包含 0/3/20/100 fixture、三个图片工具的正确归属、重复 ID/Slug、非法组合、地区/标签及缺失 loader/copy；生产 Registry 仍空 |
| P2 | `getHomepageEntries` 最多 9 项，`getCatalogSections/getDiscoverySections` 生成静态 `/tools/`；`getSwitcherTools` 最多 6 项并始终提供完整目录链接 | 当阶段目标测试 3 文件/35 项通过，CN 构建通过；最终检查非空目录 21 项、首页 9 项、Menu 6 项；Draft/异地区不可达；空态无空分类树/搜索 |
| P3 | `tool-content.ts` 为 Astro-only 内容来源；`ToolIntro/ToolGuide.astro` 与正式路由组合；Runtime 接收静态 intro；正式导航身份用 p、Lab 继续 H1 | 当阶段目标测试 2 文件/11 项通过；隔离 CN/Global 各 24 页构建与静态守卫通过；两个地区真实 Chromium 均验证计数 0→1、水合一个 Island/H1/导航、菜单 Escape 后计数保留 |

分类只影响发现，不改变 `/tools/<slug>/`。首页精选采用有效 featured ID 优先，再按 Registry 顺序补足；当前没有精选 ID 或发布工具。身份/场景标签形成带用途说明的普通链接，不复制工具实体，也不生成分类 SEO 页面。

Header/Footer/404 的工具入口按本轮合同迁移到 `/tools/`；首页 `section#tools` 和旧锚点继续有效。原 Hero、美术、字体、Token 未变。原“未知 category 隐藏标签”测试升级为“发布前拒绝未知 category”，而非删掉检查；Menu 初始焦点断言改为新增的“浏览全部工具”，保留 Escape、返回首页、地区过滤和状态断言。

正式页顺序为产品导航 → 紧凑 Astro H1/简介 → 工具操作 → Island 外静态步骤/限制/FAQ/相关工具。`ToolPageContent` 必填 title/description/h1/intro，其余按实际功能可选；目标地区缺文案或标题重复品牌将阻断发布构建。内容表当前为空，真实文案必须在 B/C/D 确认能力后填写。该组合使用 [Astro 官方框架组件 children/slot 机制](https://docs.astro.build/en/guides/framework-components/#passing-children-to-framework-components)，未修改 Astro/React/StyleX 配置。

隔离复现：停止 dev，顺序执行 `node scripts/verify-tool-fixture.mjs cn`、`node scripts/verify-tool-fixture.mjs global`。构建期间只在内存中注入 tests/fixtures，输出到仓库外 `../.validation/platform-v04a/<region>/`，生成 20 个共用工具 + 1 个该地区工具；源 Registry 字节不变。两地区均无另一地区和 Draft 页面，长内容标记不进入任何 JS，禁止将这些产物部署。首次测试曾发现测试元数据与长内容放在同一模块会泄漏标记，已分开 `publication.ts` 与 `content.ts` 并由断言防回归。程序构建使用实际版本要求的字符串 outDir；所有检查 await 完成后退出，避免编译器 worker 让测试进程滞留。

构建守卫以完整目录覆盖全部真实工具页，首页仅验证真实且 ≤9；原首页零 script/Island/JS preload、地区、SEO/OG/favicon、字体/OFL、StyleX 提取全部保留。`data-workbench` 是未来真实工具可复用的 Shell 标记，改为“没有发布工具时禁止打包”；五个 Lab 的专属代码标记仍始终禁止。另加 fixture/能力探测资源与长 SEO 文案进入生产 JS 的拒绝检查。

**当前生产无真实工具页。** Fixture 证明模板与水合组合可行，不证明真实文件导入首屏、工具预览或真实 SEO 文案已验收；这些必须在 V0.4-B 首次发布时补验。

### P4：每个工具自己的参数与结果合同

`src/tools/processing-state.ts` 是无副作用的纯迁移函数，没有 File/Blob、编码器、调度、持久化或全局 Store：

| API | 职责 |
| --- | --- |
| `createProcessingState(preset)`、`setToolMode` | 推荐预设带 id/version；Quick/Advanced 只变视图，共用 settings；切换不重置、不启动请求 |
| `isCustomSettings`、`updateSettings`、`restoreRecommended` | 调用者提供参数语义比较与合法性；真实改值递增 settingsRevision，使旧结果失效；恢复推荐必须显式调用 |
| `replaceSource`、`clearSource` | 更新 sourceRevision，旧任务不能覆盖新文件；可见参数保留，清除源时丢弃结果 |
| `beginRequest`、`completeRequest`、`failRequest`、`cancelRequest` | requestId 递增；仅当前 processing 且三个版本全部相同的完成/错误可生效；取消使旧完成失效 |
| `downloadableResult` | 仅当前源、合法参数、最新 ready 结果可以下载；stale/processing/error/idle 均拒绝 |
| `shouldAutoProcess` | Converter 的 source-ready、Resizer 的 preset-selected、Cropper 的 crop-confirmed 各自独立；Advanced 或 mode-changed 不自动执行 |

10 项状态测试通过，包括参数改回原值、同参数的两个竞争请求、换图后的旧任务、取消/错误/重试、无效输入、快照复制和处理过程中切换视图。`R` 仍由真实工具定义；只有实际输出验证成功后才可提交完成。调用者负责释放被拒绝/过期资源，状态函数不偷偷管理 Object URL。Resizer 更换源文件后重算依赖尺寸、Cropper 重置源图坐标等是各工具的派生状态职责，不能直接套用一个通用图片状态树。

### P5：原生图片能力

见 [能力记录](image-processing-capabilities.md) 与 [原始 JSON](evidence/image-capabilities-chromium.json)。Windows 内置 Chromium 155 实测 PNG/JPEG/WebP 固定样本导入及生成文件回解码通过；导出分别为 158/780/634 B，MIME/文件头/32×32 尺寸匹配。PNG/WebP 透明度保留，JPEG 白底合成；不支持 MIME 实际回退 PNG，未伪称目标格式成功。0×0、损坏 PNG 和有界 2048² PNG 测试有实际记录，8 个 ImageBitmap 全部关闭。编码判断与状态合同联合目标测试 2 文件/12 项通过。

没有添加图片库/WASM，没有提前实现 Converter/Resizer/Cropper。Firefox、WebKit、iOS/Android、方向/色彩/元数据、动画识别、大图/连续处理资源上限均未验证；后续发布不能用这份 Chromium 小样本结果代替这些门禁。

### P6：最终回归与浏览器验收

停止 dev 后按顺序执行，修复可选指南数组的 TypeScript 收窄后最终结果如下；没有降低断言：

| 命令 | 实际结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过，锁文件与依赖版本未变 |
| `pnpm check` | 81 文件，0 errors / 0 warnings / 0 hints |
| `pnpm test` | 13 文件、117 项全部通过 |
| `pnpm build:cn` | 通过，3 个静态页面：首页、目录、404 |
| `pnpm build:global` | 通过，独立输出同样 3 页，英文与 .com canonical |

两地区无真实工具页、无 Lab 路由/代码，无 fixture/spike 产物；首页及目录零 script/Island/JS preload。StyleX CSS、100 个本地 WOFF2 资源及 3 个内嵌字体子集、OFL 许可、品牌 favicon 和文本 OG/canonical 守卫通过。构建后重新启动 dev 做以下浏览器回归，没有与 Vite 构建混跑。

- **普通静态 HTTP + Chromium**：CN/Global 的首页、`/tools/`、404 在 1440×900、1024×768、768×1024、390×844、375×812、320×568、812×375 共 42 个组合中，DOM 几何未见横向溢出；首页/目录各一个 H1、0 scripts/Islands，字体加载完成；404 noindex 保留。检查了桌面和手机目录空态、静态非空目录、旧 `/#tools` 定位、Tab 可见焦点、skip link，以及 Lab 菜单进入完整目录。
- **Canvas**：1440×900、1024×600、901×600、900×600、390×844、812×375 开/关 Inspector 的 `data-canvas-viewport` 宽高完全相同。标记点击计数生效，跨宽度名称“P6 状态保留”和“暖橙”保留，只有一份名称输入；390px 嵌套 Select 键盘选择、两次 Escape 分别关闭 Select/Sheet，焦点返回参数按钮。
- **Form/Batch/UI**：空输入显示错误；有效输入输出 `✦ FURRY P6`；Batch 选择 WEBP 后新增任务、两次推进至完成、移除/清空均生效；UI 确认次数增加及成功 Toast 可见。
- **Files/ScrollDock**：系统文件选择中混合 PNG 与 HTML，合法项进入列表、非法类型单独说明；重复 PNG 使记录/批次数由 1→2，确认清空只释放页面引用；桌面滚动 1309→982px（约总距离 25%），窄屏滚动球隐藏。没有改动文件/滚动组件实现；OS 拖放与真实触摸未在本次浏览器补验，原自动化测试继续通过。

本地证据位于工作区外层 `artifacts/platform-v04a/`：`static-browser-matrix.json`、`404-browser-matrix.json`、`canvas-browser-matrix.json`，以及 `cn-tools-desktop-reviewed.jpg`、`cn-tools-320x568-reviewed.jpg`、`global-tools-390x844-reviewed.jpg`、`fixture-global-tools-768x1024-reviewed.jpg` 等截图。截图接口的 fullPage 捕获本次不可用，改用视口截图；超出宿主窗口的部分可能裁切，几何结论依据 DOM 测量，不把截图当作真实移动设备证明。

人工复核重点：中英文完整目录入口与空态、非空 fixture 的功能/身份发现层次、正式工具首次接入后的导入区域可见性、移动键盘/安全区、屏幕阅读器。未做真实 iOS/Android 和屏幕阅读器验收，也未取得 Firefox/WebKit 环境。A 的已测基础可进入 B；三款真实工具、最终 SEO 内容和设备兼容性必须在 B/C/D/E 按各自发布门禁补齐。没有发布假工具，没有合并 main，没有部署。
