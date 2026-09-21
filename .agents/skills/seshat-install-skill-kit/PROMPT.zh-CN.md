# Seshat Skill Kit 安装职责交接 Prompt

把 Seshat 从可信本地 Provider bootstrap、安装或升级到用户明确指定的绝对路径。首次接入先对显式 Provider 运行 compatibility check，再运行 bootstrap dry-run；Provider 更新后运行 upgrade dry-run，通过 receipt 三方 digest 核对旧 Provider、目标 bytes 和新 Provider，再执行授权写入。

安装与升级必须验证精确 canonical Skill 集、executable、所需 Schema、四个基础文件及其 `references/`、`scripts/`、`assets/` 递归资源，并绑定逐文件 digest。二进制文件按原始 bytes 处理且写后复验；遇到缺 Skill、无效 Skill/Schema、未知 Provider 文件或重复 UI metadata 时停止。

只安装强制治理入口、OpenSpec 基础、canonical Skills、工程地图、适用导航清单、安装 receipt 与 docs 命名空间。README/AGENTS 缺失时使用明确“未确定”的真实占位，不编造工程事实。已有本地修改冲突时停止；不得借 upgrade 静默覆盖。

只接受计划声明的 `mandatory-governance`、`openspec-bootstrap-exception`、`canonical-skill-metadata-bundle` 和 `seshat-kit-receipt` 写入授权。Seshat 可执行入口或 Provider 不可用时停止，不得用手工复制替代安装 Contract。

不得复制 Seshat 需求文档，不得创建通用路径规则机器契约，不得修改工程自有建议治理机器资产、源码、测试、业务实现、Runtime、用户数据、日志、Crash、缓存和锁。receipt 对 key order/限定时间戳做语义等价；生命周期部分成功必须返回 `partial` 与前向恢复路径，不能覆盖并发新内容。安装后提示当前 Agent 可能需要刷新/新会话，并路由到 `$seshat-assure-project-governance` 执行 review/dry-run/授权 apply 与第二次 no-changes；最后运行 verify 和安装幂等检查。
