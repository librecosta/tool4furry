# 当前架构

Tool4Furry 是单项目的浏览器工具站：Astro SSG + 必要的 React Islands + TypeScript + StyleX。Image Converter 与 Image Resize & Crop 是当前两款 Published 工具，两个地区构建就绪但均未部署。来源优先级见 [AGENTS](../AGENTS.md#sources-of-truth)。

## 静态站点层

| 所有者 | 职责 |
| --- | --- |
| `src/pages/` | 地区内双语页面模板、工具路由、静态发现文件及 DEV-only Lab |
| `src/layouts/SiteLayout.astro` | HTML、SEO、主题根、公共静态外壳与页面增强边界 |
| `src/components/site/`、`src/components/home/` | 站点与首页的 Astro 静态 UI 组合 |
| `src/site/` | 分类、目录/精选/相关工具投影、静态长文和发现文件生成 |
| `src/config/`、`src/i18n/` | 地区域名与配置、独立的语言与路径规则 |

正文、H1、说明和 FAQ 在 Astro 层静态生成；`Registry.copy` 只放工具短元数据。`tool-content.ts` 与具体工具长文不能进入交互组件依赖图。首页无 React Island；受控主题/导航/滚动与首页独有 Reveal/Wavefield 增强由 [现行站点说明](../docs/site-homepage.md) 和构建守卫约束，不意味着任意页面都可以加脚本。

## 工具与交互层

```text
Astro 工具路由 + 静态 Intro / Guide
  → 固定导入 ToolRuntime（client:load）
    → UiProvider + ToolPageFrame（唯一产品导航）
      → toolLoaders[toolId] 懒加载工具模块
        → 工具自有状态 / 算法 / 生命周期
        → WorkbenchShell 布局 + 受控 UI
```

- [registry.ts](../src/tools/registry.ts) 只组合元数据；[loaders.ts](../src/tools/loaders.ts) 独立维护字面量动态 import。不从元数据静态导入实现。
- [build-availability.ts](../src/tools/build-availability.ts) 将 Registry 映射为逐工具 Vite 静态常量；Astro 配置不列举具体工具。Loader 入口直接引用常量，生产依赖发现前排除 Draft/非当前地区的实现及私有资源，保留合法共享依赖。详见 [发布契约](../contracts/publication.md)。
- [ToolRuntime](../src/tools/ToolRuntime.tsx) 负责已知工具的加载边界、Provider 和导航装配；Astro 不能给动态组件标签临时附加 hydration 指令。
- `src/ui/` 是受控 UI 原语，业务数据属于调用方；UiProvider 只放在固定 ToolRuntime / LabRuntime 根，不放进全站 SiteLayout。
- `src/workbench/` 只负责可选插槽、布局、面板可见性和焦点，不导入具体工具编码器，不持有文件、参数、任务或全局业务 Store。
- 工具选择 canvas/form/batch/custom；Canvas 是独立全视口与覆盖层，Form/Batch 是自然流。共享可选布局不会改变未 opt-in 的工具。详见 [工作区说明](../docs/workbench-appearance.md)。

## Image Converter 分层

| 所有者 | 职责 |
| --- | --- |
| `src/tools/image/` | 有界容器检查、方向、元数据、编解码与输出验证、资源所有权、AVIF 适配器/Worker |
| `src/tools/image-converter/session.ts` | 批次与独立任务、有效设置/请求版本、失败重试与下载资格 |
| `serial-jobs.ts` | 单通道 FIFO；原生操作真实结束前不能释放串行通道 |
| `intake.ts`、`presets.ts` | 导入额度与参数推荐/相等性，数值以源码和测试为准 |
| `delivery.ts`、`zip.ts` | 当前结果一致快照、稳定命名和按需打包 |
| 工具 React 组件 | 数据装配、缩略图/预览、设置及交互，不把业务下沉到公共列表 |

PNG/JPEG/WebP 原生优先；AVIF 输入使用原生解码，输出按实际任务加载独立单线程 Worker/WASM。它们受同一串行任务契约约束，不建立第二个任务池。`ImageResources` 和工具级 URL owner 负责释放；公共 FileTaskList/预览外壳不管理 Blob。详见 [当前模块说明](../docs/image-converter-implementation.md) 和 [图片处理契约](../contracts/image-processing.md)。

Image Resize & Crop 的 Published 单张/批量实现见 [模块说明](../docs/image-resize-crop-implementation.md)：`geometry.ts` 管理 Source 整数像素中的 Crop 与 Output 联动，`render.ts` 复用图片内核一次绘制并验证输出，`session.ts` 保存逐文件单图草稿，`collection.ts` 拥有文件集合、批量规则/任务和 ZIP 快照。所有草稿与批量共用一条 `SerialJobs` 和一个 `ImageResources`，只为选中图片生成有界预览，不继承 ConverterSession 批量模型。ReactCrop/局部 CSS/NOTICE 从工具懒加载入口进入，不进入纯元数据或公共 Workbench。

## 地区、语言与生产投影

- CN 与 Global 独立 SSG，`dist/cn` / `dist/global` 及缓存隔离；域名来自 `region.ts`。
- Locale 独立于 Region：CN 默认中文，英文 `/en/`；Global 默认英文，中文 `/zh/`。同地区语言切换不跨来源，Footer 地区入口才跨来源。
- Registry 的 `status` + `regions` 是唯一发布门；路由、目录、首页和发现文件从它投影。Vite 常量只消除不可用 Loader，不是第二套发布配置。
- DEV 可以访问本地区 Draft；生产只保留本地区 Published。Lab 和目录夹具不注册为工具，构建守卫检查资源也不泄漏。
- Published 是源码资格，构建不执行部署；[发布契约](../contracts/publication.md) 与 [ADR-0001](../docs/decisions/0001-static-regions-publication.md) 说明原因。

新增工具依次添加纯元数据定义与 Registry 条目、显式 Loader（`DEV || T4F_TOOL_<NORMALIZED_ID>_AVAILABLE` + 字面量 import）、`tool-content.ts` 对应的中英文 Astro 内容。无需再为工具修改 Astro 配置；状态与地区仍只来自 Registry。算法/Worker/WASM 从工具模块按需导入，不挂到 Registry 或公共 Workbench。平台发布机制修改另运行隔离的多工具构建夹具，不为每次业务小改增加重复构建。

## 非目标

当前没有后端、数据库、SSR 服务或用户系统；不预建 monorepo、全站 React Provider、通用画布/跨媒体引擎、第二套发布门或全局任务 Store。新能力按真实需求独立批准，不能因文档模板出现某层就引入该层。
