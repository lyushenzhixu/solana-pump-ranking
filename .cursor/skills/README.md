# 项目 Skill 目录

本目录存放**项目级 Agent Skill**，随仓库共享，供 Cursor 在本项目中按场景调用。

## 目录结构

每个 skill 是一个子目录，至少包含 `SKILL.md`：

```
.cursor/skills/
├── README.md           # 本说明
└── your-skill-name/   # 单个 skill
    ├── SKILL.md        # 必选：技能说明与触发条件
    ├── reference.md    # 可选：详细参考
    └── examples.md     # 可选：使用示例
```

## 如何添加 Skill

1. 在 `.cursor/skills/` 下新建目录，如 `my-workflow/`。
2. 在该目录中创建 `SKILL.md`，包含：
   - YAML frontmatter：`name`、`description`（描述技能用途与何时触发）。
   - 正文：步骤说明、示例、注意事项。
3. 可选：同目录下增加 `reference.md`、`examples.md` 或 `scripts/` 等辅助文件。

## 与本项目的关系

- Skill 内可引用项目路径（如 `src/`、`config/sql/`），便于写「拉取榜单」「建表检查」等与仓库强相关的流程。
- 与全局 rules（`.cursor/rules/`）配合：rules 约定通用规范，skills 约定具体任务流程与领域知识。
