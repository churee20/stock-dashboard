-- Task 002: 타입 정의 및 DB 스키마 설계
-- PRD 6.2절 데이터 모델 기준. 이 마이그레이션은 설계 산출물이며 아직 실제 프로젝트에 적용되지 않았다.
-- 실제 적용 및 Supabase 클라이언트 연동은 Task 005(Supabase 연동 및 조회 API 개발) 범위.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  account_no_masked text not null,
  account_type text not null check (account_type in ('연금', '개인투자')),
  created_at timestamptz not null default now()
);

create table public.account_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  snapshot_date date not null,
  principal_amount numeric not null,
  current_amount numeric not null,
  profit_amount numeric not null,
  profit_rate numeric not null,
  collected_at timestamptz not null,
  -- PRD 6.3: 동일 계좌 + 동일 수집일 데이터는 upsert 대상(신규 row 생성 금지)
  unique (account_id, snapshot_date)
);

create index idx_account_snapshots_account_date
  on public.account_snapshots (account_id, snapshot_date);

-- ---------------------------------------------------------------------------
-- 참고: 주별/월별 집계 쿼리 초안 (PRD 5.4/5.5 "해당 기간 마지막 수집일 스냅샷을 대표값으로 사용")
-- src/lib/dummy-data/aggregate.ts의 pickLastSnapshotPerPeriod와 동일한 규칙을
-- SQL로 표현하면 다음과 같다. 현재는 애플리케이션 레벨 집계로 충분히 검증되었으므로
-- 실제 DB VIEW로는 만들지 않는다(과설계 방지). 필요 시 Task 005 이후 도입 여부 재검토.
--
-- 주별 대표 스냅샷 (ISO 주 기준):
-- select distinct on (account_id, date_trunc('week', snapshot_date))
--   *
-- from public.account_snapshots
-- order by account_id, date_trunc('week', snapshot_date), snapshot_date desc;
--
-- 월별 대표 스냅샷:
-- select distinct on (account_id, date_trunc('month', snapshot_date))
--   *
-- from public.account_snapshots
-- order by account_id, date_trunc('month', snapshot_date), snapshot_date desc;
-- ---------------------------------------------------------------------------
