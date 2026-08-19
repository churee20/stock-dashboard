-- Task 011: "투자 수익" 메뉴 신규 개발.
-- 구글시트 "종목별 실적&비중" 데이터를 매일 수집 시점에 스냅샷으로 저장한다.
-- 스프레드시트에는 날짜 이력이 없으므로(현재 시점 1건만 존재), 여기서 수집일을 기록해 누적한다.

create table public.stock_holding_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  country text not null,
  stock_code text not null,
  stock_name text not null,
  quantity numeric not null,
  avg_price_krw numeric,
  avg_price_usd numeric,
  current_price_krw numeric,
  current_price_usd numeric,
  valuation_amount numeric not null,
  weight_rate numeric not null,
  cumulative_dividend numeric not null default 0,
  cumulative_profit numeric not null,
  total_return_rate numeric not null,
  collected_at timestamptz not null,
  -- 동일 종목 + 동일 수집일 데이터는 upsert 대상(account_snapshots와 동일 규칙)
  unique (stock_code, snapshot_date)
);

create index idx_stock_holding_snapshots_date
  on public.stock_holding_snapshots (snapshot_date);

-- 기존 테이블(accounts/account_snapshots 등)과 동일하게 anon/authenticated 접근을 차단하고
-- 서버는 service_role 키로 우회 접근한다(20260805000000_enable_rls_public_tables.sql 패턴).
alter table public.stock_holding_snapshots enable row level security;
