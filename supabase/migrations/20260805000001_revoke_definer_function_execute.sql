-- Supabase 보안 경고 조치: SECURITY DEFINER 함수의 REST API(rpc) 직접 호출 차단
-- handle_new_user()는 auth.users INSERT 트리거(on_auth_user_created) 전용 함수로,
--   PostgREST가 /rest/v1/rpc/handle_new_user 로 노출해 누구나 임의 프로필을 삽입할 수 있었다.
--   트리거 실행은 함수 소유자 권한으로 이루어지므로 EXECUTE 권한 회수와 무관하게 정상 동작한다.
-- is_admin()은 RLS 정책 등에서 현재 로그인 사용자의 관리자 여부를 판별하는 헬퍼로,
--   REST API로 직접 호출될 이유가 없어 함께 회수한다.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
