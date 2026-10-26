import { createClient } from '@supabase/supabase-js'

/* Supabase 客户端：配置来自 .env（VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY） */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)
