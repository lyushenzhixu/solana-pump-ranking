/**
 * 示例：更新 (UPDATE) 和 删除 (DELETE)
 */
import { supabase } from '../index.js';

async function 更新() {
  const { data, error } = await supabase
    .from('tasks')
    .update({ done: true })
    .eq('id', 1)   // 把 id 改成你要更新的那条的 id
    .select()
    .single();

  if (error) {
    console.log('更新失败:', error.message);
    return;
  }
  console.log('更新后的数据:', data);
}

async function 删除() {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', 99);   // 把 99 改成要删除的 id

  if (error) {
    console.log('删除失败:', error.message);
    return;
  }
  console.log('删除成功');
}

// 更新().catch(console.error);
删除().catch(console.error);
