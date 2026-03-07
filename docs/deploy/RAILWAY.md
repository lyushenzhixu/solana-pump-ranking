# 用 Railway 部署榜单

把「Solana Pump 榜单」部署到线上后，会得到一个公网地址，打开即可查看榜单页面和 API。

## 一、代码推到 GitHub

1. 在 GitHub 新建一个仓库（如 `solana-pump-ranking`）。
2. 在本项目目录执行：

```bash
git init
git add .
git commit -m "init: ranking + server"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

注意：不要把 `.env` 推上去（已在 `.gitignore` 里），密钥在 Railway 里配。

## 二、在 Railway 创建项目

1. 打开 [Railway](https://railway.app)，登录。
2. 点击 **New project**。
3. 选择 **Deploy from GitHub repo**（或 **GitHub Repository**）。
4. 授权 Railway 访问 GitHub（如未授权），然后选择你刚推送的仓库。
5. Railway 会检测到 Node 项目并自动构建、部署。

## 三、配置环境变量

在 Railway 项目里打开该服务的 **Variables**，添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `SUPABASE_URL` | `https://rkzljtotquogikekxhcw.supabase.co` | 你的 Supabase 项目 URL |
| `SUPABASE_ANON_KEY` | 你的 anon 公钥 | Supabase 项目设置 → API 里的 anon key |

保存后 Railway 会自动重新部署。

## 四、生成公网域名

1. 在该服务的 **Settings** 里找到 **Networking** / **Public Networking**。
2. 点击 **Generate domain**，端口填日志里看到的端口（如 8080），会得到一个 `xxx.up.railway.app` 的地址。
3. 浏览器打开该地址即可看到榜单页面。

## 五、接口说明

- **首页（欢迎页）**：`https://你的域名/`  
  幻影领域欢迎页，点击「探索」进入榜单。
- **榜单页面**：`https://你的域名/ranking`  
  展示前 20 条 Solana Pump 榜单（从 Supabase 读取）。
- **JSON API**：`https://你的域名/api/ranking`  
  返回榜单 JSON，方便其他应用或前端调用。

## 六、更新榜单数据

线上服务只负责「读」Supabase 并展示，不会自动拉取 AVE。更新数据请在本机执行：

```bash
npm run pump-ranking
```

数据写入 Supabase 后，刷新线上页面即可看到最新榜单。
