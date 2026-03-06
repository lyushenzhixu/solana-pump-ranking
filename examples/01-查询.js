/**
 * 示例：查询数据 (SELECT)
 * 把 'tasks' 改成你在 Supabase 里创建的表名
 */
import { supabase } from '../index.js';

async function 查询示例() {
  // 查全部
  const { data, error } = await supabase
    .from('tasks')
    .select('*');

  if (error) {
    console.log('错误（可能表不存在）:', error.message);
    return;
  }
  console.log('查询结果:', data);
}

// 只查部分列
async function 查询指定列() {
  const { data } = await supabase
    .from('tasks')
    .select('id, title, done');
  console.log('指定列:', data);
}

// 带条件
async function 条件查询() {
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .eq('done', false)           // 未完成
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('未完成的前 5 条:', data);
}

查询示例().catch(console.error);
