# Skill 分类与来源治理说明

任何 Skill 的新增、复制、AI 生成、安装、升级、启用、废弃、删除、共享或发布，都必须先运行 Skill 治理审查。目录存在不代表它已经成为当前工程的有效能力。

`skillClass` 是唯一分类字段，回答“这个 Skill 相对当前工程是什么”：

- `public`：当前工程对外提供的能力；
- `inner`：当前工程自己使用的能力；
- `private`：只被当前工程 `public` Skill 依赖的私有实现；
- `outside`：由外部工程或第三方提供、当前工程安装使用的能力。

同一个 Seshat Skill 在 Seshat 自身可为 `public` 或 `inner`，安装到其他工程后统一是 `outside`。外部 Skill 不能直接改标成当前工程 `public`；若当前工程要基于它对外提供能力，应创建当前工程自己的 `public` wrapper。

2.0 记录中，`skillId` 与 `skillClass` 是根对象平级字段：

```json
{
  "schemaVersion": "2.0",
  "skillId": "example-tool",
  "skillClass": "outside",
  "namespace": "example",
  "source": {
    "kind": "git-repository",
    "locator": "https://example.invalid/repository.git"
  }
}
```

完整记录还需保留 Owner、行为 Authority、behavior digest、能力、生命周期、exposure、`consumedBy`、审批与许可证等适用证据。`SKILL.md` 始终是行为定义权威，sidecar 不得改写第三方行为。

```bash
seshat skills list --target /绝对路径/工程 --json
seshat skills review --target /绝对路径/工程 --json
seshat skills register --target /绝对路径/工程 \
  --skill <skill-id> --input /绝对路径/record.json --dry-run --json
seshat verify --target /绝对路径/工程 --json
```

旧 1.0/1.1 sidecar 只用于发现迁移问题。看到 `SKILL_CLASSIFICATION_V2_MIGRATION_REQUIRED` 后，创建明确的 2.0 输入，删除旧分类字段，先 dry-run，再应用并复核。不得在 review 中静默改写。

`private` 必须通过 `consumedBy` 指向已安装的 `public` Skill；`outside` 必须保留可追溯的外部 source locator。组织共享和公开 exposure 仍需显式批准，`outside` 在这些 exposure 下还需要许可证证据。
