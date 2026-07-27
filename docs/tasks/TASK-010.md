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
- **(2026-07-27 변경)** 리스트의 종목별 상세는 호버 툴팁이 아니라 **리스트에 항상 노출되는 개별 행**으로 표시 — 컬럼: 년월/계좌 구분, 종목명(종목코드), 배당수량, 배당금액(주당), 배당율, 배당금액. 한 계좌가 같은 달 여러 종목의 배당을 받으면 그 계좌 아래에 종목 수만큼 행이 나열됨(계좌명은 첫 행에만 표기)

---

## 구현 사항

### 1. 사전 준비
- [x] 서비스 계정에 배당 시트 뷰어 권한 공유 (사용자 완료)
- [x] 배당 시트 계좌명을 DB `accounts.account_name`과 일치하도록 수정 (사용자 완료, 실측 재확인)
- [x] `.env.local`에 `GOOGLE_DIVIDEND_SHEET_ID` 환경변수 추가, 실제 시트 접근 검증 완료

### 2. DB 스키마
- [x] `supabase/migrations/20260724000000_create_dividend_snapshots.sql` 작성 및 사용자 승인 후 실제 프로젝트(xbyqkektljnhyveqvfgx)에 적용, `list_tables`로 정상 생성 확인
- [x] `src/lib/types/database.ts`에 `DividendSnapshotRow` 타입 추가
- [x] `src/lib/types/dividend.ts`(신규)에 앱 레벨 `DividendSnapshot` 타입 정의
- [x] `src/lib/types/mappers.ts`에 `mapDividendSnapshotRowToItem`, `mapSheetRowToDividendSnapshotInsert` 매퍼 추가

### 3. Google Sheets 수집 확장
- [x] `src/lib/google-sheets/client.ts`에 `getGoogleDividendSheetId()`, `fetchDividendSheetRows()` 추가
- [x] `src/lib/google-sheets/parser.ts`에 `parseDividendSheet(rows, today?)` 추가: 헤더 스킵, 컬럼 매핑(`YYYY/MM/DD`→`YYYY-MM-DD` 정규화), 오늘 날짜 이하만 필터링
- [x] 계좌명 매칭 실패 시 `upsertDividendSnapshots`에서 명확한 에러(`배당 계좌 ID를 찾을 수 없습니다: {계좌명}`)를 던지도록 구현

### 4. Supabase upsert 로직
- [x] `src/lib/supabase/collect.ts`에 `upsertDividendSnapshots(accountIdByName, dividendRows, collectedAt)` 추가, `(account_id, stock_code, payment_date)` 기준 upsert
- [x] `collectFromSheet()`에 배당 수집 통합, 별도 try/catch로 감싸 배당 수집 실패가 기존 계좌/자산군 수집 성공(`CollectResult`)에 영향 주지 않도록 처리(`dividendError` 필드로만 노출)
- [x] `route.ts`에 배당 시트 조회/파싱 통합(조회 자체 실패도 별도 try/catch), dry-run 응답에 `dividendRawRowCount`/`parsedDividendRows` 포함

### 5. 조회 함수
- [x] `src/lib/supabase/queries.ts`에 `getDividendSnapshots()` 추가

### 6. 화면 구현 (`/dividend`)
- [x] `src/app/dividend/page.tsx` 신규 (Server Component, `getAccounts()`+`getDividendSnapshots()` 조회)
- [x] `src/components/dividend/dividend-stock-multi-select.tsx`: 배당종목명 다중 선택(`AccountMultiSelect` 패턴 재사용)
- [x] `src/components/dividend/dividend-view-container.tsx`: 종목명 필터 + `MonthRangeSelect`(연도/월 범위)로 상태 관리, 데이터 없음/필터결과 0건 각각의 빈 상태 UI
- [x] `src/components/dividend/dividend-stacked-bar-chart.tsx`: 월별 스택 막대차트(계좌별 `--chart-1~5` 색상 순환), 기존 `chart-container.tsx` 재사용
- [x] `src/components/dividend/dividend-list-table.tsx`: 년월 블록별 연금/개인투자 그룹 접기·펼치기+소계+합계 구조. **(2026-07-27 변경)** 계좌별 배당금액 셀의 호버 툴팁을 제거하고, 종목별 상세(종목명(종목코드)/배당수량/배당금액(주당)/배당율/배당금액)를 계좌 아래 개별 행으로 항상 노출하도록 재작성(6컬럼 테이블, `colSpan`으로 년월/소계/합계 행 정렬)
- [x] shadcn `tooltip` 컴포넌트 설치(`@base-ui/react` 기반), `layout.tsx`에 `TooltipProvider` 추가 — 이번 리스트 변경으로 실사용처는 없어졌으나 향후 재사용 가능성을 고려해 사용자 확인 하에 코드는 유지
- [x] `MainNav`에 `{ href: "/dividend", label: "배당실적" }` 5번째 탭 추가

### 7. 통합 테스트 및 문서화
- [x] dry-run으로 배당 시트 파싱 결과 확인(미래 날짜 제외 필터링 검증) — 최초 검증(2026-07-24)과 최종 재검증(2026-07-27) 모두 오늘 이하 2건만 정확히 파싱, 미래 예정 2건 제외 확인
- [x] 실제 수집 실행으로 DB 반영 확인 (Task 5 단계에서 실측, `dividend_snapshots`에 2건 upsert 및 정확한 계좌 FK 연결 확인)
- [x] 브라우저로 `/dividend` 화면 확인(차트/리스트/호버 툴팁/탭 전환) — claude-in-chrome으로 실제 검증
- [x] 본 문서 및 `docs/ROADMAP.md` 갱신

---

## 수락 기준

1. [x] 배당 시트의 오늘 이하 날짜 데이터만 DB에 반영되고, 미래 지급 예정 데이터는 제외된다 — dry-run 2회(7/24, 7/27) 모두 확인
2. [x] 동일 계좌가 같은 달에 여러 종목의 배당을 받아도 각 건이 개별 레코드로 정확히 upsert된다(중복/누락 없음) — `(account_id, stock_code, payment_date)` 유니크 키로 보장, 차트/리스트 집계 로직도 가상 데이터로 검증
3. [x] 월별 스택 막대차트의 계좌별 구간 합이 그 달 전체 배당금액과 일치한다 — 가상 데이터(다종목 포함)로 검증
4. [x] 리스트에서 년월 블록별 연금/개인투자 그룹소계와 개별 계좌 배당금액 합이 일치하고, 그 달 합계가 그룹소계 합과 일치한다 — 가상 데이터로 검증
5. [x] 배당종목명 다중 선택 및 연도/월 범위 조건 변경 시 차트/리스트가 함께 갱신된다 — 브라우저 실측 확인
6. [x] 리스트에서 종목별 상세 내역(종목명(종목코드)/배당수량/배당금액(주당)/배당율/배당금액)이 계좌 아래 개별 행으로 정확히 표시된다 — 브라우저 실측 확인(은퇴투자: KODEX 200 타겟 커버드콜(498400) | 1,911주 | ₩323 | 1.53% | 617,253)
7. [x] 배당 데이터가 없는 경우(수집 전) 빈 상태 UI가 표시된다 — 컨테이너 레벨에서 `dividendSnapshots.length === 0` / `filteredSnapshots.length === 0` 각각 분기 처리
8. [x] 기존 4개 화면과 동일하게 반응형 및 typecheck/lint/build 통과 — 1280px는 브라우저 실측, 375px는 브라우저 자동화 도구의 리사이즈-렌더링 반영 제약으로 코드 레벨 검토로 대체(TASK-004 선례와 동일 방식)

---

## 테스트 체크리스트

> API/비즈니스 로직 및 신규 화면이 포함되므로 브라우저 자동화(claude-in-chrome)로 시나리오 검증

- [x] `?dryRun=true`로 배당 시트 파싱 결과(오늘 이하 필터링 포함) 확인
- [x] 실제 수집 실행 후 `dividend_snapshots` 테이블에 정상 upsert 확인 (Task 5 단계, 이후 재실행은 불필요한 알림 재발생을 피하기 위해 생략)
- [x] `/dividend` 화면 진입 시 기본 조회 결과(전체 종목/기본 기간) 정상 렌더링 확인
- [x] 배당종목명 다중 선택 드롭다운 동작 확인
- [x] 리스트 년월 블록 접기/펼치기 동작 확인 (그룹 접기/펼치기 상태 관리 코드 검증)
- [x] 리스트에 종목별 상세 내역(종목명(종목코드)/배당수량/배당금액(주당)/배당율/배당금액)이 개별 행으로 표시됨 확인 — 브라우저 실측
- [x] 5개 화면(현재실적/일별추적/주별추적/월별실적/배당실적) 간 탭 전환 플로우 확인 — 브라우저 실측
- [x] 375px 반응형은 코드 레벨 검토로 대체(shadcn `Table`의 `overflow-x-auto`, `flex-col sm:flex-row` 패턴이 기존 화면과 동일함을 확인)

---

## 관련 파일

### 신규 생성
```
supabase/migrations/20260724000000_create_dividend_snapshots.sql
src/lib/types/dividend.ts
src/app/dividend/page.tsx
src/components/dividend/dividend-stacked-bar-chart.tsx
src/components/dividend/dividend-list-table.tsx
src/components/dividend/dividend-stock-multi-select.tsx
src/components/dividend/dividend-view-container.tsx
src/components/ui/tooltip.tsx
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
src/app/api/cron/collect/route.ts  (배당 시트 조회/파싱 통합)
src/app/layout.tsx                 (TooltipProvider 추가)
src/components/navigation/main-nav.tsx  (배당실적 탭 추가)
.env.local                         (GOOGLE_DIVIDEND_SHEET_ID 추가, 로컬 전용)
.env.local.example                 (GOOGLE_DIVIDEND_SHEET_ID 키 이름 추가)
docs/ROADMAP.md
```

---

## 디버깅 노트 (트러블슈팅 기록)

**투자실적 시트-DB 계좌명 불일치로 인한 중복 계좌 생성 사고**: 배당 시트에 맞춰 DB `accounts.account_name`을 공백 없는 표기(`DC계좌`/`처리투자`/`ISA`)로 갱신했으나, 기존 투자실적 시트("1.투자 현황(현재)" 탭)는 여전히 공백 포함 표기(`DC 계좌`/`처리 투자`/`ISA 계좌`)를 쓰고 있어, 실제 실행 검증 중 이를 신규 계좌로 오인해 중복 계좌 3개(및 연결된 오늘자 스냅샷)가 생성됨. 사용자 승인 하에 중복 계좌+스냅샷 삭제, 투자실적 시트를 DB 기준으로 수정, 재실행으로 `accountCount:8, newAccountCount:0` 정상화 확인. 이는 배당 upsert 로직 자체의 버그가 아니라 이번 작업으로 계좌명 표기 정책이 바뀌면서 표면화된 기존 시트와의 정합성 이슈였음.

---

## 변경 이력

**2026-07-27: 리스트 항목 UI 변경 (호버 툴팁 → 개별 행 노출)**
- 사용자 요청으로 계좌별 배당금액 셀의 호버 툴팁을 제거하고, 종목별 상세 내역을 리스트에 항상 표시되는 개별 행으로 변경
- 신규 컬럼 구성: 년월/계좌 구분, 종목명(종목코드), 배당수량, 배당금액(주당), 배당율, 배당금액(총 6컬럼)
- `dividend-list-table.tsx`를 6컬럼 테이블로 재작성, 년월 헤더/그룹소계/월합계 행은 `colSpan`으로 정렬 유지, 계좌 아래 종목별 스냅샷을 각각 한 행씩 렌더링(계좌명은 그 계좌의 첫 행에만 표기)
- shadcn Tooltip(`ui/tooltip.tsx`)과 `layout.tsx`의 `TooltipProvider`는 더 이상 이 화면에서 쓰이지 않지만, 향후 재사용 가능성을 고려해 삭제하지 않고 유지하기로 사용자와 확인
- typecheck/lint 통과, claude-in-chrome으로 실제 렌더링 확인(은퇴투자/처리투자 각각의 종목 정보가 팝업 없이 리스트에 바로 노출됨)

---

## 주의사항

1. `dividend_snapshots`의 유니크 키는 `(account_id, stock_code, payment_date)` — 기존 `account_snapshots`(계좌+날짜)와 달리 같은 계좌가 같은 날 여러 종목 배당을 받을 수 있으므로 종목코드가 유니크 키에 포함되어야 함
2. 배당 시트는 미래 지급 예정 데이터를 미리 포함하므로, 파서에서 반드시 오늘 날짜 이하로 필터링 — 이 필터를 빠뜨리면 아직 지급되지 않은 배당이 실적으로 잘못 집계됨
3. 계좌명은 현재 시트-DB가 정확히 일치하지만, 향후 어느 한쪽 시트(투자실적 또는 배당)만 표기를 바꾸면 다시 불일치가 발생할 수 있음 — 계좌명 변경 시 두 시트 모두 동시에 갱신 필요
4. 배당 수집 실패가 기존 계좌/자산군 수집 성공에 영향을 주지 않도록 분리 처리(Task 009의 알림 부분 실패 패턴과 유사한 방어적 설계)
5. Vercel Production에 `GOOGLE_DIVIDEND_SHEET_ID` 신규 환경변수가 아직 등록되지 않음 — 등록 전까지 프로덕션에서는 배당 수집이 되지 않음(계좌/자산군 수집은 정상 동작)
6. `/api/cron/collect`를 dryRun 없이 실제 호출하면 카카오톡/Slack/구글캘린더 알림이 실제로 발송됨 — 향후 검증 시 기본적으로 dryRun을 사용하고, 실제 호출이 필요하면 사전에 안내 후 진행할 것(세션 중 이 원칙을 확정함)

---

## 다음 단계

1. **Vercel Production 환경변수 `GOOGLE_DIVIDEND_SHEET_ID` 등록 필요** (사용자가 직접 입력, Task 008/009 선례와 동일 절차) — 등록 전까지는 프로덕션 자동 크론에서 배당 데이터가 수집되지 않음
2. 등록 후 다음 평일 정규 크론 실행(KST 16:00)에서 배당 데이터 자동 수집 및 화면 반영을 최종 확인
3. 외화 배당금 컬럼 활용 여부, 배당 재투자 수익률 반영 등은 실제 데이터가 쌓이며 필요성 확인 후 후속 과제로 검토
