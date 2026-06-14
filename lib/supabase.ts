import 'server-only'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY
const allowAnon = process.env.ALLOW_ANON_SUPABASE_READ === 'true'

const key = serviceRoleKey || (allowAnon ? anonKey : undefined)

if (!url) throw new Error('Missing SUPABASE_URL')
if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY (RLS is ON; anon fallback disabled — set ALLOW_ANON_SUPABASE_READ=true to override)')

export const supabase = createClient(url, key, { auth: { persistSession: false } })
