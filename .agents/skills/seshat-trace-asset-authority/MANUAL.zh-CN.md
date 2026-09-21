# Seshat 资产 Authority 路由追踪 Skill 使用说明

本 Skill 针对一个已知工程相对路径，只读返回资产类型、治理等级、路径规则、Authority、消费者、生命周期和工程地图声明状态。

```bash
seshat trace --target /绝对路径/工程 --path README.md --json
```

它不读取文件内容，也不替新资产决定落盘位置；新建或迁移问题应交给落盘咨询与标准化能力。
