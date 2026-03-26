/**
 * 向后兼容入口 — 其他模块可继续 import { supabase } from './src/index.js'
 * 实际客户端由 src/supabase.js 统一管理
 */
export { supabase } from './supabase.js';
