-- 카카오 refresh token처럼 만료 시 자동 갱신되는 시크릿을 저장하는 범용 key-value 테이블.
-- .env.local/Vercel 환경변수는 배포 없이 코드가 직접 갱신할 수 없어서, 카카오 access token
-- 갱신 응답에 새 refresh_token이 함께 오면 이 테이블에 저장해두고 다음 호출부터 우선 사용한다.
-- (env의 KAKAO_REFRESH_TOKEN은 최초 시드/폴백 용도로만 남긴다.)

create table public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- 기존 테이블(accounts 등)과 동일하게 anon/authenticated 접근을 차단하고
-- 서버는 service_role 키로 우회 접근한다(20260805000000_enable_rls_public_tables.sql 패턴).
alter table public.app_secrets enable row level security;
