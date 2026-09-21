<!-- seshat:managed -->
# Project File Map

> 本文件是职责级、仓库绑定的工程导航资产。路径身份由完整相对路径、职责、Owner、Authority、生命周期、Consumer 与 Producer 共同确定；本地图不取代被引用资产的 Authority。

```text
项目根目录/
├── .agents # canonical Agent Skills；Owner=能力提供者；Authority=各 SKILL.md；生命周期=版本化
├── .gitignore # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── AGENTS.md # AI 治理与执行入口；Owner=项目；Authority=执行 Contract；生命周期=持续维护
├── app.js # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── architecture/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── cli.mjs # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── contracts/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── dist/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── docs/ # 可脱离仓库传播的人类知识；Owner=项目；Authority=知识说明；生命周期=持续维护
├── electron/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── engine.manifest.json # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── exports/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── index.html # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── node_modules/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── openspec/ # 方案、规格、架构与 Change；Owner=项目；Authority=OpenSpec 角色；生命周期=按 Change
├── package-lock.json # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── package.json # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── project-governance/ # 仓库绑定地图与 Manifest；Owner=项目；Authority=导航；生命周期=持续维护
├── prompts/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── README.md # 工程唯一第一入口；Owner=项目；Authority=导航；生命周期=持续维护
├── release/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── runtime_data/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── scripts/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── server.mjs # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── skills/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── src/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── styles.css # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
├── tests/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
└── ui/ # 工程自有路径；职责、Owner、Authority 与生命周期由本工程声明
```

## 维护规则

1. 同名目录允许在不同父级命名空间共存；不能只按 basename 判断职责。
2. 工程自有源码、测试、资源、Schema、模板、平台与业务目录不因出现在地图中而纳入 Seshat 写入范围。
3. Authority 冲突必须通过 OpenSpec 裁决，不按修改时间、Git 历史或目录名称自动选择。
4. 不存在的可选产物目录不为“目录完整”而创建。
