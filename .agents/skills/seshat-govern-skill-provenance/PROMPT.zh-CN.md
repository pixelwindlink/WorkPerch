# Seshat Skill 分类治理职责交接 Prompt

只要请求涉及 Skill 的新增、复制、AI 生成、安装、升级、启用、废弃、删除、共享或发布，先调用 `$seshat-govern-skill-provenance`。

在目标工程运行只读 `seshat skills list` 和 `seshat skills review`，并只用一个 `skillClass` 分类：`public`=对外提供能力，`inner`=本工程自用能力，`private`=public 依赖的私有实现，`outside`=外部提供能力。

非 Seshat bundled Skill 必须使用 `schemaVersion=2.0` sidecar，且 `skillId` 与 `skillClass` 为根对象平级字段。保留来源、Owner、命名空间、行为 Authority、behavior digest、能力、生命周期、exposure、`consumedBy`、审批和许可证等适用证据。不得在 2.0 记录中加入 `authorityOrigin`、`ownership`、`operatingScope` 或 `primaryConsumer`。

外部 Skill 一律是 `outside`。若当前工程需要基于它对外提供能力，创建当前工程自己的 `public` wrapper，不得把外部 Skill 直接改标为 `public`。`private` 必须指向有效的 `public` 消费者。

先用 `skills register --dry-run` 预览唯一 sidecar 写入、class、digest 和并发前置条件；应用后重新运行 `skills review` 与 `seshat verify`。旧 1.0/1.1 记录只作为迁移证据，按 Finding 建立明确的 2.0 输入，不得静默改写或修改第三方 `SKILL.md`。
