/**
 * 完整演示：先建表再跑一遍增删改查
 * 在 Supabase 控制台 SQL 里执行下面语句先建表（可选）：
 *
 * create table if not exists tasks (
 *   id bigint generated always as identity primary key,
 *   title text,
 *   done boolean default false,
 *   created_at timestamptz default now()
 * );
 */
import { supabase } from '../src/index.js';

async function 演示() {
  const 表名 = 'tasks';

  console.log('\n--- 1. 插入 ---');
  const { data: 新行, error: insertErr } = await supabase
    .from(表名)
    .insert({ title: '示例任务', done: false })
    .select()
    .single();

  if (insertErr) {
    console.log('插入失败（若表未创建可忽略）:', insertErr.message);
    return;
  }
  console.log('新行:', 新行);
  const id = 新行.id;

  console.log('\n--- 2. 查询 ---');
  const { data: 列表 } = await supabase.from(表名).select('*').order('id', { ascending: false }).limit(3);
  console.log('最近 3 条:', 列表);

  console.log('\n--- 3. 更新 ---');
  const { data: 更新后 } = await supabase
    .from(表名)
    .update({ done: true })
    .eq('id', id)
    .select()
    .single();
  console.log('更新后:', 更新后);

  console.log('\n--- 4. 删除 ---');
  await supabase.from(表名).delete().eq('id', id);
  console.log('已删除 id =', id);

  console.log('\n演示结束');
}

演示().catch(console.error);
