# Dashboard Runtime Data

Dashboard Engine 的可变业务状态、锁和备份不得提交到 Git。

正常 Server 运行优先通过绝对路径环境变量 `DASHBOARD_RUNTIME_DIR` 指定状态根；未指定时使用用户数据目录，而不是此源码目录。Standalone CLI 和所有测试必须显式提供隔离的绝对 `DASHBOARD_RUNTIME_DIR`。

状态根包含：

- `dashboard-state.json`：版本化业务 aggregate。
- `.dashboard-owner.lock`：single-writer 所有权锁。
- `backups/`：写入前的上一 revision 备份。
- 同目录临时文件：只存在于原子提交期间。

此目录仅记录边界说明，不是生产或测试默认状态根。
