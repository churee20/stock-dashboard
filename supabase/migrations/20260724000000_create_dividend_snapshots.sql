-- Task 010: 배당실적 화면 신규 개발.
-- 별도 스프레드시트("6.배당금 계산기" > "3.배당금지급" 탭)의 배당 지급 내역을 저장한다.
-- 같은 계좌가 같은 날 여러 종목의 배당을 받을 수 있으므로, account_snapshots(계좌+날짜 유니크)와 달리
-- 종목코드까지 포함한 (account_id, stock_code, payment_date)를 유니크 키로 둔다.

create table public.dividend_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  payment_date date not null,
  stock_code text not null,
  stock_name text not null,
  dividend_shares numeric not null,
  dividend_per_share numeric not null,
  dividend_rate numeric not null,
  dividend_amount numeric not null,
  collected_at timestamptz not null,
  -- 동일 계좌 + 동일 종목 + 동일 지급일 데이터는 upsert 대상
  unique (account_id, stock_code, payment_date)
);

create index idx_dividend_snapshots_payment_date
  on public.dividend_snapshots (payment_date);
