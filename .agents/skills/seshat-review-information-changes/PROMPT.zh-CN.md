# Seshat 工程信息变更集审查职责交接 Prompt

对明确的 Git 工程和 base 执行 `seshat review changes --json`。只按路径分类变更集，不读取 diff 正文，不修改、暂存或提交文件。

把强制治理变更路由到对应 Authority，把建议治理变更路由到程序消费者 Owner，把不纳入治理变更留给代码或 Runtime 审查。未分类路径不得猜测。
