# Task 004: 4개 화면 UI 완성 (더미 데이터 활용) ✅ 완료

## 개요
- **목표**: Task 003에서 구축한 공통 컴포넌트와 더미 데이터를 활용해 대시보드/일별/주별/월별 4개 화면을 PRD 요구사항대로 완성한다
- **관련 기능**: 계좌별 실적 대시보드(현재 실적), 일별/주별/월별 추적 화면 전체
- **의존성**: **Task 003(공통 컴포넌트 라이브러리 구현) 완료 필요** — 차트/테이블/폼 컴포넌트와 더미 데이터 유틸리티가 선행되어야 함
- **참조 문서**: `docs/PRD.md`(5장 전체), `docs/ROADMAP.md`, `docs/tasks/TASK-001.md`, `docs/tasks/TASK-003.md`, `docs/PLAN-TASK-003-004.md`

> ⚠️ **데이터 연동 없음**: 이 Task는 Task 003의 더미 데이터로 화면을 완성하는 단계이며, 실제 Supabase 데이터 연동은 Task 005 이후 진행한다.

---

## 구현 사항

### 1. 대시보드 화면 (`/`, `src/app/page.tsx`)
- [x] `src/components/dashboard/summary-cards.tsx`, `summary-card.tsx`: 요약 카드 3종 (총 현재금액 / 총 수익금액(금액+수익률%) / 전일 대비(증감액+증감률%))
- [x] `src/components/dashboard/pension-vs-personal-donut.tsx`: 연금 vs 개인투자 비중 도넛 차트 (범례: 연금/개인투자)
- [x] `src/components/dashboard/account-ratio-donut.tsx`: 전체 계좌 자산 비중 차트
- [x] `src/components/dashboard/account-ratio-bar-list.tsx`: 계좌별 현재금액 비중 막대 리스트 (계좌명 + 마스킹된 계좌번호 + 금액 + 비율 막대, 금액 내림차순 정렬)
- [x] `src/components/dashboard/account-profit-ratio-chart.tsx`: 계좌별 수익금액 비중 차트
- [x] `src/components/dashboard/dashboard-detail-table.tsx`: `grouped-detail-table`을 대시보드 데이터로 감싸는 wrapper — 연금/개인투자 그룹 소계 + 전체 합계, 접기/펼치기(▷/▶), 수익금액/수익률 양수 강조(`+금액`, `+비율%`)
- [x] `page.tsx`에서 위 컴포넌트들을 조립, Header의 기준일시 placeholder에 더미 데이터의 최신 `collectedAt` 반영
- [x] 데이터 없음(빈 상태) UI 처리

### 2. 일별 추적 화면 (`/daily`, `src/app/daily/page.tsx`)
- [x] `src/components/period-view/period-filter-form.tsx`: 조회 조건(계좌 다중선택 + 기간 시작일/종료일), granularity="daily"
- [x] `src/components/period-view/period-trend-chart.tsx`: `trend-line-chart`를 일별 데이터로 감싸는 wrapper (전체/연금/개인투자 3계열, 금액/수익률 토글)
- [x] `src/components/period-view/period-detail-table.tsx`: `period-table`을 일별 데이터로 감싸는 wrapper (날짜|구분|투자원금|현재금액|수익금액|수익률, 날짜 내림차순, 전체합계 행 굵게)
- [x] 조회조건 상태는 `'use client'` 컴포넌트 내 로컬 `useState`로 관리 (주의사항 참고)
- [x] 기본 조회 기간: 최근 30일 (최초 진입 시 자동 적용)
- [x] 조회 기간 내 데이터 없는 날짜는 결측으로 명확히 구분 또는 제외

### 3. 주별 추적 화면 (`/weekly`, `src/app/weekly/page.tsx`)
- [x] 일별 화면과 동일한 `period-view` 컴포넌트 재사용, `granularity="weekly"`
- [x] 데이터는 `aggregateToWeekly` 결과 사용 (해당 주 마지막 수집일 스냅샷을 대표값으로)
- [x] 테이블 A열 헤더는 "주차"(주 시작일~종료일 또는 주차 표기)

### 4. 월별 실적 화면 (`/monthly`, `src/app/monthly/page.tsx`)
- [x] `month-range-select` 사용, granularity="monthly" (조회 필드: 년도/시작월/종료월)
- [x] 데이터는 `aggregateToMonthly` 결과 사용 (해당 월 마지막 수집일 스냅샷을 대표값으로)
- [x] 테이블 컬럼: 년월|구분|투자원금|현재금액|수익금액|수익률

### 5. 공통 사항
- [x] 각 `page.tsx`는 Server Component로 유지, 상태/이벤트가 필요한 리프 컴포넌트(필터 폼, 접기/펼치기 등)만 `'use client'`
- [x] 반응형 검증: 모바일 너비(375px), 데스크톱 너비(1280px)에서 카드/차트/테이블 레이아웃이 깨지지 않음 (테이블은 가로 스크롤 허용) — *데스크톱은 브라우저 실측, 375px는 브라우저 자동화 환경 제약으로 코드 검토(grid-cols-1/sm:/lg: 브레이크포인트, 테이블 overflow-x-auto)로 대체*
- [x] 4개 화면 간 탭 내비게이션 전환 플로우 확인 (Task 001의 MainNav 그대로 사용)

---

## 수락 기준

### 대시보드 (PRD 5.2)
1. [x] 요약 카드 3종이 더미 데이터 기준으로 정확히 계산되어 표시된다
2. [x] 연금/개인투자 비중 도넛 차트가 실제 데이터 비율과 일치한다
3. [x] 계좌별 비중 막대 리스트가 금액 내림차순으로 일관되게 정렬된다
4. [x] 상세 테이블에서 연금/개인투자 그룹 소계와 전체 합계가 개별 계좌 합과 정확히 일치한다
5. [x] 데이터가 없는 경우 빈 상태(empty state) UI가 표시된다

### 일별 (PRD 5.3)
6. [x] 조회 조건(계좌, 기간)을 변경하면 그래프와 테이블이 함께 갱신된다
7. [x] 조회 기간 내 데이터가 없는 날짜는 결측으로 명확히 구분되거나 제외된다
8. [x] 꺾은선 그래프의 데이터 포인트가 테이블 값과 일치한다
9. [x] 최초 진입 시 최근 30일 데이터가 기본으로 표시된다

### 주별 (PRD 5.4)
10. [x] 주 단위 집계 값이 일별 원본 데이터로부터 일관된 규칙(해당 주 마지막 수집일 대표값)으로 산출된다
11. [x] 그래프와 테이블의 주차 표기가 동일한 기준을 따른다
12. [x] 조회 조건 변경 시 그래프/테이블이 함께 갱신된다

### 월별 (PRD 5.5)
13. [x] 년도/시작월/종료월 조건으로 조회 시 해당 범위의 월별 데이터만 표시된다
14. [x] 월 단위 집계 값이 일별 원본 데이터로부터 일관된 규칙(해당 월 마지막 수집일 대표값)으로 산출된다
15. [x] 그래프와 테이블의 값이 서로 일치한다

### 공통
16. [x] 모바일 너비(375px)와 데스크톱 너비(1280px)에서 4개 화면 모두 레이아웃이 깨지지 않는다 — *데스크톱(1536px) 브라우저 실측 완료, 375px는 자동화 환경 제약으로 코드 검토 대체*
17. [x] 탭 내비게이션으로 4개 화면 전환이 정상 동작하고 현재 탭이 시각적으로 구분된다
18. [x] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
19. [x] any 타입 사용 없음, 컴포넌트는 kebab-case 파일명 + PascalCase 컴포넌트명 규칙 준수

---

## 관련 파일

### 생성할 파일
```
src/components/
├── dashboard/
│   ├── summary-cards.tsx
│   ├── summary-card.tsx
│   ├── pension-vs-personal-donut.tsx
│   ├── account-ratio-donut.tsx
│   ├── account-ratio-bar-list.tsx
│   ├── account-profit-ratio-chart.tsx
│   └── dashboard-detail-table.tsx
└── period-view/
    ├── period-filter-form.tsx
    ├── period-trend-chart.tsx
    └── period-detail-table.tsx
```

### 수정할 파일
```
src/app/page.tsx           # 대시보드 조립
src/app/daily/page.tsx     # 일별 조립
src/app/weekly/page.tsx    # 주별 조립
src/app/monthly/page.tsx   # 월별 조립
src/components/layout/header.tsx  # 기준일시 placeholder에 더미 데이터 최신 수집시각 반영
```

---

## 구현 단계

### Step 1: 대시보드 화면
1. `components/dashboard/` 하위 컴포넌트 구현 (요약카드 → 도넛 차트 → 막대 리스트 → 상세 테이블 순)
2. `src/app/page.tsx`에서 더미 데이터(`DUMMY_ACCOUNTS`, `DUMMY_SNAPSHOTS`)를 조립
3. PRD 5.2 수락 기준 확인 (그룹 소계=개별 합, 정렬, 빈 상태)

### Step 2: 일별 화면 (다른 두 화면의 기반)
1. `components/period-view/` 구현 (필터 폼 → 트렌드 차트 → 상세 테이블 순)
2. `src/app/daily/page.tsx` 조립, 기본 최근 30일 조회 적용
3. 조회조건 변경 시 그래프/테이블 동기화 확인

### Step 3: 주별 화면
1. `src/app/weekly/page.tsx`에서 `period-view` 컴포넌트를 `granularity="weekly"`로 재사용
2. `aggregateToWeekly` 결과 연결, 주차 표기 확인

### Step 4: 월별 화면
1. `src/app/monthly/page.tsx`에서 `month-range-select` 연결, `granularity="monthly"`
2. `aggregateToMonthly` 결과 연결

### Step 5: 반응형 및 통합 검증
1. 브라우저 개발자 도구로 375px/1280px 뷰포트 확인
2. 4개 화면 탭 전환 플로우 확인
3. 품질 검증
```bash
npm run typecheck
npm run lint
npm run build
```

---

## 주의사항

1. **Zustand 미사용 사유**: PRD 8장이 상태관리로 Zustand를 명시하지만, 본 Task에서는 화면 간 상태 공유 요구사항이 없어(각 화면이 독립적으로 조회 조건을 가짐) 로컬 `useState`로 구현한다. Task 005(실 데이터 연동) 이후 화면 간 공유 상태가 실제로 필요해지면 그때 Zustand 도입을 재검토한다
2. **더미 데이터 범위 내에서만 검증**: 그래프-테이블 값 일치, 그룹 소계 일치 등의 수락 기준은 Task 003에서 만든 더미 데이터 기준으로 검증하며, 실 데이터 정합성은 Task 006-1(핵심 기능 통합 테스트)에서 별도 검증
3. **데이터 연동 없음**: Supabase 조회 로직은 포함하지 않는다 (Task 005 범위)
4. **any 타입 금지, Pages Router 금지**: 전역 규칙 및 Next.js App Router 규칙 준수
5. **Server Components 우선**: `page.tsx`는 Server Component 유지, 상태가 필요한 필터 폼/접기·펼치기/탭 토글 컴포넌트만 `'use client'`

---

## 다음 단계

Task 004 완료 후:
1. **Task 002**: 타입 정의 및 DB 스키마 설계 (본 Task에서 선행 정의한 `src/lib/types/`를 Supabase 스키마 기준으로 정식화)
2. **Task 005**: Supabase 연동 및 조회 API 개발 (더미 데이터를 실제 Supabase 조회로 교체)
