# Seshat 审计 Finding 解释职责交接 Prompt

接收一个 Seshat Finding code，调用 `seshat findings explain --json`，解释其类别、受影响写入是否阻断、责任 Owner 和安全下一步。

不得重新审计、不得选择落盘路径、不得执行标准化。未知代码保持阻断并路由到原始证据与需求 Authority。
