# Task 005: Supabase 연동 및 조회 API 개발 ✅ 완료

## 개요
- **목표**: Task 002에서 설계한 SQL 마이그레이션·타입(`mappers.ts`, `api.ts`)을 실제 Supabase 프로젝트에 적용하고, 서버 사이드 조회 함수를 구현해 4개 화면이 사용하는 더미 데이터를 실 데이터로 교체한다.
- **관련 기능**: 대시보드/일별/주별/월별 4개 화면의 데이터 소스 전환
- **의존성**: **Task 002(타입 정의 및 DB 스키마 설계) 완료 필요** — `database.ts`, `mappers.ts`, `supabase/migrations/20260720000000_create_accounts_and_snapshots.sql` 선행
- **참조 문서**: `docs/PRD.md`(4.2, 6장, 7장), `docs/ROADMAP.md`, `docs/tasks/TASK-002.md`

> ⚠️ **실 인프라 변경 포함**: 실제 Supabase 프로젝트(`xbyqkektljnhyveqvfgx`)에 테이블을 생성하고 데이터를 삽입했다. 사용자 승인(AskUserQuestion으로 명시적 확인) 후 마이그레이션 적용과 시드 데이터 삽입을 진행했다.
>
> ⚠️ **RLS 미적용**: `accounts`/`account_snapshots` 모두 Row Level Security 비활성 상태다(다른 기존 테이블과 동일 상태 유지, 사용자 확인 완료). `get_advisors(security)` 결과 이 두 테이블을 포함해 critical 등급 권고가 확인됐다 — anon key를 아는 사람은 누구나 조회/수정 가능한 상태이므로 **추후 보안 강화 재검토 필요**.
>
> ⚠️ **키 전략**: Service Role Key는 발급/사용하지 않았다. `.env.local`에 이미 존재하던 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`(anon/publishable key)만 서버 사이드에서 사용한다(PRD 4.2 조회 전용 원칙). 당초 설계 문서의 변수명은 `NEXT_PUBLIC_SUPABASE_ANON_KEY`였으나, 실제 프로젝트에 이미 구성된 `.env.local` 값과 일치시키기 위해 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 그대로 채택했다.

---

## 구현 사항

### 1. Supabase 클라이언트 패키지 설치 및 서버 클라이언트 구성
- [x] `@supabase/supabase-js` 설치
- [x] `src/lib/supabase/client.ts`: `createSupabaseServerClient()` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 환경변수 사용, Server Component 전용, 환경변수 미설정 시 명시적 에러
- [x] `.env.local.example` 생성(필요 변수명만 안내, 실제 값은 미기입)

### 2. 조회 함수 구현 (`src/lib/supabase/queries.ts`)
- [x] `getAccounts(): Promise<Account[]>` — `accounts` 테이블 조회 후 `mapAccountRowToAccount`로 변환
- [x] `getAccountSnapshots(): Promise<AccountSnapshot[]>` — `account_snapshots` 테이블 조회 후 `mapSnapshotRowToSnapshot`로 변환
- [x] Task 002의 `database.ts`/`mappers.ts` 재정의 없이 그대로 재사용

### 3. 마이그레이션 및 개발용 시드 데이터 적용 (사용자 승인 완료)
- [x] `supabase/migrations/20260720000001_seed_dev_data.sql` 작성 — 계좌 8종(더미 데이터와 동일 이름/원금) + 최근 30일치 스냅샷 INSERT(계좌·날짜별 결정론적 의사난수로 ±2% 변동)
- [x] **사용자 승인 후** `20260720000000_create_accounts_and_snapshots.sql` 적용
- [x] **사용자 승인 후** `20260720000001_seed_dev_data.sql` 적용
- [x] `list_tables`로 `accounts` 8행, `account_snapshots` 240행(8계좌×30일) 생성 확인
- [x] `get_advisors(security)`로 보안 권고 확인 및 사용자 보고 완료 — RLS 비활성 critical 권고, 범위 외 사항으로 문서화

### 4. 4개 page.tsx 및 layout.tsx 실 데이터 전환
- [x] `src/app/page.tsx` — async 전환, `getAccounts()`/`getAccountSnapshots()` 사용
- [x] `src/app/daily/page.tsx` — async 전환
- [x] `src/app/weekly/page.tsx` — async 전환
- [x] `src/app/monthly/page.tsx` — async 전환
- [x] `src/app/layout.tsx` — async 전환, 헤더 기준일시를 실 데이터(`getAccountSnapshots()`) 기준으로 계산
- [x] 컴포넌트(19개) props 인터페이스 무변경, `src/lib/dummy-data/`는 삭제하지 않고 보존

### 5. 통합 테스트 및 문서화
- [x] 4개 화면(`/`, `/daily`, `/weekly`, `/monthly`)에서 실 Supabase 데이터 렌더링 확인 (claude-in-chrome 브라우저 자동화)
- [x] 일별 화면에서 계좌 다중선택 필터 변경 시 그래프/테이블 갱신 확인(전체 8계좌 → 6계좌로 변경 시 투자원금 215,000,000 → 165,000,000으로 즉시 반영)
- [x] 대시보드 상세 테이블 그룹 소계=전체 합계 일치 확인(실 데이터 기준: 연금 소계 134,752,600 + 개인투자 소계 80,589,500 = 전체 합계 215,342,100)
- [x] 본 `TASK-005.md` 문서를 구현 완료 후 실제 산출물 기준으로 갱신

---

## 수락 기준

1. [x] `getAccounts()`/`getAccountSnapshots()`의 반환 타입이 기존 `Account[]`/`AccountSnapshot[]`과 완전히 호환된다
2. [x] 마이그레이션 적용 전 사용자에게 명시적으로 안내하고 승인을 받았다
3. [x] `accounts`/`account_snapshots` 테이블이 실제 프로젝트에 정상 생성되고 시드 데이터가 삽입되었다(8행/240행)
4. [x] 4개 화면(`/`, `/daily`, `/weekly`, `/monthly`)이 더미 데이터가 아닌 실제 Supabase 데이터를 표시한다
5. [x] 조회 조건(계좌, 기간) 변경 시 그래프/테이블이 실 데이터 기준으로 함께 갱신된다
6. [x] 대시보드 상세 테이블의 그룹 소계와 전체 합계가 개별 계좌 합과 일치한다(실 데이터 기준)
7. [x] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
8. [x] any 타입 사용 없음, Service Role Key 미사용(anon/publishable key만 사용), 기존 19개 컴포넌트 props 인터페이스 무변경

---

## 관련 파일

### 생성한 파일
```
src/lib/supabase/
├── client.ts          # 서버 사이드 Supabase 클라이언트
└── queries.ts          # getAccounts, getAccountSnapshots

supabase/migrations/
└── 20260720000001_seed_dev_data.sql   # 개발용 시드 데이터

.env.local.example      # 필요 환경변수명 안내
```

### 수정한 파일
```
package.json              # @supabase/supabase-js 의존성 추가
src/app/page.tsx          # 대시보드 실 데이터 전환
src/app/daily/page.tsx    # 일별 실 데이터 전환
src/app/weekly/page.tsx   # 주별 실 데이터 전환
src/app/monthly/page.tsx  # 월별 실 데이터 전환
src/app/layout.tsx        # 헤더 기준일시 실 데이터 전환
docs/tasks/TASK-005.md    # 구현 완료 후 체크박스 갱신
```

### 참조(변경 없음)
```
src/lib/types/database.ts
src/lib/types/mappers.ts
src/lib/types/api.ts
src/lib/dummy-data/aggregate.ts
src/lib/dummy-data/select-latest.ts
src/components/period-view/period-view-container.tsx
supabase/migrations/20260720000000_create_accounts_and_snapshots.sql
```

---

## 구현 단계 (실제 진행 순서)

### Step 1: 클라이언트 구성
1. `@supabase/supabase-js` 설치
2. `src/lib/supabase/client.ts` 작성(기존 `.env.local`의 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` 사용)
3. `.env.local.example` 작성

### Step 2: 조회 함수
1. `src/lib/supabase/queries.ts`에 `getAccounts`, `getAccountSnapshots` 구현
2. `npm run typecheck`로 기존 App 타입과 호환성 확인

### Step 3: 마이그레이션 적용 (사용자 승인 완료)
1. 시드 데이터 마이그레이션 파일 작성
2. AskUserQuestion으로 실제 프로젝트 변경 사항 설명 후 승인 요청 → 승인 확보
3. `apply_migration`으로 두 마이그레이션(`20260720000000`, `20260720000001`) 순차 적용
4. `list_tables`/`get_advisors`로 결과 확인(8행/240행, RLS 비활성 권고)

### Step 4: page.tsx 전환
1. 4개 page.tsx + layout.tsx를 async function으로 전환
2. 더미 데이터 import를 조회 함수 호출로 교체

### Step 5: 통합 검증
```bash
npm run typecheck
npm run lint
npm run build
```
1. 개발 서버 구동 후 claude-in-chrome으로 4개 화면 실 데이터 렌더링 확인
2. 일별 화면 계좌 필터 변경 시 그래프/테이블 갱신 확인
3. 대시보드 상세 테이블 소계=합계 정합성 확인

---

## 주의사항

1. **마이그레이션 적용은 승인 후 진행 완료**: `apply_migration` 호출 전 AskUserQuestion으로 실제 프로젝트에 가해질 변경을 설명하고 명시적 동의를 받았다
2. **RLS 미적용 상태 — 추후 보안 강화 필요**: `accounts`/`account_snapshots`를 포함해 이 Supabase 프로젝트의 여러 테이블에서 RLS가 비활성 상태다(critical 등급). anon key로 누구나 조회/수정 가능하므로, 추후 보안 강화가 필요해지면 RLS 정책 설계를 별도 Task로 진행해야 한다
3. **Service Role Key 미사용**: anon/publishable key만 사용. Service Role Key는 발급받지 않았다
4. **기존 컴포넌트 무변경**: `period-view-container.tsx` 등 19개 컴포넌트는 App 타입 props만 받으므로 수정하지 않았다
5. **더미 데이터 유틸리티 보존**: `src/lib/dummy-data/`는 삭제하지 않고 유지(로컬 개발/향후 재사용 대비)
6. **any 타입 금지**: 전역 규칙 준수, 위반 없음
7. **layout.tsx와 각 page.tsx가 각각 `getAccountSnapshots()`를 호출**: 요청당 중복 조회가 발생하는 구조다. 현재 규모(8계좌×수십 행)에서는 성능 이슈가 없으나, 데이터가 커지면 캐싱/공유 전략 재검토 필요

---

## 다음 단계

Task 005 완료 후:
1. **Task 006**: Google Sheets 수집 파이프라인 및 스케줄 등록 (Vercel Cron 기반)
2. **Task 006-1**: 핵심 기능 통합 테스트
3. **보안 강화(우선순위 재검토 필요)**: `accounts`/`account_snapshots` RLS 정책 설계 및 적용
