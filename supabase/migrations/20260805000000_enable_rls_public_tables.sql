-- Supabase 보안 경고(Table publicly accessible) 조치: public 스키마 테이블 RLS 전면 활성화
-- accounts, account_snapshots, asset_class_snapshots, dividend_snapshots
--   -> 로그인 없는 개인용 서버 코드에서만 접근. anon/authenticated 정책을 두지 않아
--      PostgREST(anon key) 경유 접근은 전면 차단되고, 서버는 service_role 키로 우회 접근한다.
-- invoices, invoice_items
--   -> 이 프로젝트 코드에서는 사용하지 않는, 같은 Supabase 프로젝트를 공유하는 별도 앱의 테이블.
--      정책 설계는 해당 앱 담당이므로 우선 RLS만 켜서 무정책 상태의 전면 노출을 차단한다.

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_class_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dividend_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
