# Task 002: 타입 정의 및 DB 스키마 설계 ✅ 완료

## 개요
- **목표**: PRD 6.2절 개략 데이터 모델을 Supabase 정식 스키마와 TypeScript 타입으로 확정한다. DB Row 타입(snake_case)과 애플리케이션 타입(camelCase, 기존 선행 타입)을 분리하고 매핑 함수를 두며, SQL 마이그레이션과 API 요청/응답 타입을 설계한다.
- **관련 기능**: 전체 화면(대시보드/일별/주별/월별)이 사용할 데이터 계층의 타입·스키마 토대
- **의존성**: 없음 (Task 003/004에서 만든 선행 타입을 그대로 승격시키는 작업)
- **참조 문서**: `docs/PRD.md`(6장), `docs/ROADMAP.md`, `docs/tasks/TASK-003.md`, `docs/tasks/TASK-004.md`

> ⚠️ **실제 DB 적용 없음**: 이 Task는 타입·스키마 "설계" 산출물(TypeScript 타입, SQL 마이그레이션 파일, 문서)까지만 다룬다. 연결된 Supabase 프로젝트(`xbyqkektljnhyveqvfgx`)는 견적서/이벤트 등 이 앱과 무관한 다른 서비스용이므로 `apply_migration`을 호출하지 않는다. 실제 Supabase 프로젝트 생성/마이그레이션 적용/클라이언트 연동은 Task 005에서 진행한다.

---

## 구현 사항

### 1. DB 타입 및 Row→App 매핑 함수 (`src/lib/types/database.ts`, `src/lib/types/mappers.ts`)
- [x] `database.ts`: `AccountRow`, `AccountSnapshotRow` 인터페이스 정의 (snake_case, PRD 6.2 컬럼명 그대로 — Supabase 생성 타입 형태)
- [x] `mappers.ts`: `mapAccountRowToAccount(row: AccountRow): Account`, `mapSnapshotRowToSnapshot(row: AccountSnapshotRow): AccountSnapshot` 순수 함수 구현 (Row→App 단방향, 웹앱은 조회 전용이므로 역방향 불필요)
- [x] 기존 `src/lib/types/account.ts`의 `Account`/`AccountSnapshot`/`AccountType` 구조는 변경하지 않고 매핑 대상으로 그대로 사용

### 2. SQL 마이그레이션 파일 (`supabase/migrations/`)
- [x] `20260720000000_create_accounts_and_snapshots.sql` 작성
- [x] `accounts` 테이블: `id`(uuid PK), `account_name`, `account_no_masked`, `account_type`(CHECK IN ('연금','개인투자')), `created_at`
- [x] `account_snapshots` 테이블: `id`(uuid PK), `account_id`(FK → accounts.id, ON DELETE CASCADE), `snapshot_date`, `principal_amount`, `current_amount`, `profit_amount`, `profit_rate`, `collected_at`
- [x] `account_snapshots`에 `UNIQUE(account_id, snapshot_date)` 제약 — PRD 6.3 upsert 규칙(동일 계좌+동일 수집일은 갱신, 중복 row 금지)의 근거
- [x] `(account_id, snapshot_date)` 복합 인덱스
- [x] 파일 하단에 주/월 집계 참고 쿼리(마지막 수집일 대표값 방식, `DISTINCT ON`)를 주석으로 문서화 — 실제 DB VIEW는 생성하지 않음(애플리케이션 레벨 `aggregate.ts`가 이미 검증됨, 과설계 방지)
- [x] `apply_migration` 등으로 실제 프로젝트에 적용하지 않음

### 3. API 요청/응답 타입 (`src/lib/types/api.ts`)
- [x] `DashboardSummaryResponse`: 기존 `SummaryCardData`, `GroupBreakdown[]`, `AccountRatioItem[]`을 조합
- [x] `PeriodQueryRequest`: `accountIds: string[]`, `granularity: PeriodGranularity`, `dateRange?`(daily/weekly용), `monthRange?`(monthly용) — `period-view-container.tsx`의 실제 분기 구조와 일치시킴
- [x] `PeriodQueryResponse`: `{ rows: PeriodTableRow[] }`
- [x] 신규 필드는 최소화하고 기존 `dashboard.ts`/`period-view.ts` 타입을 재정의 없이 재사용

### 4. 문서 정리
- [x] `src/lib/types/account.ts` 상단의 "Task 002에서 교체될 선행 타입" 안내 주석을 "정식 애플리케이션 타입(DB Row 타입은 `database.ts` 참고)"으로 교체
- [x] 본 `TASK-002.md` 문서를 구현 완료 후 실제 산출물 기준으로 갱신

---

## 수락 기준

1. [x] `AccountRow`/`AccountSnapshotRow`가 PRD 6.2 컬럼명과 정확히 일치한다
2. [x] `mapAccountRowToAccount`/`mapSnapshotRowToSnapshot`의 반환 타입이 기존 `Account`/`AccountSnapshot`과 완전히 호환된다 (컴포넌트 19개 무변경)
3. [x] SQL 마이그레이션에 upsert 대상 `UNIQUE(account_id, snapshot_date)` 제약과 `account_type` CHECK 제약이 반영되어 있다
4. [x] SQL 마이그레이션은 실제 Supabase 프로젝트에 적용되지 않은 상태로 유지된다
5. [x] `api.ts`의 타입이 기존 `dashboard.ts`/`period-view.ts` 타입을 재사용하며, `period-view-container.tsx`의 실제 조회 조건 구조(daily/weekly는 dateRange, monthly는 monthRange)와 일치한다
6. [x] `npm run typecheck`, `npm run lint`가 에러 없이 통과한다
7. [x] any 타입 사용 없음, 컴포넌트/파일은 kebab-case 파일명 규칙 준수

---

## 관련 파일

### 생성할 파일
```
src/lib/types/
├── database.ts       # Supabase Row 타입 (snake_case)
├── mappers.ts         # Row → App 타입 매핑 함수
└── api.ts             # API 요청/응답 타입

supabase/migrations/
└── 20260720000000_create_accounts_and_snapshots.sql
```

### 수정할 파일
```
src/lib/types/account.ts   # 안내 주석 교체
docs/tasks/TASK-002.md     # 구현 완료 후 체크박스 갱신
```

### 참조(변경 없음)
```
src/lib/types/dashboard.ts
src/lib/types/period-view.ts
src/components/period-view/period-view-container.tsx
src/lib/dummy-data/aggregate.ts
```

---

## 구현 단계

### Step 1: DB 타입 및 매핑 함수
1. `src/lib/types/database.ts`에 `AccountRow`, `AccountSnapshotRow` 정의
2. `src/lib/types/mappers.ts`에 매핑 함수 구현
3. `npm run typecheck`로 기존 `Account`/`AccountSnapshot`과의 호환성 확인

### Step 2: SQL 마이그레이션
1. `supabase/migrations/20260720000000_create_accounts_and_snapshots.sql` 작성
2. `accounts`, `account_snapshots` DDL + 제약조건 + 인덱스 작성
3. 주/월 집계 참고 쿼리를 주석으로 문서화

### Step 3: API 타입
1. `src/lib/types/api.ts`에 `DashboardSummaryResponse`, `PeriodQueryRequest`, `PeriodQueryResponse` 정의
2. `period-view-container.tsx`의 실제 상태 구조와 대조 검증

### Step 4: 문서 정리 및 품질 검증
1. `account.ts` 안내 주석 교체
2. 본 문서(`TASK-002.md`) 체크박스 갱신
```bash
npm run typecheck
npm run lint
```

---

## 주의사항

1. **실제 Supabase 미적용**: 이 Task는 설계 산출물까지만 다룬다. `apply_migration` MCP 도구를 호출하지 않는다 — 연결된 프로젝트가 이 앱과 무관하기 때문이며, 실제 적용은 Task 005 범위다
2. **기존 타입 구조 변경 금지**: `account.ts`/`dashboard.ts`/`period-view.ts`는 19개 파일이 이미 의존 중이므로 필드 구조를 바꾸지 않는다. 신규 계층(`database.ts`, `mappers.ts`, `api.ts`)만 추가한다
3. **DB VIEW/RLS/클라이언트 코드 제외**: 주/월 집계 VIEW 생성, RLS 정책 설계, Supabase 클라이언트 코드 작성은 이번 Task 범위에서 제외한다 (Task 005 범위)
4. **Row→App 단방향**: 웹앱은 조회 전용(PRD 4.2)이므로 App→Row 역매핑은 구현하지 않는다
5. **any 타입 금지**: 전역 규칙 준수. `account_type` 컬럼은 DB에서 `text`이므로 `AccountType`으로의 명시적 단언이 필요할 수 있음(any 아님)

---

## 다음 단계

Task 002 완료 후:
1. **Task 005**: Supabase 연동 및 조회 API 개발 (본 Task의 마이그레이션을 실제 프로젝트에 적용, `mappers.ts`를 그대로 활용해 더미 데이터를 실 데이터로 교체)
