-- 동일 계좌명을 서로 다른 증권사로 쓰는 계좌(예: "처리투자"의 미래에셋/삼성증권)가 추가되면서,
-- account_name만으로 계좌를 식별하던 수집 로직(syncAccounts)이 서로 다른 계좌를 같은 것으로
-- 병합해 account_snapshots upsert 시 동일 배치 내 중복 대상 row 충돌(500 에러)이 발생했다.
-- 계좌 식별 키를 account_name + account_no_masked 조합으로 바꾸면서, DB 레벨에서도
-- 같은 조합의 중복 insert를 막기 위해 unique 제약을 추가한다.

ALTER TABLE public.accounts
  ADD CONSTRAINT accounts_name_no_masked_unique UNIQUE (account_name, account_no_masked);
