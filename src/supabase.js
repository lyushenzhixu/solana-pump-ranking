/**
 * 统一 Supabase 客户端（单例）
 * - 优先使用 SUPABASE_SERVICE_ROLE_KEY（绕过 RLS，服务端写入）
 * - 没有 service role key 时 fallback 到 SUPABASE_ANON_KEY（开发环境）
 */
import './load-env.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

const isPlaceholder = /你的|项目ID|anon|公钥/i.test(supabaseUrl + anonKey);
if (!supabaseUrl || (!serviceRoleKey && !anonKey) || isPlaceholder) {
  console.error('[错误] 未配置 Supabase，无法启动服务。');
  console.error('请编辑项目根目录的 .env 文件，填入：');
  console.error('  SUPABASE_URL=https://你的项目ID.supabase.co');
  console.error('  SUPABASE_ANON_KEY=你的 anon 公钥');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=你的 service_role 密钥（推荐）');
  process.exit(1);
}

const key = serviceRoleKey || anonKey;
if (serviceRoleKey) {
  console.log('[Supabase] 使用 service_role key（绕过 RLS）');
} else {
  console.warn('[Supabase] ⚠️  未配置 SUPABASE_SERVICE_ROLE_KEY，使用 anon key（RLS 加固后写入将被拒绝）');
}

/** Supabase 客户端单例 */
export const supabase = createClient(supabaseUrl, key);
