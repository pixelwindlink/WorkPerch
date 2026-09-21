# 治理结果验证职责交接 Prompt

对用户明确指定的 Seshat JSON 结果执行只读结构验证。先识别 `command` 并选择已安装的结果 Schema；命令未知、Schema 不存在、必填字段缺失或字段类型不符时返回 `invalid` 或 `unsupported`。

不要读取 `target` 指向的工程，不要重新执行来源命令，不要修改或重新序列化输入，不要把结构有效解释为当前合规。需要持久化时转交证据留存 Skill，需要历史比较时转交基线比较 Skill。
