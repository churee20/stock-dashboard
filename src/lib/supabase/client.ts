import { createClient } from '@supabase/supabase-js'

// Server Component 전용: Client Component에서 import하지 않는다
// accounts 등 핵심 테이블은 RLS를 켜고 anon/authenticated 정책을 두지 않았으므로,
// 서버에서는 service_role 키로 RLS를 우회해 접근한다. 이 키는 절대 클라이언트로 노출되면 안 된다.
export function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다')
  }

  return createClient(url, serviceRoleKey)
}
