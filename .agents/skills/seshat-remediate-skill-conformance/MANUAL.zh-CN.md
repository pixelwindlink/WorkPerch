# 整改工程 Skill

## 用途与适用场景

本 Skill 用于审查并在明确授权后实际整改工程自有 Skill，使其具备 Codex/OpenSpec 风格的 canonical 发现、自然语言触发、近邻职责边界和渐进披露条件。适用于新建 Skill 的创建后规范化、存量 Skill 整改，以及 audit、`skills lint`、`skills review` Finding 的闭环修复。

## 使用方式

- 只要求审查、分析或建议时，保持只读并给出逐文件方案。
- 明确要求整改、修复、规范化或对齐时，先确认目标、所有权和写入范围，再修改工程自有 Skill。
- 行为发生变化后，使用 `seshat-govern-skill-provenance` 预览并更新 behavior digest，最后运行 lint、review 和 verify。

## 边界

- 平台 `skill-creator` 提供通用 Skill 编写方法；本 Skill 负责 Seshat 对齐整改；provenance Skill 负责分类和来源，三者不能互相替代。
- `outside` 和消费工程中的 Seshat bundled Skill 不得原地修改，只能升级、上游修复、创建 wrapper、显式 fork、禁用或移除。
- `seshat-complete-skill-atom` 只补缺失 companion；`seshat-standardize-information-assets` 只处理路径和导航，二者均不改写行为语义。
- 静态 lint 通过不等于真实 Agent 自动触发已经验证。
