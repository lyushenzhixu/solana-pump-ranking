# 历史聊天记录：安装 AVE Cloud Skill 与配置 API Key

**日期**：2026-03-07  
**文件名**：历史聊天记录-安装AVE-Cloud-skill与配置API-Key-2026-03-07.md

---

## 1. 用户需求

- 安装 skill：`c:\Users\USER\Downloads\Telegram Desktop\ave-cloud-1.2.0.zip`
- 配置 AVE Cloud API Key：用户提供了 key，要求写入配置

---

## 2. 实现

### 2.1 安装 Skill

- 解压 zip 到临时目录，再复制到项目：`.cursor/skills/ave-cloud/`
- 目录内容：`SKILL.md`、`scripts/ave_data_rest.py`、`scripts/ave_data_wss.py`、`scripts/requirements.txt`、`scripts/Dockerfile.txt`、`references/api-endpoints.md`、`_meta.json`

### 2.2 与项目对齐的修改

- zip 内文档写的是 `ave_client.py`，实际脚本名为 `ave_data_rest.py`。已在整个 skill 内将 `ave_client.py` 替换为 `ave_data_rest.py`（SKILL.md、references/api-endpoints.md）。

### 2.3 API Key 配置

- 在项目根目录 `.env` 中新增用户提供的 AVE API Key 及 `API_PLAN=free`（key 仅存于 .env，不写入本记录）。
- 在 `.env.example` 中增加 `AVE_API_KEY`、`API_PLAN` 的占位说明，便于他人配置；真实 key 仅存在于 `.env`（已 gitignore）。

### 2.4 使用方式与安全

- Cursor 中涉及代币搜索、价格、K 线、持币分布、合约风险、榜单等时，可触发 ave-cloud skill，按 SKILL.md 执行 `scripts/ave_data_rest.py` 对应命令。
- 在终端直接运行该 Python 脚本时，需保证当前环境已加载 `.env`（或已 export 上述变量）。
- 提醒：勿将 `.env` 或 API Key 提交到仓库或泄露；若泄露请到 AVE Cloud 后台重新生成并更新 `.env`。

---

## 3. 涉及文件与位置汇总

| 文件 / 位置 | 说明 |
|-------------|------|
| `.cursor/skills/ave-cloud/` | AVE Cloud skill 安装目录 |
| `.cursor/skills/ave-cloud/SKILL.md` | 技能说明与命令（已改为 ave_data_rest.py） |
| `.cursor/skills/ave-cloud/scripts/ave_data_rest.py` | REST API 命令行入口 |
| `.env` | 已写入 AVE_API_KEY、API_PLAN（不提交） |
| `.env.example` | 已补充 AVE 相关变量说明 |
