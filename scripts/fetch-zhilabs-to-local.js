/**
 * 从 AVE 拉取 zhilabs ca.md 中代币的原始响应，保存到本地 JSON 文件，便于查看 AVE 实际返回的字段结构
 * 不写 Supabase，只拉取并落盘
 * 使用: npm run zhilabs-to-local
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CA_FILE = path.join(__dirname, '..', 'zhilabs meme榜单精选', 'ca.md');
const OUT_FILE = path.join(__dirname, '..', 'zhilabs meme榜单精选', 'ave-raw-responses.json');

const AVE_API_KEY = process.env.AVE_API_KEY;
const AVE_BASE = 'https://data.ave-api.xyz/v2';

function parseCaList(content) {
  return content
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('#'));
}

async function fetchTokenRaw(address) {
  const url = `${AVE_BASE}/tokens/${address}-solana`;
  const res = await fetch(url, {
    headers: { 'X-API-KEY': AVE_API_KEY },
  });
  const text = await res.text();
  if (!res.ok) {
    return { address, ok: false, status: res.status, body: text };
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { address, ok: false, parseError: true, body: text.slice(0, 500) };
  }
  return { address, ok: true, status: data.status, data: data.data, full: data };
}

async function main() {
  if (!AVE_API_KEY) {
    throw new Error('缺少 AVE_API_KEY，请在 .env 中配置');
  }
  if (!fs.existsSync(CA_FILE)) {
    throw new Error(`CA 文件不存在: ${CA_FILE}`);
  }

  const addresses = parseCaList(fs.readFileSync(CA_FILE, 'utf8'));
  if (addresses.length === 0) {
    throw new Error('ca.md 中无有效 CA');
  }

  console.log('正在从 AVE 拉取', addresses.length, '个代币原始响应...');
  const results = [];

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const out = await fetchTokenRaw(addr);
    results.push(out);
    console.log(`  [${i + 1}/${addresses.length}] ${addr} ${out.ok ? 'OK' : 'FAIL'}`);
    if (i < addresses.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
  console.log('已写入:', OUT_FILE);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
