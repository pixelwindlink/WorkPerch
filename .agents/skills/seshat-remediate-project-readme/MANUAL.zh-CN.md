# 整改工程 README

## 用途与适用场景

本 Skill 用于审查并在明确授权后增量整改工程 `README.md` 的消费者旅程，包括 Quick Start、安装后如何与 Agent 对话、终端与 chat 边界、真实平台调用形式、更新、卸载、brownfield、排错、限制和 Authority 导航。

## 使用方式

- 只要求审查、分析或建议时保持只读。
- 明确要求整改时，先执行 `seshat readme remediate --dry-run`，确认只修改 README 且所有技术事实来自当前 CLI、Agent Registry、AGENTS 和 OpenSpec。
- 应用后重新运行 `readme review`、`audit` 与 `verify`；第二次 dry-run 不应再有机械写入。

## 边界

- 保留原有业务内容和语气，不整体覆盖 README。
- 不编造产品价值、发布状态、Runtime 或自动触发成功。
- 未确认的产品定位、目标用户、Owner、许可证、删除和公开暴露进入 Owner 队列。
- 不替代 Skill conformance、provenance、安装或路径标准化能力。
