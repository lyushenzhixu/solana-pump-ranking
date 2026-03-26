-- ============================================================
-- Phase 0.5 RLS 安全加固
-- 目标：anon key 只能 SELECT，不能写；service_role key 绕过 RLS
-- 用法：在 Supabase SQL Editor 中执行本脚本
-- ============================================================

-- 1. 删除旧的全开放策略（策略名可能为中文或英文，逐一尝试）
DROP POLICY IF EXISTS "允许所有人读写" ON solana_pump_ranking;
DROP POLICY IF EXISTS "允许所有人读写" ON zhilabs_ranking;
DROP POLICY IF EXISTS "Allow all" ON solana_pump_ranking;
DROP POLICY IF EXISTS "Allow all" ON zhilabs_ranking;

-- 2. 为 ranking 表创建只读策略（anon 只能 SELECT）
CREATE POLICY "anon_read_only" ON solana_pump_ranking
  FOR SELECT USING (true);
CREATE POLICY "anon_read_only" ON zhilabs_ranking
  FOR SELECT USING (true);

-- 3. 为 narrative/tweet 缓存表启用 RLS + 只读策略
ALTER TABLE token_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_tweets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_only" ON token_narratives
  FOR SELECT USING (true);
CREATE POLICY "anon_read_only" ON token_tweets
  FOR SELECT USING (true);

-- ============================================================
-- 验证说明：
-- 用 anon key 测试 SELECT → 应成功
-- 用 anon key 测试 INSERT/UPDATE/DELETE → 应被 RLS 拒绝
-- 用 service_role key 测试写操作 → 应成功（绕过 RLS）
-- ============================================================
