# 推送到 GitHub

本地已完成：`git init`、`git add .`、`git commit`。

## 你需要做的

### 1. 在 GitHub 上新建仓库

1. 打开 https://github.com/new
2. **Repository name** 填：`solana-pump-ranking`（或任意名称）
3. 选 **Public**，**不要**勾选 "Add a README"（避免冲突）
4. 点击 **Create repository**

### 2. 在终端执行（远程已配置为 lyushenzhixu/solana-pump-ranking）

```bash
cd "/Users/reversegame/Desktop/superbase 实验"
git push -u origin main
```

推送时如要求登录，用 GitHub 账号 + Personal Access Token（密码处填 Token）。

完成后再去 Railway 选 **Deploy from GitHub repo** 并选中这个仓库即可。
