import { createClient } from '@supabase/supabase-js'

// Server Component 전용: Client Component에서 import하지 않는다
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !anonKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다')
  }

  return createClient(url, anonKey)
}
