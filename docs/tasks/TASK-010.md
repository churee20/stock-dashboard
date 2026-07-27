# Task 010: 배당실적 화면 신규 개발

## 개요
- **목표**: 별도 구글 스프레드시트("6.배당금 계산기")의 배당 지급 내역을 수집해, 계좌별/월별 배당 실적을 조회하는 신규 화면("배당실적") 추가
- **관련 기능**: Google Sheets 수집 파이프라인(Task 006/009)에 배당 데이터 소스 추가, 기존 대시보드 상세 테이블(Task 004) 패턴을 리스트에 재사용
- **참조 문서**: `01.요구사항/추가 기능 요구사항_20260724.txt`, `docs/plans/PLAN-TASK-010-배당실적.md`

---

## 사전 조사 결과 (계획 단계에서 확인한 사실)

- 배당 시트(`1NTV6g6vCg-HVn9dBeoDlFX-DOkIMLG40gzcs1Q6kgzQ`, "6.배당금 계산기")는 기존 투자 실적 시트와 **별도 문서**. "3.배당금지급" 탭 헤더는 3행(일자/연도/월/일/계좌/종목코드/종목명/배당주식수/1주당배당금액/분배율/원화 배당금/외화 배당금/원화환산), 데이터는 5행부터 시작
- 실 데이터 16건(2026-07-20~2026-08-20) 확인, **아직 오지 않은 미래 지급 예정 데이터도 미리 입력**되어 있음 → 수집 시 오늘 날짜 이하만 반영
- 외화 배당금 컬럼은 현재 값이 있는 행이 없어 이번 범위에서는 저장하지 않음(원화 배당금만 사용)
- 시트의 계좌명 7종(처리투자/은퇴투자/ISA/퇴직연금/개인연금(기존)/개인연금(신)/DC계좌)은 사용자가 이미 DB `accounts.account_name`과 **정확히 1:1 일치**하도록 시트를 수정 완료(실측 재확인 완료, 별도 매핑 로직 불필요)
- 서비스 계정(`stock-admin@stock-dashboard-503106.iam.gserviceaccount.com`)에 새 시트 뷰어 권한 공유 완료

### 확정된 결정 사항
- 미래 날짜 데이터는 수집 대상에서 제외(`payment_date <= 오늘`)
- 별도 크론 없이 기존 `/api/cron/collect`에 통합 수집
- 대시보드 차트: 월별 스택(적층) 막대차트, X축 월, 계좌별 색상 구간
- 네비게이션: 기존 4개 탭 다음 5번째 탭 "배당실적"(`/dividend`)
- 조회 조건: 배당종목명 다중 선택 + 연도/월 범위
- 리스트 구조: `GroupedDetailTable`과 동일한 연금/개인투자 그룹 접기·펼치기+소계+합계 구조를 **년월별로 반복**
- 배당금액 셀 호버 시 해당 년월+계좌의 종목별 상세 내역(종목명/종목코드/배당주식수/1주당배당금액/분배율/원화배당금)을 툴팁으로 표시

---

## 구현 사항

### 1. 사전 준비
- [x] 서비스 계정에 배당 시트 뷰어 권한 공유 (사용자 완료)
- [x] 배당 시트 계좌명을 DB `accounts.account_name`과 일치하도록 수정 (사용자 완료, 실측 재확인)
- [ ] `.env.local`/Vercel Production에 `GOOGLE_DIVIDEND_SHEET_ID` 환경변수 추가

### 2. DB 스키마
- [ ] `supabase/migrations/`에 `dividend_snapshots` 테이블 마이그레이션 작성 (계좌 FK + 지급일 + 종목코드 기준 유니크, 사용자 승인 후 적용)
- [ ] `src/lib/types/database.ts`에 `DividendSnapshotRow` 타입 추가
- [ ] `src/lib/types/dividend.ts`(신규)에 앱 레벨 `DividendSnapshot` 타입 정의
- [ ] `src/lib/types/mappers.ts`에 Row↔App 매퍼 추가

### 3. Google Sheets 수집 확장
- [ ] `src/lib/google-sheets/client.ts`에 `fetchDividendSheetRows()` 추가 (별도 스프레드시트 ID, 읽기 전용 스코프 재사용)
- [ ] `src/lib/google-sheets/parser.ts`에 `parseDividendSheet(rows)` 추가: 헤더 스킵, 컬럼 매핑, 오늘 날짜 이하만 필터링
- [ ] 계좌명 매칭 실패 시(향후 시트에 신규 계좌명 추가 등) 명확한 에러로 조기 발견되도록 처리

### 4. Supabase upsert 로직
- [ ] `src/lib/supabase/collect.ts`에 `upsertDividendSnapshots(dividendRows, collectedAt)` 추가, `(account_id, stock_code, payment_date)` 기준 upsert
- [ ] `collectFromSheet()`에 배당 수집 통합, 배당 수집 실패가 기존 계좌/자산군 수집에 영향 주지 않도록 처리

### 5. 조회 함수
- [ ] `src/lib/supabase/queries.ts`에 `getDividendSnapshots()` 추가

### 6. 화면 구현 (`/dividend`)
- [ ] `src/app/dividend/page.tsx` 신규 (Server Component)
- [ ] 조회 조건 폼: 배당종목명 다중 선택(`AccountMultiSelect` 패턴 재사용, 대상만 종목명으로 교체) + 연도/월 범위(`MonthRangeSelect` 재사용)
- [ ] `src/components/dividend/dividend-stacked-bar-chart.tsx`: 월별 스택 막대차트(계좌별 색상 구간), 기존 `chart-container.tsx` 재사용
- [ ] `src/components/dividend/dividend-list-table.tsx`: 년월 블록별 연금/개인투자 그룹 접기·펼치기+소계+합계 구조, 배당금액 셀에 Tooltip으로 종목별 상세 내역 표시
- [ ] `MainNav`에 `{ href: "/dividend", label: "배당실적" }` 추가

### 7. 통합 테스트 및 문서화
- [ ] dry-run으로 배당 시트 파싱 결과 확인(미래 날짜 제외 필터링 검증)
- [ ] 실제 수집 실행으로 DB 반영 확인
- [ ] 브라우저로 `/dividend` 화면 확인(차트/리스트/호버 툴팁/탭 전환/반응형)
- [ ] 본 문서 및 `docs/ROADMAP.md` 갱신

---

## 수락 기준

1. [ ] 배당 시트의 오늘 이하 날짜 데이터만 DB에 반영되고, 미래 지급 예정 데이터는 제외된다
2. [ ] 동일 계좌가 같은 달에 여러 종목의 배당을 받아도 각 건이 개별 레코드로 정확히 upsert된다(중복/누락 없음)
3. [ ] 월별 스택 막대차트의 계좌별 구간 합이 그 달 전체 배당금액과 일치한다
4. [ ] 리스트에서 년월 블록별 연금/개인투자 그룹소계와 개별 계좌 배당금액 합이 일치하고, 그 달 합계가 그룹소계 합과 일치한다
5. [ ] 배당종목명 다중 선택 및 연도/월 범위 조건 변경 시 차트/리스트가 함께 갱신된다
6. [ ] 배당금액 셀 호버 시 해당 년월+계좌의 종목별 상세 내역(종목명/종목코드/배당주식수/1주당배당금액/분배율/원화배당금)이 정확히 표시된다
7. [ ] 배당 데이터가 없는 경우(수집 전) 빈 상태 UI가 표시된다
8. [ ] 기존 4개 화면과 동일하게 반응형(375px/1280px) 및 typecheck/lint/build 통과

---

## 테스트 체크리스트

> API/비즈니스 로직 및 신규 화면이 포함되므로 브라우저 자동화(claude-in-chrome)로 시나리오 검증

- [ ] `?dryRun=true`로 배당 시트 파싱 결과(오늘 이하 필터링 포함) 확인
- [ ] 실제 수집 실행 후 `dividend_snapshots` 테이블에 정상 upsert 확인
- [ ] `/dividend` 화면 진입 시 기본 조회 결과(전체 종목/기본 기간) 정상 렌더링 확인
- [ ] 배당종목명 다중 선택 변경 시 차트/리스트 갱신 확인
- [ ] 연도/월 범위 변경 시 차트/리스트 갱신 확인
- [ ] 리스트 년월 블록 접기/펼치기 동작 확인
- [ ] 배당금액 셀 호버 시 종목별 상세 내역 툴팁 확인
- [ ] 계좌 필터로 결과 0건 유발 시 빈 상태 UI 확인
- [ ] 375px/1280px 반응형 확인
- [ ] 4개 기존 화면과 배당실적 화면 간 탭 전환 플로우 확인

---

## 관련 파일

### 신규 생성
```
supabase/migrations/2026072x000000_create_dividend_snapshots.sql
src/lib/types/dividend.ts
src/app/dividend/page.tsx
src/components/dividend/dividend-stacked-bar-chart.tsx
src/components/dividend/dividend-list-table.tsx
docs/tasks/TASK-010.md
docs/plans/PLAN-TASK-010-배당실적.md
```

### 수정
```
src/lib/types/database.ts          (DividendSnapshotRow 추가)
src/lib/types/mappers.ts           (Row↔App 매퍼 추가)
src/lib/google-sheets/client.ts    (fetchDividendSheetRows 추가)
src/lib/google-sheets/parser.ts    (parseDividendSheet 추가)
src/lib/supabase/collect.ts        (upsertDividendSnapshots 추가, collectFromSheet 확장)
src/lib/supabase/queries.ts        (getDividendSnapshots 추가)
src/components/navigation/main-nav.tsx  (배당실적 탭 추가)
.env.local.example                 (GOOGLE_DIVIDEND_SHEET_ID 추가)
docs/ROADMAP.md
```

---

## 주의사항

1. `dividend_snapshots`의 유니크 키는 `(account_id, stock_code, payment_date)` — 기존 `account_snapshots`(계좌+날짜)와 달리 같은 계좌가 같은 날 여러 종목 배당을 받을 수 있으므로 종목코드가 유니크 키에 포함되어야 함
2. 배당 시트는 미래 지급 예정 데이터를 미리 포함하므로, 파서에서 반드시 오늘 날짜 이하로 필터링 — 이 필터를 빠뜨리면 아직 지급되지 않은 배당이 실적으로 잘못 집계됨
3. 계좌명은 현재 시트-DB가 정확히 일치하지만, 향후 시트에 새 계좌가 추가되거나 표기가 다시 바뀌면 매칭 실패가 발생할 수 있으므로 명확한 에러 로그로 조기 발견 가능하게 구현
4. 배당 수집 실패가 기존 계좌/자산군 수집 성공에 영향을 주지 않도록 분리 처리(Task 009의 알림 부분 실패 패턴과 유사한 방어적 설계)
5. Vercel Production에 `GOOGLE_DIVIDEND_SHEET_ID` 신규 환경변수 등록 필요 (Task 008/009 선례와 동일하게 사용자가 직접 입력)

---

## 다음 단계

Task 010 완료 후: 외화 배당금 컬럼 활용 여부, 배당 재투자 수익률 반영 등은 실제 데이터가 쌓이며 필요성 확인 후 후속 과제로 검토
