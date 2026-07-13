# Task 007: 데이터베이스 스키마 및 Supabase 초기 설정

## 개요
- **목표**: Supabase 프로젝트에 Gather 스키마(profiles/events/event_participants, RLS, 인덱스, Storage)를 적용하고 로컬 개발 환경에서 실제로 연동되도록 환경 변수를 설정한다
- **관련 기능**: F001-F015 전체 (모든 데이터 기능의 기반)
- **의존성**: Task 006 (관리자 데스크톱 페이지 UI 완성)
- **현재 상태**: ✅ 완료 — 스키마 생성, RLS 버그 수정, 환경 변수 설정, 실제 플로우(로그인/이벤트 생성) 검증까지 완료

## ⚠️ 진행 중 발견된 중요 사실 (당초 전제와 다름)

최초 작성 시점에는 "`database.types.ts`가 이미 존재하므로 원격에 스키마가 이미 반영되어 있다"고 가정했으나, **실제로는 원격 Supabase 프로젝트(`xbyqkektljnhyveqvfgx`)에 스키마가 전혀 없는 상태**였다. REST API로 `profiles` 조회 시 `PGRST205 (table not found)`가 반환되었고, 대신 이 프로젝트에는 Gather와 무관한 `invoices`/`invoice_items` 테이블(다른 용도로 쓰이던 프로젝트로 추정)이 존재했다.

`database.types.ts`는 과거 어느 시점에 로컬에서 작성/생성되었을 뿐 원격과 동기화된 적이 없던 파일로 보인다. 따라서 이번 Task는 "기존 스키마 재현"이 아니라 **`database.types.ts`를 근거로 한 신규 스키마 설계 및 최초 적용**으로 범위가 바뀌었다.

### 진행 경과 요약
1. `.env.local`/`.env.example` 생성 (초기 계획대로 진행)
2. Supabase CLI 로그인 시도 → 브라우저 로그인이 CLI에 반영되지 않아 **Access Token 방식**으로 전환 (`supabase login --token`)
3. `supabase db pull` 시도 → **Docker Desktop 미설치**로 shadow DB 생성 실패 (`db dump`도 동일하게 Docker 필요)
4. `psql` 등 원격 DB 직접 연결 도구도 이 환경에 없어, **Supabase 대시보드 SQL Editor에 직접 SQL을 붙여넣는 방식**으로 스키마 최초 적용 (`supabase/migrations/20260707000000_init_schema.sql`)
5. `event-covers` Storage 버킷은 SQL의 `insert into storage.buckets`가 적용되지 않아 **대시보드에서 수동 생성** 후 정책만 SQL로 적용
6. 로그인 테스트 중 **PGRST301 (No suitable key or wrong key type)** 401 에러 발생 — 원인은 두 가지가 겹쳐 있었음:
   - `.env.local`에 넣은 레거시 anon key(HS256) 대신 새 **publishable key**(`sb_publishable_...`)를 사용해야 했음
   - `profiles_admin_all` RLS 정책이 `profiles` 테이블을 자기 자신 안에서 서브쿼리로 참조해 **무한 재귀(`42P17`)**가 발생 → `security definer` 함수 `is_admin()`으로 재귀를 끊는 마이그레이션(`20260708000000_fix_profiles_admin_policy_recursion.sql`) 추가 적용
7. Playwright로 회원가입/로그인/프로필 자동 생성(트리거)/이벤트 생성/참여자 자동 등록까지 실제 플로우 검증 완료
8. `npm run db:types` 결과와 `database.types.ts` diff — Gather가 쓰는 3개 테이블은 필드/FK 완전 일치, 차이는 CLI 출력 포맷 변경, `graphql_public` 스키마 추가, 무관한 `invoices`/`invoice_items` 테이블, 신규 `is_admin` 함수뿐

### ✅ 완료된 것
- `lib/supabase/database.types.ts`에 정의된 스키마(`profiles`, `events`, `event_participants`)를 원격 프로젝트에 실제로 생성 완료
- RLS 정책 전체 적용 및 자기참조 재귀 버그 수정 완료
- 인덱스(`invite_code` unique, `created_by`, `event_id`/`user_id`, `(event_id, user_id)` unique 복합) 적용 완료
- `handle_new_user` 트리거로 `auth.users` 가입 시 `profiles` 자동 생성 확인 완료
- `event-covers` Storage 버킷 + 공개 조회/인증 업로드 정책 적용 완료
- `event_participants` Realtime publication 추가 완료
- `.env.local`/`.env.example` 생성, `npm run dev` 로컬 인증 플로우 정상 동작 확인
- Supabase 공식 MCP 서버(`supabase`)를 `.mcp.json`에 프로젝트 scope로 추가 (향후 유사 이슈 진단에 활용 가능)

### 참고: 이 프로젝트에 공존하는 무관한 테이블
`invoices`, `invoice_items` 테이블은 Gather 앱과 관련이 없다 (다른 프로젝트/용도로 같은 Supabase 프로젝트를 공유 중인 것으로 추정). 삭제 여부는 이번 Task 범위 밖이므로 건드리지 않았다. 필요 시 별도로 사용자와 논의 후 정리할 것.

## 구현 사항

### 1. 로컬 환경 변수 설정
- [x] Supabase 프로젝트 대시보드에서 API 설정(URL, anon/publishable key) 확인
- [x] 프로젝트 루트에 `.env.local` 생성 (`.gitignore`에 이미 포함되어 있어 커밋되지 않음)
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
  ```
- [ ] `npm run dev` 실행 후 로그인 플로우가 실제로 동작하는지 확인 (미들웨어가 더 이상 건너뛰지 않는지)
- [x] 팀 공유용으로 `.env.example` 파일 생성 (키 값 없이 항목만)

**새 팀원 온보딩 절차**: `.env.example`을 복사해 `.env.local`을 만들고, Supabase 대시보드 → Settings → API에서 Project URL과 anon/publishable key를 확인해 채워넣는다.
```bash
cp .env.example .env.local
```

### 2. Supabase CLI 연동 및 스키마 최초 적용
- [x] `supabase login --token`으로 Access Token 인증 (브라우저 `supabase login`이 CLI에 반영 안 되는 이슈로 대체)
- [x] `supabase link --project-ref xbyqkektljnhyveqvfgx`로 원격 프로젝트 연결
- [x] ~~`supabase db pull`~~ → Docker Desktop 미설치로 실패, 대신 **대시보드 SQL Editor에 직접 SQL 실행**으로 스키마 최초 생성
- [x] `supabase/migrations/20260707000000_init_schema.sql` 작성 (`profiles`, `events`, `event_participants` DDL, RLS 정책, 인덱스, `handle_new_user` 트리거, Realtime 구독, Storage 버킷/정책 포함)
- [x] `supabase/migrations/20260708000000_fix_profiles_admin_policy_recursion.sql` 추가 (RLS 자기참조 재귀 버그 수정)
- [x] 마이그레이션 파일 git 커밋 대상으로 준비 (실제 커밋은 사용자 확인 후 별도 진행)

### 3. RLS 정책 검증
- [x] `profiles`: 본인만 수정 가능(`profiles_update_own`), 조회는 인증된 사용자 전체 허용(`profiles_select_authenticated`) — Playwright로 로그인 후 본인 프로필 조회 확인
- [x] `events`: `created_by` 본인만 수정/삭제 가능(`events_update_own`, `events_delete_own`) — 이벤트 생성 시 `created_by`가 올바르게 기록됨을 확인
- [x] `event_participants`: 본인 참여 레코드만 insert/delete 가능(`event_participants_insert_own`, `_delete_own`)
- [x] `role: admin` 우회 정책(`*_admin_all`) 확인 — **최초 버전이 `profiles` 자기참조로 무한 재귀(`42P17`) 발생**, `security definer` 함수 `is_admin()`으로 수정하여 해결

### 4. 인덱스 확인
- [x] `events.invite_code` unique 인덱스 적용 확인 (이벤트 생성 시 `HN7ZP9` 형식 코드 정상 발급)
- [x] `events.created_by` 인덱스 적용 확인
- [x] `event_participants.event_id`, `event_participants.user_id` 인덱스 적용 확인
- [x] `event_participants (event_id, user_id)` unique 복합 인덱스 적용 확인 (중복 참여 방지 `23505`의 근거)

### 5. Storage 버킷 설정 검증
- [x] `event-covers` 버킷 존재 및 public 여부 확인 (대시보드에서 수동 생성, public read policy 정상 동작 REST API로 확인)
- [x] 버킷 접근 정책(업로드는 인증된 사용자만, 조회는 public) SQL 적용 확인
- [ ] `app/actions/upload.ts`에서 실제 파일 업로드 테스트 (테이블/이벤트 플로우 검증까지만 진행, 업로드 자체는 미실시 — 후속 확인 필요)

### 6. Realtime 구독 설정 확인
- [x] `event_participants` 테이블에 Realtime publication 추가 완료 (`alter publication supabase_realtime add table`)

### 7. 타입 재생성 스크립트 정비
- [x] `SUPABASE_PROJECT_ID=xbyqkektljnhyveqvfgx`로 `npm run db:types` 실행 확인
- [x] `npm run db:types` 결과와 기존 `database.types.ts` diff 확인 — **Gather가 쓰는 3개 테이블(profiles/events/event_participants)은 필드/FK 완전 일치**. 차이는 CLI 출력 포맷 변경, `graphql_public` 스키마 추가, 무관한 `invoices`/`invoice_items` 테이블, 신규 `is_admin` 함수뿐 → `database.types.ts` 덮어쓰기 불필요로 판단
- [ ] 로컬 Supabase(Docker) 사용 여부 결정 — 이번 세션에서는 Docker 미설치로 미사용, 필요 시 별도 설치 후 `db:types:local` 경로 검토

## 수락 기준

1. ✅ `.env.local` 설정 후 `npm run dev`로 로그인/이벤트 생성 플로우가 실제 DB와 연동되어 동작함 (Playwright로 검증)
2. ✅ `supabase/migrations/`에 현재 스키마(테이블, RLS, 인덱스, 버그 수정)를 재현할 수 있는 마이그레이션 파일 2개 작성 완료
3. ⚠️ 새 팀원 재현 절차: `.env.example` 복사 + 마이그레이션 파일을 SQL Editor에서 순서대로 실행 (Docker 없는 환경에서는 `db push` 대신 이 방식 사용을 문서화함) + `event-covers` 버킷은 대시보드에서 수동 생성 필요
4. ✅ `npm run db:types` 결과가 기존 `database.types.ts`와 (무관한 테이블 제외) 일치함을 확인함
5. ⚠️ Storage 버킷 생성과 정책 적용은 확인했으나, 실제 파일 업로드 테스트는 미실시

## 테스트 체크리스트

- [x] `.env.local` 설정 후 회원가입 → 이메일 확인(대시보드 수동 처리) → 로그인 플로우 확인 (Playwright, `churee20@gmail.com`)
- [x] 이벤트 생성 → 초대 코드 발급 → 실제 DB에 row 생성 확인 (REST API로 직접 조회, `invite_code: HN7ZP9`)
- [x] 이벤트 생성 시 주최자가 `event_participants`에 `role: host`로 자동 등록되는지 확인
- [ ] 동일 사용자가 같은 초대 코드로 두 번 참여 시도 → `23505` 에러로 정상 차단되는지 확인 (미실시, 후속 확인 필요)
- [ ] 이벤트 커버 이미지 업로드 후 Storage 대시보드에서 실제 파일 생성 확인 (미실시)
- [ ] 관리자 계정(`role: admin`)으로 로그인 시 관리자 전용 데이터 조회가 RLS에 막히지 않는지 확인 (재귀 버그는 수정했으나 실제 admin 계정으로 E2E 검증은 미실시)

## 관련 파일

### 확인/생성할 파일
```
.env.local                          # 신규 생성 (git 미포함)
.env.example                        # 신규 생성 검토
supabase/
├── config.toml                     # supabase init 시 생성
└── migrations/
    └── <timestamp>_init_schema.sql # supabase db pull로 역추출
```

### 참조할 기존 파일
- `lib/supabase/database.types.ts` - 현재 반영된 스키마 타입 (역추출 결과와 대조용)
- `lib/supabase/server.ts`, `client.ts`, `middleware.ts` - 클라이언트 생성 패턴
- `app/actions/upload.ts` - Storage 버킷 사용 코드
- `app/actions/events.ts` - 중복 참여 방지(`23505`) 로직, RLS/인덱스 전제 확인용
- `package.json`의 `db:types`, `db:types:local` 스크립트
- `CLAUDE.md`의 "환경 변수" 섹션

## 주의사항 (실제로 겪은 이슈 기반)

1. **`.env.local`은 절대 커밋하지 않음**: `.gitignore`에 이미 포함되어 있어 정상적으로 추적 제외됨을 확인함
2. **이 Supabase 프로젝트에는 Gather와 무관한 `invoices`/`invoice_items` 테이블이 공존함**: 삭제하지 않고 그대로 둠. 정리가 필요하면 별도로 논의 후 진행할 것
3. **Docker Desktop이 없는 환경에서는 `supabase db pull`/`db dump`가 모두 실패함**: shadow DB 생성에 Docker가 필수. 이런 환경에서는 SQL을 직접 작성해 대시보드 SQL Editor에서 실행하는 방식으로 대체해야 함
4. **RLS 정책에서 테이블 자기참조 서브쿼리는 무한 재귀를 유발함**: `profiles` 정책 안에서 `profiles`를 다시 조회하는 패턴은 반드시 `security definer` 함수로 우회할 것 (`is_admin()` 참고)
5. **Supabase가 JWT 서명 키를 HS256(legacy)에서 ES256(비대칭키)로 마이그레이션한 프로젝트는 `.env.local`에 새 publishable key(`sb_publishable_...`)를 써야 함**: 레거시 anon key(JWT 형식)를 계속 쓰면 `PGRST301` 에러가 날 수 있음 (이번 경우엔 최종 원인은 RLS 재귀였지만, 키 교체도 함께 필요했음)
6. Supabase 공식 MCP 서버(`.mcp.json`의 `supabase` 항목)가 추가되어 있음 — 별도 터미널에서 `/mcp` 실행 후 브라우저 인증 필요, 인증하면 이후 유사 진단 작업에 활용 가능

## 다음 단계

Task 007 완료 후:
1. Task 012: 핵심 기능 통합 테스트 — 로컬 환경에서 Playwright E2E 테스트를 실제로 실행할 수 있게 됨
2. 미완료 항목 후속 확인: 커버 이미지 실제 업로드 테스트, 중복 참여(`23505`) 재현, 관리자 계정 E2E 검증
3. `invoices`/`invoice_items` 테이블 정리 여부 논의
4. 마이그레이션 파일(`supabase/migrations/*.sql`) git 커밋 — 이후 스키마 변경 시 기준선(baseline)으로 사용
