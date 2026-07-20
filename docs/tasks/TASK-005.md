# Task 005: Supabase 연동 및 조회 API 개발

## 개요
- **목표**: Task 002에서 설계한 SQL 마이그레이션·타입(`mappers.ts`, `api.ts`)을 실제 Supabase 프로젝트에 적용하고, 서버 사이드 조회 함수를 구현해 4개 화면이 사용하는 더미 데이터를 실 데이터로 교체한다.
- **관련 기능**: 대시보드/일별/주별/월별 4개 화면의 데이터 소스 전환
- **의존성**: **Task 002(타입 정의 및 DB 스키마 설계) 완료 필요** — `database.ts`, `mappers.ts`, `supabase/migrations/20260720000000_create_accounts_and_snapshots.sql` 선행
- **참조 문서**: `docs/PRD.md`(4.2, 6장, 7장), `docs/ROADMAP.md`, `docs/tasks/TASK-002.md`

> ⚠️ **실 인프라 변경 포함**: 이 Task는 실제 Supabase 프로젝트(`xbyqkektljnhyveqvfgx`)에 테이블을 생성하고 데이터를 삽입하는 유일한 단계다. 마이그레이션 적용과 시드 데이터 삽입은 반드시 사용자 승인을 받은 후 진행한다.
>
> ⚠️ **RLS 미적용**: 이번 Task에서는 Row Level Security를 적용하지 않는다(현재 다른 테이블과 동일하게 비활성 상태 유지, 사용자 확인 완료). anon key를 아는 사람은 누구나 `accounts`/`account_snapshots`를 조회할 수 있다 — 추후 보안 강화 시 재검토 필요.
>
> ⚠️ **키 전략**: Service Role Key는 발급/사용하지 않는다. anon/publishable key만 서버 사이드에서 사용한다(PRD 4.2 조회 전용 원칙).

---

## 구현 사항

### 1. Supabase 클라이언트 패키지 설치 및 서버 클라이언트 구성
- [ ] `@supabase/supabase-js` 설치
- [ ] `src/lib/supabase/client.ts`: `createSupabaseServerClient()` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수 사용, Server Component 전용
- [ ] `.env.local.example` 생성(필요 변수명만 안내, 실제 값은 사용자가 `.env.local`에 직접 입력)

### 2. 조회 함수 구현 (`src/lib/supabase/queries.ts`)
- [ ] `getAccounts(): Promise<Account[]>` — `accounts` 테이블 조회 후 `mapAccountRowToAccount`로 변환
- [ ] `getAccountSnapshots(): Promise<AccountSnapshot[]>` — `account_snapshots` 테이블 조회 후 `mapSnapshotRowToSnapshot`로 변환
- [ ] Task 002의 `database.ts`/`mappers.ts` 재정의 없이 그대로 재사용

### 3. 마이그레이션 및 개발용 시드 데이터 적용 (사용자 승인 필수)
- [ ] `supabase/migrations/20260720000001_seed_dev_data.sql` 작성 — 계좌 8종(더미 데이터와 동일) + 최근 30일치 스냅샷 INSERT
- [ ] **사용자 승인 후** `20260720000000_create_accounts_and_snapshots.sql` 적용
- [ ] **사용자 승인 후** `20260720000001_seed_dev_data.sql` 적용
- [ ] `list_tables`로 테이블 생성 및 행 개수 확인, `get_advisors`로 보안 권고 확인 후 사용자 보고

### 4. 4개 page.tsx 및 layout.tsx 실 데이터 전환
- [ ] `src/app/page.tsx` — async 전환, `getAccounts()`/`getAccountSnapshots()` 사용
- [ ] `src/app/daily/page.tsx` — async 전환
- [ ] `src/app/weekly/page.tsx` — async 전환
- [ ] `src/app/monthly/page.tsx` — async 전환
- [ ] `src/app/layout.tsx` — async 전환, 헤더 기준일시를 실 데이터 기준으로 계산
- [ ] 컴포넌트(19개) props 인터페이스 무변경, `src/lib/dummy-data/`는 삭제하지 않고 보존

### 5. 통합 테스트 및 문서화
- [ ] 4개 화면에서 실 Supabase 데이터 렌더링 확인 (브라우저)
- [ ] 조회 조건(계좌/기간) 변경 시 그래프/테이블 갱신 확인
- [ ] 대시보드 상세 테이블 그룹 소계=전체 합계 일치 확인(실 데이터 기준)
- [ ] 본 `TASK-005.md` 문서를 구현 완료 후 실제 산출물 기준으로 갱신

---

## 수락 기준

1. [ ] `getAccounts()`/`getAccountSnapshots()`의 반환 타입이 기존 `Account[]`/`AccountSnapshot[]`과 완전히 호환된다
2. [ ] 마이그레이션 적용 전 사용자에게 명시적으로 안내하고 승인을 받았다
3. [ ] `accounts`/`account_snapshots` 테이블이 실제 프로젝트에 정상 생성되고 시드 데이터가 삽입되었다
4. [ ] 4개 화면(`/`, `/daily`, `/weekly`, `/monthly`)이 더미 데이터가 아닌 실제 Supabase 데이터를 표시한다
5. [ ] 조회 조건(계좌, 기간) 변경 시 그래프/테이블이 실 데이터 기준으로 함께 갱신된다
6. [ ] 대시보드 상세 테이블의 그룹 소계와 전체 합계가 개별 계좌 합과 일치한다(실 데이터 기준)
7. [ ] `npm run typecheck`, `npm run lint`, `npm run build`가 에러 없이 통과한다
8. [ ] any 타입 사용 없음, Service Role Key 미사용(anon key만 사용), 기존 19개 컴포넌트 props 인터페이스 무변경

---

## 관련 파일

### 생성할 파일
```
src/lib/supabase/
├── client.ts          # 서버 사이드 Supabase 클라이언트
└── queries.ts          # getAccounts, getAccountSnapshots

supabase/migrations/
└── 20260720000001_seed_dev_data.sql   # 개발용 시드 데이터

.env.local.example      # 필요 환경변수명 안내
```

### 수정할 파일
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

## 구현 단계

### Step 1: 클라이언트 구성
1. `@supabase/supabase-js` 설치
2. `src/lib/supabase/client.ts` 작성
3. `.env.local.example` 작성, 사용자에게 `.env.local` 직접 작성 안내

### Step 2: 조회 함수
1. `src/lib/supabase/queries.ts`에 `getAccounts`, `getAccountSnapshots` 구현
2. `npm run typecheck`로 기존 App 타입과 호환성 확인

### Step 3: 마이그레이션 적용 (사용자 승인 필수)
1. 시드 데이터 마이그레이션 파일 작성
2. **사용자에게 실제 프로젝트 변경 사항 설명 후 승인 요청**
3. 승인 시 `apply_migration`으로 두 마이그레이션 순차 적용
4. `list_tables`/`get_advisors`로 결과 확인

### Step 4: page.tsx 전환
1. 4개 page.tsx + layout.tsx를 async function으로 전환
2. 더미 데이터 import를 조회 함수 호출로 교체

### Step 5: 통합 검증
```bash
npm run typecheck
npm run lint
npm run build
```
1. 브라우저로 4개 화면 실 데이터 렌더링 확인
2. 조회 조건 변경 시 갱신 확인

---

## 주의사항

1. **마이그레이션 적용은 반드시 승인 후**: `apply_migration` 호출 전 실제 프로젝트에 어떤 변경이 가해지는지 사용자에게 설명하고 명시적 동의를 받는다
2. **RLS 미적용 상태**: 이번 Task에서 RLS 정책을 도입하지 않는다. anon key로 누구나 조회 가능한 상태이므로, 추후 보안 강화가 필요해지면 RLS 정책 설계를 별도 Task로 진행해야 한다
3. **Service Role Key 미사용**: anon/publishable key만 사용. Service Role Key는 발급받지 않는다
4. **기존 컴포넌트 무변경**: `period-view-container.tsx` 등 19개 컴포넌트는 App 타입 props만 받으므로 수정하지 않는다
5. **더미 데이터 유틸리티 보존**: `src/lib/dummy-data/`는 삭제하지 않고 유지한다(로컬 개발/향후 재사용 대비)
6. **any 타입 금지**: 전역 규칙 준수

---

## 다음 단계

Task 005 완료 후:
1. **Task 006**: Google Sheets 수집 파이프라인 및 스케줄 등록 (Vercel Cron 기반)
2. **Task 006-1**: 핵심 기능 통합 테스트
