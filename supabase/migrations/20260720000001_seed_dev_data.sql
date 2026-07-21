-- Task 005: 개발용 시드 데이터 (계좌 8종 + 최근 30일 스냅샷)
-- src/lib/dummy-data/accounts.ts, generate-snapshots.ts의 값 체계를 참고해 간소화한 개발용 데이터.

with inserted_accounts as (
  insert into public.accounts (account_name, account_no_masked, account_type, created_at)
  values
    ('퇴직연금', '220-91', '연금', '2023-01-01T00:00:00.000Z'),
    ('개인연금(기존)', '220-34', '연금', '2023-01-01T00:00:00.000Z'),
    ('개인연금(신)', '112-8680', '연금', '2023-01-01T00:00:00.000Z'),
    ('DC계좌', '496-3028', '연금', '2023-01-01T00:00:00.000Z'),
    ('퇴직연금(삼성)', '648-8656', '연금', '2023-01-01T00:00:00.000Z'),
    ('처리투자(미래에셋)', '355-1120', '개인투자', '2023-01-01T00:00:00.000Z'),
    ('은퇴투자(미래에셋)', '355-2231', '개인투자', '2023-01-01T00:00:00.000Z'),
    ('ISA계좌', '648-8656', '개인투자', '2023-01-01T00:00:00.000Z')
  returning id, account_name
),
principal_by_account as (
  select id, account_name,
    case account_name
      when '퇴직연금' then 45000000
      when '개인연금(기존)' then 30000000
      when '개인연금(신)' then 20000000
      when 'DC계좌' then 25000000
      when '퇴직연금(삼성)' then 15000000
      when '처리투자(미래에셋)' then 35000000
      when '은퇴투자(미래에셋)' then 25000000
      when 'ISA계좌' then 20000000
    end as principal_amount
  from inserted_accounts
),
date_series as (
  select generate_series(current_date - interval '29 days', current_date, interval '1 day')::date as snapshot_date
),
raw_snapshots as (
  select
    p.id as account_id,
    d.snapshot_date,
    p.principal_amount,
    -- 계좌/날짜별 결정론적 의사난수 변동률(-2% ~ +2%)
    p.principal_amount + round(
      p.principal_amount * ((abs(hashtext(p.id::text || d.snapshot_date::text)) % 4001 - 2000)::numeric / 100000)
    ) as current_amount
  from principal_by_account p
  cross join date_series d
)
insert into public.account_snapshots (
  account_id, snapshot_date, principal_amount, current_amount,
  profit_amount, profit_rate, collected_at
)
select
  account_id,
  snapshot_date,
  principal_amount,
  current_amount,
  current_amount - principal_amount as profit_amount,
  round((current_amount - principal_amount)::numeric / principal_amount * 100, 2) as profit_rate,
  (snapshot_date::timestamp + interval '16 hours') at time zone 'UTC' as collected_at
from raw_snapshots;
