import { supabase } from '@/supabase'

/* ============================================================
   账户中心数据访问层
   ------------------------------------------------------------
   所有查询都经过 RLS：只能读写 auth.uid() 自己的行。
   表结构见 supabase/account.sql。
   ============================================================ */

const now = () => new Date().toISOString()

export async function fetchProfile (id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,company,phone,country,lang,created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveProfile (id, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, ...patch, updated_at: now() }, { onConflict: 'id' })
    .select('id,email,full_name,company,phone,country,lang,created_at')
    .single()
  if (error) throw error
  return data
}

export async function fetchSubscription (id) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveSubscription (id, patch) {
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({ user_id: id, ...patch, updated_at: now() }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data
}

/* 询价篮提交记录 */
export async function listEnquiries (id, limit = 50) {
  const { data, error } = await supabase
    .from('enquiries')
    .select('id,created_at,item_count,items,text,status,contact')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

/* 定制需求表单记录 */
export async function listRequests (id, limit = 50) {
  const { data, error } = await supabase
    .from('requests')
    .select('id,created_at,doll_type,size,style,colorway,categories,qty,target,lead,name,contact,notes,status')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}
