# Task 003: 공통 컴포넌트 라이브러리 구현

## 개요
- **목표**: 대시보드/일별/주별/월별 4개 화면에서 공통으로 사용할 차트·테이블·폼 컴포넌트와, 이를 채울 더미 데이터 생성 유틸리티를 구축하여 Task 004(화면 조립)의 토대를 마련
- **관련 기능**: 요약 카드, 상세 테이블, 조회 조건 폼, 도넛/꺾은선 차트, 계좌별 비중 막대 리스트 — 4개 화면 전반에서 재사용되는 UI 빌딩블록
- **의존성**: Task 001(프로젝트 구조 및 라우팅 설정) 완료 필요
- **참조 문서**: `docs/PRD.md`(5장, 6.2절), `docs/ROADMAP.md`, `docs/tasks/TASK-001.md`, `docs/guides/component-patterns.md`, `docs/guides/styling-guide.md`, `docs/guides/project-structure.md`, `agent.md`(계좌 명칭·구분 참고), `docs/PLAN-TASK-003-004.md`

> ⚠️ **Task 002와의 관계**: Task 002(타입 정의 및 DB 스키마 설계)는 로드맵상 Phase 3(Task 003/004보다 뒤)에 위치한다. 이 Task에서는 PRD 6.2절의 개략 데이터 모델을 **선행 타입**으로 정의해 두고, Task 002 진행 시 Supabase 생성 타입으로 교체·정식화한다.

---

## 구현 사항

### 1. 패키지 설치
- [ ] `recharts` 설치 (차트 라이브러리 — shadcn/ui 공식 chart 컴포넌트가 Recharts 기반이라 채택)
- [ ] `zustand` 설치 (설치만 진행, 실제 사용은 Task 005 이후 필요성 재확인 후 결정 — 주의사항 참고)
- [ ] `react-hook-form`, `zod`, `@hookform/resolvers` 설치 (조회 조건 폼에서 사용)
- [ ] `dayjs` 설치 + `isoWeek` 플러그인 (주차 계산, 기간 필터에 사용)

### 2. shadcn/ui 컴포넌트 추가
- [ ] `npx shadcn@latest add table checkbox popover command calendar select badge skeleton separator form` 실행
- [ ] `components.json`의 `base-nova` 스타일이 신규 컴포넌트에도 동일하게 적용되었는지 확인

### 3. 색상 인프라 정비 (`src/app/globals.css`)
- [ ] `--chart-1`~`--chart-5`를 현재 그레이스케일(oklch 무채색)에서 채도 있는 카테고리컬 팔레트로 교체 (다크모드 포함)
- [ ] `--profit-positive`(수익 양수 강조, 빨강 계열), `--profit-negative`(수익 음수, 파랑 계열) 신규 시맨틱 변수 추가 — 기존 `--destructive`(위험/삭제 의미)와 의미 분리
- [ ] `@theme inline` 블록에 신규 변수 매핑 추가 (`--color-profit-positive` 등, 기존 `--color-chart-*` 패턴 따름)

### 4. 선행 타입 정의 (`src/lib/types/`)
- [ ] `account.ts`: `AccountType`("연금" | "개인투자"), `Account`(id, accountName, accountNoMasked, accountType, createdAt), `AccountSnapshot`(id, accountId, snapshotDate, principalAmount, currentAmount, profitAmount, profitRate, collectedAt) — PRD 6.2 기준. 파일 상단에 "Task 002에서 Supabase 생성 타입으로 교체 예정" 주석 명시
- [ ] `dashboard.ts`: `SummaryCardData`, `GroupBreakdown`, `AccountRatioItem`
- [ ] `period-view.ts`: `PeriodGranularity`("daily"|"weekly"|"monthly"), `PeriodRowGroup`, `PeriodTableRow`, `PeriodChartPoint`

### 5. 더미 데이터 유틸리티 (`src/lib/dummy-data/`)
- [ ] `accounts.ts`: 계좌 8종 고정 마스터 데이터
  - 연금(5): 퇴직연금, 개인연금(기존), 개인연금(신), DC계좌, 퇴직연금(삼성)
  - 개인투자(3): 처리투자(미래에셋), 은퇴투자(미래에셋), ISA계좌
  - agent.md의 명칭을 참고하되, 계좌번호는 이미 마스킹된 예시 형태만 사용 (실제 원본 계좌번호 하드코딩 금지)
- [ ] `generate-snapshots.ts`: 시드 고정 결정론적 PRNG(예: mulberry32)로 계좌별 랜덤워크 일별 스냅샷 생성
  - 최소 14개월치 생성 (연도 경계를 넘겨야 월별 화면의 "년도 선택"이 의미 있음)
  - 계좌별 `principalAmount`는 고정, `currentAmount`는 전일 대비 -2%~+2% 랜덤워크
  - 주말은 전일값 유지 옵션 포함
  - 재실행/새로고침 시에도 동일한 값이 나오도록 시드 고정 (매번 값이 달라지면 안 됨)
- [ ] `aggregate.ts`:
  - `aggregateToWeekly(snapshots)`: 주 마지막 수집일 스냅샷을 그 주 대표값으로 반환 (PRD 5.4 규칙)
  - `aggregateToMonthly(snapshots)`: 월 마지막 수집일 스냅샷을 그 달 대표값으로 반환 (PRD 5.5 규칙)
  - `calculateGroupTotals(accounts, snapshots)`: 연금/개인투자 그룹 소계 + 전체 합계 계산
  - 부수효과 없는 순수 함수로 작성 (Task 005에서 실 데이터 집계 로직으로 그대로 승격 가능하도록)
- [ ] `index.ts`: 배럴 export + 모듈 로드 시 1회 생성되는 완제품 더미 데이터셋(`DUMMY_ACCOUNTS`, `DUMMY_SNAPSHOTS`) export

### 6. 공통 차트 컴포넌트 (`src/components/charts/`)
- [ ] `chart-container.tsx`: shadcn `ChartContainer`/`ChartTooltip` 래퍼 (색상은 CSS 변수 참조)
- [ ] `donut-chart.tsx`: 도넛 차트 (연금 vs 개인투자 비중, 전체 계좌 비중 겸용). Props: `data`(label/value/colorVar 배열), `centerLabel?`, `centerValue?`
- [ ] `trend-line-chart.tsx`: 꺾은선 그래프 (일/주/월 공용, 전체/연금/개인투자 다계열). Props에 `yAxisMode: "amount" | "profitRate"` 포함 — **단일 Y축, 토글 방식**으로 금액/수익률 전환 (병행 이중 축 사용 금지)

### 7. 공통 테이블 컴포넌트 (`src/components/tables/`)
- [ ] `table-row-profit-cell.tsx`: 수익금액/수익률 셀. `amount > 0`이면 `--profit-positive` 색상 + `+` 접두사, `amount < 0`이면 `--profit-negative` 색상, 0은 중립색
- [ ] `period-table.tsx`: 일/주/월 공용 실적 테이블 (날짜|구분|투자원금|현재금액|수익금액|수익률). 전체합계 행 강조 스타일 지원
- [ ] `grouped-detail-table.tsx`: 대시보드 상세 테이블 (연금/개인투자 그룹별 접기/펼치기 + 그룹 소계 + 전체 합계 행)

### 8. 공통 폼 컴포넌트 (`src/components/forms/`)
- [ ] `account-multi-select.tsx`: 계좌 다중 선택 (Command + Popover + Checkbox 조합)
- [ ] `date-range-picker.tsx`: 시작일/종료일 선택 (shadcn Calendar 기반, 일별/주별 화면에서 사용)
- [ ] `month-range-select.tsx`: 년도/시작월/종료월 선택 (월별 화면에서 사용)

### 9. 빌드 스크립트 정비
- [ ] `package.json`에 `"typecheck": "tsc --noEmit"` 스크립트 추가 (TASK-001.md의 수락 기준이 이미 이 명령을 전제하지만 스크립트 자체가 없었음)

---

## 수락 기준

1. [ ] 위 차트/테이블/폼 컴포넌트가 더미 데이터를 받아 개별적으로 렌더링했을 때 에러 없이 표시된다 (Task 004에서 실제 화면에 조립하며 확인 가능)
2. [ ] `--profit-positive`/`--profit-negative`가 light/dark 모드 모두에 정의되어 있고, `--destructive`와 별도로 구분된다
3. [ ] `--chart-1`~`--chart-5`가 시각적으로 구분 가능한 채도 있는 색상으로 정의되어 있다
4. [ ] `generate-snapshots.ts`로 생성한 더미 데이터가 재실행/새로고침 시에도 동일한 값을 반환한다 (시드 고정 확인)
5. [ ] `aggregateToWeekly`/`aggregateToMonthly`/`calculateGroupTotals`의 결과값이 원본 일별 데이터의 합과 일치한다 (그룹 소계 = 개별 계좌 합)
6. [ ] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
7. [ ] any 타입 사용 없음, 컴포넌트는 kebab-case 파일명 + PascalCase 컴포넌트명 규칙 준수, 파일당 300줄 이하 권장 기준 준수

---

## 관련 파일

### 생성할 파일
```
src/
├── lib/
│   ├── types/
│   │   ├── account.ts          # Account, AccountSnapshot 선행 타입
│   │   ├── dashboard.ts        # 대시보드 화면 조립 타입
│   │   └── period-view.ts      # 일/주/월 공용 화면 조립 타입
│   └── dummy-data/
│       ├── accounts.ts         # 계좌 8종 고정 마스터
│       ├── generate-snapshots.ts # 시드 기반 일별 스냅샷 생성
│       ├── aggregate.ts        # 주별/월별 집계 + 그룹 합계
│       └── index.ts            # 배럴 export + 완제품 더미 데이터셋
└── components/
    ├── charts/
    │   ├── chart-container.tsx
    │   ├── donut-chart.tsx
    │   └── trend-line-chart.tsx
    ├── tables/
    │   ├── table-row-profit-cell.tsx
    │   ├── period-table.tsx
    │   └── grouped-detail-table.tsx
    └── forms/
        ├── account-multi-select.tsx
        ├── date-range-picker.tsx
        └── month-range-select.tsx
```

### 수정할 파일
```
src/app/globals.css     # 차트 팔레트 교체, profit 변수 추가
package.json            # 패키지 추가, typecheck 스크립트 추가
```

---

## 구현 단계

### Step 1: 패키지 및 shadcn 컴포넌트 설치
```bash
npm install recharts zustand react-hook-form zod @hookform/resolvers dayjs
npx shadcn@latest add table checkbox popover command calendar select badge skeleton separator form
```

### Step 2: 색상 인프라 정비
1. `globals.css`의 `--chart-1~5`를 채도 있는 팔레트로 교체 (라이트/다크 모두)
2. `--profit-positive`/`--profit-negative` 추가 및 `@theme inline`에 매핑

### Step 3: 선행 타입 정의
1. `src/lib/types/account.ts` 작성 (PRD 6.2 그대로 이식 + 교체 예정 주석)
2. `dashboard.ts`, `period-view.ts` 작성

### Step 4: 더미 데이터 유틸리티
1. `accounts.ts` (계좌 8종)
2. `generate-snapshots.ts` (시드 기반 생성기)
3. `aggregate.ts` (주별/월별 집계, 그룹 합계)
4. `index.ts`로 조립 및 export

### Step 5: 공통 컴포넌트 구현
1. `charts/` — chart-container → donut-chart → trend-line-chart 순
2. `tables/` — table-row-profit-cell → period-table → grouped-detail-table 순
3. `forms/` — account-multi-select → date-range-picker → month-range-select 순

### Step 6: 품질 검증
```bash
npm run typecheck
npm run lint
npm run build
```

---

## 주의사항

1. **Zustand는 설치만, 사용은 보류**: PRD 8장이 상태관리 기술로 Zustand를 명시하지만, 현재 단계에서는 화면 간 상태 공유 요구사항이 없어 로컬 `useState`로 충분하다고 판단. Task 005(실 데이터 연동) 이후 실제 필요성이 확인되면 도입 재검토
2. **개인정보 보호**: agent.md에 언급된 계좌번호는 참고용 예시일 뿐이며, 실제 원본 계좌번호를 코드에 하드코딩하지 않고 이미 마스킹된 형태만 사용
3. **색상 하드코딩 금지**: Recharts 시리즈 색상은 반드시 `var(--chart-1)` 등 시맨틱 CSS 변수를 참조. 하드코딩된 hex/rgb 금지
4. **순수 함수 원칙**: 더미 데이터 생성/집계 로직은 Task 005에서 실 데이터 집계 로직으로 그대로 승격될 것을 전제로 부수효과 없이 작성
5. **any 타입 금지**: 전역 규칙 준수, Recharts/shadcn 컴포넌트 Props도 명시적 타입 지정
6. **Server Components 우선**: 차트/폼처럼 상호작용이 필요한 컴포넌트만 `'use client'`, 순수 표시용 테이블 등은 Server Component로 유지 가능한지 검토

---

## 다음 단계

Task 003 완료 후:
1. **Task 004**: 4개 화면 UI 완성 — 본 Task에서 만든 컴포넌트와 더미 데이터를 대시보드/일별/주별/월별 화면에 조립
