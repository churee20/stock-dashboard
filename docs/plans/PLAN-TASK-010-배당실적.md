# Task 010: 배당실적 화면 신규 개발

## Context

`01.요구사항/추가 기능 요구사항_20260724.txt`에 명시된 요구사항: 별도 구글 스프레드시트("6.배당금 계산기", `1NTV6g6vCg-HVn9dBeoDlFX-DOkIMLG40gzcs1Q6kgzQ`)의 "3.배당금지급" 탭 데이터를 수집해, 계좌별/월별 배당 실적을 대시보드(막대차트) + 리스트로 조회하는 신규 화면("배당실적")을 만든다.

세션 중 실제 시트에 접근해 확인한 사실:
- 헤더는 3행(`일자, 연도, 월, 일, 계좌, 종목코드, 종목명, 배당주식수, 1주당배당금액, 분배율, 원화 배당금, 외화 배당금, 원화환산`), 데이터는 5행부터 시작 (A열은 항상 빈 값)
- 현재 실 데이터는 16건(2026-07-20 ~ 2026-08-20)뿐이고, **아직 오지 않은 미래 날짜의 배당금도 미리 입력**되어 있음(지급 예정 스케줄)
- 외화 배당금 컬럼은 현재 값이 있는 행이 없음(전부 공백) — 원화 배당금만 실질적으로 사용
- 시트의 계좌명 7종(처리투자/은퇴투자/ISA/퇴직연금/개인연금(기존)/개인연금(신)/DC계좌)은 사용자가 이미 DB `accounts.account_name`과 **정확히 1:1 일치**하도록 시트를 수정 완료함(매핑 로직 불필요, 실측 재확인함)

세션 중 확정된 결정 사항:
- **미래 날짜 데이터**: 오늘 날짜 이하(`snapshot_date <= 오늘`)만 수집, 미래 지급 예정 행은 제외
- **수집 방식**: 별도 크론/API Route를 신설하지 않고 기존 `/api/cron/collect`에 통합(같은 실행에서 계좌/자산군 수집과 함께 배당 데이터도 upsert)
- **차트 형태**: 월별 스택(적층) 막대차트 — X축 월, 각 막대 안에서 계좌별 색상 구간으로 배당금 누적 표시
- **네비게이션**: 기존 4개 탭(현재실적/일별추적/주별추적/월별실적) 다음 5번째 탭으로 "배당실적" 추가, `/dividend` 라우트 신설
- **조회 조건**: 배당종목명 필터는 다중 선택(기존 `AccountMultiSelect` 패턴과 동일하게 `Command`+`Popover`+`Checkbox` 조합 검토)
- **리스트 구조**: 기존 대시보드 `GroupedDetailTable`과 동일하게 연금/개인투자 그룹 접기·펼치기 + 그룹소계 + 합계 구조를 사용하되, **년월별로 이 그룹 구조를 반복**(년월 블록마다 연금 그룹/개인투자 그룹 접기·펼치기 + 그 달 합계)
- **리스트 인터랙션(사용자 추가 요청)**: 리스트의 배당금액 셀에 마우스 호버 시, 해당 년월+계좌에 속한 개별 종목 배당 내역(종목명/종목코드/배당주식수/1주당배당금액/분배율/원화배당금)을 툴팁으로 표시

## 데이터 모델

### 신규 테이블: `dividend_snapshots`

기존 `account_snapshots`/`asset_class_snapshots`와 동일한 패턴(계좌 마스터 FK + 날짜 + upsert). 배당은 "동일 계좌 + 동일 종목 + 동일 지급일"이 유니크 키가 되어야 한다(같은 계좌가 같은 날 여러 종목의 배당을 받을 수 있으므로 `account_snapshots`처럼 계좌+날짜 단일 유니크로는 부족).

```sql
create table public.dividend_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  payment_date date not null,        -- 시트 "일자"
  stock_code text not null,          -- 종목코드
  stock_name text not null,          -- 종목명
  dividend_shares numeric not null,  -- 배당 주식수
  dividend_per_share numeric not null, -- 1주당 배당금액
  dividend_rate numeric not null,    -- 분배율(%)
  dividend_amount numeric not null,  -- 원화 배당금
  collected_at timestamptz not null,
  unique (account_id, stock_code, payment_date)
);

create index idx_dividend_snapshots_payment_date
  on public.dividend_snapshots (payment_date);
```

- 연도/월은 `payment_date`에서 파생 가능하므로 별도 컬럼 불필요(집계 시 `date_trunc`/JS Date로 처리)
- 외화 배당금 컬럼은 현재 실사용 데이터가 없어 이번 범위에서 저장하지 않음(향후 필요 시 컬럼 추가로 확장)

## 작업 개요

이 Task는 **계획 문서만 작성**한다. 실제 코드 구현은 사용자 승인 후 별도로 진행한다(TASK-006/008/009 선례와 동일한 순서).

1. `docs/tasks/TASK-010.md` 작성
2. shrimp task manager에 하위 작업 등록(append 모드)
3. 사용자 승인 후 순차 구현

## 구현 단계 (초안)

### 1. DB 스키마
- `supabase/migrations/`에 `dividend_snapshots` 테이블 마이그레이션 작성, 사용자 승인 후 적용
- `src/lib/types/database.ts`에 `DividendSnapshotRow` 타입 추가
- `src/lib/types/account.ts` 또는 신규 `dividend.ts`에 앱 레벨 `DividendSnapshot` 타입 정의, `mappers.ts`에 Row↔App 매퍼 추가

### 2. Google Sheets 수집 확장
- `src/lib/google-sheets/client.ts`에 두 번째 스프레드시트(`GOOGLE_DIVIDEND_SHEET_ID` 신규 환경변수)용 `fetchDividendSheetRows()` 추가 — 기존 `createGoogleSheetsClient()`는 스코프 그대로 재사용 가능(읽기 전용), 시트 ID만 다르게 지정
- `src/lib/google-sheets/parser.ts`에 `parseDividendSheet(rows)` 추가: 3행 헤더 스킵, 컬럼 인덱스 매핑(일자=1, 계좌=5, 종목코드=6, 종목명=7, 배당주식수=8, 1주당배당금액=9, 분배율=10, 원화배당금=11), **오늘 날짜 이하만 필터링**
- 계좌명 매핑: 시트 계좌명이 이미 DB와 일치하므로 별도 정규화 로직 불필요, 다만 매칭 실패(향후 시트에 새 계좌명 추가 시) 시 명확한 에러로 조기 발견되도록 처리

### 3. Supabase upsert 로직
- `src/lib/supabase/collect.ts`에 `upsertDividendSnapshots(dividendRows, collectedAt)` 추가, `(account_id, stock_code, payment_date)` 기준 upsert
- `collectFromSheet()`에 배당 수집을 통합(계좌/자산군 수집과 나란히, 실패해도 서로 영향 없도록 개별 try/catch 검토)

### 4. 조회 함수
- `src/lib/supabase/queries.ts`에 `getDividendSnapshots()` 추가(전체 조회, 화면에서 필터링은 클라이언트 측 집계로 처리— 기존 daily/weekly/monthly 패턴과 동일)

### 5. 화면 구현 (`/dividend`)
- `src/app/dividend/page.tsx` 신규(Server Component, `getAccounts()` + `getDividendSnapshots()` 조회)
- 조회 조건: 배당종목명 다중 선택(기존 `AccountMultiSelect`와 동일한 `Command`+`Popover`+`Checkbox` 패턴, 대상만 계좌→종목명으로 교체) + 연도/월 범위 선택(기존 `MonthRangeSelect` 재사용)
- 월별 스택 막대차트: 신규 `src/components/dividend/dividend-stacked-bar-chart.tsx`, 기존 `chart-container.tsx`(ChartContainer/ChartTooltip 래퍼) 재사용, 계좌별 색상은 기존 `--chart-1~5` 팔레트 재사용
- 리스트 테이블: 신규 `src/components/dividend/dividend-list-table.tsx` — 기존 `GroupedDetailTable`과 동일한 그룹 접기/펼치기 구조를 **년월 단위로 반복**:
  - 년월 블록(예: "2026년 08월") → 그 안에 연금 그룹(접기/펼치기, 그룹소계) / 개인투자 그룹(접기/펼치기, 그룹소계) → 그 달 합계 행
  - 개별 계좌 행의 배당금액 셀에 `Tooltip`(shadcn) 적용, 호버 시 해당 년월+계좌의 종목별 상세 내역(종목명/종목코드/배당주식수/1주당배당금액/분배율/원화배당금) 표시 — 한 계좌가 같은 달에 여러 종목 배당을 받을 수 있으므로 합산액 대신 내역 목록 형태로 표시
- `MainNav`에 `{ href: "/dividend", label: "배당실적" }` 5번째 항목 추가

### 6. 사전 준비 (사용자 작업)
- Google 서비스 계정(`stock-admin@stock-dashboard-503106.iam.gserviceaccount.com`)에 새 배당 시트 뷰어 권한 공유(**세션 중 이미 완료**)
- `.env.local`/Vercel Production에 `GOOGLE_DIVIDEND_SHEET_ID=1NTV6g6vCg-HVn9dBeoDlFX-DOkIMLG40gzcs1Q6kgzQ` 추가

### 7. 통합 테스트 및 문서화
- dry-run으로 배당 시트 파싱 결과 확인(미래 날짜 제외 필터링 검증)
- 실제 수집 실행으로 DB 반영 확인
- 브라우저로 `/dividend` 화면 확인(차트/리스트/호버 툴팁/탭 전환)
- `docs/tasks/TASK-010.md`, `docs/ROADMAP.md` 갱신

## 확정 사항 (2026-07-24 재확인)

- 배당종목명 조회 조건: **다중 선택**
- 리스트 구조: 대시보드 상세 테이블(`GroupedDetailTable`)과 동일하게 연금/개인투자 그룹 접기·펼치기 + 그룹소계 + 합계 구조를 사용하되, **년월별로 이 구조를 반복**(년월 블록마다 그룹 구조 전체가 다시 나타남)

## 다음 단계

이 계획에 대해 사용자 승인을 받은 뒤:
1. `docs/tasks/TASK-010.md`를 위 초안 기준으로 정식 작성
2. shrimp task manager에 `split_tasks`(append 모드)로 하위 작업 등록
3. DB 마이그레이션 → 수집 파이프라인 → 화면 구현 → 통합 테스트 순으로 진행
