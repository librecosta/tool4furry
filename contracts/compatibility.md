# 兼容性契约

范围：正式页面与工具对外可观察的路径、元数据和行为。具体类型及测试优先级见 [Sources of Truth](../AGENTS.md#sources-of-truth)。发布资格由 [publication](publication.md) 负责，图片安全由 [image-processing](image-processing.md) 负责。

- 正式工具使用稳定 `/tools/{slug}/`，分类、身份或模式变化不改变 slug，不另造 Preview 或格式组合的重复路由。改变已公开路径需明确迁移及对应测试。
- Region 与 Locale 独立：CN 默认中文 / 英文 `/en/`，Global 默认英文 / 中文 `/zh/`。语言切换留在当前来源；Footer 地区入口才跨来源，目标不可用工具回退目标地区相应语言的目录。未知路径不制造不存在的链接。
- 可索引页面唯一 Title、Description、H1 和 self-canonical；同地区实际存在的语言页面使用对称绝对 hreflang。OG/Twitter 复用真实 SEO 数据，域名来自当前地区配置。Noindex 页面不能被当作公开发现入口。
- Registry 元数据、`status`、`regions` 和实际可访问能力不可在普通重构中静默改变；首页、导航、目录、相关推荐与路由必须采用同一可用性投影，不伪造工具或数量。
- 已有键盘操作、焦点返回、触控命中区、Reduced Motion、无 JS 静态正文及响应式状态保持属于可观察行为；普通重构不能以视觉复用为由破坏它们。
- Selected、指针聚焦与键盘 `:focus-visible` 分开：选中态不能借焦点框表达；不使用 `:focus-within` 绘制选择/焦点轮廓。复合控件可用 `:has(input:focus-visible)` 将唯一键盘指示投影到可见容器。工作区指针主动 `.focus()` 需标记输入方式，键盘进入/操作恢复清晰指示；局部替代全局焦点时保留等价反馈，不全局移除 outline。焦点反馈不参与延迟过渡。
- 文件处理失败、格式不符、过期结果不能伪装为成功或提供误导下载；文件名/扩展名必须对应实际有效输出。
- 有意的兼容性变化需要明确影响、必要迁移说明和相关测试；重要公开变化记录 CHANGELOG。Registry 不以当前正式工具数量作为容量上限。

验证入口：[contracts.test.ts](../tests/contracts.test.ts)、[language.test.ts](../tests/language.test.ts)、[taxonomy.test.ts](../tests/taxonomy.test.ts)、[tool-content.test.ts](../tests/tool-content.test.ts)、目录/工作区组件测试及 [verify-build.mjs](../scripts/verify-build.mjs)。不以复制 UI Props 或 SEO 全文代替可执行契约。
