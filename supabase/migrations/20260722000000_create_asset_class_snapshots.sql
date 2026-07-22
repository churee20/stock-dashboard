-- Task 007-1: 대시보드 "전체 계좌 자산 비중"을 계좌 기준에서 자산군 기준으로 교체.
-- "4.계좌별 비중" 탭의 [전체 계좌 비중] 섹션(반도체/채권/미국배당/한국배당/금/현금)을
-- cron 수집 시점에 함께 저장해 조회는 기존과 동일하게 DB 기반으로 유지한다.

create table public.asset_class_snapshots (
  id uuid primary key default gen_random_uuid(),
  asset_class text not null,
  snapshot_date date not null,
  current_amount numeric not null,
  collected_at timestamptz not null,
  -- 동일 자산군 + 동일 수집일 데이터는 upsert 대상(account_snapshots와 동일 규칙)
  unique (asset_class, snapshot_date)
);

create index idx_asset_class_snapshots_date
  on public.asset_class_snapshots (snapshot_date);
