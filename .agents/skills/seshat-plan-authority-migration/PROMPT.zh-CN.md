# Authority 路径迁移规划职责交接 Prompt

仅接受用户或 OpenSpec 明确给出的一个 `source=destination`。检查源存在、目标不存在、路径位于强制治理边界、源文件有 Authority 标记，并记录源哈希。

只输出迁移计划，不写入目标，不自动选择 Authority，不根据 basename、更新时间或目录便利性推断路径。最终执行必须转交 standardize，并在写入前重新检查哈希和目标缺失。
