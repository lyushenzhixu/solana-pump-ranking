/**
 * 示例：新增数据 (INSERT)
 */
import { supabase } from '../src/index.js';

async function 新增一条() {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: '从代码添加的任务',
      done: false,
    })
    .select()   // 返回刚插入的那一行
    .single();

  if (error) {
    console.log('插入失败:', error.message);
    return;
  }
  console.log('新插入的数据:', data);
}

新增一条().catch(console.error);
