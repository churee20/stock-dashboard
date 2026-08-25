-- account_snapshots 데이터가 매일 누적되면서 다음 두 쿼리 패턴이 인덱스 없이 Seq Scan으로 실행되고 있어 추가한다.
-- (실측: explain으로 두 쿼리 모두 Seq Scan 확인, 338행 시점엔 미미하지만 데이터가 쌓일수록 느려짐)
--
-- 1) snapshot_date 단독 필터: getSnapshotsByDate/getLatestSnapshotsBefore(src/lib/supabase/queries.ts)
--    - 매일 cron 수집 후 알림 발송 시 호출(WHERE snapshot_date = ? / WHERE snapshot_date < ? ORDER BY snapshot_date DESC)
--    - 기존 idx_account_snapshots_account_date는 (account_id, snapshot_date) 복합이라 account_id 없이는 활용 안 됨
--
-- 2) collected_at 정렬: getLatestCollectedAt(src/lib/supabase/queries.ts)
--    - 모든 화면의 헤더 렌더링마다 호출(ORDER BY collected_at DESC LIMIT 1)

create index idx_account_snapshots_snapshot_date
  on public.account_snapshots (snapshot_date);

create index idx_account_snapshots_collected_at
  on public.account_snapshots (collected_at desc);
