# 项目知识库

本目录用于存放项目相关的**结构化知识**，便于团队与 AI 查阅和引用。

## 建议内容

- **设计决策**：技术选型、表结构设计、接口约定等记录。
- **领域说明**：业务概念、术语表、与 Supabase/AVE/Solana 相关的说明。
- **运维与排错**：常见问题、部署检查清单、环境差异说明。
- **外部参考**：重要文档摘要、API 用法摘要（可放链接 + 简短说明）。

## 使用方式

- 以 Markdown 为主，按主题分文件或分子目录。
- 文件名与标题清晰，便于搜索和 AI 检索。
- 与 `docs/` 区分：`docs/` 偏操作类（如 RAILWAY.md、PUSH-TO-GITHUB.md）；`knowledge/` 偏概念与沉淀。

## 已有条目

- **pump-ranking-rules.md** — Pump 榜单入榜条件、LP/Top10 规则、数据源与运维排错（0 条、本地重启等）。

## 示例结构

```
knowledge/
├── README.md             # 本说明
├── pump-ranking-rules.md # Pump 榜单筛选规则与实现
├── design-decisions.md   # 设计决策记录
├── glossary.md           # 术语表
└── runbooks/             # 可选：运维手册
    └── deploy-checklist.md
```
