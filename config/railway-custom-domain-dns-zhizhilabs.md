# Railway 自定义域名 DNS 配置（zhizhilabs.com）

用于在 **腾讯云** 为域名 **zhizhilabs.com** 配置 DNS，使 Railway 服务通过自定义域名访问。

---

## 需要添加的 DNS 记录

根据你在 Railway 控制台「Configure DNS Records」弹窗中的内容，在腾讯云 **zhizhilabs.com** 的 DNS 解析里添加下面两条记录。

### 1. CNAME 记录（根域名指向 Railway）

| 腾讯云字段 | 填写值 |
|------------|--------|
| **记录类型** | CNAME |
| **主机记录** | `@`（表示根域名 zhizhilabs.com） |
| **记录值** | `ypurx10p.up.railway.app` |
| **TTL** | 600 或默认即可 |

### 2. TXT 记录（Railway 域名校验）

| 腾讯云字段 | 填写值 |
|------------|--------|
| **记录类型** | TXT |
| **主机记录** | `_railway-verify` |
| **记录值** | 从 Railway 弹窗中**完整复制** TXT 的 Value（形如 `railway-verify=75d0f2d078e1264f56d0ff417249...`，不要漏掉任何字符） |
| **TTL** | 600 或默认即可 |

---

## 腾讯云操作步骤

1. 登录 [腾讯云 DNSPod / 域名控制台](https://console.cloud.tencent.com/cns)。
2. 找到 **zhizhilabs.com**，点击「解析」进入解析列表。
3. 点击「添加记录」：
   - **第一条**：类型选 **CNAME**，主机记录填 **@**，记录值填 **ypurx10p.up.railway.app**，保存。
   - **第二条**：类型选 **TXT**，主机记录填 **_railway-verify**，记录值从 Railway 弹窗里完整复制（含 `railway-verify=` 及后面整串），保存。
4. 保存后等待解析生效（通常几分钟到几小时，最多约 48 小时）。

---

## 配置后

- 在 Railway 控制台 **Networking → Custom Domains** 查看验证状态；通过后会自动启用 HTTPS。
- 若日后 Railway 分配的域名（如 `ypurx10p.up.railway.app`）变更，只需把 CNAME 的**记录值**改为新域名即可。

---

## 原理说明（为什么需要这样配置）

### 要解决什么问题

应用部署在 Railway，默认地址是 `ypurx10p.up.railway.app`。希望用户访问 **zhizhilabs.com** 时打开同一应用，且走 HTTPS。需要两件事：**把域名指到 Railway** + **让 Railway 相信你拥有该域名**。两条 DNS 记录分别对应这两点。

### CNAME 记录：把域名「指」到 Railway

- **作用**：告诉全球 DNS：「zhizhilabs.com 请去问 ypurx10p.up.railway.app 要答案」。
- **CNAME** = 别名：根域名不写死 IP，而是说「和 ypurx10p.up.railway.app 是同一个」。这样 Railway 背后换 IP 你也不用改 DNS。
- **主机记录 `@`**：表示根域名 zhizhilabs.com 本身。

### TXT 记录：证明域名归你所有

- **作用**：让 Railway 验证你确实能控制 zhizhilabs.com 的 DNS。
- **流程**：Railway 生成随机校验串 → 要求你在 DNS 里为 `_railway-verify.zhizhilabs.com` 添加 TXT，值为该串 → Railway 查询该 TXT，能查到即证明你拥有域名 → 通过后为域名签发 SSL、提供 HTTPS。
- **为什么用 TXT**：TXT 用来存一段「说明文字」，适合做所有权验证；行业里域名验证、邮件验证等都用 TXT。

### 用户访问时的流程（简化）

1. 用户访问 zhizhilabs.com → DNS 查 CNAME 得到 ypurx10p.up.railway.app。
2. 再查该主机名对应的 IP（A 记录），浏览器连到 Railway。
3. 请求头里 Host 为 zhizhilabs.com，Railway 识别并匹配已验证的自定义域名。
4. 用为该域名签发的 SSL 证书建立 HTTPS，返回你的应用内容。

**总结**：CNAME 负责「指路」，TXT 负责「证明身份」，两者缺一不可。
