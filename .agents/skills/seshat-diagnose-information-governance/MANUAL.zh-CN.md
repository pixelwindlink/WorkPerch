# Seshat 工程信息治理诊断 Skill 使用说明

本 Skill 对目标工程执行审计，并把每个已发现文件、目录的诊断结果写入 `artifacts/audit/` 下的 Markdown 表格。它强制分开两个判断：

1. 当前路径是否遵循《AI 时代的工程信息治理规范》；
2. 当前资产属于什么类型，以及其治理等级是**强制治理、建议治理还是不纳入治理**。

因此，路径即使没有遵循规范，只要职责证据足够，仍然可以单独标出资产类型和治理等级。例如：`src/main/resources/contracts/workflow.json` 可以标记为“规范遵循：不遵循；资产类型：机器契约；治理等级：建议治理”。

先预览：

```bash
seshat diagnose \
  --target /绝对路径/工程 \
  --output artifacts/audit/<run-id>/information-governance-diagnosis.md \
  --dry-run --json
```

确认目标路径不存在冲突后执行：

```bash
seshat diagnose \
  --target /绝对路径/工程 \
  --output artifacts/audit/<run-id>/information-governance-diagnosis.md \
  --json
```

报告至少包含：路径、目录或文件类型、规范遵循状态、遵循依据、主要资产类型、`2.1.2` 章节引用、类型状态、治理等级、路径一致性、Finding、Authority 和安全下一步。

规范遵循状态只描述当前路径与内容边界是否符合规范，不替代资产类型判断：

- `遵循`：没有适用的路径或内容 Finding；
- `部分遵循`：只有信息性观察或待核验路径/角色一致性，尚未形成直接违规结论；
- `不遵循`：存在路径漂移、治理冲突或冻结内容漂移；
- `无法判断`：持续性信息资产尚未获得足够类型或 Authority 证据；
- `不适用（不纳入治理）`：源码、脚本、Runtime、日志、Crash、缓存、锁等边界资产。

本 Skill 只写诊断 Markdown，不修复工程。修复交给 `seshat-standardize-information-assets`，新资产归类交给 `seshat-consult-asset-placement`，JSON 证据留存交给 `seshat-persist-governance-evidence`。
