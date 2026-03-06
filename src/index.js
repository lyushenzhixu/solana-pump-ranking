import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('请设置环境变量: SUPABASE_URL 和 SUPABASE_ANON_KEY');
  console.error('1. 复制 .env.example 为 .env');
  console.error('2. 在 Supabase 控制台 [项目设置 -> API] 获取 URL 和 anon key');
  process.exit(1);
}

/** 已连接的 Supabase 客户端，可在其他模块中 import { supabase } from './src/index.js' */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Supabase 已连接:', supabaseUrl.replace(/https?:\/\//, '').split('.')[0]);
}

main().catch(console.error);
