# Task 003 / Task 004: 공통 컴포넌트 라이브러리 + 4개 화면 UI 완성 (더미 데이터)

## Context

ROADMAP.md Phase 2 "UI/UX 완성 (더미 데이터 활용)"을 진행한다. Task 001(라우팅 골격 + Header/MainNav)은 완료된 상태이고, 4개 라우트(`/`, `/daily`, `/weekly`, `/monthly`)는 아직 `<h1>` placeholder뿐이다. Task 002(Supabase 스키마/타입 정식화)는 Phase 3로 로드맵상 Task 003/004보다 뒤에 있으므로, PRD 6.2절의 개략 데이터 모델을 선행 타입으로 정의해두고 더미 데이터로 4개 화면을 완성한다. 실 데이터 연동(Task 005)은 범위 밖이며, 여기서 만드는 집계/타입 로직은 그대로 승격되도록 설계한다.

세션 중 확정된 결정 사항:
- 차트 라이브러리: **Recharts** (shadcn/ui 공식 chart 컴포넌트가 Recharts 기반)
- shadcn 스타일: **base-nova** 유지 (문서의 "new-york" 언급은 오기, 실제 설정 기준으로 감)
- 꺾은선 그래프 Y축: **토글 방식** (금액 보기 / 수익률 보기 버튼 전환, 단일 Y축 유지)
- 수익 강조색: **신규 시맨틱 변수 추가** (`--profit-positive`/`--profit-negative`), 기존 `--destructive`(위험/삭제 의미)와 분리
- 계좌 다중선택 등 조회 조건 상태: **각 페이지 로컬 useState** (Zustand는 Task 005 이후 실제 필요성 확인되면 도입 — PRD 8장과의 불일치는 Task 004 문서 주의사항에 사유 명시)
- Task 003 / Task 004는 **독립 문서 2개**로 작성 (TASK-001/006 선례를 따름, "부품 제작" vs "화면 조립"으로 성격이 다름)

## 작업 개요

1. `docs/tasks/TASK-003.md` 작성 (공통 컴포넌트 라이브러리 명세)
2. `docs/tasks/TASK-004.md` 작성 (4개 화면 UI 완성 명세, Task 003 완료를 전제)
3. 두 문서 모두 TASK-001.md/TASK-006.md와 동일한 구조: 개요 → 구현 사항(체크박스) → 수락 기준 → 관련 파일 → 구현 단계 → 주의사항 → 다음 단계
4. **문서만 작성한다 — 코드 구현은 이 Task 범위에 포함하지 않는다** (사용자가 이전 세션에서 Task 001/006도 "문서 작성 → 승인 → 별도로 구현 진행" 순서를 따랐음)

## TASK-003.md 구성 내용

### 구현 사항
1. **패키지 설치**: `recharts`, `zustand`(설치만, 사용은 보류), `react-hook-form`, `zod`, `@hookform/resolvers`, `dayjs`(+`isoWeek` 플러그인)
2. **shadcn 컴포넌트 추가**: `table`, `checkbox`, `popover`, `command`, `calendar`, `select`, `badge`, `skeleton`, `separator`, `form` (`npx shadcn@latest add ...`, base-nova 스타일 그대로 적용됨)
3. **색상 인프라**: `globals.css`의 `--chart-1~5`를 그레이스케일 → 채도 있는 카테고리컬 팔레트로 교체(dataviz 스킬 팔레트 검증 적용), `--profit-positive`/`--profit-negative` 신규 변수 추가 (light/dark 모두)
4. **선행 타입 정의** (`src/lib/types/`):
   - `account.ts`: `AccountType`, `Account`, `AccountSnapshot` (PRD 6.2 기준, "Task 002에서 Supabase 타입으로 교체 예정" 주석 명시)
   - `dashboard.ts`: `SummaryCardData`, `GroupBreakdown`, `AccountRatioItem`
   - `period-view.ts`: `PeriodGranularity`, `PeriodRowGroup`, `PeriodTableRow`, `PeriodChartPoint`
5. **더미 데이터 유틸리티** (`src/lib/dummy-data/`):
   - `accounts.ts`: 계좌 8종 고정 마스터 (연금 5: 퇴직연금/개인연금(기존)/개인연금(신)/DC계좌/퇴직연금(삼성), 개인투자 3: 처리투자/은퇴투자/ISA계좌 — agent.md 명칭 참고, 마스킹된 예시 번호만 사용)
   - `generate-snapshots.ts`: 시드 기반(mulberry32 등 결정론적 PRNG) 랜덤워크로 일별 스냅샷 생성. **최소 14개월치**(연도 경계를 넘겨 월별 화면의 "년도 선택"이 의미 있도록) 생성, 주말은 전일값 유지 옵션
   - `aggregate.ts`: `aggregateToWeekly`/`aggregateToMonthly`(해당 기간 마지막 수집일 대표값 — PRD 5.4/5.5 규칙과 동일), `calculateGroupTotals`(연금/개인투자 소계 + 전체합계). Task 005에서 실 데이터 집계 로직으로 그대로 승격 가능하도록 순수 함수로 작성
   - `index.ts`: 배럴 export + 모듈 로드 시 1회 생성되는 완제품 더미 데이터셋
6. **공통 컴포넌트**:
   - `components/charts/donut-chart.tsx`, `trend-line-chart.tsx`(Y축 토글 props 포함), `chart-container.tsx`(shadcn ChartContainer/ChartTooltip 래퍼)
   - `components/tables/period-table.tsx`, `grouped-detail-table.tsx`(접기/펼치기), `table-row-profit-cell.tsx`(신규 profit 변수로 양수/음수 강조)
   - `components/forms/account-multi-select.tsx`(Command+Popover+Checkbox), `date-range-picker.tsx`(Calendar), `month-range-select.tsx`
7. **`package.json`에 `"typecheck": "tsc --noEmit"` 스크립트 추가** (TASK-001.md 수락 기준이 이미 이 명령을 전제하는데 스크립트 자체가 없는 상태였음)

### 수락 기준 (요지)
- 위 컴포넌트들이 더미 데이터로 개별 렌더링 시 깨지지 않음 (임시 확인 페이지 또는 Task 004에서 실제 화면에 꽂아 확인)
- `--profit-positive`/`--profit-negative`가 light/dark 모드 모두 정의됨
- any 타입 없음, `npm run typecheck`/`lint`/`build` 통과
- 더미 데이터가 시드 고정으로 재실행/새로고침 시 값이 바뀌지 않음

## TASK-004.md 구성 내용

### 구현 사항 (화면별)
1. **대시보드(`/`)**: 요약카드 3종(총현재금액/총수익금액/전일대비), 연금vs개인투자 도넛, 전체계좌 비중 차트, 계좌별 비중 막대리스트(내림차순 정렬), 계좌별 수익비중 차트, 상세테이블(그룹 소계+전체합계, 접기/펼치기, `+금액`/`+비율%` 강조)
2. **일별(`/daily`)**: 조회조건(계좌 다중선택 + 기간, 기본 최근 30일) + 꺾은선그래프(전체/연금/개인투자, 금액·수익률 토글) + 테이블(날짜 내림차순, 전체합계 굵게)
3. **주별(`/weekly`)**: daily와 동일 컴포넌트 재사용, 데이터만 `aggregateToWeekly` 결과로 교체
4. **월별(`/monthly`)**: 조회조건(년도/시작월/종료월) + 월별 그래프/테이블
5. 각 `page.tsx`는 Server Component 유지, 상태 필요한 리프 컴포넌트만 `'use client'`
6. 반응형 검증 (375px/1280px), 4탭 전환 플로우 확인

### 수락 기준 (PRD 5.2~5.5 그대로 인용)
- 그룹 소계/전체합계가 개별 계좌 합과 정확히 일치
- 조회조건 변경 시 그래프+테이블 동기화
- 데이터 없는 빈 상태 UI
- 그래프-테이블 값 일치

## 관련 파일 (두 문서 공통 "관련 파일" 섹션에 반영)

```
src/lib/types/{account,dashboard,period-view}.ts
src/lib/dummy-data/{accounts,generate-snapshots,aggregate,index}.ts
src/components/charts/{donut-chart,trend-line-chart,chart-container}.tsx
src/components/tables/{period-table,grouped-detail-table,table-row-profit-cell}.tsx
src/components/forms/{account-multi-select,date-range-picker,month-range-select}.tsx
src/components/dashboard/{summary-cards,summary-card,pension-vs-personal-donut,account-ratio-donut,account-ratio-bar-list,account-profit-ratio-chart,dashboard-detail-table}.tsx
src/components/period-view/{period-filter-form,period-trend-chart,period-detail-table}.tsx
src/app/{page,daily/page,weekly/page,monthly/page}.tsx (수정)
src/app/globals.css (수정: 차트 팔레트, profit 변수)
package.json (수정: 패키지 + typecheck 스크립트)
```

## 주의사항 (두 문서에 반영)

- PRD 8장이 Zustand를 명시하지만 이번 Task에서는 로컬 useState로 진행 — Task 005 이후 화면 간 상태 공유가 실제로 필요해지면 재검토
- agent.md의 계좌번호는 참고용 예시이며, 실제 개인 계좌번호 원본을 코드에 하드코딩하지 않고 마스킹된 형태만 사용
- Recharts 색상은 반드시 시맨틱 CSS 변수(`var(--chart-1)` 등) 참조, 하드코딩 색상 금지
- 더미 데이터 생성/집계 로직은 Task 005에서 실 데이터로 교체될 것을 전제로 순수 함수로 작성 (부수효과 없음)

## 다음 단계

두 문서 작성 후, 실제 구현은 사용자 승인을 받아 별도로 순차 진행 (Task 003 구현 → 검증 → Task 004 구현 → 검증), TASK-001.md 방식과 동일하게 진행 상황에 따라 체크박스 갱신.
