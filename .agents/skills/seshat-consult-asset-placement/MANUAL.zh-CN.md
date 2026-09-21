# Seshat 工程信息落盘咨询 Skill 使用说明

本 Skill 在写文件之前确定“治理等级 × 候选主要资产类型”，并给出类型章节引用、provisional 状态、Authority、消费者、生命周期、既有路径策略和推荐路径。它只咨询，不写入。

```bash
seshat consult --content-type readme --json
seshat consult --content-type machine-contract --consumer cli --json
seshat consult --content-type runtime-schema \
  --existing-path src/main/resources/schemas/event.schema.json --json
```

机器契约、Schema、Template、Registry、Policy、配置和元数据属于建议治理：已有路径保持不变；新建且无约定时才建议 `machine-assets/`。源码和 Runtime 等不纳入治理。无法分类时返回 `UNCLASSIFIED_INFORMATION_ASSET`，不会根据 AI、扩展名或目录便利性猜路径。

外部使用时应尽量提供职责、Authority、消费者、生命周期、可重建性和既有路径，并通过已安装的 Seshat CLI 或可信绝对入口执行。
