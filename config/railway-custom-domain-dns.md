# Railway 自定义域名 DNS 配置（zhilabs.ai）

用于在域名服务商处为 **zhilabs.ai** 配置 DNS，使 Railway 服务通过自定义域名访问。  
参考：[Railway - Add a custom domain](https://docs.railway.com/networking/public-networking#add-a-custom-domain)、[Domains](https://docs.railway.com/networking/domains)。

---

## 需要添加的 DNS 记录

在 **zhilabs.ai** 的 DNS 管理（域名服务商控制台）中添加以下两条记录。

### 1. CNAME 记录（根域名指向 Railway）

| 字段 | 值 |
|------|-----|
| **Type** | CNAME |
| **Name / 主机记录** | `@`（表示根域名 zhilabs.ai） |
| **Value / 记录值** | `34b621ba.up.railway.app` |
| **说明** | 将 zhilabs.ai 解析到当前 Railway 服务提供的域名 |

> 部分 DNS 服务商对根域名（@）只支持 A 记录或 ALIAS/ANAME，若无法添加 CNAME，请查阅该服务商的「根域名 CNAME 扁平化」或「ALIAS」设置方式。

### 2. TXT 记录（Railway 域名校验）

| 字段 | 值 |
|------|-----|
| **Type** | TXT |
| **Name / 主机记录** | `_railway-verify` |
| **Value / 记录值** | `railway-verify=6edcff064faf8e07e5e591d8d3dd4d5c50a68d82d771ad4d0658a06f573b3eb9` |
| **说明** | 供 Railway 验证你对域名的控制权，验证通过后会自动签发 SSL 证书 |

---

## 配置后

- 保存 DNS 记录后，解析生效可能需要数分钟到 48 小时（视服务商而定）。
- 在 Railway 控制台 **Networking → Custom Domains** 中可查看验证状态；验证通过后会自动启用 HTTPS。
- 若 Railway 分配的域名（如 `34b621ba.up.railway.app`）日后变更，只需更新上述 CNAME 的 **Value** 为新域名即可，TXT 校验码一般无需更改。
