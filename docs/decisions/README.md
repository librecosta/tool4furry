# Architecture Decision Records

ADR 解释重大、长期或难以逆转的选择为什么存在；当前结构见 [.agents/architecture.md](../../.agents/architecture.md)，稳定规则见 [contracts](../../contracts/)。普通 UI、文件名、局部重构和常规依赖更新不需要 ADR。

| 编号 | 决策 | 状态 |
| --- | --- | --- |
| 0001 | [Static Regions & Publication](0001-static-regions-publication.md) | Accepted |
| 0002 | [Browser-local Image Processing](0002-browser-local-image-processing.md) | Accepted |

采用递增编号与短文件名，包含 Title、Status、Context、Decision、Alternatives Considered、Consequences。状态可为 Proposed / Accepted / Superseded / Deprecated。变更重大选择时用新 ADR 关联替代，不改写旧背景或重新编号。

本轮两条均为 **2026-10-30 对既有选择的整理**，不是声称所有决定在该日首次形成；当时实现与验收仍在 [History](../history/README.md)、[Research/Evidence](../README.md#research--研究) 和 Git 历史中。ADR 不替代具体 API、配置、预算或测试。
